import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ContainerLookup } from "@/generated/ContainerLookup";
import { expectNoA11yViolations } from "@/lib/test/a11y";
import { engineError, mockCommands } from "@/lib/test/ipc";
import { chooseWithKeyboard } from "@/lib/test/keyboard";
import { renderRoutes } from "@/lib/test/router";
import { ACCESSION, ACCESSION_ID, container, SUMMARY, sessionWith } from "../testData";
import { ContainerLookupPage } from "./ContainerLookupPage";

const LOOKUP: ContainerLookup = {
  container: container(),
  specimenTypeCode: "urine",
  acceptance: "accepted",
  accessionId: ACCESSION_ID,
  accessionNumber: "A26000001",
  subject: SUMMARY,
};

function renderPage(
  findContainer: (args: unknown) => unknown,
  path = "/containers",
  commands: Record<string, (args: unknown) => unknown> = {},
) {
  // The lookup returns the patient; no second read of the patient's record is made.
  mockCommands({
    find_container: findContainer,
    get_container_history: () => ({
      moves: [],
      holds: [],
      disposal: null,
      depletion: null,
      hasMore: false,
      snapshot: { maxMoveRowId: "0", maxHoldRowId: "0" },
      totals: { moves: 0, holds: 0 },
    }),
    current_session: () => sessionWith(["accession", "enter_orders"]),
    ...commands,
  });
  return renderRoutes([{ path: "/containers", element: <ContainerLookupPage /> }], path);
}

describe("ContainerLookupPage (REQ-SPC-001)", () => {
  it("shows the banner and the result of one scan without a duplicate React key", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderPage(() => LOOKUP, "/containers?labelCode=C00000001");
    expect(await screen.findByRole("link", { name: "Patient, Test" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "A26000001" })).toBeTruthy();
    const keyErrors = errors.mock.calls.filter((call) => String(call[0]).includes("same key"));
    errors.mockRestore();
    expect(keyErrors).toEqual([]);
  });

  it("finds a scanned barcode on Enter and clears the field for the next scan", async () => {
    const find = vi.fn(() => LOOKUP);
    const { user, container: page } = renderPage(find);
    await expectNoA11yViolations(page, { wholePage: true });

    // A scanner types into the focused field and presses Enter.
    await user.keyboard("C00000001{Enter}");
    expect(await screen.findByRole("link", { name: "A26000001" })).toBeTruthy();
    expect(find).toHaveBeenCalledWith({ input: { labelCode: "C00000001" } });
    expect(screen.getByText("Accepted")).toBeTruthy();
    expect(screen.getByText("30.0 mL, estimated")).toBeTruthy();
    expect(await screen.findByRole("link", { name: "Patient, Test" })).toBeTruthy();
    const banner = screen.getByRole("region", { name: "Patient and specimen identity" });
    expect(within(banner).getByText("MRN-00001")).toBeTruthy();
    expect(within(banner).getByText("A26000001")).toBeTruthy();
    expect(within(banner).getByText("C00000001")).toBeTruthy();
    const field = screen.getByRole("textbox", { name: /Container barcode/ });
    expect(field).toHaveProperty("value", "");
    expect(document.activeElement).toBe(field);
    await expectNoA11yViolations(page, { wholePage: true });

    // Scanning the same container again looks it up again and shows its current state. The
    // first scan's result stays on screen until the new one renders, so wait for the second
    // answer itself, not for anything the first one already shows.
    find.mockReturnValueOnce({ ...LOOKUP, container: container({ state: "depleted" }) });
    await user.keyboard("C00000001{Enter}");
    expect(await screen.findByText("Depleted")).toBeTruthy();
    expect(find).toHaveBeenCalledTimes(2);
  });

  it("looks up the barcode the top bar's scan field sends in the address", async () => {
    const find = vi.fn(() => LOOKUP);
    renderPage(find, "/containers?labelCode=C00000001");
    expect(await screen.findByRole("link", { name: "A26000001" })).toBeTruthy();
    expect(find).toHaveBeenCalledWith({ input: { labelCode: "C00000001" } });
    expect(screen.getByRole("region", { name: "Patient and specimen identity" })).toBeTruthy();
  });

  it("says when no container has the barcode", async () => {
    const { user } = renderPage(() =>
      Promise.reject(engineError("not_found", "The container was not found.")),
    );
    await user.keyboard("C99999999{Enter}");
    expect(await screen.findByText("No container has the barcode C99999999")).toBeTruthy();
  });

  it("shows other engine errors with the support reference", async () => {
    const { user } = renderPage(() =>
      Promise.reject(engineError("forbidden", "You cannot look up containers.")),
    );
    await user.keyboard("C00000001{Enter}");
    expect(await screen.findByText("You cannot look up containers.")).toBeTruthy();
    expect(screen.getByText("corr-test-0001")).toBeTruthy();
  });

  it("requires a barcode before looking up", async () => {
    const find = vi.fn();
    const { user } = renderPage(find);
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Enter container barcode.")).toBeTruthy();
    expect(find).not.toHaveBeenCalled();
  });

  it("records a waiting receipt decision from the lookup and says where work continues (#4793)", async () => {
    let acceptance: ContainerLookup["acceptance"] = "received";
    const getAccession = vi.fn(() => ACCESSION);
    const decided = {
      ...ACCESSION.specimens[0],
      acceptance: "accepted",
      decisions: [
        {
          decisionId: "00000000-0000-7000-8000-000000001701",
          decision: "accepted",
          discrepancies: [],
          policyReference: null,
          scope: null,
          reason: null,
          decidedBy: "00000000-0000-7000-8000-000000000e12",
          decidedByDisplay: "Test Receiver",
          decidedAt: "2026-11-05T10:00:00.000000000Z",
          causalSequence: 1,
        },
      ],
    };
    const record = vi.fn(() => {
      acceptance = "accepted";
      getAccession.mockReturnValue({ ...ACCESSION, specimens: [decided] } as never);
      return { ...ACCESSION, specimens: [decided] };
    });
    const { user, container: page } = renderPage(
      () => ({ ...LOOKUP, acceptance }),
      "/containers?labelCode=C00000001",
      {
        current_session: () => sessionWith(["accession", "perform_analysis"]),
        get_accession: getAccession,
        record_receipt_decision: record,
      },
    );
    expect(await screen.findByText("This specimen waits for a receipt decision.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Finish receiving" })).toBeTruthy();
    await expectNoA11yViolations(page, { wholePage: true });

    await user.click(await screen.findByRole("button", { name: "Record receipt decision" }));
    await screen.findByRole("dialog", { name: "Receipt decision for Specimen 1 (urine)" });
    await user.keyboard("C00000001{Enter}");
    const dialog = await screen.findByText("Container C00000001 checked.");
    await chooseWithKeyboard(user, /Decision$/, "Accept");
    await user.click(
      within(dialog.closest("[role=dialog]") as HTMLElement).getByRole("button", {
        name: "Record decision",
      }),
    );
    expect(
      await screen.findByText("Receipt finished. Work continues in the Worklist."),
    ).toBeTruthy();
    expect(record).toHaveBeenCalledWith({
      input: expect.objectContaining({ decision: "accepted", expectedRevision: 1 }),
    });
    expect(await screen.findByText(/Accepted by Test Receiver/)).toBeTruthy();
    expect(
      screen.getByText(/lists C00000001 once its holds and order checks allow a run/),
    ).toBeTruthy();
    expect(screen.queryByText(/ready for testing/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Go to Worklist" })).toBeTruthy();
    expect(screen.queryByText("This specimen waits for a receipt decision.")).toBeNull();
  });

  it("shows the waiting notice and Finish receiving, without the decision, to quality (#4793)", async () => {
    const getAccession = vi.fn(() => ACCESSION);
    const { user, router } = renderPage(
      () => ({ ...LOOKUP, acceptance: "received" }),
      "/containers?labelCode=C00000001",
      {
        current_session: () => sessionWith(["manage_quality"]),
        get_accession: getAccession,
      },
    );
    expect(await screen.findByText("This specimen waits for a receipt decision.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Record receipt decision" })).toBeNull();
    expect(getAccession).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Open Finish receiving" }));
    expect(router.state.location.pathname).toBe(`/accessions/${ACCESSION_ID}`);
  });

  it("shows no receipt step for a specimen decided before the lookup", async () => {
    const getAccession = vi.fn(() => ACCESSION);
    renderPage(() => LOOKUP, "/containers?labelCode=C00000001", { get_accession: getAccession });
    expect(await screen.findByRole("link", { name: "A26000001" })).toBeTruthy();
    expect(screen.queryByText(/receipt decision|Receipt finished/)).toBeNull();
    expect(getAccession).not.toHaveBeenCalled();
  });

  it("shows one container card with one Refresh, and the last barcode beside the empty field (#4794)", async () => {
    const find = vi.fn(() => LOOKUP);
    const { user } = renderPage(find);
    await user.keyboard("C00000001{Enter}");
    const card = await screen.findByRole("region", { name: /^Container C00000001/ });
    expect(within(card).getAllByRole("button", { name: "Refresh" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Refresh" })).toHaveLength(1);
    expect(within(card).getByText("urine · Primary")).toBeTruthy();
    expect(within(card).getByRole("button", { name: "Storage excursions" })).toBeTruthy();
    expect(screen.getByText(/^Last: C00000001 · /)).toBeTruthy();
    const field = screen.getByRole("textbox", { name: /Container barcode/ });
    expect(field).toHaveProperty("value", "");
    expect(document.activeElement).toBe(field);
    expect(await screen.findByRole("tab", { name: "Location moves (0)" })).toBeTruthy();
  });

  it("refreshes the container and its history together", async () => {
    const find = vi.fn(() => LOOKUP);
    const history = vi.fn(() => ({
      moves: [],
      holds: [],
      disposal: null,
      depletion: null,
      hasMore: false,
      snapshot: { maxMoveRowId: "0", maxHoldRowId: "0" },
      totals: { moves: 0, holds: 0 },
    }));
    const { user } = renderPage(find, "/containers?labelCode=C00000001", {
      get_container_history: history,
    });
    await screen.findByRole("tab", { name: "Location moves (0)" });
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await vi.waitFor(() => expect(history).toHaveBeenCalledTimes(2));
    expect(find).toHaveBeenCalledTimes(2);
  });

  it("opens a History tab without looking the container up again", async () => {
    const find = vi.fn(() => LOOKUP);
    const { user, router } = renderPage(find, "/containers?labelCode=C00000001");
    await user.click(await screen.findByRole("tab", { name: "Label jobs (0)" }));
    expect(await screen.findByText("No labels requested.")).toBeTruthy();
    expect(router.state.location.search).toBe("?labelCode=C00000001&history=labels");
    expect(screen.getByRole("tab", { name: "Label jobs (0)", selected: true })).toBeTruthy();
    expect(find).toHaveBeenCalledTimes(1);
  });

  it("says what to do before a scan, with the field focused and no example barcode (#4795)", async () => {
    const { container: page } = renderPage(vi.fn());
    expect(await screen.findByText("Scan a container to see it here")).toBeTruthy();
    expect(screen.getByText(/You will see its specimen and receipt decision/)).toBeTruthy();
    const field = screen.getByRole("textbox", { name: /Container barcode/ });
    expect(field.getAttribute("placeholder")).toBe("Scan or type a container barcode");
    expect(document.activeElement).toBe(field);
    // Only the scan form acts; the guidance is plain text.
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Find container",
    ]);
    // Nothing was looked up in this render: no recent lookups yet.
    expect(screen.queryByText("Your recent lookups")).toBeNull();
    await expectNoA11yViolations(page, { wholePage: true });
  });
});
