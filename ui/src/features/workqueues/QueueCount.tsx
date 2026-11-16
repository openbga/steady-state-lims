import { useRef } from "react";
import { Tooltip, TooltipTriggerStateContext, VisuallyHidden } from "react-aria-components";
import tooltipStyles from "@/lib/cellTooltip.module.css";
import { useFormatTime } from "@/lib/format";
import { useCellTooltip } from "@/lib/useCellTooltip";
import type { CheckedCount } from "./checkedCounts";
import type { WorkQueueSummary } from "./contract";

const NOT_COUNTED = "Not counted yet";
const NOT_COUNTED_WHY =
  "This queue looks through the whole result history, so it is checked only when you open it.";

const countText = (count: number, capped: boolean) => (capped ? `${count} or more` : `${count}`);

/** "Not counted yet", with why on hover or when its cell has focus. */
function NotCounted() {
  const ref = useRef<HTMLSpanElement>(null);
  const state = useCellTooltip(ref);
  return (
    <>
      <span
        ref={ref}
        aria-hidden="true"
        className={tooltipStyles.trigger}
        onPointerEnter={() => state.open()}
        onPointerLeave={() => state.close()}
      >
        {NOT_COUNTED}
      </span>
      <VisuallyHidden>{`${NOT_COUNTED}. ${NOT_COUNTED_WHY}`}</VisuallyHidden>
      <TooltipTriggerStateContext.Provider value={state}>
        <Tooltip triggerRef={ref} placement="bottom end" className={tooltipStyles.tooltip}>
          {NOT_COUNTED_WHY}
        </Tooltip>
      </TooltipTriggerStateContext.Provider>
    </>
  );
}

/**
 * A queue's count: the engine's, or for a queue the summary does not count, what it held when
 * last opened ("0 · checked 14:25 UTC") until Refresh, else "Not counted yet" (ticket #4776).
 */
export function QueueCount({ row, checked }: { row: WorkQueueSummary; checked?: CheckedCount }) {
  const formatTime = useFormatTime();
  if (row.count !== null) return countText(row.count, row.countCapped);
  if (!checked) return <NotCounted />;
  const at = formatTime(checked.checkedAt, { today: new Date() });
  return `${countText(checked.count, checked.capped)} · checked ${at}`;
}
