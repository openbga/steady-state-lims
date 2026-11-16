//! Incomplete identity intake awaiting verified identity (#4773). The identity module owns the
//! selection; items are named by intake ID, never by the supplied name.

use super::{QueueDefinition, WorkQueueError, WorkQueueItem};

pub(super) fn intake_items(
    conn: &rusqlite::Connection,
    definition: QueueDefinition,
    limit: u32,
) -> Result<Vec<WorkQueueItem>, WorkQueueError> {
    Ok(lis_identity::intake_awaiting_identity(conn, limit)?
        .into_iter()
        .map(|row| WorkQueueItem {
            queue: definition.code.to_owned(),
            item_kind: "intake_deferral".to_owned(),
            item_id: row.intake_id.to_string(),
            title: format!("Intake {}", row.intake_id),
            state: "awaiting_identity".to_owned(),
            state_label: Some("Awaiting verified identity".to_owned()),
            since: row.since,
            next_action: definition.next_action.to_owned(),
            has_more: Some(false),
        })
        .collect())
}
