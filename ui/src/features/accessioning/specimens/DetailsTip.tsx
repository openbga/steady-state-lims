import type { ReactNode } from "react";
import { FieldTip } from "@/components/Form";
import styles from "./lookup.module.css";

/** A short note with a "?" that opens its longer explanation. The note stays on the page. */
export function DetailsTip({
  note,
  label,
  children,
}: {
  /** The short line shown on the page. */
  note: string;
  /** Names the "?" button and the popover, such as "About history order". */
  label: string;
  children: ReactNode;
}) {
  return (
    <p className={styles.note}>
      {note}
      <FieldTip label={label}>{children}</FieldTip>
    </p>
  );
}
