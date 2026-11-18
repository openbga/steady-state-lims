import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import { Dialog, DialogTrigger, Popover } from "react-aria-components";
import { Button } from "@/components/Button";
import styles from "./Form.module.css";

/**
 * A "?" that opens a longer explanation in a popover, opened by click, Enter or Space and
 * closed with Escape. Beside a field's label or a short note; the explanation stays hidden
 * until asked for.
 */
export function FieldTip({
  label,
  children,
}: {
  /** Names the "?" button and the popover, such as "About billing responsibility". */
  label: string;
  children: ReactNode;
}) {
  return (
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
  );
}
