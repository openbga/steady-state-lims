//! The rows of an import attempt, each with what happened to it (REQ-ANA-003).

use lis_analytical::RunId;
use lis_specimens::SpecimenId;
use serde::Serialize;
use ts_rs::TS;

use crate::model::ImportRowOutcome;

/// One placed row of an import attempt and what happened to it, with its text
/// exactly as received. Its clinical text is returned only by the audited
/// detail query.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ImportRowView {
    /// The row's place in the attempt, in received order (1-based).
    #[ts(type = "number")]
    pub row_no: i64,
    pub record_path: String,
    pub sample_label: Option<String>,
    pub test_code: Option<String>,
    /// The catalog analyte the test code maps to; absent when it maps to none.
    pub analyte_code: Option<String>,
    pub analyte_name: Option<String>,
    pub value_text: Option<String>,
    pub units_text: Option<String>,
    pub outcome: ImportRowOutcome,
    /// The run of the position the row matched; a QC row's QC is reviewed there.
    pub run_id: Option<RunId>,
    /// The specimen of a patient row's container, whose results are in review.
    pub specimen_id: Option<SpecimenId>,
}
