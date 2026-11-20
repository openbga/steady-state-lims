import { Link } from "react-router";
import { StatusBadge } from "@/components/StatusBadge";
import { Timestamp } from "@/components/Timestamp";
import type { ClientView } from "@/generated/ClientView";
import type { OrderDetail } from "@/generated/OrderDetail";
import type { PractitionerView } from "@/generated/PractitionerView";
import { useCommandQuery } from "@/lib/commands";
import { IdentityBanner } from "@/lib/IdentityBanner";
import { LIST_CLIENTS, LIST_PRACTITIONERS } from "../orders/contract";
import { orderStatus } from "../orders/labels";
import { clientById, practitionerById } from "../orders/references";

/**
 * The one summary line of Receive specimens: the patient (with the MRN and any identity hold),
 * the order by when it was received, as a link with its status, the client and its location,
 * and the ordering practitioner. No internal order ID is shown.
 */
export function ReceiveBanner({ order }: { order: OrderDetail }) {
  const clients = useCommandQuery<ClientView[]>(LIST_CLIENTS);
  const practitioners = useCommandQuery<PractitionerView[]>(LIST_PRACTITIONERS);
  const status = orderStatus(order.status);
  const references =
    clients.data && practitioners.data
      ? { clients: clients.data, practitioners: practitioners.data, orderables: [] }
      : null;
  const client = references && clientById(references, order.clientId, order.clientLocationId);
  const details = [
    {
      label: "Order",
      value: (
        <>
          <Link to={`/orders/${order.orderId}`}>
            Received <Timestamp value={order.receivedAt} />
          </Link>{" "}
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </>
      ),
    },
    ...(client
      ? [{ label: "Client", value: [client.client, client.location].filter(Boolean).join(" · ") }]
      : []),
    ...(references
      ? [
          {
            label: "Ordering practitioner",
            value: practitionerById(references, order.practitionerId),
          },
        ]
      : []),
  ];
  return <IdentityBanner subjectId={order.subjectId} details={details} />;
}
