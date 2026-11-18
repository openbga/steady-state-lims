import { useEffect, useSyncExternalStore } from "react";
import bundle from "./changelog.json";

/**
 * The What's new list, generated with CHANGELOG.md from `changelog.d/` by
 * `scripts/changelog.py` and bundled with the app: no request leaves the computer. The
 * generator validates the entries and decides the groups and their order; this module only
 * reads them and remembers, per account on this computer, the newest entry the person has seen.
 */
type ChangeType = "added" | "changed" | "fixed" | "removed" | "deprecated" | "security";
type ChangeImpact = "high" | "medium" | "low";

export interface ChangeEntry {
  /** The entry's file name without `.md`. */
  id: string;
  /** The day the change merged, YYYY-MM-DD. */
  date: string;
  type: ChangeType;
  impact: ChangeImpact;
  title: string;
  /** The navigation area people know the change by. */
  area?: string;
  /** The application path where the change is found. */
  link?: string;
  pr?: number;
  summary: string;
  /** Details for whoever installs or integrates the app. */
  notes?: string;
}

export interface ChangeGroup {
  /** `null` for changes not yet in a release. */
  release: string | null;
  from: string;
  to: string;
  impacts: { impact: ChangeImpact; entries: ChangeEntry[] }[];
}

export const changeGroups = bundle.groups as ChangeGroup[];

export function groupEntries(groups: readonly ChangeGroup[]): ChangeEntry[] {
  return groups.flatMap((group) => group.impacts.flatMap((part) => part.entries));
}

const allEntries = groupEntries(changeGroups);

/** Orders entries by date, then file name; a later key is a newer entry. */
export function entryKey(entry: Pick<ChangeEntry, "date" | "id">): string {
  return `${entry.date} ${entry.id}`;
}

/**
 * Entries newer than the newest one seen. Without a mark nothing is unread: nothing is new to
 * someone who has not used the app on this computer before.
 */
export function isUnread(entry: ChangeEntry, seen: string | null): boolean {
  return seen !== null && entryKey(entry) > seen;
}

export function unreadCount(entries: readonly ChangeEntry[], seen: string | null): number {
  return entries.filter((entry) => isUnread(entry, seen)).length;
}

const KEY_PREFIX = "vibe-tox.whats-new-seen-v1.";
const listeners = new Set<() => void>();
// Used when this webview cannot persist the choice, so opening the list still clears it.
const remembered = new Map<string, string>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function readSeen(userId: string): string | null {
  try {
    return localStorage.getItem(KEY_PREFIX + userId) ?? remembered.get(userId) ?? null;
  } catch {
    // Preferences are optional: a damaged or unavailable store means no mark yet.
    return remembered.get(userId) ?? null;
  }
}

/** Records the newest of `entries` as seen by this account on this computer. */
export function markAllSeen(userId: string, entries: readonly ChangeEntry[]) {
  const newest = entries.map(entryKey).sort().at(-1);
  const seen = readSeen(userId);
  // An older list, such as after installing an earlier version, never moves the mark back.
  if (newest === undefined || (seen !== null && newest <= seen)) return;
  remembered.set(userId, newest);
  try {
    localStorage.setItem(KEY_PREFIX + userId, newest);
  } catch {
    // The in-memory value keeps the indicator clear for this session.
  }
  for (const listener of listeners) listener();
}

/**
 * How many bundled entries this account has not seen, kept current when the list is opened.
 * The first time the shell renders for an account on this computer, the newest entry is
 * recorded as seen, so later changes count from then.
 */
export function useUnreadCount(userId: string): number {
  const seen = useSyncExternalStore(subscribe, () => readSeen(userId));
  useEffect(() => {
    if (seen === null) markAllSeen(userId, allEntries);
  }, [userId, seen]);
  return unreadCount(allEntries, seen);
}
