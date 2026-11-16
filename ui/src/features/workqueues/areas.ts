import { useMemo, useState } from "react";
import type { SessionInfo } from "@/generated/SessionInfo";
import type { WorkQueueArea } from "@/generated/WorkQueueArea";
import { CURRENT_SESSION, useCommandQuery } from "@/lib/commands";

/** The work areas, in the navigation's order, with the navigation's headings. */
export const AREAS: readonly { id: WorkQueueArea; label: string }[] = [
  { id: "front_desk", label: "Front desk" },
  { id: "bench", label: "Bench" },
  { id: "review", label: "Review" },
  { id: "reports", label: "Reports" },
  { id: "billing", label: "Billing" },
  { id: "system", label: "System" },
];

export const areaLabel = (area: WorkQueueArea) =>
  AREAS.find((each) => each.id === area)?.label ?? area;

const KEY_PREFIX = "vibe-tox.work-queue-areas-v1.";

function readAreas(userId: string): WorkQueueArea[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY_PREFIX + userId) ?? "[]");
    if (!Array.isArray(saved)) return [];
    // Kept in the list's order; unknown codes from another version are dropped.
    return AREAS.filter((area) => saved.includes(area.id)).map((area) => area.id);
  } catch {
    // Preferences are optional: a damaged or unavailable store means every area.
    return [];
  }
}

/**
 * The areas whose queues Work queues shows (ticket #4776), remembered on this computer for
 * each account. None chosen means every area.
 */
export function useAreaChoice() {
  const userId = useCommandQuery<SessionInfo | null>(CURRENT_SESSION).data?.userId;
  const [picked, setPicked] = useState<WorkQueueArea[] | undefined>();
  // Read once per account, so the list's rows stay the same array between renders.
  const stored = useMemo(() => (userId ? readAreas(userId) : []), [userId]);
  const areas = picked ?? stored;
  function choose(next: WorkQueueArea[]) {
    const ordered = AREAS.filter((area) => next.includes(area.id)).map((area) => area.id);
    setPicked(ordered);
    if (!userId) return;
    try {
      localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(ordered));
    } catch {
      // Continue with the in-memory choice when this webview cannot persist it.
    }
  }
  return [areas, choose] as const;
}
