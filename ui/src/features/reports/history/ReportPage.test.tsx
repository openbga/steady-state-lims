import { screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "@/lib/test/a11y";
import { openRow, openRowActions } from "@/lib/test/grid";
import { engineError, mockCommands } from "@/lib/test/ipc";
import { chooseWithKeyboard } from "@/lib/test/keyboard";
import { mockGridLayout } from "@/lib/test/layout";
import { renderRoutes } from "@/lib/test/router";
import { expectNextKeepsFocus, renderFromList } from "@/lib/test/sequence";
import type { ObligationView } from "../contract";
import { reportPath } from "../paths";
import {
  DESTINATION,
  OBLIGATION,
  REPORT,
  REPORT_ID,
  REVISION,
  REVISION_DETAIL,
  REVISION_ID,
  SPECIMEN_ID,
  sessionWith,
} from "../testData";
import { ReportPage } from "./ReportPage";

/** The engine's refusal of a wrong password (REQ-IDN-004). */
const WRONG_PASSWORD = engineError("validation", "The password is incorrect.", {
  fieldErrors: [{ field: "password", code: "incorrect", message: "The password is incorrect." }],
});

const ROUTE = { path: "/reports/:reportId/:tab?", element: <ReportPage /> };

/** A revision's page and a specimen's workspace, ranked above a report's tab as in the app. */
const OTHER_ROUTES = [
  { path: "/reports/revisions/:revisionId", element: <p>Revision page</p> },
  { path: "/reports/specimens/:specimenId", element: <p>Report workspace</p> },
];

function mockPage(commands: Record<string, (args: unknown) => unknown> = {}) {
  mockCommands({
    current_session: () => sessionWith(["release_reports", "deliver_reports"]),
    get_report: () => REPORT,
    get_report_revision: () => REVISION_DETAIL,
    list_delivery_destinations: () => [DESTINATION],
    ...commands,
  });
}

/** Opens the header's More actions menu and returns its items' names. */
async function moreActions(user: UserEvent) {
  await user.click(await screen.findByRole("button", { name: "More actions" }));
  const menu = await screen.findByRole("menu");
  return within(menu)
    .getAllByRole("menuitem")
    .map((item) => item.textContent);
}

/** Chooses one item of the header's More actions menu. */
async function chooseMoreAction(user: UserEvent, name: string) {
  await moreActions(user);
  await user.click(screen.getByRole("menuitem", { name }));
}

/** Opens the report page, on one of its tabs when `tab` names it. */
function renderPage(commands: Record<string, (args: unknown) => unknown> = {}, tab = "") {
  mockPage(commands);
  return renderRoutes([ROUTE, ...OTHER_ROUTES], `/reports/${REPORT_ID}${tab && `/${tab}`}`);
}

describe("ReportPage (REQ-RPT-002, REQ-RPT-003, REQ-RPT-013)", () => {
  beforeEach(mockGridLayout);

  it("shows the page heading while the report loads", async () => {
    renderPage({ get_report: () => new Promise(() => {}) });
    expect(await screen.findByRole("heading", { level: 1, name: "Report" })).toBeTruthy();
    expect(screen.getByText("Loading report…")).toBeTruthy();
  });

  it("shows the patient banner and tabs, and opens a revision with a click", async () => {
    const get = vi.fn(() => REPORT);
    const { user, container, router } = renderPage({ get_report: get });
    expect(
      await screen.findByRole("heading", { level: 1, name: "Report A26000001-URN" }),
    ).toBeTruthy();
    expect(get).toHaveBeenCalledWith({ input: { reportId: REPORT_ID } });
    const identity = screen.getByRole("region", { name: "Patient and specimen identity" });
    expect(identity.textContent).toContain("Testpatient, Jane");
    expect(within(identity).getByText("MRN-00000")).toBeTruthy();
    expect(within(identity).getByText("A26000001")).toBeTruthy();
    // Opened from no list, the breadcrumb leads to the reports directory.
    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumbs).getByRole("link", { name: "Reports" }).getAttribute("href")).toBe(
      "/reports",
    );
    expect(await screen.findByRole("gridcell", { name: "Synthetic amphetamine" })).toBeTruthy();
    await expectNoA11yViolations(container, { wholePage: true });
    await user.click(screen.getByRole("tab", { name: /^PDF exports/ }));
    expect(await screen.findByText("Not exported.")).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: /^Revisions/ }));
    expect(router.state.location.pathname).toBe(`/reports/${REPORT_ID}/revisions`);
    await openRow(user, "Revision 1");
    expect(await screen.findByText("Revision page")).toBeTruthy();
    expect(router.state.location.pathname).toBe(`/reports/revisions/${REVISION_ID}`);
    // The revision's breadcrumb leads back to the Revisions tab.
    expect(router.state.location.state).toEqual({
      recordSequence: {
        list: { label: "Report A26000001-URN", href: `/reports/${REPORT_ID}/revisions` },
        ids: [REVISION_ID],
      },
    });
  });

  it("keeps focus on Next while the next report loads", async () => {
    const second = "00000000-0000-7000-8000-00000000r002";
    mockPage({
      get_report: (args) =>
        JSON.stringify(args).includes(second)
          ? { ...REPORT, reportId: second, reportNumber: "A26000002-URN" }
          : REPORT,
    });
    const { user } = await renderFromList({
      route: ROUTE,
      recordPath: reportPath,
      ids: [REPORT_ID, second, "00000000-0000-7000-8000-00000000r003"],
    });
    await screen.findByRole("heading", { level: 1, name: "Report A26000001-URN" });
    await expectNextKeepsFocus(user, "Report A26000002-URN");
  });

  it("opens an obligation in the delivery workspace under every open status", async () => {
    const { user } = renderPage({}, "delivery");
    await openRow(user, "Synthetic Clinic fax");
    expect(
      await screen.findByText(`Navigated to /delivery?filter=all&open=${OBLIGATION.obligationId}`),
    ).toBeTruthy();
  });

  it("leaves a closed obligation on the report, which the delivery workspace does not hold", async () => {
    const closed: ObligationView = {
      ...OBLIGATION,
      status: {
        code: "closed",
        label: "Fax by staff: closed (redirected)",
        shortLabel: "Closed: redirected",
        method: "Fax by staff",
      },
    };
    const { user, router } = renderPage(
      { get_report: () => ({ ...REPORT, obligations: [closed] }) },
      "delivery",
    );
    await openRow(user, "Synthetic Clinic fax");
    expect(router.state.location.pathname).toBe(`/reports/${REPORT_ID}/delivery`);
  });

  it("records a delivery attempt from an obligation's row menu", async () => {
    const record = vi.fn(() => OBLIGATION);
    const { user } = renderPage({ record_delivery_attempt: record }, "delivery");
    const menu = await openRowActions(user, "A26000001-URN to Synthetic Clinic fax");
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Record attempt", "Redirect", "Export PDF"]);
    await user.click(within(menu).getByRole("menuitem", { name: "Record attempt" }));
    const dialog = await screen.findByRole("dialog", { name: "Record delivery attempt" });
    await chooseWithKeyboard(user, /What happened/, "Outcome unknown");
    await user.click(within(dialog).getByRole("button", { name: "Record attempt" }));
    expect(await screen.findByText("Delivery attempt recorded")).toBeTruthy();
    expect(record).toHaveBeenCalledWith({
      input: { obligationId: OBLIGATION.obligationId, evidence: "outcome_unknown" },
    });
  });

  it("withdraws the report with a reason and the password", async () => {
    const withdraw = vi.fn(() => ({ ...REPORT, availability: "withdrawn" }));
    const { user } = renderPage({ withdraw_report: withdraw });
    await chooseMoreAction(user, "Withdraw report");
    const dialog = await screen.findByRole("alertdialog", {
      name: "Withdraw report A26000001-URN",
    });
    expect(dialog.textContent).toContain("This cannot be undone.");
    await user.type(within(dialog).getByLabelText(/^Reason/), "Specimen mix-up");
    await user.type(within(dialog).getByLabelText(/^Your password/), "synthetic-secret");
    await user.click(within(dialog).getByRole("button", { name: "Withdraw report" }));
    expect(await screen.findByText("Report A26000001-URN withdrawn")).toBeTruthy();
    expect(withdraw).toHaveBeenCalledWith({
      input: {
        reportId: REPORT_ID,
        expectedRevisionNo: 1,
        reason: "Specimen mix-up",
        password: "synthetic-secret",
      },
    });
  });

  it("keeps the withdraw dialog open on a wrong password or a refusal", async () => {
    const withdraw = vi
      .fn()
      .mockRejectedValueOnce(WRONG_PASSWORD)
      .mockRejectedValueOnce(
        engineError("conflict", "The report changed since it was shown. Reload and try again.", {
          gateReasons: [
            {
              code: "revision_conflict",
              message: "The report changed since it was shown. Reload and try again.",
            },
          ],
        }),
      );
    const { user } = renderPage({ withdraw_report: withdraw });
    await chooseMoreAction(user, "Withdraw report");
    const dialog = await screen.findByRole("alertdialog");
    await user.type(within(dialog).getByLabelText(/^Reason/), "Specimen mix-up");
    await user.type(within(dialog).getByLabelText(/^Your password/), "wrong");
    await user.click(within(dialog).getByRole("button", { name: "Withdraw report" }));
    await waitFor(() =>
      expect(
        within(dialog)
          .getByLabelText(/^Your password/)
          .getAttribute("aria-invalid"),
      ).toBe("true"),
    );
    expect(within(dialog).getAllByText("The password is incorrect.").length).toBeGreaterThan(0);
    await user.click(within(dialog).getByRole("button", { name: "Withdraw report" }));
    const blocked = await within(dialog).findByRole("list", { name: "Blocked by" });
    expect(blocked.textContent).toContain("Changed since it was shown");
    expect(within(dialog).getByText("Not withdrawn")).toBeTruthy();
  });

  it("does not withdraw without a reason", async () => {
    const withdraw = vi.fn();
    const { user } = renderPage({ withdraw_report: withdraw });
    await chooseMoreAction(user, "Withdraw report");
    const dialog = await screen.findByRole("alertdialog");
    await user.type(within(dialog).getByLabelText(/^Your password/), "synthetic-secret");
    await user.click(within(dialog).getByRole("button", { name: "Withdraw report" }));
    expect(await within(dialog).findByText("Enter the reason for this change.")).toBeTruthy();
    expect(withdraw).not.toHaveBeenCalled();
  });

  it("records an impact assessment for the open changes", async () => {
    const assess = vi.fn(() => null);
    const { user } = renderPage(
      {
        current_session: () => sessionWith(["manage_quality", "deliver_reports"]),
        get_report: () => ({
          ...REPORT,
          impact: {
            revisionId: REVISION_ID,
            correctionDue: false,
            open: [
              {
                key: `review_stale:${REVISION.revisionId}:qc_rejected:qc-9`,
                code: "review_stale",
                message: "QC for a reported result was rejected after release.",
              },
            ],
            assessments: [],
          },
          allowedActions: ["add_delivery_obligation", "record_impact_assessment"],
        }),
        record_impact_assessment: assess,
      },
      "impact",
    );
    expect(await screen.findByText(/Delivery of the current revision is paused/)).toBeTruthy();
    expect(await moreActions(user)).toEqual(["Add destination"]);
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Record impact assessment" }));
    const dialog = await screen.findByRole("dialog", { name: "Record impact assessment" });
    await user.click(within(dialog).getByRole("checkbox", { name: /QC for a reported result/ }));
    await chooseWithKeyboard(user, /Decision/, "No impact on the released report");
    await user.type(
      within(dialog).getByLabelText(/^Reason/),
      "Repeat QC accepted; values unchanged",
    );
    await user.click(within(dialog).getByRole("button", { name: "Record assessment" }));
    expect(await screen.findByText("Impact assessment recorded")).toBeTruthy();
    expect(assess).toHaveBeenCalledWith({
      input: {
        revisionId: REVISION_ID,
        keys: [`review_stale:${REVISION_ID}:qc_rejected:qc-9`],
        decision: "no_impact",
        reason: "Repeat QC accepted; values unchanged",
      },
    });
  });

  it("offers only the actions the engine allows the signed-in person", async () => {
    const withImpact = {
      ...REPORT,
      impact: {
        revisionId: REVISION_ID,
        correctionDue: true,
        open: [{ key: "medications_changed:2", code: "medications_changed", message: "Changed." }],
        assessments: [],
      },
    };
    const { user, router } = renderPage({ get_report: () => withImpact });
    expect(await moreActions(user)).toEqual([
      "Prepare next revision",
      "Add destination",
      "Withdraw report",
    ]);
    await user.keyboard("{Escape}");
    expect(screen.getByRole("tab", { name: "Impact 1" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Record impact assessment" })).toBeNull();
    await chooseMoreAction(user, "Prepare next revision");
    expect(await screen.findByText("Report workspace")).toBeTruthy();
    expect(router.state.location.pathname).toBe(`/reports/specimens/${SPECIMEN_ID}`);
  });

  it("offers a delivery clerk no release actions", async () => {
    const { user } = renderPage({
      current_session: () => sessionWith(["deliver_reports"]),
      get_report: () => ({ ...REPORT, allowedActions: ["add_delivery_obligation"] }),
    });
    expect(await moreActions(user)).toEqual(["Add destination"]);
  });

  it("adds a verified destination of the order's client for the current revision", async () => {
    const add = vi.fn(() => OBLIGATION);
    const destinations = vi.fn(() => [DESTINATION]);
    const { user } = renderPage({
      add_delivery_obligation: add,
      list_delivery_destinations: destinations,
    });
    await chooseMoreAction(user, "Add destination");
    const dialog = await screen.findByRole("dialog", { name: "Add a destination" });
    expect(destinations).toHaveBeenCalledWith({
      input: { clientId: REPORT.clientId, state: "verified" },
    });
    await chooseWithKeyboard(user, /Destination/, "Results email (results@clinic.example)");
    await user.type(within(dialog).getByLabelText(/^Reason/), "Clinic asked for a copy by email");
    await user.click(within(dialog).getByRole("button", { name: "Add destination" }));
    expect(await screen.findByText("Delivery obligation added")).toBeTruthy();
    expect(add).toHaveBeenCalledWith({
      input: {
        revisionId: REVISION_ID,
        destinationId: DESTINATION.destinationId,
        reason: "Clinic asked for a copy by email",
      },
    });
  });

  it("shows a withdrawn report, its exports, and no actions", async () => {
    renderPage(
      {
        get_report: () => ({
          ...REPORT,
          exports: [
            {
              exportId: "00000000-0000-7000-8000-00000000x001",
              revisionNo: 1,
              withdrawalNotice: false,
              purpose: "records",
              fileName: "A26000001-URN-r1.pdf",
              exportedBy: {
                userId: "00000000-0000-7000-8000-000000000e02",
                displayName: "Test Releaser",
              },
              exportedAt: "2026-10-12T15:10:00Z",
              label: "PDF exported by Test Releaser (not a delivery)",
            },
          ],
          availability: "withdrawn",
          revisions: [{ ...REVISION, availability: "withdrawn" }],
          withdrawal: {
            revisionNo: 1,
            reason: "Specimen mix-up",
            withdrawnBy: {
              userId: "00000000-0000-7000-8000-000000000e02",
              displayName: "Test Releaser",
            },
            withdrawnAt: "2026-10-12T16:00:00Z",
            noticeArtifactSha256: "e5".repeat(32),
          },
          allowedActions: [],
        }),
      },
      "exports",
    );
    expect(await screen.findByText("This report is withdrawn")).toBeTruthy();
    expect(screen.getByRole("gridcell", { name: "Revision 1 (withdrawn)" })).toBeTruthy();
    expect(screen.getByRole("gridcell", { name: "A26000001-URN-r1.pdf" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Export PDF/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "More actions" })).toBeNull();
  });

  it("closes an open preservation incident and shows closed ones (NFR-07)", async () => {
    const incident = {
      incidentId: "00000000-0000-7000-8000-00000000f001",
      revision: 1,
      kind: "corrupt" as const,
      record: "content_json" as const,
      artifactSha256: "c3".repeat(32),
      reportId: REPORT_ID,
      revisionId: REVISION_ID,
      candidateId: null,
      withdrawalNotice: false,
      detectedAt: "2026-10-12T15:00:00Z",
      closure: null,
      allowedActions: ["close_preservation_incident"],
    };
    const closed = {
      ...incident,
      incidentId: "00000000-0000-7000-8000-00000000f002",
      record: "pdf" as const,
      kind: "missing" as const,
      revision: 2,
      closure: {
        resolution: "artifact_restored_from_backup" as const,
        reason: "Restored from the nightly copy",
        closedBy: { userId: "00000000-0000-7000-8000-000000000e03", displayName: "Test Quality" },
        closedAt: "2026-10-12T16:00:00Z",
      },
      allowedActions: [],
    };
    const close = vi.fn(() => ({ ...incident, revision: 2, allowedActions: [] }));
    const { user } = renderPage(
      {
        current_session: () => sessionWith(["manage_quality"]),
        get_report: () => ({ ...REPORT, incidents: [incident, closed], allowedActions: [] }),
        close_preservation_incident: close,
      },
      "incidents",
    );
    const list = await screen.findByRole("list", { name: "Preservation incidents" });
    expect(list.textContent).toContain("Revision 1: stored report content damaged");
    expect(list.textContent).toContain(
      "Restored intact from a backup. Reason: Restored from the nightly copy",
    );
    expect(within(list).getAllByRole("button", { name: "Close incident" })).toHaveLength(1);
    await user.click(within(list).getByRole("button", { name: "Close incident" }));
    const dialog = await screen.findByRole("dialog", { name: "Close preservation incident" });
    await chooseWithKeyboard(user, /Resolution/, "Accepted as lost");
    await user.type(within(dialog).getByLabelText(/^Reason/), "No intact copy exists");
    await user.click(within(dialog).getByRole("button", { name: "Close incident" }));
    expect(await screen.findByText("Preservation incident closed")).toBeTruthy();
    expect(close).toHaveBeenCalledWith({
      input: {
        incidentId: incident.incidentId,
        expectedRevision: 1,
        resolution: "accepted_as_lost",
        reason: "No intact copy exists",
      },
    });
  });

  it("shows the engine's error", async () => {
    renderPage({
      get_report: () => Promise.reject(engineError("not_found", "The report was not found.")),
    });
    expect(await screen.findByText("The report was not found.")).toBeTruthy();
  });
});
