import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "@/lib/test/a11y";
import { renderWithProviders } from "@/lib/test/render";
import {
  type ChangeEntry,
  changeGroups,
  entryKey,
  groupEntries,
  markAllSeen,
  readSeen,
} from "./changelog";
import { WhatsNewLink, whatsNewLabel } from "./WhatsNewLink";

const entries = groupEntries(changeGroups);
const byAge = [...entries].sort((a, b) => entryKey(a).localeCompare(entryKey(b)));
/** A synthetic entry older than every bundled one, to leave all of them unread. */
const BEFORE_ALL: ChangeEntry = {
  id: "2000-01-01-before",
  date: "2000-01-01",
  type: "added",
  impact: "low",
  title: "Before",
  summary: "Synthetic.",
};
let account = 0;
afterEach(() => localStorage.clear());

/** A fresh synthetic account per test; the in-memory fallback outlives `localStorage.clear()`. */
function newUser() {
  account += 1;
  return `00000000-0000-7000-8000-00000000c${String(account).padStart(3, "0")}`;
}

describe("WhatsNewLink", () => {
  it("names the number of new changes", () => {
    expect(whatsNewLabel(0)).toBe("What's new");
    expect(whatsNewLabel(1)).toBe("What's new: 1 new change");
    expect(whatsNewLabel(3)).toBe("What's new: 3 new changes");
  });

  it("shows no count on a first visit and records the current list as seen", async () => {
    const user = newUser();
    renderWithProviders(<WhatsNewLink userId={user} />);
    expect(screen.getByRole("link", { name: "What's new" }).textContent).toBe("What's new");
    await waitFor(() => expect(readSeen(user)).toBe(byAge.map(entryKey).at(-1)));
  });

  it("counts changes newer than the mark until the list is seen, then only the label", async () => {
    const userId = newUser();
    markAllSeen(userId, byAge.slice(0, -3));
    const { container, user } = renderWithProviders(<WhatsNewLink userId={userId} />);
    const unread = whatsNewLabel(3);
    const link = screen.getByRole("link", { name: unread });
    expect(link.getAttribute("href")).toBe("/whats-new");
    expect(link.textContent).toBe("What's new3");
    // Keyboard focus shows the tooltip at once; hover waits for react-aria's delay.
    await user.tab();
    expect(document.activeElement).toBe(link);
    expect((await screen.findByRole("tooltip")).textContent).toBe(unread);
    await expectNoA11yViolations(container);
    act(() => markAllSeen(userId, entries));
    expect(screen.getByRole("link", { name: "What's new" }).textContent).toBe("What's new");
  });

  it("shows 99+ above 99 unread changes and keeps the number in its name", () => {
    const userId = newUser();
    markAllSeen(userId, [BEFORE_ALL]);
    renderWithProviders(<WhatsNewLink userId={userId} />);
    const link = screen.getByRole("link", { name: whatsNewLabel(entries.length) });
    expect(link.textContent).toContain(entries.length > 99 ? "99+" : `${entries.length}`);
  });
});
