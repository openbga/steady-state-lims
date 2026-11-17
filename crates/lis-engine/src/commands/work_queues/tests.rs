use super::*;
use lis_core::{Capability, SessionId, UserId, WorkstationId};

fn principal(capabilities: impl IntoIterator<Item = Capability>) -> Principal {
    Principal::user(
        UserId::generate(),
        SessionId::generate(),
        WorkstationId::generate(),
        capabilities,
    )
}

#[test]
fn queue_visibility_is_owner_capability_filtered() {
    let reviewer = principal([Capability::ReviewResults]);
    assert!(queue_definition("review_ready").is_some());
    assert!(reviewer.require(Capability::ReviewResults).is_ok());
    assert!(reviewer.require(Capability::EnterOrders).is_err());
}

// #4773/#4776: codes stay unique, and incomplete intake is a Front desk queue for enter_orders.
#[test]
fn queue_codes_are_unique_and_intake_is_a_front_desk_queue() {
    let codes: std::collections::BTreeSet<_> = QUEUES.iter().map(|queue| queue.code).collect();
    assert_eq!(codes.len(), QUEUES.len());
    let intake = queue_definition("incomplete_intake").unwrap();
    assert_eq!(intake.area, WorkQueueArea::FrontDesk);
    assert_eq!(intake.capability, Capability::EnterOrders);
}

#[test]
fn queue_items_are_oldest_first_with_a_stable_tie_break() -> Result<(), lis_core::ParseError> {
    let old = UtcTimestamp::parse("2026-10-13T10:00:00.000000000Z")?;
    let new = UtcTimestamp::parse("2026-10-13T11:00:00.000000000Z")?;
    let mut items = vec![item("c", new), item("b", old), item("a", old)];
    sort_items(&mut items, 2, None);
    assert_eq!(
        items
            .iter()
            .map(|item| item.item_id.as_str())
            .collect::<Vec<_>>(),
        vec!["a", "b"]
    );
    assert!(items.iter().all(|item| item.has_more == Some(true)));
    Ok(())
}

#[test]
fn later_duplicate_does_not_reappear_after_its_earliest_task_cursor()
-> Result<(), lis_core::ParseError> {
    let old = UtcTimestamp::parse("2026-10-13T10:00:00.000000000Z")?;
    let new = UtcTimestamp::parse("2026-10-13T11:00:00.000000000Z")?;
    let cursor = super::WorkQueueCursor {
        since: old,
        item_kind: "synthetic".into(),
        item_id: "a".into(),
    };
    let mut items = vec![item("a", new), item("a", old), item("b", new)];
    sort_items(&mut items, 2, Some(&cursor));
    assert_eq!(
        items
            .iter()
            .map(|item| item.item_id.as_str())
            .collect::<Vec<_>>(),
        vec!["b"]
    );
    Ok(())
}

fn item(id: &str, since: UtcTimestamp) -> WorkQueueItem {
    WorkQueueItem {
        queue: "synthetic".to_owned(),
        item_kind: "synthetic".to_owned(),
        item_id: id.to_owned(),
        title: "Synthetic item".to_owned(),
        state: "open".to_owned(),
        state_label: Some("Open".to_owned()),
        since,
        next_action: "Review".to_owned(),
        has_more: Some(false),
    }
}

#[test]
fn a_qc_run_item_counts_its_analytes_by_status() {
    use lis_analytical::{QcStatus, QcWorkAnalyte};
    let analyte = |status| QcWorkAnalyte {
        analyte_id: lis_catalog::AnalyteId::generate(),
        name: "Synthetic analyte".to_owned(),
        status,
    };
    let pending = [QcStatus::Pending, QcStatus::Pending, QcStatus::Pending].map(analyte);
    assert_eq!(
        owner_items::qc_state_label(&pending),
        "3 analytes not assessed"
    );
    let mixed = [QcStatus::Rejected, QcStatus::Pending, QcStatus::Stale].map(analyte);
    assert_eq!(
        owner_items::qc_state_label(&mixed),
        "1 analyte not assessed, 1 analyte out of date, 1 analyte rejected"
    );
}
