//! Lot corrections: a new revision with a reason and an immutable history; runs keep
//! the values in effect when they were created (#4558).

use lis_analytical::{
    CorrectLotInput, LotHistoryInput, LotId, LotView, MaterialKind, RegisterLotInput,
    WithdrawLotInput,
};
use lis_core::{Clock, ErrorCode};

use crate::{Fixture, LATER, STAFF, code_of, fixture, last_event, read, run};

fn correction(lot: &LotView) -> CorrectLotInput {
    CorrectLotInput {
        lot_id: lot.lot_id,
        expected_revision: lot.revision,
        product_name: lot.product_name.clone(),
        lot_number: lot.lot_number.clone(),
        level_text: lot.level_text.clone(),
        sample_label: lot.sample_label.clone(),
        expires_on: lot.expires_on.clone(),
        reason: "Synthetic typo".to_owned(),
    }
}

fn lot(f: &Fixture, id: LotId) -> LotView {
    let now = f.clock.now();
    read(f, move |conn| {
        lis_analytical::list_lots(conn, false, now, None)
    })
    .into_iter()
    .find(|lot| lot.lot_id == id)
    .unwrap()
}

fn correct(
    f: &Fixture,
    input: CorrectLotInput,
) -> Result<LotView, lis_analytical::AnalyticalError> {
    run(f, STAFF, move |ctx| lis_analytical::correct_lot(ctx, input))
}

fn later(f: &Fixture) {
    f.clock.set(
        f.clock
            .now()
            .checked_add(std::time::Duration::from_secs(60))
            .unwrap(),
    );
}

#[test]
fn a_correction_is_a_new_revision_with_history_and_audit() {
    let f = fixture();
    let id = f.lot(MaterialKind::Control, "LOT-TEST-3", LATER);
    let before = lot(&f, id);
    later(&f);
    let mut input = correction(&before);
    input.lot_number = "LOT-TEST-4".to_owned();
    input.level_text = Some("High".to_owned());
    input.sample_label = Some("QC-LCMS-1".to_owned());
    input.expires_on = "2027-06-30".to_owned();

    let after = correct(&f, input).unwrap();

    assert_eq!(after.revision, 2);
    assert_eq!(after.material_kind, MaterialKind::Control);
    assert_eq!(after.lot_number, "LOT-TEST-4");
    assert_eq!(after.level_text.as_deref(), Some("High"));
    assert_eq!(after.sample_label.as_deref(), Some("QC-LCMS-1"));
    assert_eq!(after.expires_on, "2027-06-30");
    let (action, record, reason) = last_event(&f);
    assert_eq!(action, "analytical.correct_lot");
    assert_eq!(record, Some(id.to_string()));
    assert_eq!(reason.as_deref(), Some("Synthetic typo"));

    let history = read(&f, move |conn| {
        lis_analytical::lot_history(conn, LotHistoryInput { lot_id: id })
    });
    let summary: Vec<_> = history
        .iter()
        .map(|h| {
            (
                h.revision,
                h.lot_number.as_str(),
                h.origin.as_str(),
                h.reason.as_deref(),
            )
        })
        .collect();
    assert_eq!(
        summary,
        [
            (1, "LOT-TEST-3", "registered", None),
            (2, "LOT-TEST-4", "corrected", Some("Synthetic typo")),
        ]
    );
}

#[test]
fn a_run_keeps_the_lot_values_in_effect_when_it_was_created() {
    let f = fixture();
    let run_view = f.open_run();
    let reagent = lot(&f, run_view.lots[0].lot_id);
    later(&f);
    let mut input = correction(&reagent);
    input.lot_number = "R-CORRECTED".to_owned();
    correct(&f, input).unwrap();

    let (run_id, now) = (run_view.run_id, f.clock.now());
    let shown = read(&f, move |conn| lis_analytical::get_run(conn, run_id, now));
    assert_eq!(shown.lots[0].lot_number, reagent.lot_number);
    assert_eq!(lot(&f, reagent.lot_id).lot_number, "R-CORRECTED");
}

#[test]
fn a_correction_is_refused_when_it_changes_nothing_or_breaks_a_rule() {
    let f = fixture();
    let id = f.lot(MaterialKind::Control, "C-1", LATER);
    let other = f.lot(MaterialKind::Control, "C-2", LATER);
    let current = lot(&f, id);

    assert_eq!(
        code_of(correct(&f, correction(&current))),
        ErrorCode::Validation
    );

    let mut no_reason = correction(&current);
    no_reason.lot_number = "C-9".to_owned();
    no_reason.reason = " ".to_owned();
    assert_eq!(code_of(correct(&f, no_reason)), ErrorCode::Validation);

    let mut taken = correction(&current);
    taken.sample_label = lot(&f, other).sample_label;
    let error = correct(&f, taken).unwrap_err();
    assert_eq!(error.field_errors()[0].code, "in_use", "{error:?}");

    let mut duplicate = correction(&current);
    duplicate.lot_number = "C-2".to_owned();
    assert_eq!(code_of(correct(&f, duplicate)), ErrorCode::Conflict);

    let mut stale = correction(&current);
    stale.lot_number = "C-9".to_owned();
    stale.expected_revision = 7;
    assert_eq!(code_of(correct(&f, stale)), ErrorCode::Conflict);

    let mut no_label = correction(&current);
    no_label.sample_label = None;
    assert_eq!(code_of(correct(&f, no_label)), ErrorCode::Validation);
    assert_eq!(lot(&f, id), current);
}

#[test]
fn a_withdrawn_lot_is_not_corrected_and_its_label_is_free_again() {
    let f = fixture();
    let withdrawn = f.lot(MaterialKind::Calibrator, "K-1", LATER);
    let label = lot(&f, withdrawn).sample_label;
    let input = WithdrawLotInput {
        lot_id: withdrawn,
        expected_revision: 1,
        reason: "Synthetic recall".to_owned(),
    };
    run(&f, STAFF, move |ctx| {
        lis_analytical::withdraw_lot(ctx, input)
    })
    .unwrap();
    let mut refused = correction(&lot(&f, withdrawn));
    refused.lot_number = "K-9".to_owned();
    assert_eq!(code_of(correct(&f, refused)), ErrorCode::Conflict);

    let other = f.lot(MaterialKind::Calibrator, "K-2", LATER);
    let mut relabel = correction(&lot(&f, other));
    relabel.sample_label = label;
    correct(&f, relabel).unwrap();
}

#[test]
fn a_reagent_takes_no_sample_label() {
    let f = fixture();
    let input = RegisterLotInput {
        material_kind: MaterialKind::Reagent,
        product_name: "Synthetic reagent".to_owned(),
        lot_number: "R-1".to_owned(),
        level_text: None,
        sample_label: None,
        expires_on: LATER.to_owned(),
    };
    let reagent = run(&f, STAFF, move |ctx| {
        lis_analytical::register_lot(ctx, input)
    })
    .unwrap();
    let mut labelled = correction(&reagent);
    labelled.sample_label = Some("QC-R".to_owned());
    let error = correct(&f, labelled).unwrap_err();
    assert_eq!(error.field_errors()[0].code, "not_applicable", "{error:?}");
}

#[test]
fn the_database_refuses_a_correction_without_matching_history() {
    let f = fixture();
    let id = f.lot(MaterialKind::Reagent, "R-RAW", LATER);
    let refused = f.raw().execute(
        "UPDATE ana_lots SET lot_number = 'R-EDIT', revision = 2 WHERE id = ?1",
        [id.to_string()],
    );
    assert!(refused.is_err());
    assert_eq!(lot(&f, id).lot_number, "R-RAW");
}
