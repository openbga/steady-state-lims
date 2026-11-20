import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/Button";
import { Timestamp } from "@/components/Timestamp";
import type { AccessionSpecimenView } from "@/generated/AccessionSpecimenView";
import { useHasCapability } from "@/lib/commands";
import { usePersonText } from "@/lib/person";
import { acceptanceStatus } from "./labels";
import { outcomeText, RUNS_PATH, WORKLIST_PATH } from "./ReceiptOutcome";
import styles from "./receiving.module.css";

interface ReceiptStepProps {
  specimen: AccessionSpecimenView;
  /** Opens the receipt decision dialog. */
  onDecide: () => void;
  /** Opens Print labels for the specimen's containers; omitted when none can be printed. */
  onPrint?: (() => void) | undefined;
}

/**
 * The next step of one specimen on Finish receiving (REQ-SPC-002), as one box: while no
 * decision is recorded, the label to scan and Record receipt decision; once recorded, the
 * outcome, who recorded it, and where work continues. The decision is offered from the
 * engine's `allowedActions`.
 */
export function ReceiptStep({ specimen, onDecide, onPrint }: ReceiptStepProps) {
  const canDecide = useHasCapability("accession");
  const { acceptance, containers } = specimen;
  const labels = containers.map((container) => container.labelCode);
  const print = onPrint && <Button onPress={onPrint}>Print labels</Button>;
  if (acceptance !== "received") {
    return <DecidedStep specimen={specimen} labels={labels} print={print} />;
  }
  const allowed = canDecide && specimen.allowedActions.includes("record_receipt_decision");
  return (
    <div className={styles.nextStep} data-tone="info">
      <span aria-hidden="true" className={styles.stepMarker}>
        1
      </span>
      <div className={styles.nextText}>
        <p className={styles.nextTitle}>
          Scan the label on container{" "}
          {labels.map((label, index) => (
            <span key={label}>
              {index > 0 && " or "}
              <code className={styles.labelCode}>{label}</code>
            </span>
          ))}
        </p>
        <p className={styles.nextHint}>
          {canDecide
            ? "This confirms the tube matches this specimen. Then choose Accept, Accept conditionally, Hold or Reject."
            : "Someone who receives specimens scans the label and records the decision."}
        </p>
      </div>
      <div className={styles.nextActions}>
        {allowed && (
          <Button variant="primary" onPress={onDecide}>
            Record receipt decision
          </Button>
        )}
        {print}
      </div>
    </div>
  );
}

const TONES = {
  accepted: "success",
  accepted_conditionally: "success",
  held: "hold",
  rejected: "neutral",
} as const;

function DecidedStep({
  specimen,
  labels,
  print,
}: {
  specimen: AccessionSpecimenView;
  labels: readonly string[];
  print: ReactNode;
}) {
  const navigate = useNavigate();
  const person = usePersonText();
  const bench = useHasCapability("perform_analysis");
  const acceptance = specimen.acceptance === "received" ? "accepted" : specimen.acceptance;
  const decision = specimen.decisions.at(-1);
  const material = labels.length === 1 ? (labels[0] ?? "") : "its containers";
  const accepted = TONES[acceptance] === "success";
  return (
    <div className={styles.nextStep} data-tone={TONES[acceptance]}>
      {accepted && (
        <span aria-hidden="true" className={styles.stepMarker}>
          <Check />
        </span>
      )}
      <div className={styles.nextText}>
        <p className={styles.nextTitle}>
          {accepted
            ? `Receipt finished. Next: put ${material} on a run.`
            : `Receipt decision recorded: ${acceptanceStatus(acceptance).label.toLowerCase()}.`}
        </p>
        <p className={styles.nextHint}>
          {!accepted && `${outcomeText(acceptance, material)} `}
          {decision && (
            <>
              {acceptanceStatus(acceptance).label} by{" "}
              {person(decision.decidedBy, decision.decidedByDisplay)},{" "}
              <Timestamp value={decision.decidedAt} />.
            </>
          )}
        </p>
      </div>
      <div className={styles.nextActions}>
        {accepted && bench && (
          <>
            <Button variant="primary" onPress={() => navigate(WORKLIST_PATH)}>
              Go to Worklist
            </Button>
            <Button onPress={() => navigate(RUNS_PATH)}>Runs</Button>
          </>
        )}
        {print}
      </div>
    </div>
  );
}
