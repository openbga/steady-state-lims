//! The order read names what acceptance would refuse or turn into a hold (REQ-ORD-001).
use lis_orders::AcceptanceBlocker;

use super::*;

fn accept(fixture: &Fixture, order: &lis_orders::OrderDetail) -> lis_orders::OrderDetail {
    let input = AcceptOrderInput {
        order_id: order.order_id,
        expected_revision: order.revision,
    };
    fixture.write(move |ctx| accept_order(ctx, input)).unwrap()
}

#[test]
fn a_complete_order_has_no_blockers_before_or_after_acceptance() {
    let fixture = Fixture::open();
    let received = fixture.register(None);
    assert!(received.acceptance_blockers.is_empty());
    let accepted = accept(&fixture, &received);
    assert_eq!(accepted.status, lis_orders::OrderStatus::Accepted);
    assert!(accepted.acceptance_blockers.is_empty());
}

#[test]
fn missing_authority_is_named_and_then_its_hold() {
    let fixture = Fixture::open();
    let mut input = fixture.registration_input(None, ReflexAuthorization::Authorized);
    input.evidence.authority = AuthorityEvidenceInput {
        kind: AuthorityEvidenceKind::NotSupplied,
        document_ref: None,
    };
    let received = fixture
        .write(move |ctx| register_order(ctx, input))
        .unwrap();
    assert_eq!(
        received.acceptance_blockers,
        vec![AcceptanceBlocker::AuthorityMissing]
    );
    let held = accept(&fixture, &received);
    assert_eq!(held.status, lis_orders::OrderStatus::Received);
    assert_eq!(
        held.acceptance_blockers,
        vec![
            AcceptanceBlocker::AuthorityMissing,
            AcceptanceBlocker::OpenClarificationHold
        ]
    );
}

#[test]
fn an_open_hold_is_named() {
    let fixture = Fixture::open();
    let received = fixture.register(None);
    let held = fixture
        .write(move |ctx| {
            place_clarification_hold(
                ctx,
                PlaceClarificationHoldInput {
                    order_id: received.order_id,
                    expected_revision: received.revision,
                    deficiency: ClarificationDeficiency::RequestorMissing,
                    note: None,
                },
            )
        })
        .unwrap();
    assert_eq!(
        held.acceptance_blockers,
        vec![AcceptanceBlocker::OpenClarificationHold]
    );
}

#[test]
fn an_exhausted_standing_order_is_named_before_acceptance() {
    let fixture = Fixture::open();
    let standing = register_standing(&fixture, vec![fixture.orderable_id], Some(1));
    let first = fixture.register(Some(standing.standing_order_id));
    assert!(first.acceptance_blockers.is_empty());
    accept(&fixture, &first);
    let second = fixture.register(Some(standing.standing_order_id));
    assert_eq!(
        second.acceptance_blockers,
        vec![AcceptanceBlocker::StandingOrderExhausted]
    );
}

#[test]
fn rejected_orders_have_no_blockers() {
    let fixture = Fixture::open();
    let received = fixture.register(None);
    let rejected = fixture
        .write(move |ctx| {
            reject_order(
                ctx,
                RejectOrderInput {
                    order_id: received.order_id,
                    expected_revision: received.revision,
                    reason: "Synthetic rejection".to_owned(),
                },
            )
        })
        .unwrap();
    assert!(rejected.acceptance_blockers.is_empty());
}
