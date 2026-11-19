import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { EmptyState } from "@/components/EmptyState";
import { Page, PageHeader } from "@/components/Page";
import type { OrderDetail } from "@/generated/OrderDetail";
import { IdentityBanner } from "@/lib/IdentityBanner";
import { IntakeSteps } from "../IntakeSteps";
import { ReceiveSpecimens } from "../specimens/ReceiveSpecimens";
import { newOrderPath } from "../subjects";
import { OrderForm } from "./OrderForm";
import { OrderReferencesGate } from "./OrderReferencesGate";
import { PatientStep } from "./PatientStep";
import type { OrderReferences } from "./references";

/**
 * Order entry for one patient (REQ-ORD-001, REQ-ORD-005, REQ-ORD-007), for people with
 * `enter_orders`. The first step chooses the patient; a patient chosen elsewhere starts at the
 * order details. For people who receive specimens, Accept order and receive specimens goes on,
 * on the same page, to the accepted order's Specimens step (REQ-SPC-001); saving it opens
 * Finish receiving.
 */
export function NewOrderPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const subjectId = params.get("subjectId");
  const [accepted, setAccepted] = useState<OrderDetail | null>(null);
  return (
    <Page>
      <PageHeader
        title="New order"
        breadcrumbs={[
          { label: "Orders", href: "/orders" },
          { label: "New order", href: "/orders/new" },
        ]}
      />
      <IntakeSteps current={accepted ? "receive" : subjectId ? "order" : "patient"} />
      {subjectId ? (
        <>
          <IdentityBanner
            subjectId={subjectId}
            action={accepted ? undefined : <Link to="/orders/new">Change patient</Link>}
          />
          {accepted ? (
            <ReceiveSpecimens orderId={accepted.orderId} inOrder />
          ) : (
            <OrderReferencesGate>
              {(references) => (
                <OrderEntry
                  subjectId={subjectId}
                  references={references}
                  onAccepted={setAccepted}
                />
              )}
            </OrderReferencesGate>
          )}
        </>
      ) : (
        <PatientStep onChoose={(id) => navigate(newOrderPath(id))} />
      )}
    </Page>
  );
}

function OrderEntry({
  subjectId,
  references,
  onAccepted,
}: {
  subjectId: string;
  references: OrderReferences;
  onAccepted: (order: OrderDetail) => void;
}) {
  if (references.clients.length === 0 || references.practitioners.length === 0) {
    return (
      <EmptyState
        title="No clients or practitioners are set up"
        description="An administrator adds ordering clients and practitioners before orders can be entered."
      />
    );
  }
  if (references.orderables.length === 0) {
    return (
      <EmptyState
        title="No tests can be ordered"
        description="The catalog has no approved tests yet."
      />
    );
  }
  return <OrderForm subjectId={subjectId} references={references} onAccepted={onAccepted} />;
}
