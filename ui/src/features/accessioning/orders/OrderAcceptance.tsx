import { useNavigate } from "react-router";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import type { AcceptanceBlocker } from "@/generated/AcceptanceBlocker";
import type { OrderDetail } from "@/generated/OrderDetail";
import styles from "../accessioning.module.css";
import type { useOrderAccessionContext } from "../useOrderAccessionContext";

/** What each engine acceptance check means, and what the person can do about it. */
const BLOCKERS: Record<AcceptanceBlocker, string> = {
  legacy_sequence_role:
    "A requested test was recorded before testing sequence roles were required. This order cannot be accepted; it can only be rejected.",
  authority_missing:
    "No signature or intent to order is recorded. Accepting now places a clarification hold instead; add the authority with Amend supplied evidence under Order changes.",
  open_clarification_hold:
    "A clarification hold is open. Resolve it under Clarification holds before accepting.",
  standing_order_expired:
    "The standing order no longer matches this patient and practitioner. Accepting now places a clarification hold instead.",
  standing_order_exhausted:
    "The standing order has no visits left. Accepting now places a clarification hold instead.",
  standing_order_out_of_scope:
    "A test is outside the standing order's scope. Accepting now places a clarification hold instead.",
};

interface OrderAcceptanceProps {
  order: OrderDetail;
  accessionContext: ReturnType<typeof useOrderAccessionContext>;
}

/**
 * Whether the order can be accepted, from the checks `accept_order` applies (REQ-ORD-001),
 * and, once accepted with nothing received yet, the next step the engine allows.
 */
export function OrderAcceptance({ order, accessionContext }: OrderAcceptanceProps) {
  const navigate = useNavigate();
  if (order.status === "received") {
    if (order.acceptanceBlockers.length > 0) {
      return (
        <Alert tone="hold" title="Not ready to accept">
          <ul className={styles.list}>
            {order.acceptanceBlockers.map((blocker) => (
              <li key={blocker}>{BLOCKERS[blocker]}</li>
            ))}
          </ul>
        </Alert>
      );
    }
    if (!order.allowedActions.includes("accept")) return null;
    return (
      <Alert tone="success" title="Ready to accept">
        Authority, clarification holds and any standing order pass the acceptance checks. Review the
        request below, then choose Accept order.
      </Alert>
    );
  }
  const context = accessionContext.data;
  const receivable =
    order.status === "accepted" &&
    !accessionContext.isError &&
    context?.accessions.length === 0 &&
    context.allowedActions.includes("create_accession");
  if (!receivable) return null;
  return (
    <Alert tone="success" title="Next step: receive specimens">
      <p>The order is accepted and no specimens have been received for it yet.</p>
      <Button variant="primary" onPress={() => navigate(`/orders/${order.orderId}/accession`)}>
        Start receiving specimens
      </Button>
    </Alert>
  );
}
