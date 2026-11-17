import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type ChangeEntry,
  changeGroups,
  entryKey,
  groupEntries,
  isUnread,
  markAllSeen,
  readSeen,
  unreadCount,
} from "./changelog";

function entry(id: string, date: string): ChangeEntry {
  return { id, date, type: "added", impact: "low", title: id, summary: "Synthetic." };
}

const OLDER = entry("2026-11-01-older", "2026-11-01");
const SAME_DAY = entry("2026-11-02-alpha", "2026-11-02");
const NEWEST = entry("2026-11-02-beta", "2026-11-02");
const ENTRIES = [OLDER, SAME_DAY, NEWEST];

afterEach(() => localStorage.clear());

describe("unread changes", () => {
  it("counts nothing as unread before a mark exists", () => {
    expect(unreadCount(ENTRIES, null)).toBe(0);
    expect(isUnread(NEWEST, null)).toBe(false);
  });

  it("counts entries newer than the newest seen, by date and then file name", () => {
    expect(unreadCount(ENTRIES, entryKey(OLDER))).toBe(2);
    expect(unreadCount(ENTRIES, entryKey(SAME_DAY))).toBe(1);
    expect(unreadCount(ENTRIES, entryKey(NEWEST))).toBe(0);
    expect(isUnread(OLDER, entryKey(NEWEST))).toBe(false);
  });

  it("remembers the newest entry seen for each account separately", () => {
    markAllSeen("user-a", ENTRIES);
    expect(readSeen("user-a")).toBe(entryKey(NEWEST));
    expect(readSeen("user-b")).toBeNull();
    // Opening an older list never moves the mark back.
    markAllSeen("user-a", [OLDER]);
    expect(readSeen("user-a")).toBe(entryKey(NEWEST));
  });

  it("still clears the indicator for this session when the browser store refuses writes", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    markAllSeen("user-c", ENTRIES);
    expect(readSeen("user-c")).toBe(entryKey(NEWEST));
  });

  it("ignores an empty list", () => {
    markAllSeen("user-d", []);
    expect(readSeen("user-d")).toBeNull();
  });
});

describe("bundled list", () => {
  it("ships the generated entries with titles and summaries", () => {
    const entries = groupEntries(changeGroups);
    expect(entries.length).toBeGreaterThan(0);
    for (const each of entries) {
      expect(each.title.trim()).not.toBe("");
      expect(each.summary.trim()).not.toBe("");
    }
  });
});
