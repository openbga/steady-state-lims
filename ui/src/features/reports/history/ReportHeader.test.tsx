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
  REVISION_DETAIL,
  sessionWith,
} from "../testData";
import { deliveryChip } from "./ReportHeader";
import { ReportPage } from "./ReportPage";

/** The report page's header, patient banner and summary (#4831, #4832, #4833). */

const ROUTE = { path: "/reports/:reportId/:tab?", element: <ReportPage /> };

function renderPage(capabilities: string[], report = REPORT) {
  mockCommands({
    current_session: () => sessionWith(capabilities),
    get_report: () => report,
    get_report_revision: () => REVISION_DETAIL,
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
    // REQ-RPT-011: never a bare claim of receipt (the word is assembled, as in deliveryWording).
    expect(within(header).queryByText(new RegExp(["Deliver", "ed"].join("")))).toBeNull();
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

const summary = () => screen.findByRole("region", { name: "Summary" });

/** The summary card's facts as label → text. */
async function summaryFacts() {
  const facts = within(await summary()).getAllByRole("term");
  return Object.fromEntries(
    facts.map((term) => [term.textContent, term.nextElementSibling?.textContent ?? ""]),
  );
}

describe("Report page summary card (#4832)", () => {
  beforeEach(mockGridLayout);

  it("shows the order and specimen as printed, the release, the last export and no open impact", async () => {
    renderPage(["release_reports"], {
      ...REPORT,
      impact: { revisionId: REVISION.revisionId, open: [], correctionDue: false, assessments: [] },
      exports: [
        {
          exportId: "00000000-0000-7000-8000-00000000x001",
          revisionNo: 1,
          withdrawalNotice: false,
          purpose: "records",
          fileName: "A26000001-URN-r1.pdf",
          exportedBy: { userId: "00000000-0000-7000-8000-000000000e02", displayName: "Test" },
          exportedAt: "2026-10-12T15:00:00Z",
          label: "Exported by Test",
        },
      ],
    });
    const facts = await summaryFacts();
    expect(facts.Client).toBe("Synthetic Clinic – Main Office");
    expect(facts["Ordering practitioner"]).toBe("TESTDOC, Ordering · NPI 1999999992");
    expect(facts.Specimen).toBe("Urine · C00000001");
    expect(facts.Tests).toBe("Synthetic confirmation panel");
    expect(facts.Collected).toBe("2026-10-12 07:00 CDT");
    expect(facts.Released).toContain("by Test Releaser");
    expect(facts["Last export"]).toContain("For the laboratory's records");
    expect(facts["Impact after release"]).toBe("Nothing open");
    expect(screen.getByRole("tab", { name: "Impact 0" })).toBeTruthy();
  });

  it("counts open impact in warning tone, also on the Impact tab", async () => {
    renderPage(["release_reports"], {
      ...REPORT,
      impact: {
        revisionId: REVISION.revisionId,
        correctionDue: false,
        assessments: [],
        open: [
          { key: "a", code: "review_stale", message: "QC was rejected after release." },
          { key: "b", code: "medications_changed", message: "Medications changed." },
        ],
      },
    });
    const facts = await summaryFacts();
    expect(facts["Impact after release"]).toBe("2 open items");
    expect(
      within(await summary())
        .getByText("2 open items")
        .closest("[data-tone]")
        ?.getAttribute("data-tone"),
    ).toBe("warning");
    expect(screen.getByRole("tab", { name: "Impact 2" })).toBeTruthy();
  });

  it("says when the printed content cannot be read and nothing was exported", async () => {
    renderPage(["release_reports"], { ...REPORT, overview: null, impact: null });
    const facts = await summaryFacts();
    expect(facts.Client).toMatch(/^Not available/);
    expect(facts["Last export"]).toBe("Not exported");
    expect(facts["Impact after release"]).toBe("Not applicable");
  });
});
