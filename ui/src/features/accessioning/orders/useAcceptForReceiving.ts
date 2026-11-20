import { useToast } from "@/components/Toast";
import type { AcceptOrderInput } from "@/generated/AcceptOrderInput";
import type { OrderDetail } from "@/generated/OrderDetail";
import { ORDER_ACTIONS } from "./contract";
import { useOrderCommand } from "./useOrderCommand";

interface Outcomes {
  /** The order is accepted: New order goes on to its Specimens step. */
  onAccepted: (order: OrderDetail) => void;
  /** The order is saved but not accepted: its page shows why, with its holds. */
  onNotAccepted: (order: OrderDetail) => void;
}

/**
 * Accept order and receive specimens, after the order is saved: the person's press of that
 * button is the explicit acceptance (REQ-ORD-001), recorded by `accept_order` with its own
 * audit event. The engine rechecks every gate; an order it does not offer to accept, or
 * leaves received (a failed standing-order check places a hold), opens on its page instead.
 */
export function useAcceptForReceiving({ onAccepted, onNotAccepted }: Outcomes) {
  const toast = useToast();
  const accept = useOrderCommand<AcceptOrderInput>("accept_order");
  const notAccepted = (order: OrderDetail, description: string) => {
    toast.show({ tone: "warning", title: "Order received, not accepted", description });
    onNotAccepted(order);
  };
  function acceptSaved(order: OrderDetail) {
    if (!order.allowedActions.includes(ORDER_ACTIONS.accept)) {
      notAccepted(order, "Review the order's acceptance checks on its page.");
      return;
    }
    accept.mutate(
      { input: { orderId: order.orderId, expectedRevision: order.revision } },
      {
        onSuccess: (updated) => {
          if (updated.status !== "accepted") {
            notAccepted(order, "A clarification hold was placed. See the holds on the order.");
            return;
          }
          toast.show({ tone: "success", title: "Order received and accepted" });
          onAccepted(updated);
        },
        onError: () => notAccepted(order, "Review the order and accept it on its page."),
      },
    );
  }
  return { acceptSaved, isPending: accept.isPending };
}
