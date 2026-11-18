//! An import attempt's rows, each with what happened to it (REQ-ANA-003).

use super::*;
use crate::views::ImportRowView;

/// The rows `attempt_id` recorded, in received order, each with the run and
/// specimen its position names (through the published position and container
/// views) and the catalog analyte its test code maps to. Text is as received.
pub(super) fn import_rows(
    conn: &Connection,
    attempt_id: ImportAttemptId,
) -> Result<Vec<ImportRowView>, ResultError> {
    let mut rows: Vec<(Option<AnalyteId>, ImportRowView)> = conn
        .prepare_cached(
            "SELECT r.row_no, r.record_path, r.sample_label, r.source_test_code, r.analyte_id, \
             r.value_text, r.units_text, r.outcome, p.run_id, c.specimen_id \
             FROM res_import_rows r \
             LEFT JOIN ana_v_positions p ON p.position_id = r.position_id \
             LEFT JOIN spc_v_containers c ON c.container_id = p.container_id \
             WHERE r.import_attempt_id = ?1 ORDER BY r.row_no",
        )?
        .query_map([attempt_id], |row| {
            Ok((
                row.get(4)?,
                ImportRowView {
                    row_no: row.get(0)?,
                    record_path: row.get(1)?,
                    sample_label: row.get(2)?,
                    test_code: row.get(3)?,
                    analyte_code: None,
                    analyte_name: None,
                    value_text: row.get(5)?,
                    units_text: row.get(6)?,
                    outcome: row.get(7)?,
                    run_id: row.get(8)?,
                    specimen_id: row.get(9)?,
                },
            ))
        })?
        .collect::<Result<_, _>>()?;
    let analytes: BTreeMap<AnalyteId, (String, String)> = lis_catalog::list_analytes(conn)?
        .into_iter()
        .map(|analyte| (analyte.id, (analyte.code, analyte.name)))
        .collect();
    for (analyte, view) in &mut rows {
        if let Some((code, name)) = analyte.and_then(|id| analytes.get(&id)) {
            view.analyte_code = Some(code.clone());
            view.analyte_name = Some(name.clone());
        }
    }
    Ok(rows.into_iter().map(|(_, view)| view).collect())
}
