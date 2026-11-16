//! The QC work queue grouped by run (#4774, REQ-OPS-004): one item per run,
//! named by method version, instrument and analyte, oldest first and limited.

use std::time::Duration;

use lis_analytical::{QcStatus, RunId};
use lis_core::Clock;

use crate::observe;
use crate::qc::setup;

#[test]
fn the_qc_run_queue_names_each_run_once_oldest_first_and_limited() {
    let s = setup();
    s.observe("48", "F");
    let later = s.f.open_run().run_id;
    s.f.clock.set(
        s.f.clock
            .now()
            .checked_add(Duration::from_secs(60))
            .unwrap(),
    );
    let (control, _) = s.f.control(later, "P1");
    let control = control.positions[0].position_id;
    observe(&s.f, control, s.receipt, "A1", "47", "F").unwrap();

    let queue = crate::read(&s.f, |conn| lis_analytical::qc_runs_work_queue(conn, 10));
    let runs: Vec<RunId> = queue.iter().map(|item| item.run_id).collect();
    assert_eq!(runs, [s.run_id, later]);
    assert!(queue[0].since < queue[1].since);
    let run_id = s.run_id;
    let now = s.f.clock.now();
    let detail = crate::read(&s.f, move |conn| lis_analytical::get_run(conn, run_id, now));
    let first = &queue[0];
    assert_eq!(
        (
            first.method_code.as_str(),
            first.method_version,
            first.instrument_name.as_str(),
            first.run_created_at,
        ),
        (
            detail.method_code.as_str(),
            detail.method_version,
            detail.instrument_name.as_str(),
            detail.created_at,
        )
    );
    assert_eq!(first.analytes.len(), 1);
    assert_eq!(first.analytes[0].analyte_id, s.analyte);
    assert_eq!(first.analytes[0].status, QcStatus::Pending);
    assert!(!first.analytes[0].name.is_empty());
    assert_ne!(first.analytes[0].name, s.analyte.to_string());

    let limited = crate::read(&s.f, |conn| lis_analytical::qc_runs_work_queue(conn, 1));
    assert_eq!(limited.len(), 1);
    assert_eq!(limited[0].run_id, s.run_id);
}
