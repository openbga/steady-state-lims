import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESSION_ID, container, SUMMARY } from "@/features/accessioning/testData";
import { TEST_SESSION } from "@/features/auth/testSession";
import type { SessionInfo } from "@/generated/SessionInfo";
import { mockGridLayout } from "@/lib/test/layout";
import { renderApp } from "./frameTestData";

/** How long the first render of a lazily loaded page may take under a busy test run. */
const LAZY_PAGE_MS = 10_000;

const HISTORY = {
  moves: [],
  holds: [],
  disposal: null,
  depletion: null,
  hasMore: false,
  snapshot: { maxMoveRowId: "0", maxHoldRowId: "0" },
  totals: { moves: 0, holds: 0 },
};

const LOOKUP = {
  container: container(),
  specimenTypeCode: "urine",
  acceptance: "received",
  accessionId: ACCESSION_ID,
  accessionNumber: "A26000001",
  subject: SUMMARY,
};

/**
 * Container lookup's recent lookups name patients, so they live in the signed-in frame only
 * (#4795): never in browser storage, and gone after a lock or a sign-out.
 */
describe("Recent container lookups", () => {
  beforeEach(mockGridLayout);

  it("lists this session's lookups, opens one again, and forgets them on lock", async () => {
    const stored = vi.spyOn(Storage.prototype, "setItem");
    let session: SessionInfo = { ...TEST_SESSION, capabilities: ["accession"] };
    const find = vi.fn(() => LOOKUP);
    const { user, router } = renderApp("/containers?labelCode=C00000001", ["accession"], {
      current_session: () => session,
      find_container: find,
      get_container_history: () => HISTORY,
      lock_session: () => {
        session = { ...session, locked: true };
        return null;
      },
      unlock_session: () => {
        session = { ...session, locked: false };
        return session;
      },
    });
    // The page loads lazily, which can take longer than a second while other suites run.
    expect(
      await screen.findByRole("link", { name: "A26000001" }, { timeout: LAZY_PAGE_MS }),
    ).toBeTruthy();

    await user.click(await screen.findByRole("link", { name: "Container lookup" }));
    const recent = await screen.findByRole("grid", { name: "Your recent lookups in this session" });
    expect(within(recent).getByText("C00000001")).toBeTruthy();
    expect(within(recent).getByText("Patient, Test")).toBeTruthy();
    expect(within(recent).getByText("Received, not yet decided")).toBeTruthy();
    const written = stored.mock.calls.map((call) => String(call[1]));
    expect(written.some((value) => value.includes("C00000001") || value.includes("Patient"))).toBe(
      false,
    );

    // Opening a recent lookup looks the container up again: a new, audited read.
    await user.click(within(recent).getByText("C00000001"));
    expect(await screen.findByRole("tab", { name: "Location moves (0)" })).toBeTruthy();
    expect(router.state.location.search).toBe("?labelCode=C00000001");
    expect(find).toHaveBeenCalledTimes(2);

    // Lock from the empty page, so nothing is looked up again after unlocking.
    await user.click(screen.getByRole("link", { name: "Container lookup" }));
    expect(
      await screen.findByRole("grid", { name: "Your recent lookups in this session" }),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Signed in as/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Lock now" }));
    expect(await screen.findByRole("heading", { name: "Session locked" })).toBeTruthy();
    await user.type(screen.getByLabelText(/^Password/), "synthetic-password{Enter}");
    expect(await screen.findByText("Scan a container to see it here")).toBeTruthy();
    expect(router.state.location.search).toBe("");
    expect(screen.queryByRole("grid", { name: "Your recent lookups in this session" })).toBeNull();
    stored.mockRestore();
  });
});
