//! Lot corrections through the engine (#4558): a quality manager corrects a lot,
//! anyone signed in reads its history, and the audit event's Changes show the old
//! and new values. Synthetic data only.

use lis_analytical::{LotId, MaterialKind};
use lis_auth::RoleCode;
use lis_core::CommandError;
use lis_engine::{
    AuditChangeStatus, AuditStream, CorrectLotInput, Engine, GetAuditEventChangesInput,
    LotHistoryInput, RegisterLotInput,
};

use crate::fixture::TestEngine;

/// Calls the lot correction command `name` with plausible input; `None` for others.
pub(crate) async fn lot_correction_call(
    engine: &Engine,
    name: &str,
) -> Option<Result<(), CommandError>> {
    Some(match name {
        "correct_lot" => engine
            .correct_lot(correction(LotId::generate(), "LOT-AUTH"))
            .await
            .map(drop),
        "lot_history" => engine
            .lot_history(LotHistoryInput {
                lot_id: LotId::generate(),
            })
            .await
            .map(drop),
        _ => return None,
    })
}

fn correction(lot_id: LotId, lot_number: &str) -> CorrectLotInput {
    CorrectLotInput {
        lot_id,
        expected_revision: 1,
        product_name: "AMP control".to_owned(),
        lot_number: lot_number.to_owned(),
        level_text: None,
        sample_label: Some("QC-LCMS-1".to_owned()),
        expires_on: "2027-12-31".to_owned(),
        reason: "Lot number typed wrong".to_owned(),
    }
}

#[tokio::test]
async fn a_lot_correction_keeps_its_history_and_shows_old_and_new_values_in_the_audit() {
    let t = TestEngine::start().await;
    t.admin_session().await;
    t.create_user("qa1", &[RoleCode::QualityManager, RoleCode::Auditor])
        .await;
    t.first_sign_in("qa1").await;
    let lot = t
        .engine
        .register_lot(RegisterLotInput {
            material_kind: MaterialKind::Control,
            product_name: "AMP control".to_owned(),
            lot_number: "LOT-TEST-3".to_owned(),
            level_text: None,
            sample_label: Some("QC-LCMS-1".to_owned()),
            expires_on: "2027-12-31".to_owned(),
        })
        .await
        .unwrap();

    let corrected = t
        .engine
        .correct_lot(correction(lot.lot_id, "LOT-TEST-4"))
        .await
        .unwrap();
    assert_eq!(
        (corrected.lot_number.as_str(), corrected.revision),
        ("LOT-TEST-4", 2)
    );

    let history = t
        .engine
        .lot_history(LotHistoryInput { lot_id: lot.lot_id })
        .await
        .unwrap();
    assert_eq!(history.len(), 2);
    assert_eq!(history[1].reason.as_deref(), Some("Lot number typed wrong"));
    assert!(history[1].recorded_by_display.is_some());

    let seq = t
        .conn()
        .query_row(
            "SELECT max(seq) FROM audit_events WHERE action = 'analytical.correct_lot'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    let changes = t
        .engine
        .get_audit_event_changes(GetAuditEventChangesInput {
            stream: AuditStream::Clinical,
            seq,
        })
        .await
        .unwrap();
    assert_eq!(changes.status, AuditChangeStatus::Changed);
    assert_eq!(changes.fields.len(), 1);
    assert_eq!(changes.fields[0].field, "Lot number");
    assert_eq!(changes.fields[0].old.as_deref(), Some("LOT-TEST-3"));
    assert_eq!(changes.fields[0].new.as_deref(), Some("LOT-TEST-4"));
}
