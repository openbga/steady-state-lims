import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import { Dialog, DialogTrigger, Popover } from "react-aria-components";
import { Button } from "@/components/Button";
import styles from "./lookup.module.css";

/**
 * A short note with a "?" that opens its longer explanation in a popover, opened by click,
 * Enter or Space and closed with Escape. The note stays on the page; only the detail is
 * hidden until asked for.
 */
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
      <DialogTrigger>
        <Button variant="quiet" aria-label={label}>
          <CircleHelp aria-hidden="true" className={styles.tipIcon} />
        </Button>
        <Popover placement="bottom start" className={styles.tip}>
          <Dialog aria-label={label} className={styles.tipBody}>
            {children}
          </Dialog>
        </Popover>
      </DialogTrigger>
    </p>
  );
}
