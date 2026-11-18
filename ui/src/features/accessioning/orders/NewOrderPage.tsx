import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Page, PageHeader } from "@/components/Page";
import { IdentityBanner } from "@/lib/IdentityBanner";
import { IntakeSteps } from "../IntakeSteps";
import { newOrderPath } from "../subjects";
import { OrderForm } from "./OrderForm";
import { OrderReferencesGate } from "./OrderReferencesGate";
import { PatientStep } from "./PatientStep";
import type { OrderReferences } from "./references";

/**
 * Order entry for one patient (REQ-ORD-001, REQ-ORD-005, REQ-ORD-007), for people with
 * `enter_orders`. The first step chooses the patient; a patient chosen elsewhere starts at the
 * order details.
 */
export function NewOrderPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const subjectId = params.get("subjectId");
  return (
    <Page>
      <PageHeader
        title="New order"
        breadcrumbs={[
          { label: "Orders", href: "/orders" },
          { label: "New order", href: "/orders/new" },
        ]}
        description="Choose the patient, then record the request as supplied by the ordering source."
        actions={
          subjectId && <Button onPress={() => navigate("/orders/new")}>Change patient</Button>
        }
      />
      <IntakeSteps current={subjectId ? "order" : "patient"} />
      {subjectId ? (
        <>
          <IdentityBanner subjectId={subjectId} />
          <OrderReferencesGate>
            {(references) => <OrderEntry subjectId={subjectId} references={references} />}
          </OrderReferencesGate>
        </>
      ) : (
        <PatientStep onChoose={(id) => navigate(newOrderPath(id))} />
      )}
    </Page>
  );
}

function OrderEntry({ subjectId, references }: { subjectId: string; references: OrderReferences }) {
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
  return <OrderForm subjectId={subjectId} references={references} />;
}
