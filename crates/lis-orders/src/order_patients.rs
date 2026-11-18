//! Choosing the patient of a new order (REQ-ORD-001, REQ-IDN-001): the patients the
//! signed-in user entered orders for most recently, and each listed patient's latest
//! order. PHI: the engine authorizes and audits the read.

use std::collections::BTreeMap;

use lis_core::{Phi, UtcTimestamp};
use lis_identity::{ClientId, SubjectId, SubjectSummary};
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::error::OrderError;

/// Input of `find_order_patients`: the recent patients and, with find text, the
/// patients it matches.
#[derive(Debug, Clone, Deserialize, TS)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[ts(export)]
pub struct FindOrderPatientsInput {
    /// The start of a name, an exact birth date (`YYYY-MM-DD`) or the start of an
    /// active identifier value, as the patient directory's find text matches.
    #[serde(default)]
    #[ts(optional = nullable)]
    pub query: Option<Phi<String>>,
    /// Most matching patients to return, 1–50.
    pub limit: u32,
}

/// A patient's latest order, so people with the same name can be told apart.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct LastOrderView {
    /// When the order was received.
    pub received_at: UtcTimestamp,
    /// Display name of the ordering client organization.
    pub client_name: String,
}

/// A patient that can be chosen for a new order, with their latest order.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OrderPatientChoice {
    pub subject: SubjectSummary,
    /// The patient's latest order by anyone; `None` before their first order.
    pub last_order: Option<LastOrderView>,
}

/// The patients offered when choosing who a new order is for.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OrderPatientChoices {
    /// Patients the signed-in user entered orders for, most recent first.
    pub recent: Vec<OrderPatientChoice>,
    /// Patients the find text matches, ordered as the patient directory orders them;
    /// empty without find text.
    pub matches: Vec<OrderPatientChoice>,
}

/// Up to `limit` distinct patients of the orders the user `user_id` entered, most
/// recent order first. Walks the received-at index newest first and stops once enough
/// patients are found.
pub fn recent_order_subjects(
    conn: &Connection,
    user_id: &str,
    limit: usize,
) -> Result<Vec<SubjectId>, OrderError> {
    let mut statement = conn.prepare_cached(
        "SELECT subject_id FROM ord_orders \
         WHERE received_by_kind = 'user' AND received_by_id = ?1 \
         ORDER BY received_at DESC, id DESC",
    )?;
    let mut rows = statement.query(params![user_id])?;
    let mut subjects: Vec<SubjectId> = Vec::new();
    while subjects.len() < limit {
        let Some(row) = rows.next()? else { break };
        let subject: SubjectId = row.get(0)?;
        if !subjects.contains(&subject) {
            subjects.push(subject);
        }
    }
    Ok(subjects)
}

/// `subjects`, in the same order, each with their latest order. Client names are read
/// through the identity module's published query, once per client.
pub fn with_last_orders(
    conn: &Connection,
    subjects: Vec<SubjectSummary>,
) -> Result<Vec<OrderPatientChoice>, OrderError> {
    let mut clients: BTreeMap<ClientId, String> = BTreeMap::new();
    subjects
        .into_iter()
        .map(|subject| {
            let last_order = match latest_order(conn, subject.subject_id)? {
                Some((received_at, client_id)) => {
                    let client_name = match clients.get(&client_id) {
                        Some(name) => name.clone(),
                        None => {
                            let name = lis_identity::get_client(conn, client_id)?.name;
                            clients.insert(client_id, name.clone());
                            name
                        }
                    };
                    Some(LastOrderView {
                        received_at,
                        client_name,
                    })
                }
                None => None,
            };
            Ok(OrderPatientChoice {
                subject,
                last_order,
            })
        })
        .collect()
}

/// When the subject's newest order was received and its client, by the subject index.
fn latest_order(
    conn: &Connection,
    subject_id: SubjectId,
) -> Result<Option<(UtcTimestamp, ClientId)>, OrderError> {
    let mut statement = conn.prepare_cached(
        "SELECT received_at, client_id FROM ord_orders WHERE subject_id = ?1 \
         ORDER BY received_at DESC, id DESC LIMIT 1",
    )?;
    let mut rows = statement.query(params![subject_id])?;
    match rows.next()? {
        Some(row) => Ok(Some((row.get(0)?, row.get(1)?))),
        None => Ok(None),
    }
}
