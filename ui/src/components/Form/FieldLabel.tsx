import { Label, VisuallyHidden } from "react-aria-components";
import styles from "./Form.module.css";

interface FieldLabelProps {
  children: string;
  isRequired?: boolean;
  /** Read by screen readers only: the field's value names it, such as "All connections". */
  isHidden?: boolean;
  /**
   * Read by screen readers only after the visible label, where the row around the field
   * shows it, such as " for SYN-SCR" after "Sequence role".
   */
  hiddenSuffix?: string | undefined;
}

/** A field's visible label, with the required marker. */
export function FieldLabel({ children, isRequired, isHidden, hiddenSuffix }: FieldLabelProps) {
  return (
    <Label className={styles.label} data-hidden={isHidden || undefined}>
      {children}
      {hiddenSuffix && <VisuallyHidden>{hiddenSuffix}</VisuallyHidden>}
      {isRequired && (
        <span className={styles.required} aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </Label>
  );
}
