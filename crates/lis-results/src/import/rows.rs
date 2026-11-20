//! The record of every placed row of an import attempt and what happened to
//! it (REQ-ANA-003), with its text exactly as received.

use super::*;
use crate::model::ImportRowOutcome;

/// One received row as the attempt records it.
struct RowRecord<'a> {
    record_path: &'a str,
    sample_label: Option<&'a str>,
    test_code: Option<&'a str>,
    analyte: Option<AnalyteId>,
    value_text: Option<&'a str>,
    units_text: Option<&'a str>,
    position: Option<lis_analytical::PositionId>,
    outcome: ImportRowOutcome,
}

impl<'a> RowRecord<'a> {
    fn of(
        row: &'a ExtractedRow,
        analyte: Option<AnalyteId>,
        position: Option<lis_analytical::PositionId>,
        outcome: ImportRowOutcome,
    ) -> Self {
        Self {
            record_path: &row.record_path,
            sample_label: row.sample_label.as_deref(),
            test_code: row.test_code.as_deref(),
            analyte,
            value_text: row.value_text.as_deref(),
            units_text: row.units_text.as_deref(),
            position,
            outcome,
        }
    }
}

/// Appends one record per placed row of `plans`, numbered in received order.
/// Rows not read as results (F10) are only counted and rows set aside (F9,
/// F17) are listed on their own, so neither is repeated here.
pub(super) fn record_rows(
    ctx: &CommandContext<'_>,
    attempt_id: ImportAttemptId,
    plans: &[Plan],
) -> Result<(), ResultError> {
    let mut insert = ctx.tx().prepare_cached(
        "INSERT INTO res_import_rows (import_attempt_id, row_no, record_path, sample_label, \
         source_test_code, analyte_id, value_text, units_text, position_id, outcome) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
    )?;
    for (row_no, record) in (1_i64..).zip(plans.iter().filter_map(row_record)) {
        insert.execute(params![
            attempt_id,
            row_no,
            record.record_path,
            record.sample_label,
            record.test_code,
            record.analyte,
            record.value_text,
            record.units_text,
            record.position,
            record.outcome,
        ])?;
    }
    Ok(())
}

fn row_record(plan: &Plan) -> Option<RowRecord<'_>> {
    match plan {
        Plan::Patient(patient) => Some(RowRecord::of(
            &patient.row,
            Some(patient.analyte_id),
            Some(patient.position.position_id),
            patient_outcome(patient),
        )),
        Plan::Quarantine { row, context } => Some(RowRecord::of(
            row,
            context.analyte,
            context.position,
            ImportRowOutcome::Quarantined,
        )),
        Plan::Qc(qc) => Some(RowRecord {
            record_path: &qc.observation.record_path,
            sample_label: qc.sample_label.as_deref(),
            test_code: Some(qc.observation.source_test_code.as_str())
                .filter(|code| !code.is_empty()),
            analyte: qc.analyte_id,
            value_text: qc.observation.row.value_text.as_deref(),
            units_text: qc.observation.row.units_text.as_deref(),
            position: Some(qc.observation.position_id),
            outcome: ImportRowOutcome::Qc,
        }),
        Plan::NotResult | Plan::SetAside { .. } => None,
    }
}

/// The same split `count_plans` counts: a conflicting repeat is quarantined.
fn patient_outcome(patient: &PatientPlan) -> ImportRowOutcome {
    match patient.decision {
        RowDecision::New if patient.kept() => ImportRowOutcome::Retained,
        RowDecision::New => ImportRowOutcome::New,
        RowDecision::Duplicate => ImportRowOutcome::Duplicate,
        RowDecision::Correction => ImportRowOutcome::Reprocessed,
        RowDecision::Conflict => ImportRowOutcome::Quarantined,
    }
}
