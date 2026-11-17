import { useRef } from "react";
import { Tooltip, TooltipTriggerStateContext, VisuallyHidden } from "react-aria-components";
import type { OrderSummary } from "@/generated/OrderSummary";
import tooltipStyles from "@/lib/cellTooltip.module.css";
import { useCellTooltip } from "@/lib/useCellTooltip";
import styles from "./OrderedTests.module.css";

/** The tooltip title: "1 test ordered", "4 tests ordered". */
const testsOrdered = (count: number) => `${count} ${count === 1 ? "test" : "tests"} ordered`;

/**
 * The order's test count, marked as hoverable; hovering it or focusing its cell lists the
 * ordered tests, one per line with name and code (#4747). Screen readers hear the list
 * with the cell.
 */
export function OrderedTests({ order }: { order: OrderSummary }) {
  const ref = useRef<HTMLSpanElement>(null);
  const state = useCellTooltip(ref);
  const title = testsOrdered(order.itemCount);
  const tests = order.orderedTests.map((test) => `${test.name} (${test.code})`);
  return (
    <>
      <span
        ref={ref}
        aria-hidden="true"
        className={tooltipStyles.trigger}
        onPointerEnter={() => state.open()}
        onPointerLeave={() => state.close()}
      >
        {order.itemCount}
      </span>
      <VisuallyHidden>{`${title}: ${tests.join("; ")}`}</VisuallyHidden>
      <TooltipTriggerStateContext.Provider value={state}>
        <Tooltip triggerRef={ref} placement="bottom end" className={tooltipStyles.tooltip}>
          <div className={styles.title}>{title}</div>
          <ul className={styles.tests}>
            {tests.map((test, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: an order can list a test twice; the list is fixed while shown.
              <li key={index}>{test}</li>
            ))}
          </ul>
        </Tooltip>
      </TooltipTriggerStateContext.Provider>
    </>
  );
}
