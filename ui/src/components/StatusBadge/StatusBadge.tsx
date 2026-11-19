import { type Tone, toneIcons } from "@/components/tones";
import styles from "./StatusBadge.module.css";

/** `tint` shows a danger or hold tone as a tint with a border instead of solid. */
export type BadgeVariant = "tint";

interface StatusBadgeProps {
  tone: Tone;
  /** For a danger or hold state that needs no action now, such as a withdrawn report. */
  variant?: BadgeVariant;
  /** The status in words; required, because color alone never carries status. */
  children: string;
}

/** A compact status label. Callers map their states to a tone; this only displays it. */
export function StatusBadge({ tone, variant, children }: StatusBadgeProps) {
  const Icon = toneIcons[tone];
  return (
    <span className={styles.badge} data-tone={tone} data-variant={variant}>
      <Icon aria-hidden="true" className={styles.icon} />
      {children}
    </span>
  );
}
