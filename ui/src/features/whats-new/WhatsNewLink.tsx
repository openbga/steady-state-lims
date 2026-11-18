import { Sparkles } from "lucide-react";
import { Link, Tooltip, TooltipTrigger } from "react-aria-components";
import tooltipStyles from "@/lib/cellTooltip.module.css";
import { useUnreadCount } from "./changelog";
import styles from "./WhatsNew.module.css";

const WHATS_NEW_PATH = "/whats-new";

/** Above this, the count in the top bar reads "99+"; the accessible name keeps the number. */
const MAX_SHOWN = 99;

export function whatsNewLabel(unread: number): string {
  if (unread === 0) return "What's new";
  return `What's new: ${unread} new ${unread === 1 ? "change" : "changes"}`;
}

/**
 * "What's new" in the top bar, for every signed-in person. A count shows while the list has
 * entries newer than the newest one this person has seen on this computer; opening the list
 * clears it. A person's first visit records the current list as seen, so it starts with none.
 */
export function WhatsNewLink({ userId }: { userId: string }) {
  const unread = useUnreadCount(userId);
  const label = whatsNewLabel(unread);
  const link = (
    <Link href={WHATS_NEW_PATH} aria-label={label} className={styles.link}>
      <Sparkles aria-hidden="true" />
      What's new
      {unread > 0 && (
        <span aria-hidden="true" className={styles.count}>
          {unread > MAX_SHOWN ? `${MAX_SHOWN}+` : unread}
        </span>
      )}
    </Link>
  );
  if (unread === 0) return link;
  return (
    <TooltipTrigger>
      {link}
      <Tooltip placement="bottom" className={tooltipStyles.tooltip}>
        {label}
      </Tooltip>
    </TooltipTrigger>
  );
}
