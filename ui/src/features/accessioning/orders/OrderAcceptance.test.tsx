import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderAccessionContext } from "@/generated/OrderAccessionContext";
import type { OrderDetail } from "@/generated/OrderDetail";
import { expectNoA11yViolations } from "@/lib/test/a11y";
import { mockCommands } from "@/lib/test/ipc";
import { WALKTHROUGH_TIMEOUT_MS } from "@/lib/test/keyboard";
import { mockGridLayout } from "@/lib/test/layout";
import { renderRoutes } from "@/lib/test/router";
import {
  ACCESSION_ID,
  CLIENTS,
  ORDER,
  ORDER_ID,
  ORDERABLES,
  orderAccessionContext,
  PRACTITIONERS,
  SUBJECT_VIEW,
  sessionWith,
} from "../testData";
import { OrderDetailPage } from "./OrderDetailPage";

const ACCEPTED: OrderDetail = {
  ...ORDER,
  status: "accepted",
  revision: 2,
  items: ORDER.items.map((item) => ({ ...item, state: "accepted" })),
  allowedActions: ["amend_evidence", "place_hold", "request_follow_on"],
};

function renderPage(
  order: OrderDetail | (() => OrderDetail),
  context: () => OrderAccessionContext = () =>
    orderAccessionContext({ items: [], allowedActions: [] }),
  commands: Record<string, (args: unknown) => unknown> = {},
) {
  mockCommands({
    get_order: typeof order === "function" ? order : () => order,
    get_order_accession_context: context,
    get_subject: () => SUBJECT_VIEW,
    list_clients: () => CLIENTS,
    list_practitioners: () => PRACTITIONERS,
    list_active_orderables: () => ORDERABLES,
    current_session: () => sessionWith(["enter_orders", "accession"]),
    ...commands,
  });
  return renderRoutes(
    [{ path: "/orders/:orderId", element: <OrderDetailPage /> }],
    `/orders/${ORDER_ID}`,
  );
}

describe("Order acceptance card (REQ-ORD-001)", { timeout: WALKTHROUGH_TIMEOUT_MS }, () => {
  beforeEach(mockGridLayout);

  it("says the order is ready when the engine names no blocker", async () => {
    const { container } = renderPage(ORDER);
    expect(await screen.findByText("Ready to accept")).toBeTruthy();
    expect(screen.queryByText("Not ready to accept")).toBeNull();
    await expectNoA11yViolations(container, { wholePage: true });
  });

  it("lists each blocker the engine names, and no ready message", async () => {
    renderPage({
      ...ORDER,
      acceptanceBlockers: ["authority_missing", "open_clarification_hold"],
    });
    const card = (await screen.findByText("Not ready to accept")).closest("[role=alert]");
    expect(card).not.toBeNull();
    const items = within(card as HTMLElement).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("No signature or intent to order is recorded."),
      expect.stringContaining("A clarification hold is open."),
    ]);
    expect(screen.queryByText("Ready to accept")).toBeNull();
  });

  it("names standing-order and legacy blockers in plain words", async () => {
    renderPage({
      ...ORDER,
      allowedActions: ["reject"],
      acceptanceBlockers: ["legacy_sequence_role", "standing_order_exhausted"],
    });
    expect(
      await screen.findByText(/This order cannot be accepted; it can only be rejected/),
    ).toBeTruthy();
    expect(screen.getByText(/The standing order has no visits left/)).toBeTruthy();
  });

  it("shows nothing when the engine neither offers acceptance nor names a blocker", async () => {
    renderPage({ ...ORDER, status: "rejected", allowedActions: [] });
    expect(await screen.findByText("Rejected")).toBeTruthy();
    expect(screen.queryByText("Ready to accept")).toBeNull();
    expect(screen.queryByText("Not ready to accept")).toBeNull();
  });

  it("after Accept, offers receiving specimens as the next step", async () => {
    let current = ORDER;
    const accept = vi.fn(() => {
      current = ACCEPTED;
      return current;
    });
    const { user } = renderPage(
      () => current,
      () =>
        orderAccessionContext({
          allowedActions: current.status === "accepted" ? ["create_accession"] : [],
        }),
      { accept_order: accept },
    );
    await user.click(await screen.findByRole("button", { name: "Accept order" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Accept order" }),
    );
    expect(await screen.findByText("Next step: receive specimens")).toBeTruthy();
    expect(screen.queryByText("Ready to accept")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Start receiving specimens" }));
    expect(await screen.findByText(`Navigated to /orders/${ORDER_ID}/accession`)).toBeTruthy();
  });

  it("offers no next step once specimens are received, or when receiving is not allowed", async () => {
    renderPage(ACCEPTED, () =>
      orderAccessionContext({
        allowedActions: ["create_accession"],
        accessions: [
          {
            accessionId: ACCESSION_ID,
            accessionNumber: "A26000001",
            specimenCount: 1,
            pendingReceiptCount: 0,
            createdAt: "2026-11-05T10:00:00.000000000Z",
          },
        ],
      }),
    );
    expect(await screen.findByText("Accession A26000001")).toBeTruthy();
    expect(screen.queryByText("Next step: receive specimens")).toBeNull();
  });
});
