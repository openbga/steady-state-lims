import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PartnerMessageRow } from "@/generated/PartnerMessageRow";
import { expectNoA11yViolations } from "@/lib/test/a11y";
import { mockCommands } from "@/lib/test/ipc";
import { mockGridLayout } from "@/lib/test/layout";
import { renderRoutes } from "@/lib/test/router";
import { ReportPage } from "../history/ReportPage";
import { DESTINATION, REPORT, REPORT_ID, REVISION_DETAIL, sessionWith } from "../testData";

/** A report's messages through Interfaces on its Delivery tab (#4725). Synthetic data. */

const ROUTE = { path: "/reports/:reportId/:tab?", element: <ReportPage /> };
const DELIVERY_ID = "01a1c02c-b86a-76b1-9fbe-fb18fc49e4aa";

function message(overrides: Partial<PartnerMessageRow>): PartnerMessageRow {
  return {
    messageId: "m-1",
    deliveryId: DELIVERY_ID,
    at: "2026-11-11T10:00:00.000000000Z",
    messageType: "hl7_oru",
    source: "report_revision",
    sourceId: "rev-1",
    sourceNumber: 1,
    sourceLabel: REPORT.reportNumber,
    connection: { id: "c-1", name: "TEST MLLP Results", protocol: "mllp_connect" },
    reason: "routed",
    transport: "written",
    outcomeUnknown: false,
    waiting: null,
    attempts: 0,
    givenUp: false,
    superseded: false,
    nextAttemptAt: null,
    errorCode: null,
    writtenPath: "192.0.2.10:2575",
    ackCode: "AA",
    ackText: null,
    awaitingAck: false,
    peer: null,
    unrouted: false,
    resolution: null,
    rejectionResolved: null,
    allowedActions: [],
    received: null,
    ...overrides,
  };
}

const ROWS: PartnerMessageRow[] = [
  message({}),
  message({
    deliveryId: "02b2c02c-b86a-76b1-9fbe-fb18fc49e4bb",
    connection: { id: "c-2", name: "TEST Folder HL7", protocol: "folder" },
    ackCode: null,
    outcomeUnknown: true,
    writtenPath: "A26000001-URN_r1.hl7",
  }),
  message({
    messageId: "m-3",
    deliveryId: null,
    messageType: "report_pdf",
    connection: null,
    reason: null,
    transport: "not_sent",
    ackCode: null,
    writtenPath: null,
    unrouted: true,
    resolution: "delivered_another_way",
  }),
];

function renderPage(capabilities: string[], list = vi.fn(() => ({ rows: ROWS, more: false }))) {
  mockCommands({
    current_session: () => sessionWith(capabilities),
    get_report: () => REPORT,
    get_report_revision: () => REVISION_DETAIL,
    list_delivery_destinations: () => [DESTINATION],
    list_partner_messages: list,
  });
  return { list, ...renderRoutes([ROUTE], `/reports/${REPORT_ID}/delivery`) };
}

describe("Interface messages on a report's Delivery tab (#4725)", () => {
  beforeEach(mockGridLayout);

  it("lists the report's messages with connection, revision, status and time", async () => {
    const { list, container } = renderPage(["deliver_reports", "manage_configuration"]);
    const grid = await screen.findByRole("grid", { name: "Interface messages" });
    expect(list).toHaveBeenCalledWith({
      input: { view: "all", reportId: REPORT_ID, hideTests: true },
    });
    const statuses = within(grid)
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("gridcell")[2]?.textContent);
    expect(statuses).toEqual(["Accepted (AA)", "Written", "Delivery recorded another way"]);
    expect(within(grid).getAllByText("Revision 1")).toHaveLength(3);
    // Not counted as handed off: the staff count still covers destinations only.
    expect(screen.getByText(/not counted as handed off/)).toBeTruthy();
    await expectNoA11yViolations(container, { wholePage: true });
  });

  it("links each row to its message in Interfaces › Logs", async () => {
    renderPage(["deliver_reports", "manage_configuration"]);
    const sent = await screen.findByRole("link", { name: "TEST MLLP Results" });
    expect(sent.getAttribute("href")).toBe(
      `/interfaces/logs?period=all&q=${DELIVERY_ID}&open=${DELIVERY_ID}`,
    );
    const unrouted = screen.getByRole("link", { name: "None matched" });
    expect(unrouted.getAttribute("href")).toBe(
      `/interfaces/logs?period=all&q=${REPORT.reportNumber}`,
    );
  });

  it("is not shown, nor read, without access to Interfaces", async () => {
    const { list } = renderPage(["deliver_reports"]);
    expect(await screen.findByRole("grid", { name: "Delivery obligations" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Interfaces" })).toBeNull();
    expect(list).not.toHaveBeenCalled();
  });

  it("says when no message went through Interfaces", async () => {
    renderPage(
      ["deliver_reports", "manage_configuration"],
      vi.fn(() => ({ rows: [], more: false })),
    );
    expect(await screen.findByText("No messages through Interfaces for this report.")).toBeTruthy();
  });
});
