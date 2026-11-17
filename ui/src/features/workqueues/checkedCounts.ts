import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { WorkQueueItem } from "./contract";

/** What a queue the summary does not count held when it was last opened (ticket #4776). */
export interface CheckedCount {
  count: number;
  /** The scan stopped before the end: more items may wait. */
  capped: boolean;
  oldestSince: string | null;
  /** When the opened queue's items were read, as an ISO time. */
  checkedAt: string;
}

type CheckedCounts = Readonly<Record<string, CheckedCount>>;

/**
 * Kept in the query cache, not the engine: a sign-out or lock clears it with every other
 * cached result, and Work queues' Refresh clears it.
 */
const CHECKED_KEY = ["work-queues", "checked-counts"];

/** The counts found by opening uncounted queues, and how to forget them on Refresh. */
export function useCheckedCounts() {
  const client = useQueryClient();
  const checked = useQuery<CheckedCounts>({
    queryKey: CHECKED_KEY,
    queryFn: () => ({}),
    initialData: {},
    enabled: false,
    gcTime: Number.POSITIVE_INFINITY,
  });
  return { counts: checked.data, clear: () => client.setQueryData(CHECKED_KEY, {}) };
}

interface ScanState {
  data?: unknown;
  rows: readonly WorkQueueItem[];
  isFetching: boolean;
  scanning: boolean;
  hasNextPage: boolean;
  dataUpdatedAt: number;
}

/**
 * Records what an opened queue holds once its scan stops, for a queue whose summary count is
 * unknown: finished (an exact count) or paused with more to check (a lower bound).
 */
export function useRecordCheckedCount(queue: string, uncounted: boolean, items: ScanState) {
  const client = useQueryClient();
  const settled = uncounted && items.data !== undefined && !items.isFetching && !items.scanning;
  const { hasNextPage, dataUpdatedAt } = items;
  const count = items.rows.length;
  const oldestSince = items.rows.reduce<string | null>(
    (min, row) => (min === null || row.since < min ? row.since : min),
    null,
  );
  useEffect(() => {
    if (!settled) return;
    const entry: CheckedCount = {
      count,
      capped: hasNextPage,
      oldestSince,
      checkedAt: new Date(dataUpdatedAt).toISOString(),
    };
    client.setQueryData<CheckedCounts>(CHECKED_KEY, (last) => ({ ...last, [queue]: entry }));
  }, [client, queue, settled, count, hasNextPage, oldestSince, dataUpdatedAt]);
}
