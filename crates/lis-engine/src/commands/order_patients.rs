//! Choosing the patient of a new order (REQ-ORD-001, REQ-IDN-001): the patients the
//! signed-in user entered orders for most recently and the patients the find text
//! matches, each with their latest order. Audited: the `access` event counts what was
//! returned and never copies the find text.

use lis_audit::AuditDetail;
use lis_core::{Actor, Capability, CommandError, Phi};
use lis_identity::SubjectSearch;
use lis_orders::{FindOrderPatientsInput, OrderError, OrderPatientChoices};
use rusqlite::Connection;

use crate::engine::Engine;
use crate::pipeline::access;
use crate::registry::{Access, CommandSpec, spec};

/// How many recent patients are offered.
const RECENT_LIMIT: usize = 10;

pub(crate) const FIND_ORDER_PATIENTS: CommandSpec = spec(
    "find_order_patients",
    "order.find_patients",
    Access::Capability(Capability::EnterOrders),
);

/// The find text when it is not blank.
fn find_text(input: &FindOrderPatientsInput) -> Option<Phi<String>> {
    input
        .query
        .as_ref()
        .filter(|query| !query.expose().trim().is_empty())
        .cloned()
}

/// Recent patients of `user_id` (none for a non-user caller) and, with find text, the
/// patients the patient directory search finds for it.
fn order_patients(
    conn: &Connection,
    user_id: Option<&str>,
    input: &FindOrderPatientsInput,
) -> Result<OrderPatientChoices, OrderError> {
    let recent_ids = match user_id {
        Some(user_id) => lis_orders::recent_order_subjects(conn, user_id, RECENT_LIMIT)?,
        None => Vec::new(),
    };
    let recent = lis_identity::subject_summaries(conn, &recent_ids)?;
    let matches = match find_text(input) {
        Some(query) => lis_identity::search_subjects(
            conn,
            &SubjectSearch {
                query: Some(query),
                offset: None,
                identifier: None,
                family_name: None,
                given_names: None,
                birth_date: None,
                limit: input.limit,
            },
        )?,
        None => Vec::new(),
    };
    Ok(OrderPatientChoices {
        recent: lis_orders::with_last_orders(conn, recent)?,
        matches: lis_orders::with_last_orders(conn, matches)?,
    })
}

impl Engine {
    /// `find_order_patients` (audited): the patients offered when choosing who a new
    /// order is for. The event records whether find text was used and the counts.
    pub async fn find_order_patients(
        &self,
        input: FindOrderPatientsInput,
    ) -> Result<OrderPatientChoices, CommandError> {
        self.run(&FIND_ORDER_PATIENTS, |call| async move {
            let user_id = match call.principal.actor() {
                Actor::User { user_id, .. } => Some(user_id.to_string()),
                Actor::Instrument { .. } | Actor::System { .. } => None,
            };
            let by_query = find_text(&input).is_some();
            self.audited_read(
                &call,
                move |conn| order_patients(conn, user_id.as_deref(), &input),
                move |found| {
                    access(FIND_ORDER_PATIENTS.action)
                        .detail("by_query", AuditDetail::boolean(by_query))
                        .detail("recent", AuditDetail::count(found.recent.len()))
                        .detail("returned", AuditDetail::count(found.matches.len()))
                },
            )
            .await
        })
        .await
    }
}
