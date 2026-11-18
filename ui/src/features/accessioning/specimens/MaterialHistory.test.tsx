import { screen, within } from "@testing-library/react";
import { useSearchParams } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { ContainerView } from "@/generated/ContainerView";
import type { MaterialHistoryPage } from "@/generated/MaterialHistoryPage";
import { expectNoA11yViolations } from "@/lib/test/a11y";
import { mockCommands } from "@/lib/test/ipc";
import { renderRoutes } from "@/lib/test/router";
import { container, sessionWith } from "../testData";
import {
  HISTORY_TABS,
  type HistoryTab,
  MaterialHistory,
  useMaterialHistory,
} from "./MaterialHistory";

const HOLDER = "00000000-0000-7000-8000-000000000e11";

const HOLD = {
  id: "1",
  kind: "hold",
  actor: HOLDER,
  actorDisplay: "Test Quality Holder",
  recordedAt: "2026-11-05T10:00:00.000000000Z",
  description: "Quality hold placed",
  reason: "Synthetic leaking container",
  causalSequence: 1,
};

const PAGE: MaterialHistoryPage = {
  snapshot: { maxMoveRowId: "0", maxHoldRowId: "1" },
  totals: { moves: 0, holds: 1 },
  moves: [],
  holds: [HOLD],
  disposal: null,
  depletion: null,
  hasMore: false,
};

/** The History card as Container lookup shows it, with its tab in the address. */
function Harness({ material }: { material: ContainerView }) {
  const [params] = useSearchParams();
  const history = useMaterialHistory(material.containerId);
  const named = params.get("history");
  const tab: HistoryTab = HISTORY_TABS.find((each) => each === named) ?? "moves";
  return (
    <MaterialHistory
      container={material}
      history={history}
      tab={tab}
      tabHref={(id) => `/containers?history=${id}`}
      routerOptions={{}}
    />
  );
}

function renderHistory(page: (args: unknown) => unknown, material = container(), path = "") {
  const read = vi.fn(page);
  mockCommands({
    current_session: () => sessionWith(["accession"]),
    get_container_history: read,
  });
  const rendered = renderRoutes(
    [{ path: "/containers", element: <Harness material={material} /> }],
    `/containers${path}`,
  );
  return { ...rendered, read };
}

describe("MaterialHistory (#4794)", () => {
  it("shows each stream in its own tab with its true count", async () => {
    const material = container({
      labelJobs: [
        {
          jobId: "job-1",
          containerId: container().containerId,
          printerId: "printer-1",
          kind: "print",
          requestedAt: "2026-11-05T10:00:00.000000000Z",
          outcome: "handed_off",
          errorCode: null,
        },
      ],
    });
    const { user, container: page } = renderHistory(() => PAGE, material);
    const tabs = await screen.findByRole("tablist", { name: "History" });
    expect(await within(tabs).findByRole("tab", { name: "Location moves (0)" })).toBeTruthy();
    expect(within(tabs).getByRole("tab", { name: "Holds and releases (1)" })).toBeTruthy();
    expect(within(tabs).getByRole("tab", { name: "Terminal events (0)" })).toBeTruthy();
    expect(within(tabs).getByRole("tab", { name: "Label jobs (1)" })).toBeTruthy();
    // An empty tab says so once, without paging.
    expect(screen.getByText("No location moves recorded for this container.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /history$/ })).toBeNull();
    await expectNoA11yViolations(page);

    await user.click(within(tabs).getByRole("tab", { name: "Holds and releases (1)" }));
    // Names who recorded each event instead of the account ID.
    expect(await screen.findByText(/Recorded by Test Quality Holder/)).toBeTruthy();
    expect(screen.queryByText(new RegExp(HOLDER))).toBeNull();

    await user.click(within(tabs).getByRole("tab", { name: "Label jobs (1)" }));
    expect(await screen.findByText(/Print: Handed off to printer\./)).toBeTruthy();
    expect(
      screen.getByText("A queued or handed-off job does not prove a label printed."),
    ).toBeTruthy();
  });

  it("counts every page from the engine's totals and pages only a stream that has more", async () => {
    const moves = Array.from({ length: 50 }, (_, index) => ({
      ...HOLD,
      id: `move-${index}`,
      kind: "move",
      description: `Moved to shelf ${index}`,
      causalSequence: 60 - index,
    }));
    const { user, read } = renderHistory(() => ({
      ...PAGE,
      totals: { moves: 60, holds: 1 },
      moves,
      hasMore: true,
    }));
    expect(await screen.findByRole("tab", { name: "Location moves (60)" })).toBeTruthy();
    const previous = screen.getByRole("button", { name: "Previous history" });
    expect(previous.hasAttribute("disabled")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Next history" }));
    expect(read).toHaveBeenLastCalledWith({
      input: { containerId: container().containerId, offset: 50, snapshot: PAGE.snapshot },
    });
  });

  it("keeps the long explanation behind the ? beside a short note", async () => {
    const { user } = renderHistory(() => PAGE);
    expect(
      await screen.findByText("Times come from separate streams and don't set a shared order."),
    ).toBeTruthy();
    expect(screen.queryByText(/Moves follow committed sequence/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "About history order" }));
    const details = await screen.findByRole("dialog", { name: "About history order" });
    expect(within(details).getByText(/Moves follow committed sequence/)).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "About history order" })).toBeNull();
  });
});
