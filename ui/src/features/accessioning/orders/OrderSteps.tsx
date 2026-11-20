import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { VisuallyHidden } from "react-aria-components";
import styles from "./OrderForm.module.css";
import type { OrderStep } from "./orderProgress";

const STEPS: { id: OrderStep; label: string }[] = [
  { id: "requisition", label: "Requisition" },
  { id: "tests", label: "Tests" },
];

/**
 * Where order details stand, as in the paper requisition: "Order details · step 1 of 2" above a
 * bar with Requisition on the left, a line, and Tests on the right. A finished step shows a
 * check. Focus moves to the heading when the step changes, so the new step is read from its
 * start; the heading also names the step for screen readers.
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
        {`Order details · step ${index + 1} of ${STEPS.length}`}
        <VisuallyHidden elementType="span">{`: ${STEPS[index]?.label}`}</VisuallyHidden>
      </h2>
      <ol className={styles.stepBar} aria-label="Order details steps">
        {STEPS.map((each, position) => (
          <li
            key={each.id}
            className={styles.step}
            aria-current={each.id === step ? "step" : undefined}
            data-done={position < index || undefined}
          >
            <span className={styles.stepNumber} aria-hidden="true">
              {position < index ? <Check size={14} /> : position + 1}
            </span>
            {each.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
