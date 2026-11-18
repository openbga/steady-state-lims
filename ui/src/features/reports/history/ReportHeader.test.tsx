import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { mockCommands } from "@/lib/test/ipc";
import { mockGridLayout } from "@/lib/test/layout";
import { renderRoutes } from "@/lib/test/router";
import { ACCESSION_ID, DESTINATION, ORDER_ID, REPORT, REPORT_ID, sessionWith } from "../testData";
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
    // The session has loaded once delivery actions are offered.
    expect(await screen.findByRole("button", { name: "Add destination" })).toBeTruthy();
    expect(within(identity).getByText("A26000001")).toBeTruthy();
    expect(within(identity).queryByRole("link", { name: "A26000001" })).toBeNull();
    expect(within(identity).queryByRole("link", { name: "View order" })).toBeNull();
  });
});
