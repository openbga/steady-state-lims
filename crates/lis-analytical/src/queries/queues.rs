//! Work-queue and billing reads (REQ-OPS-004, REQ-BIL-005). Identifiers,
//! codes, laboratory names (run, method, instrument, analyte) and times only,
//! oldest first.

use std::collections::BTreeMap;
use std::collections::btree_map::Entry;

use lis_catalog::AnalyteId;
use lis_core::InstrumentId;
use lis_orders::OrderComponentId;
use rusqlite::Connection;

use crate::dependency::qc_status;
use crate::error::AnalyticalError;
use crate::model::{QcStatus, RunId};
use crate::repo::qc::{self as qc_repo, ScopeKey};
use crate::repo::{deviations, queues};
use crate::views::{ComponentExecution, DeviationView, QcRunWorkItem, QcWorkAnalyte, QcWorkItem};

/// Every execution of the order component, active or failed, oldest first.
pub fn component_executions(
    conn: &Connection,
    component_id: OrderComponentId,
) -> Result<Vec<ComponentExecution>, AnalyticalError> {
    Ok(queues::component_executions(conn, component_id)?)
}

/// Run × analyte QC that needs a decision, at most `limit`, oldest first:
/// `pending` and `stale` wherever the current observations differ from the
/// cited ones or a QC conflict is open (the review gate's rule), and
/// `rejected` while the run is open, so its work can be failed or repeated
/// before the run closes. A closed run's rejection needs no further QC
/// action and leaves the queue.
pub fn qc_work_queue(conn: &Connection, limit: u32) -> Result<Vec<QcWorkItem>, AnalyticalError> {
    let mut items = Vec::new();
    for (run_id, analyte_id, since) in queues::changed_qc(conn)? {
        let current = qc_repo::current_assessment(conn, ScopeKey::RunAnalyte(run_id, analyte_id))?;
        let status = qc_status(current.map(|assessment| assessment.outcome), true);
        match status {
            QcStatus::Pending | QcStatus::Stale => items.push(QcWorkItem {
                run_id,
                analyte_id,
                status,
                since,
            }),
            // Listed below, while the run is open.
            QcStatus::Rejected | QcStatus::Accepted => {}
        }
    }
    for (run_id, analyte_id, since) in queues::rejected_on_open_runs(conn)? {
        items.push(QcWorkItem {
            run_id,
            analyte_id,
            status: QcStatus::Rejected,
            since,
        });
    }
    items.sort_by_key(|item| (item.since, item.run_id, item.analyte_id));
    items.truncate(usize::try_from(limit).unwrap_or(usize::MAX));
    Ok(items)
}

/// [`qc_work_queue`] grouped by run, at most `limit` runs, oldest first by
/// their oldest analyte: one decision place per run, its Run QC review. Names
/// come from a fixed number of reads plus one per distinct method version.
pub fn qc_runs_work_queue(
    conn: &Connection,
    limit: u32,
) -> Result<Vec<QcRunWorkItem>, AnalyticalError> {
    let mut by_run: BTreeMap<RunId, Vec<QcWorkItem>> = BTreeMap::new();
    for item in qc_work_queue(conn, u32::MAX)? {
        by_run.entry(item.run_id).or_default().push(item);
    }
    let run_ids = by_run.keys().copied().collect::<Vec<_>>();
    let names = QueueNames::read(conn)?;
    let mut methods = BTreeMap::new();
    let mut runs = Vec::new();
    for (run_id, instrument_id, method_version_id, run_created_at) in
        queues::queue_runs(conn, &run_ids)?
    {
        let (method_code, method_version) = match methods.entry(method_version_id) {
            Entry::Occupied(found) => found.into_mut(),
            Entry::Vacant(slot) => {
                let method = lis_catalog::get_method_version(conn, method_version_id)?;
                slot.insert((method.method_code, method.version))
            }
        }
        .clone();
        let items = by_run.remove(&run_id).unwrap_or_default();
        runs.push(QcRunWorkItem {
            run_id,
            method_code,
            method_version,
            instrument_name: names.instrument(instrument_id)?,
            run_created_at,
            since: items
                .iter()
                .map(|item| item.since)
                .min()
                .unwrap_or(run_created_at),
            analytes: items
                .into_iter()
                .map(|item| names.analyte(item))
                .collect::<Result<_, _>>()?,
        });
    }
    runs.sort_by_key(|run| (run.since, run.run_id));
    runs.truncate(usize::try_from(limit).unwrap_or(usize::MAX));
    Ok(runs)
}

/// Instrument and analyte names, each read once for a whole queue.
struct QueueNames {
    instruments: BTreeMap<InstrumentId, String>,
    analytes: BTreeMap<AnalyteId, String>,
}

impl QueueNames {
    fn read(conn: &Connection) -> Result<Self, AnalyticalError> {
        Ok(Self {
            instruments: lis_interfaces::instrument_names(conn)?
                .into_iter()
                .collect(),
            analytes: lis_catalog::list_analytes(conn)?
                .into_iter()
                .map(|analyte| (analyte.id, analyte.name))
                .collect(),
        })
    }

    fn instrument(&self, id: InstrumentId) -> Result<String, AnalyticalError> {
        self.instruments
            .get(&id)
            .cloned()
            .ok_or(AnalyticalError::NotFound("instrument"))
    }

    fn analyte(&self, item: QcWorkItem) -> Result<QcWorkAnalyte, AnalyticalError> {
        Ok(QcWorkAnalyte {
            name: self
                .analytes
                .get(&item.analyte_id)
                .cloned()
                .ok_or(AnalyticalError::NotFound("analyte"))?,
            analyte_id: item.analyte_id,
            status: item.status,
        })
    }
}

/// Open deviations, oldest first, at most `limit`. Descriptions and reasons
/// are staff-typed text about laboratory work, not patient data.
pub fn open_deviations(
    conn: &Connection,
    limit: u32,
) -> Result<Vec<DeviationView>, AnalyticalError> {
    Ok(deviations::open(conn, limit)?)
}

/// Opens one deviation by its exact identity, including lot-scoped deviations
/// that can affect more than one run. The engine authorizes and audits this read.
pub fn get_deviation(
    conn: &Connection,
    id: crate::DeviationId,
) -> Result<DeviationView, AnalyticalError> {
    deviations::deviation(conn, id)?.ok_or(AnalyticalError::NotFound("deviation"))
}
