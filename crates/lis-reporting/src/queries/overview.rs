//! The report page summary: what the latest revision printed about the
//! order and the specimen (REQ-RPT-003). Part of the audited report read.

use rusqlite::Connection;
use serde::Serialize;
use ts_rs::TS;

use crate::error::ReportingError;
use crate::repo::candidates;
use crate::repo::reports::RevisionRow;
use crate::stored::stored_content;

/// The order and specimen as the latest revision printed them, in the
/// laboratory's words: the report page's summary.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ReportOverview {
    /// The ordering client.
    pub client: String,
    /// The client location, if any.
    pub client_location: Option<String>,
    /// The ordering practitioner's name as printed.
    pub practitioner: String,
    /// The ordering practitioner's National Provider Identifier.
    pub practitioner_npi: String,
    /// The specimen type.
    pub specimen_type: String,
    /// The container labels.
    pub container_labels: Vec<String>,
    /// The ordered tests the revision names, reported or not, once each.
    pub tests: Vec<String>,
    /// Collection time as printed; `None` when not provided.
    pub collected: Option<String>,
}

/// What `revision` printed about the client, the practitioner, the
/// specimen and the tests, or `None` while its stored content fails its
/// digest: the report stays readable and the content is never shown
/// (NFR-07).
pub(crate) fn overview(
    conn: &Connection,
    revision: &RevisionRow,
) -> Result<Option<ReportOverview>, ReportingError> {
    let candidate = candidates::candidate(conn, revision.candidate_id)?
        .ok_or(ReportingError::Inconsistent("released candidate"))?;
    let data = match stored_content(conn, &candidate) {
        Ok(stored) => stored.data,
        Err(ReportingError::ContentMismatch(_)) => return Ok(None),
        Err(error) => return Err(error),
    };
    let mut tests: Vec<String> = Vec::new();
    let names = data
        .result_groups
        .iter()
        .map(|group| &group.name)
        .chain(data.other_tests.iter().map(|test| &test.name));
    for name in names {
        if !tests.contains(name) {
            tests.push(name.clone());
        }
    }
    Ok(Some(ReportOverview {
        client: data.order.client,
        client_location: data.order.location,
        practitioner: data.order.practitioner.name,
        practitioner_npi: data.order.practitioner.npi,
        specimen_type: data.specimen.matrix,
        container_labels: data.specimen.container_labels,
        tests,
        collected: data.specimen.collected,
    }))
}
