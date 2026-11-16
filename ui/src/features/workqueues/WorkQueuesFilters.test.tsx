import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "@/lib/test/a11y";
import { openRow } from "@/lib/test/grid";
import { mockCommands } from "@/lib/test/ipc";
import { mockGridLayout } from "@/lib/test/layout";
import { renderRoutes } from "@/lib/test/router";
import { session } from "@/lib/test/session";
import type { WorkQueueSummary } from "./contract";
import { LABEL_QUEUE, NOW, REVIEW_QUEUE } from "./testData";
import { WorkQueuePage } from "./WorkQueuePage";
import { WorkQueuesPage } from "./WorkQueuesPage";

const USER = session(["enter_orders", "review_results", "release_reports"]);
const STORED_AREAS = `vibe-tox.work-queue-areas-v1.${USER.userId}`;

const ORDERS: WorkQueueSummary = {
  ...REVIEW_QUEUE,
  queue: "orders_needing_decision",
  label: "Orders needing a decision",
  area: "front_desk",
  count: 1,
  nextAction: "Accept, hold or reject",
};
const RELEASE: WorkQueueSummary = {
  ...REVIEW_QUEUE,
  queue: "release_ready",
  label: "Reports ready for release",
  area: "reports",
  count: 2,
  nextAction: "Prepare and release",
};
const STALE: WorkQueueSummary = {
  ...REVIEW_QUEUE,
  queue: "review_stale",
  label: "Stale result reviews",
  count: null,
  oldestSince: null,
  nextAction: "Review again",
};

function renderPage(queues: WorkQueueSummary[], path = "/work-queues") {
  const list = vi.fn(() => queues);
  mockCommands({
    current_session: () => USER,
    list_work_queues: list,
    list_work_queue_items: () => ({ items: [], next: null, scanned: 3 }),
  });
  const rendered = renderRoutes(
    [
      { path: "/work-queues", element: <WorkQueuesPage /> },
      { path: "/work-queues/:queue", element: <WorkQueuePage /> },
    ],
    path,
  );
  return { ...rendered, list };
}

const queueNames = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.querySelector('[role="gridcell"]')?.textContent);

async function chooseArea(user: ReturnType<typeof renderPage>["user"], name: RegExp) {
  await user.click(screen.getByRole("button", { name: /^Area/ }));
  const dialog = await screen.findByRole("dialog", { name: "Areas" });
  await user.click(within(dialog).getByRole("checkbox", { name }));
  await user.keyboard("{Escape}");
}

describe("WorkQueuesPage filters (ticket #4776)", () => {
  beforeEach(() => {
    mockGridLayout();
    localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("hides empty queues until asked, keeping the choice in the address", async () => {
    const { user, router } = renderPage([REVIEW_QUEUE, LABEL_QUEUE, STALE]);
    expect(await screen.findByRole("gridcell", { name: "Review" })).toBeTruthy();
    expect(screen.queryByRole("gridcell", { name: "Reprint" })).toBeNull();
    // A queue not counted yet may have work, so it is never hidden as empty.
    expect(screen.getByRole("gridcell", { name: "Review again" })).toBeTruthy();
    expect(screen.getByText("2 queues shown")).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: "Show empty queues (1)" }));
    expect(await screen.findByRole("gridcell", { name: "Reprint" })).toBeTruthy();
    expect(router.state.location.search).toBe("?empty=show");
  });

  it("lists the chosen areas' queues, names the choice and remembers it for the person", async () => {
    const queues = [ORDERS, RELEASE, REVIEW_QUEUE, LABEL_QUEUE];
    const { user, container, unmount } = renderPage(queues);
    const area = await screen.findByRole("button", { name: "Area All areas" });
    await user.click(area);
    const dialog = await screen.findByRole("dialog", { name: "Areas" });
    // Each area counts the queues it would list: the empty label queue is hidden.
    expect(within(dialog).getByRole("checkbox", { name: "All areas, 3 queues" })).toBeTruthy();
    expect(within(dialog).getByRole("checkbox", { name: "Front desk, 1 queue" })).toBeTruthy();
    expect(within(dialog).getByRole("checkbox", { name: "Billing, 0 queues" })).toBeTruthy();
    await expectNoA11yViolations(container, { wholePage: true });
    await user.click(within(dialog).getByRole("checkbox", { name: "Reports, 1 queue" }));
    await user.click(within(dialog).getByRole("checkbox", { name: "Front desk, 1 queue" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Area Front desk, Reports" })).toBeTruthy();
    expect(queueNames()).toEqual([
      "Orders needing a decision · Front desk",
      "Reports ready for release · Reports",
    ]);
    expect(JSON.parse(localStorage.getItem(STORED_AREAS) ?? "null")).toEqual([
      "front_desk",
      "reports",
    ]);
    unmount();

    const again = renderPage(queues);
    expect(await screen.findByRole("button", { name: "Area Front desk, Reports" })).toBeTruthy();
    await screen.findByRole("gridcell", { name: "Prepare and release" });
    expect(queueNames()).toHaveLength(2);
    await chooseArea(again.user, /^All areas/);
    expect(await screen.findByRole("button", { name: "Area All areas" })).toBeTruthy();
    expect(queueNames()).toHaveLength(3);
    expect(JSON.parse(localStorage.getItem(STORED_AREAS) ?? "null")).toEqual([]);
  });

  it("offers every area when none of the person's queues is in the chosen ones", async () => {
    localStorage.setItem(STORED_AREAS, JSON.stringify(["billing"]));
    const { user } = renderPage([ORDERS]);
    expect(await screen.findByText("No queues in the chosen areas")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Show all areas" }));
    expect(await screen.findByRole("gridcell", { name: "Accept, hold or reject" })).toBeTruthy();
  });

  it("offers the empty queues when every chosen queue is empty", async () => {
    const { user } = renderPage([LABEL_QUEUE]);
    expect(await screen.findByText("Nothing waiting")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Show empty queues" }));
    expect(await screen.findByRole("gridcell", { name: "Reprint" })).toBeTruthy();
  });

  it("shows what an uncounted queue held after it was opened, until Refresh", async () => {
    const { user, list } = renderPage([REVIEW_QUEUE, STALE]);
    await openRow(user, "Review again");
    expect(await screen.findByText("Nothing waiting")).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Work queues" }));
    expect(await screen.findByRole("gridcell", { name: "0 · checked 12:00 UTC" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(list.mock.calls.length).toBeGreaterThanOrEqual(3));
    expect(await screen.findByRole("gridcell", { name: /^Not counted yet/ })).toBeTruthy();
  });
});
