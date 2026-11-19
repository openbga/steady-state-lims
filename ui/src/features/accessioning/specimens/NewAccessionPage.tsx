import { useParams } from "react-router";
import { Page, PageHeader } from "@/components/Page";
import type { OrderDetail } from "@/generated/OrderDetail";
import { useCommandQuery } from "@/lib/commands";
import { IdentityBanner } from "@/lib/IdentityBanner";
import { IntakeSteps } from "../IntakeSteps";
import { GET_ORDER } from "../orders/contract";
import { ReceiveSpecimens } from "./ReceiveSpecimens";

/** Receive material for an existing order, then verify receipt (REQ-SPC-001/002, WF-02). */
export function NewAccessionPage() {
  const { orderId = "" } = useParams();
  const order = useCommandQuery<OrderDetail>(GET_ORDER, { input: { orderId } });
  return (
    <Page>
      <PageHeader
        title="Receive specimens"
        breadcrumbs={[
          { label: "Order", href: `/orders/${orderId}` },
          { label: "Receive specimens", href: `/orders/${orderId}/accession` },
        ]}
        description="Register the material that arrived. Check labels and record acceptance next."
      />
      <IntakeSteps current="receive" />
      {order.data && <IdentityBanner subjectId={order.data.subjectId} />}
      <ReceiveSpecimens orderId={orderId} />
    </Page>
  );
}
