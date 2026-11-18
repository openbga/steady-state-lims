import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "@/lib/test/a11y";
import { mockCommands } from "@/lib/test/ipc";
import { mockGridLayout } from "@/lib/test/layout";
import { renderRoutes } from "@/lib/test/router";
import type { ReportDetail } from "../contract";
import {
  DESTINATION,
  REPORT,
  REPORT_ID,
  REVISION_DETAIL,
  REVISION_ID,
  sessionWith,
} from "../testData";
import { ReportPage } from "./ReportPage";

/** The report page's tabs (#4834). */

const ROUTE = { path: "/reports/:reportId/:tab?", element: <ReportPage /> };

function renderPage(
  report: ReportDetail = REPORT,
  tab = "",
  commands: Record<string, (args: unknown) => unknown> = {},
) {
  mockCommands({
    current_session: () => sessionWith(["release_reports", "deliver_reports"]),
    get_report: () => report,
    get_report_revision: () => REVISION_DETAIL,
    list_delivery_destinations: () => [DESTINATION],
    ...commands,
  });
  return renderRoutes([ROUTE], `/reports/${REPORT_ID}${tab && `/${tab}`}`);
}

const tabNames = () => screen.getAllByRole("tab").map((tab) => tab.textContent);

describe("Report page tabs (#4834)", () => {
  beforeEach(mockGridLayout);

  it("opens on Results, with a count on every tab that lists records", async () => {
    const read = vi.fn(() => REVISION_DETAIL);
    const { container } = renderPage(REPORT, "", { get_report_revision: read });
    expect(await screen.findByRole("tab", { name: "Results 2" })).toBeTruthy();
    expect(tabNames()).toEqual([
      "Results 2",
      "Preview",
      "Delivery 1",
      "Revisions 1",
      "PDF exports 0",
      "Impact 0",
    ]);
    expect(screen.getByRole("tab", { name: "Results 2" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    // The results come from the audited read of the current revision.
    expect(read).toHaveBeenCalledWith({ input: { revisionId: REVISION_ID } });
    await expectNoA11yViolations(container, { wholePage: true });
  });

  it("shows each result exactly as printed, with only Meets cutoff as a neutral badge", async () => {
    renderPage();
    const grid = await screen.findByRole("grid", { name: "Results" });
    const rows = within(grid).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("gridcell")[1]?.textContent)).toEqual([
      "512.4",
      "<5.0",
    ]);
    const [meets, below] = rows as [HTMLElement, HTMLElement];
    expect(within(meets).getByText("Cutoff 50 ng/mL; LOQ 5 ng/mL")).toBeTruthy();
    const badge = within(meets).getByText("Meets cutoff").closest("[data-tone]");
    expect(badge?.getAttribute("data-tone")).toBe("neutral");
    // Not meeting the cutoff is plain text: results are colored only by lab-rule flags.
    expect(within(below).getByText("Does not meet cutoff").closest("[data-tone]")).toBeNull();
    expect(screen.getByText(/Not reported in this revision: Synthetic opiate panel/)).toBeTruthy();
  });

  it("shows Incidents only when the report has a preservation incident", async () => {
    const incident = {
      incidentId: "00000000-0000-7000-8000-00000000f001",
      revision: 1,
      kind: "missing" as const,
      record: "pdf" as const,
      artifactSha256: "c3".repeat(32),
      reportId: REPORT_ID,
      revisionId: REVISION_ID,
      candidateId: null,
      withdrawalNotice: false,
      detectedAt: "2026-10-12T15:00:00Z",
      closure: null,
      allowedActions: [],
    };
    const { user } = renderPage({ ...REPORT, incidents: [incident] });
    await user.click(await screen.findByRole("tab", { name: "Incidents 1" }));
    const list = await screen.findByRole("list", { name: "Preservation incidents" });
    expect(list.textContent).toContain("Revision 1: PDF file missing");
  });

  it("says when impact after release does not apply", async () => {
    renderPage({ ...REPORT, impact: null }, "impact");
    expect(await screen.findByText(/^Not applicable: only a current revision/)).toBeTruthy();
  });

  it("previews the revision with the content the PDF is rendered from", async () => {
    renderPage(REPORT, "preview");
    const article = await screen.findByRole("article", {
      name: "Printed content of report A26000001-URN",
    });
    expect(article.textContent).toContain("Synthetic Toxicology Laboratory");
  });
});
