import { Circle, CircleCheck } from "lucide-react";
import { Button } from "@/components/Button";
import { Section } from "@/components/Section";
import styles from "./OrderForm.module.css";
import { isComplete, type OrderProgress } from "./orderProgress";

interface OrderSummaryProps {
  progress: OrderProgress;
  onCancel: () => void;
  isPending: boolean;
}

/**
 * What the order still needs before Save order works. A task position, not a statement that
 * the request is complete or valid: the engine checks it again when the order is saved.
 */
export function OrderSummary({ progress, onCancel, isPending }: OrderSummaryProps) {
  const parts = [
    { label: "Patient", done: true },
    { label: "Ordering source", done: progress.orderingSource },
    { label: "Authority to test", done: progress.authority },
    { label: "Tests", done: progress.tests },
  ];
  return (
    <aside className={styles.summary} aria-label="Order summary">
      <Section title="Order summary">
        <ul className={styles.summaryList}>
          {parts.map(({ label, done }) => (
            <li key={label} data-done={done || undefined}>
              {done ? <CircleCheck aria-hidden="true" /> : <Circle aria-hidden="true" />}
              {label}
              <span className={styles.summaryState}>{done ? "Done" : "To do"}</span>
            </li>
          ))}
        </ul>
        <p role="status" className={styles.hint}>
          {isComplete(progress)
            ? "All required fields are filled in."
            : "Save order works once the required fields are filled in."}
        </p>
        <Button isDisabled={isPending} onPress={onCancel}>
          Cancel
        </Button>
      </Section>
    </aside>
  );
}
