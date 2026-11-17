//! A lot's correction history, and the old and new values behind its audit
//! events (#4558, REQ-OPS-001). Lots hold no PHI.

use lis_store::StoreError;
use rusqlite::Connection;
use serde::Deserialize;
use ts_rs::TS;

use crate::actions;
use crate::error::AnalyticalError;
use crate::model::LotId;
use crate::repo::{lot_history, lots};
use crate::views::LotHistoryEntry;

/// Input of [`lot_history`].
#[derive(Debug, Clone, Copy, Deserialize, TS)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
#[ts(export)]
pub struct LotHistoryInput {
    /// The lot.
    pub lot_id: LotId,
}

/// Every revision of the lot's values, oldest first: its registration, then each correction.
pub fn lot_history(
    conn: &Connection,
    input: LotHistoryInput,
) -> Result<Vec<LotHistoryEntry>, AnalyticalError> {
    if lots::lot(conn, input.lot_id)?.is_none() {
        return Err(AnalyticalError::NotFound("lot"));
    }
    Ok(lot_history::history(conn, input.lot_id)?)
}

/// The old and new values behind a lot's registration or correction event,
/// read from the lot's immutable history when the event is viewed.
pub fn audit_record_changes(
    conn: &Connection,
    query: &lis_audit::ChangeQuery<'_>,
) -> Result<Option<lis_audit::RecordChanges>, StoreError> {
    if query.record_type != "lot"
        || ![actions::REGISTER_LOT, actions::CORRECT_LOT].contains(&query.action)
    {
        return Ok(None);
    }
    let (Ok(lot_id), Some(new_revision)) =
        (query.record_id.parse::<LotId>(), query.produced_revision())
    else {
        return Ok(None);
    };
    let history = lot_history::history(conn, lot_id).map_err(StoreError::from)?;
    let values = |revision: Option<i64>| {
        let entry = history
            .iter()
            .find(|entry| Some(entry.revision) == revision);
        [
            entry.map(|entry| entry.product_name.clone()),
            entry.map(|entry| entry.lot_number.clone()),
            entry.and_then(|entry| entry.level_text.clone()),
            entry.and_then(|entry| entry.sample_label.clone()),
            entry.map(|entry| entry.expires_on.clone()),
        ]
    };
    let new = values(Some(new_revision));
    if new[0].is_none() {
        return Ok(None);
    }
    let rows = [
        "Product",
        "Lot number",
        "Level",
        "Sample label",
        "Expires on",
    ]
    .into_iter()
    .zip(values(query.old_revision).into_iter().zip(new))
    .map(|(label, (old, new))| (label.to_owned(), old, new));
    Ok(Some(lis_audit::RecordChanges::configuration(
        lis_audit::differing(rows),
    )))
}
