import { useNavigate } from "react-router";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Timestamp } from "@/components/Timestamp";
import { Toolbar } from "@/components/Toolbar";
import type { ReceiptDecisionView } from "@/generated/ReceiptDecisionView";
import type { SpecimenAcceptance } from "@/generated/SpecimenAcceptance";
import { useHasCapability } from "@/lib/commands";
import { usePersonText } from "@/lib/person";
import { acceptanceStatus } from "./labels";
import styles from "./receiving.module.css";

type Decided = Exclude<SpecimenAcceptance, "received">;

/** Bench › Worklist and Bench › Runs (`app/navigation.ts`). */
export const WORKLIST_PATH = "/bench/worklist";
export const RUNS_PATH = "/bench/runs";

/**
 * What a recorded decision means for the material. Acceptance finishes receipt, but it is not
 * readiness for testing: the Worklist lists a container only once its holds, receipt
 * chronology and order checks allow a run (`lis_specimens::testing_gate`).
 */
const OUTCOMES: Record<Decided, { tone: "success" | "hold" | "info"; title: string }> = {
  accepted: { tone: "success", title: "Receipt finished. Work continues in the Worklist." },
  accepted_conditionally: {
    tone: "success",
    title: "Receipt finished. Work continues in the Worklist.",
  },
  held: { tone: "hold", title: "Receipt decision recorded: held." },
  rejected: { tone: "info", title: "Receipt decision recorded: rejected." },
};

export function outcomeText(acceptance: Decided, material: string): string {
  if (acceptance === "held") return "Held specimens need review under laboratory policy.";
  if (acceptance === "rejected") {
    return "The specimen will not be tested. Its containers and the decision are kept.";
  }
  return `The Worklist lists ${material} once its holds and order checks allow a run.`;
}

interface ReceiptOutcomeProps {
  acceptance: Decided;
  /** The latest decision, to say who recorded it and when; omitted when not loaded. */
  decision?: ReceiptDecisionView | undefined;
  /** How the text names the material, such as "C00000001" or "its containers". */
  material: string;
}

/**
 * A recorded receipt decision and where work goes next. The Worklist button is offered
 * to people who may open it (`perform_analysis`).
 */
export function ReceiptOutcome({ acceptance, decision, material }: ReceiptOutcomeProps) {
  const navigate = useNavigate();
  const person = usePersonText();
  const bench = useHasCapability("perform_analysis");
  const outcome = OUTCOMES[acceptance];
  const accepted = acceptance === "accepted" || acceptance === "accepted_conditionally";
  return (
    <Alert tone={outcome.tone} title={outcome.title}>
      <p>
        {outcomeText(acceptance, material)}{" "}
        {decision && (
          <>
            {acceptanceStatus(acceptance).label} by{" "}
            {person(decision.decidedBy, decision.decidedByDisplay)},{" "}
            <Timestamp value={decision.decidedAt} />.
          </>
        )}
      </p>
      {accepted && bench && (
        <div className={styles.noticeActions}>
          <Toolbar>
            <Button variant="primary" onPress={() => navigate(WORKLIST_PATH)}>
              Go to Worklist
            </Button>
          </Toolbar>
        </div>
      )}
    </Alert>
  );
}
