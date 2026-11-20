import type { ReactNode, Ref } from "react";
import { Button as AriaButton } from "react-aria-components";
import styles from "./Button.module.css";

interface ButtonProps {
  children: ReactNode;
  /**
   * `primary` for the main action of a view, `danger` for destructive actions, `link` for an
   * action that opens something in place (a dialog) where the screen shows links beside it.
   */
  variant?: "primary" | "secondary" | "danger" | "quiet" | "link";
  type?: "button" | "submit";
  isDisabled?: boolean;
  /** Shows the action as running and blocks repeated presses. */
  isPending?: boolean;
  autoFocus?: boolean;
  onPress?: () => void;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant = "secondary", type = "button", children, ...rest }: ButtonProps) {
  return (
    <AriaButton {...rest} type={type} className={styles.button} data-variant={variant}>
      {children}
    </AriaButton>
  );
}
