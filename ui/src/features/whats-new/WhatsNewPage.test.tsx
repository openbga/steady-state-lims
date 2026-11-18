import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TEST_SESSION } from "@/features/auth/testSession";
import { expectNoA11yViolations } from "@/lib/test/a11y";
import { mockCommands } from "@/lib/test/ipc";
import { renderWithProviders } from "@/lib/test/render";
import { type ChangeGroup, readSeen } from "./changelog";
import { WhatsNewPage } from "./WhatsNewPage";

/** Synthetic entries in the generator's order: unreleased first, then by impact. */
const GROUPS: ChangeGroup[] = [
  {
    release: null,
    from: "2026-11-17",
    to: "2026-11-17",
    impacts: [
      {
        impact: "medium",
        entries: [
          {
            id: "2026-11-17-queue-filter",
            date: "2026-11-17",
            type: "changed",
            impact: "medium",
            title: "Filter work queues by area",
            area: "Work queues",
            link: "/work-queues",
            pr: 9001,
            summary: "Choose an **Area** to see only its queues.",
          },
        ],
      },
    ],
  },
  {
    release: "0.2.0",
    from: "2026-11-01",
    to: "2026-11-03",
    impacts: [
      {
        impact: "high",
        entries: [
          {
            id: "2026-11-03-run-export",
            date: "2026-11-03",
            type: "added",
            impact: "high",
            title: "Export a run as a file",
            summary: "Runs can be exported.\n\nThe file opens in a spreadsheet.",
            notes: "Migration `0042` adds a column.",
          },
        ],
      },
      {
        impact: "low",
        entries: [
          {
            id: "2026-11-01-label-fix",
            date: "2026-11-01",
            type: "fixed",
            impact: "low",
            title: "Keep the label printer choice",
            summary: "The printer stays chosen.",
          },
        ],
      },
    ],
  },
];

const STORAGE_KEY = `vibe-tox.whats-new-seen-v1.${TEST_SESSION.userId}`;

afterEach(() => localStorage.clear());

function renderPage(groups: readonly ChangeGroup[] = GROUPS) {
  mockCommands({ current_session: () => TEST_SESSION });
  return renderWithProviders(<WhatsNewPage groups={groups} />);
}

describe("WhatsNewPage", () => {
  it("lists every group with its date range, impact headings and entries in order", async () => {
    const { container } = renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "What's new" })).toBeTruthy();
    const groups = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(groups).toEqual(["Unreleased2026-11-17", "Version 0.2.02026-11-01 to 2026-11-03"]);
    const release = screen.getByRole("region", { name: /Version 0.2.0/ });
    const impacts = within(release).getAllByRole("heading", { level: 3 });
    expect(impacts.map((h) => h.textContent)).toEqual(["High impact", "Low impact"]);
    const entry = within(release).getByRole("heading", {
      level: 4,
      name: "Export a run as a file",
    });
    const item = entry.closest("li") as HTMLElement;
    expect(within(item).getByText("Added")).toBeTruthy();
    expect(within(item).getByText("2026-11-03")).toBeTruthy();
    expect(within(item).getByText("The file opens in a spreadsheet.")).toBeTruthy();
    await expectNoA11yViolations(container);
  });

  it("shows the area, pull request, marked text and a link to where the change is", () => {
    renderPage();
    const item = screen.getByRole("heading", { name: "Filter work queues by area" }).closest("li");
    const scope = within(item as HTMLElement);
    expect(scope.getByText("Work queues")).toBeTruthy();
    expect(scope.getByText("Pull request #9001")).toBeTruthy();
    expect(scope.getByText("Area").tagName).toBe("STRONG");
    const link = scope.getByRole("link", { name: "Go to the page: Filter work queues by area" });
    expect(link.getAttribute("href")).toBe("/work-queues");
  });

  it("keeps technical notes folded until opened", async () => {
    const { user } = renderPage();
    const notes = screen.getByText("Technical notes");
    expect(notes.closest("details")?.open).toBe(false);
    await user.click(notes);
    expect(notes.closest("details")?.open).toBe(true);
    expect(screen.getByText("0042").tagName).toBe("CODE");
  });

  it("marks the list as seen and badges the entries that were new on opening", async () => {
    localStorage.setItem(STORAGE_KEY, "2026-11-01 2026-11-01-label-fix");
    renderPage();
    await waitFor(() => expect(screen.getAllByText("New")).toHaveLength(2));
    expect(readSeen(TEST_SESSION.userId)).toBe("2026-11-17 2026-11-17-queue-filter");
    const fixed = screen.getByRole("heading", { name: "Keep the label printer choice" });
    expect(within(fixed.closest("li") as HTMLElement).queryByText("New")).toBeNull();
  });

  it("badges nothing on a first visit, before any change was marked as seen", async () => {
    renderPage();
    await waitFor(() => expect(readSeen(TEST_SESSION.userId)).not.toBeNull());
    expect(screen.queryByText("New")).toBeNull();
  });

  it("says when no changes are recorded", () => {
    renderPage([]);
    expect(screen.getByText("No changes are recorded yet")).toBeTruthy();
  });
});
