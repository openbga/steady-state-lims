import { Circle, CircleCheck } from "lucide-react";
import { VisuallyHidden } from "react-aria-components";
import { Button } from "@/components/Button";
import { Section } from "@/components/Section";
import styles from "./OrderForm.module.css";
import type { OrderProgress } from "./orderProgress";

/** One line of the summary: a part of the intake and whether it is filled in. */
export interface SummaryPart {
  label: string;
  done: boolean;
}

interface OrderSummaryProps {
  parts: readonly SummaryPart[];
  /** What the main button needs, or that everything is filled in. */
  hint: string;
  /** Cancel while entering the order; Finish later once it is accepted. */
  actionLabel: string;
  onAction: () => void;
  isPending: boolean;
}

/** The order details' parts: the patient is chosen, the rest follows the form. */
export function orderParts(progress: OrderProgress): SummaryPart[] {
  return [
    { label: "Patient", done: true },
    { label: "Ordering source", done: progress.orderingSource },
    { label: "Authority to test", done: progress.authority },
    { label: "Tests", done: progress.tests },
  ];
}

/**
 * What the intake still needs before its main button works. A task position, not a statement
 * that the request is complete or valid: the engine checks it again on saving.
 */
export function OrderSummary({ parts, hint, actionLabel, onAction, isPending }: OrderSummaryProps) {
  return (
    <aside className={styles.summary} aria-label="Order summary">
      <Section title="Order summary">
        <ul className={styles.summaryList}>
          {parts.map(({ label, done }) => (
            <li key={label} data-done={done || undefined}>
              {done ? <CircleCheck aria-hidden="true" /> : <Circle aria-hidden="true" />}
              {/* The icon alone shows it; screen readers hear it before the label. */}
              <VisuallyHidden>{done ? "Done: " : "To do: "}</VisuallyHidden>
              {label}
            </li>
          ))}
        </ul>
        <p role="status" className={styles.hint}>
          {hint}
        </p>
        <Button isDisabled={isPending} onPress={onAction}>
          {actionLabel}
        </Button>
      </Section>
    </aside>
  );
}
