import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Toolbar } from "@/components/Toolbar";
import type { AccessionSpecimenView } from "@/generated/AccessionSpecimenView";
import { useHasCapability } from "@/lib/commands";
import { ReceiptOutcome } from "./ReceiptOutcome";

interface ReceiptStepProps {
  specimen: AccessionSpecimenView;
  /** Opens the receipt decision dialog. */
  onDecide: () => void;
}

/**
 * The receipt step of one specimen on Finish receiving (REQ-SPC-002): while no decision is
 * recorded, what is left to do and Record receipt decision; once recorded, the outcome and
 * where work continues. The decision is offered from the engine's `allowedActions`.
 */
export function ReceiptStep({ specimen, onDecide }: ReceiptStepProps) {
  const canDecide = useHasCapability("accession");
  const { acceptance, containers } = specimen;
  if (acceptance !== "received") {
    return (
      <ReceiptOutcome
        acceptance={acceptance}
        decision={specimen.decisions.at(-1)}
        material={containers.length === 1 ? (containers[0]?.labelCode ?? "") : "its containers"}
        withRuns
      />
    );
  }
  const labels = containers.map((container) => container.labelCode).join(" or ");
  const allowed = specimen.allowedActions.includes("record_receipt_decision");
  return (
    <Alert tone="info" title={`Receipt decision still needed: scan the label on ${labels}`}>
      <p>
        {canDecide
          ? "Scanning confirms the tube matches this specimen. Then choose Accept, Accept conditionally, Hold or Reject."
          : "Someone who receives specimens scans the label and records the decision."}
      </p>
      {canDecide && allowed && (
        <Toolbar>
          <Button variant="primary" onPress={onDecide}>
            Record receipt decision
          </Button>
        </Toolbar>
      )}
    </Alert>
  );
}
