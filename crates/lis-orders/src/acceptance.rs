//! The acceptance checks, shared by `accept_order` and the order read, so the order page
//! shows exactly what acceptance will check (REQ-ORD-001, REQ-ORD-006).

use std::collections::BTreeSet;

use lis_catalog::{OrderableId, OrderableVersionId};
use lis_core::text_enum;
use rusqlite::{Connection, OptionalExtension};

use crate::{ClarificationDeficiency, OrderError, OrderId, OrderStatus, StandingOrderId};

text_enum!(/// What acceptance of a received order would refuse or turn into a clarification hold.
AcceptanceBlocker {
    /// A requested test predates the sequence-role requirement; acceptance is refused.
    LegacySequenceRole = "legacy_sequence_role",
    /// No signature or attestation is recorded; acceptance places a clarification hold.
    AuthorityMissing = "authority_missing",
    /// An open clarification hold refuses acceptance.
    OpenClarificationHold = "open_clarification_hold",
    /// The standing order no longer matches the patient or practitioner; acceptance places a hold.
    StandingOrderExpired = "standing_order_expired",
    /// The standing order has no visits left; acceptance places a hold.
    StandingOrderExhausted = "standing_order_exhausted",
    /// A test is outside the standing order's scope; acceptance places a hold.
    StandingOrderOutOfScope = "standing_order_out_of_scope",
});

/// Every acceptance check the order fails now, in the order `accept_order` applies them.
/// Empty unless the order is received.
pub(crate) fn acceptance_blockers(
    conn: &Connection,
    order_id: OrderId,
    status: OrderStatus,
    standing_order_id: Option<StandingOrderId>,
) -> Result<Vec<AcceptanceBlocker>, OrderError> {
    let mut blockers = Vec::new();
    if status != OrderStatus::Received {
        return Ok(blockers);
    }
    if has_legacy_item(conn, order_id)? {
        blockers.push(AcceptanceBlocker::LegacySequenceRole);
    }
    if !has_active_authority(conn, order_id)? {
        blockers.push(AcceptanceBlocker::AuthorityMissing);
    }
    if open_hold_count(conn, order_id)? > 0 {
        blockers.push(AcceptanceBlocker::OpenClarificationHold);
    }
    if let Some(standing_id) = standing_order_id
        && let Some(deficiency) = standing_order_deficiency(conn, order_id, standing_id)?
    {
        let blocker = match deficiency {
            ClarificationDeficiency::StandingOrderExpired => {
                Some(AcceptanceBlocker::StandingOrderExpired)
            }
            ClarificationDeficiency::StandingOrderExhausted => {
                Some(AcceptanceBlocker::StandingOrderExhausted)
            }
            ClarificationDeficiency::StandingOrderOutOfScope => {
                Some(AcceptanceBlocker::StandingOrderOutOfScope)
            }
            // Not standing-order deficiencies: `standing_order_deficiency` never returns them.
            ClarificationDeficiency::RequestorMissing
            | ClarificationDeficiency::TestSelectionMissing
            | ClarificationDeficiency::SignatureOrIntentRequired
            | ClarificationDeficiency::ReflexAuthorityMissing
            | ClarificationDeficiency::OtherAuthority => None,
        };
        blockers.extend(blocker);
    }
    Ok(blockers)
}

/// A requested item without an explicit sequence role cannot be accepted.
pub(crate) fn has_legacy_item(conn: &Connection, order_id: OrderId) -> Result<bool, OrderError> {
    Ok(conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM ord_order_items \
         WHERE order_id = ?1 AND state = 'requested' AND sequence_role IS NULL)",
        [order_id],
        |row| row.get(0),
    )?)
}

pub(crate) fn open_hold_count(conn: &Connection, order_id: OrderId) -> Result<i64, OrderError> {
    Ok(conn.query_row(
        "SELECT count(*) FROM ord_clarification_holds WHERE order_id = ?1 AND state = 'open'",
        [order_id],
        |row| row.get(0),
    )?)
}

pub(crate) fn has_active_authority(
    conn: &Connection,
    order_id: OrderId,
) -> Result<bool, OrderError> {
    let supplied: i64 = conn.query_row(
        "SELECT count(*) FROM ord_authority_evidence \
         WHERE order_id = ?1 AND removed_in_version IS NULL AND kind <> 'not_supplied'",
        [order_id],
        |row| row.get(0),
    )?;
    Ok(supplied != 0)
}

/// Rechecks the standing order's patient, practitioner, visit limit and scope.
pub(crate) fn standing_order_deficiency(
    conn: &Connection,
    order_id: OrderId,
    standing_id: StandingOrderId,
) -> Result<Option<ClarificationDeficiency>, OrderError> {
    let (subject_id, practitioner_id, visit_limit): (
        lis_identity::SubjectId,
        lis_identity::PractitionerId,
        Option<i64>,
    ) = conn
        .query_row(
            "SELECT subject_id, practitioner_id, visit_limit \
         FROM ord_standing_orders WHERE id = ?1",
            [standing_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .optional()?
        .ok_or(OrderError::NotFound("standing_order"))?;
    let (order_subject, order_practitioner): (
        lis_identity::SubjectId,
        lis_identity::PractitionerId,
    ) = conn.query_row(
        "SELECT subject_id, practitioner_id FROM ord_orders WHERE id = ?1",
        [order_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;
    if subject_id != order_subject || practitioner_id != order_practitioner {
        return Ok(Some(ClarificationDeficiency::StandingOrderExpired));
    }
    if let Some(limit) = visit_limit {
        let accepted: i64 = conn.query_row(
            "SELECT count(*) FROM ord_orders WHERE standing_order_id = ?1 AND status = 'accepted'",
            [standing_id],
            |r| r.get(0),
        )?;
        if accepted >= limit {
            return Ok(Some(ClarificationDeficiency::StandingOrderExhausted));
        }
    }
    let scope: BTreeSet<OrderableId> = conn
        .prepare_cached(
            "SELECT orderable_id FROM ord_standing_order_scope WHERE standing_order_id = ?1",
        )?
        .query_map([standing_id], |row| row.get(0))?
        .collect::<Result<_, _>>()?;
    let versions: Vec<OrderableVersionId> = conn
        .prepare_cached("SELECT orderable_version_id FROM ord_order_items WHERE order_id = ?1")?
        .query_map([order_id], |row| row.get(0))?
        .collect::<Result<_, _>>()?;
    let mut outside_scope = false;
    for version_id in versions {
        let version = lis_catalog::get_orderable_version(conn, version_id)?;
        outside_scope |= !scope.contains(&version.orderable_id);
    }
    if outside_scope {
        return Ok(Some(ClarificationDeficiency::StandingOrderOutOfScope));
    }
    Ok(None)
}
