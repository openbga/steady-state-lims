import { useEffect, useRef } from "react";
import stepStyles from "../IntakeSteps.module.css";
import styles from "./OrderForm.module.css";
import type { OrderStep } from "./orderProgress";

const STEPS: { id: OrderStep; label: string }[] = [
  { id: "requisition", label: "Requisition" },
  { id: "tests", label: "Tests" },
];

/**
 * Where order details stand: step 1 of 2, Requisition, or step 2, Tests. Focus moves here when
 * the step changes, so the new step is read from its start.
 */
export function OrderSteps({ step }: { step: OrderStep }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef(step);
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    heading.current?.focus();
  }, [step]);
  const index = STEPS.findIndex((each) => each.id === step);
  return (
    <div className={styles.steps}>
      <h2 ref={heading} tabIndex={-1} className={styles.stepTitle}>
        {`Order details · step ${index + 1} of ${STEPS.length}: ${STEPS[index]?.label}`}
      </h2>
      <ol className={stepStyles.steps} aria-label="Order details steps">
        {STEPS.map((each, position) => (
          <li
            key={each.id}
            className={stepStyles.step}
            aria-current={each.id === step ? "step" : undefined}
          >
            <span className={stepStyles.number} aria-hidden="true">
              {position + 1}
            </span>
            {each.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
