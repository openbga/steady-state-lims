import type { WorkQueueArea } from "@/generated/WorkQueueArea";
import { AREAS } from "./areas";
import type { CheckedCount } from "./checkedCounts";
import type { WorkQueueSummary } from "./contract";

/** A queue as Work queues lists it: the engine's summary and, if opened uncounted, its check. */
export type QueueRow = WorkQueueSummary & { checked?: CheckedCount };

/**
 * Queues whose work is done on another screen open there: incomplete intake opens filtered on
 * the intake awaiting verified identity (ticket #4773).
 */
const QUEUE_SCREENS: Readonly<Record<string, string>> = {
  incomplete_intake: "/patients/incomplete-intake?show=awaiting",
};

export const queuePath = (row: WorkQueueSummary) =>
  QUEUE_SCREENS[row.queue] ?? `/work-queues/${row.queue}`;

/** Empty by the engine's count only: a queue not counted yet may have work, so it stays. */
const isEmpty = (row: WorkQueueSummary) => row.count === 0;

interface QueueView {
  /** The queues shown, in the engine's order; the grid sorts them. */
  shown: QueueRow[];
  /** Empty queues in the chosen areas: what "Show empty queues" adds. */
  empty: number;
  /** How many queues each area would show, and all areas together. */
  counts: Record<WorkQueueArea, number>;
  total: number;
}

/**
 * Filters the queues by the chosen areas (none means all) and hides the empty ones unless
 * asked; the counts beside each area follow the empty-queue choice (ticket #4776).
 */
export function queueView(
  rows: readonly WorkQueueSummary[],
  checked: Readonly<Record<string, CheckedCount>>,
  areas: readonly WorkQueueArea[],
  showEmpty: boolean,
): QueueView {
  const listed = rows.filter((row) => showEmpty || !isEmpty(row));
  const inAreas = (row: WorkQueueSummary) => areas.length === 0 || areas.includes(row.area);
  const counts = Object.fromEntries(
    AREAS.map((area) => [area.id, listed.filter((row) => row.area === area.id).length]),
  ) as Record<WorkQueueArea, number>;
  return {
    shown: listed.filter(inAreas).map((row) => {
      const check = row.count === null ? checked[row.queue] : undefined;
      return check ? { ...row, checked: check } : row;
    }),
    empty: rows.filter((row) => inAreas(row) && isEmpty(row)).length,
    counts,
    total: listed.length,
  };
}
