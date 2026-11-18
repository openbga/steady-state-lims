import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { ObligationStatus } from "@/generated/ObligationStatus";
import { mockCommands } from "@/lib/test/ipc";
import { mockGridLayout } from "@/lib/test/layout";
import { renderRoutes } from "@/lib/test/router";
import {
  ACCESSION_ID,
  DESTINATION,
  OBLIGATION,
  ORDER_ID,
  REPORT,
  REPORT_ID,
  REVISION,
  sessionWith,
} from "../testData";
import { deliveryChip } from "./ReportHeader";
import { ReportPage } from "./ReportPage";

/** The report page's header, patient banner and summary (#4831, #4832, #4833). */

const ROUTE = { path: "/reports/:reportId", element: <ReportPage /> };

function renderPage(capabilities: string[], report = REPORT) {
  mockCommands({
    current_session: () => sessionWith(capabilities),
    get_report: () => report,
    list_delivery_destinations: () => [DESTINATION],
  });
  return renderRoutes([ROUTE], `/reports/${REPORT_ID}`);
}

/** The page header: breadcrumb, title, chips and actions. */
async function pageHeader() {
  const title = await screen.findByRole("heading", { level: 1, name: "Report A26000001-URN" });
  const header = title.closest("header");
  if (!(header instanceof HTMLElement)) throw new Error("The title has no header");
  return header;
}

const banner = () => screen.findByRole("region", { name: "Patient and specimen identity" });

describe("Report page patient banner (#4833)", () => {
  beforeEach(mockGridLayout);

  it("shows the identifier with its type and issuer, and links the accession and the order", async () => {
    renderPage(["release_reports", "accession", "enter_orders"]);
    const identity = await banner();
    expect(within(identity).getByText("MRN (SYN)")).toBeTruthy();
    const accession = await within(identity).findByRole("link", { name: "A26000001" });
    expect(accession.getAttribute("href")).toBe(`/accessions/${ACCESSION_ID}`);
    expect(within(identity).getByRole("link", { name: "View order" }).getAttribute("href")).toBe(
      `/orders/${ORDER_ID}`,
    );
  });

  it("links the accession for quality staff, and offers no order to people who cannot enter orders", async () => {
    renderPage(["manage_quality"]);
    const identity = await banner();
    expect(await within(identity).findByRole("link", { name: "A26000001" })).toBeTruthy();
    expect(within(identity).queryByRole("link", { name: "View order" })).toBeNull();
  });

  it("keeps the accession number as text for people who cannot open the accession", async () => {
    renderPage(["deliver_reports"]);
    const identity = await banner();
    // The session has loaded once the destinations of the order's client are listed.
    expect(await screen.findByRole("button", { name: "More actions" })).toBeTruthy();
    expect(within(identity).getByText("A26000001")).toBeTruthy();
    expect(within(identity).queryByRole("link", { name: "A26000001" })).toBeNull();
    expect(within(identity).queryByRole("link", { name: "View order" })).toBeNull();
  });
});

const withStatus = (...codes: ObligationStatus[]) =>
  codes.map((code, index) => ({
    ...OBLIGATION,
    obligationId: `${OBLIGATION.obligationId}-${index}`,
    status: { code, label: code },
  }));

describe("Report page status chips and actions (#4831)", () => {
  beforeEach(mockGridLayout);

  it("shows availability, completeness, revision and delivery under the title", async () => {
    renderPage(["release_reports"], {
      ...REPORT,
      revisions: [{ ...REVISION, completeness: "partial" }],
    });
    const header = await pageHeader();
    for (const chip of ["Current", "Partial", "Revision 1 · Initial report", "Handed off 0 of 1"]) {
      expect(within(header).getByText(chip)).toBeTruthy();
    }
    expect(within(header).queryByText(/Delivered/)).toBeNull();
  });

  it("counts handed-off obligations out of those still owed, green only when all are", () => {
    expect(deliveryChip([])).toBeNull();
    expect(deliveryChip(withStatus("closed"))).toBeNull();
    expect(deliveryChip(withStatus("handed_off", "closed"))).toEqual({
      label: "Handed off 1 of 1",
      tone: "success",
    });
    for (const open of ["awaiting", "attention", "paused", "blocked"] as const) {
      expect(deliveryChip(withStatus("handed_off", open))).toEqual({
        label: "Handed off 1 of 2",
        tone: "warning",
      });
    }
  });

  it("keeps Export PDF as the one button and puts Withdraw report last, apart and in danger text", async () => {
    const { user } = renderPage(["release_reports", "deliver_reports"]);
    const header = await pageHeader();
    expect(
      await within(header).findByRole("button", { name: "Export PDF (revision 1, current)" }),
    ).toBeTruthy();
    expect(within(header).queryByRole("button", { name: "Prepare next revision" })).toBeNull();
    await user.click(within(header).getByRole("button", { name: "More actions" }));
    const items = within(await screen.findByRole("menu")).getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Prepare next revision",
      "Add destination",
      "Withdraw report",
    ]);
    const withdraw = items[2];
    expect(withdraw?.className).toMatch(/danger/);
    expect(withdraw?.className).toMatch(/separated/);
    expect(items[0]?.className).not.toMatch(/separated/);
  });
});
