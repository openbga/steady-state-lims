import { Check, ChevronRight } from "lucide-react";
import styles from "./IntakeSteps.module.css";

const STEPS = [
  { id: "patient", label: "Patient" },
  { id: "order", label: "Order details" },
  { id: "receive", label: "Receive specimens" },
  { id: "finish", label: "Finish receipt" },
] as const;

/**
 * Task position as a row of pills: earlier steps green with a check, the current step filled
 * with a dot, later steps outlined. Not a clinical status or an assertion that any safety
 * gate has passed. `complete` marks every step done, as Finish receipt once each specimen has
 * a receipt decision.
 */
export function IntakeSteps({
  current,
  complete = false,
}: {
  current: (typeof STEPS)[number]["id"];
  complete?: boolean;
}) {
  const position = complete ? STEPS.length : STEPS.findIndex((step) => step.id === current);
  return (
    <ol className={styles.steps} aria-label="Intake progress">
      {STEPS.map((step, index) => (
        <li
          key={step.id}
          className={styles.step}
          aria-current={index === position ? "step" : undefined}
          data-done={index < position || undefined}
        >
          {index > 0 && <ChevronRight aria-hidden="true" className={styles.separator} />}
          <span className={styles.pill}>
            {index < position && <Check aria-hidden="true" className={styles.check} />}
            {index === position && <span aria-hidden="true" className={styles.dot} />}
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
