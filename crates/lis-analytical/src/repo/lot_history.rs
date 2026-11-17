//! SQL for lot corrections and the immutable lot history (#4558).

use lis_core::UtcTimestamp;
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::model::{CivilDate, LotId};
use crate::views::LotHistoryEntry;

/// The correctable values of a lot.
#[derive(Debug, Clone, Copy)]
pub(crate) struct LotFacts<'a> {
    pub(crate) product_name: &'a str,
    pub(crate) lot_number: &'a str,
    pub(crate) level_text: Option<&'a str>,
    pub(crate) sample_label: Option<&'a str>,
    pub(crate) expires_on: CivilDate,
}

/// One revision to append; `reason` is set for corrections only.
pub(crate) struct NewRevision<'a> {
    pub(crate) lot_id: LotId,
    pub(crate) revision: i64,
    pub(crate) facts: LotFacts<'a>,
    pub(crate) by: &'a str,
    pub(crate) at: UtcTimestamp,
    pub(crate) reason: Option<&'a str>,
}

pub(crate) fn insert_revision(conn: &Connection, new: &NewRevision<'_>) -> rusqlite::Result<()> {
    conn.prepare_cached(
        "INSERT INTO ana_lot_history (lot_id, revision, product_name, lot_number, level_text, \
         sample_label, expires_on, recorded_at, recorded_by, reason, origin) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, \
         CASE WHEN ?10 IS NULL THEN 'registered' ELSE 'corrected' END)",
    )?
    .execute(params![
        new.lot_id,
        new.revision,
        new.facts.product_name,
        new.facts.lot_number,
        new.facts.level_text,
        new.facts.sample_label,
        new.facts.expires_on.to_text(),
        new.at,
        new.by,
        new.reason
    ])?;
    Ok(())
}

/// Writes the corrected values; the trigger requires the matching history row.
pub(crate) fn correct_lot(
    conn: &Connection,
    id: LotId,
    revision: i64,
    facts: &LotFacts<'_>,
) -> rusqlite::Result<()> {
    conn.prepare_cached(
        "UPDATE ana_lots SET product_name = ?2, lot_number = ?3, level_text = ?4, \
         sample_label = ?5, expires_on = ?6, revision = ?7 WHERE id = ?1",
    )?
    .execute(params![
        id,
        facts.product_name,
        facts.lot_number,
        facts.level_text,
        facts.sample_label,
        facts.expires_on.to_text(),
        revision
    ])?;
    Ok(())
}

/// Another lot of the same material, product and lot number.
pub(crate) fn duplicate_lot(
    conn: &Connection,
    id: LotId,
    facts: &LotFacts<'_>,
) -> rusqlite::Result<bool> {
    conn.prepare_cached(
        "SELECT EXISTS (SELECT 1 FROM ana_lots o JOIN ana_lots l ON l.id = ?1 \
         WHERE o.id <> l.id AND o.material_kind = l.material_kind AND o.product_name = ?2 \
         AND o.lot_number = ?3)",
    )?
    .query_row(params![id, facts.product_name, facts.lot_number], |row| {
        row.get(0)
    })
}

/// The product and lot number of another active lot with `sample_label`.
pub(crate) fn sample_label_holder(
    conn: &Connection,
    id: LotId,
    sample_label: &str,
) -> rusqlite::Result<Option<(String, String)>> {
    conn.prepare_cached(
        "SELECT product_name, lot_number FROM ana_lots \
         WHERE id <> ?1 AND state = 'active' AND sample_label = ?2 \
         ORDER BY product_name, lot_number LIMIT 1",
    )?
    .query_row(params![id, sample_label], |row| {
        Ok((row.get(0)?, row.get(1)?))
    })
    .optional()
}

const HISTORY_COLUMNS: &str = "revision, product_name, lot_number, level_text, sample_label, \
     expires_on, recorded_at, recorded_by, reason, origin";

fn entry_from_row(row: &Row<'_>) -> rusqlite::Result<LotHistoryEntry> {
    Ok(LotHistoryEntry {
        revision: row.get(0)?,
        product_name: row.get(1)?,
        lot_number: row.get(2)?,
        level_text: row.get(3)?,
        sample_label: row.get(4)?,
        expires_on: row.get(5)?,
        recorded_at: row.get(6)?,
        recorded_by: row.get(7)?,
        recorded_by_display: None,
        reason: row.get(8)?,
        origin: row.get(9)?,
    })
}

/// Every revision of the lot's values, oldest first.
pub(crate) fn history(conn: &Connection, id: LotId) -> rusqlite::Result<Vec<LotHistoryEntry>> {
    conn.prepare_cached(&format!(
        "SELECT {HISTORY_COLUMNS} FROM ana_lot_history WHERE lot_id = ?1 ORDER BY revision"
    ))?
    .query_map([id], entry_from_row)?
    .collect()
}

/// The lot's values in effect at `at`: the last revision recorded by then.
pub(crate) fn values_at(
    conn: &Connection,
    id: LotId,
    at: UtcTimestamp,
) -> rusqlite::Result<Option<LotHistoryEntry>> {
    conn.prepare_cached(&format!(
        "SELECT {HISTORY_COLUMNS} FROM ana_lot_history WHERE lot_id = ?1 AND recorded_at <= ?2 \
         ORDER BY revision DESC LIMIT 1"
    ))?
    .query_row(params![id, at], entry_from_row)
    .optional()
}
