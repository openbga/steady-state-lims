import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "@/lib/test/a11y";
import { openRow, openRowActions } from "@/lib/test/grid";
import { WALKTHROUGH_TIMEOUT_MS } from "@/lib/test/keyboard";
import { mockGridLayout } from "@/lib/test/layout";
import { waitingText } from "./intakeColumns";
import { INTAKE, intakePage, renderIntake } from "./intakeTestData";

const DECLINED = {
  ...INTAKE,
  intakeId: "synthetic-declined",
  suppliedName: "Declined Person",
  revision: 2,
  disposition: "declined" as const,
  dispositionSource: "Synthetic source",
  dispositionReason: "Source withdrew intake",
  disposedBy: INTAKE.recordedBy,
  disposedAt: "2026-11-05T11:00:00.000000000Z",
};
const COUNTS = { awaiting: 2, resolved: 1, declined: 1 };

describe("Incomplete identity intake list", { timeout: WALKTHROUGH_TIMEOUT_MS }, () => {
  beforeEach(mockGridLayout);
  it("asks the engine for open intake first, and keeps the Show filter in the address", async () => {
    const list = vi.fn(() => intakePage([INTAKE], COUNTS));
    const { user, router } = renderIntake({ list_intake_deferrals: list });
    const show = await screen.findByRole("button", { name: /Show$/ });
    await waitFor(() => expect(show.textContent).toContain("Awaiting verified identity (2)"));
    expect(list).toHaveBeenLastCalledWith({
      input: { show: "awaiting", search: null, afterId: null },
    });
    await user.click(show);
    const options = within(await screen.findByRole("listbox")).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Awaiting verified identity (2)",
      "Resolved (1)",
      "Declined (1)",
      "All (4)",
    ]);
    await user.click(screen.getByRole("option", { name: "Declined (1)" }));
    expect(router.state.location.search).toBe("?show=declined");
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({
        input: { show: "declined", search: null, afterId: null },
      }),
    );
  });
  it("opens with the filter the address names and finds in the engine", async () => {
    const list = vi.fn(() => intakePage([], COUNTS));
    const { user, router } = renderIntake(
      { list_intake_deferrals: list },
      { path: "/patients/incomplete-intake?show=all" },
    );
    expect(await screen.findByText("No intake to show")).toBeTruthy();
    expect(list).toHaveBeenLastCalledWith({ input: { show: "all", search: null, afterId: null } });
    const find = screen.getByRole("searchbox", {
      name: "Find intake by name as supplied or source reference",
    });
    await user.type(find, "REQ-TEST{Enter}");
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({
        input: { show: "all", search: "REQ-TEST", afterId: null },
      }),
    );
    expect(await screen.findByText("No intake matches")).toBeTruthy();
    // The find text names a person: it stays out of the address.
    expect(router.state.location.search).toBe("?show=all");
  });
  it("offers Open, the dispositions and View in audit trail on the row", async () => {
    const { user, router } = renderIntake(
      { list_intake_deferrals: () => intakePage([INTAKE, DECLINED]) },
      {
        path: "/patients/incomplete-intake?show=all",
        capabilities: ["enter_orders", "view_audit"],
      },
    );
    const menu = await openRowActions(user, "Incomplete Person");
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Open",
      "Resolve with verified patient",
      "Record declined intake",
      "View in audit trail",
    ]);
    await user.click(within(menu).getByRole("menuitem", { name: "Record declined intake" }));
    const dialog = await screen.findByRole("dialog", { name: "Record declined intake" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    const closed = await openRowActions(user, "Declined Person");
    expect(
      within(closed)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Open", "View in audit trail"]);
    await user.click(within(closed).getByRole("menuitem", { name: "Open" }));
    const panel = await screen.findByRole("region", { name: "Intake: Declined Person" });
    await user.click(within(panel).getByRole("link", { name: "View in audit trail" }));
    expect(router.state.location.pathname).toBe("/audit");
    expect(router.state.location.search).toBe(
      "?recordType=intake_deferral&recordId=synthetic-declined",
    );
  });
  it("offers View in audit trail only to people who may view the audit trail", async () => {
    const { user, container } = renderIntake();
    const menu = await openRowActions(user, "Incomplete Person");
    expect(within(menu).queryByRole("menuitem", { name: "View in audit trail" })).toBeNull();
    await user.keyboard("{Escape}");
    await openRow(user, "Incomplete Person");
    const panel = screen.getByRole("region", { name: "Intake: Incomplete Person" });
    expect(within(panel).queryByRole("link", { name: "View in audit trail" })).toBeNull();
    await expectNoA11yViolations(container, { wholePage: true });
  });
  it("shows how long open intake has waited", () => {
    const recorded = Date.parse(INTAKE.recordedAt);
    const hours = (count: number) => recorded + count * 60 * 60 * 1000;
    expect(waitingText(INTAKE, hours(0.5))).toBe("Under 1 hour");
    expect(waitingText(INTAKE, hours(1))).toBe("1 hour");
    expect(waitingText(INTAKE, hours(5))).toBe("5 hours");
    expect(waitingText(INTAKE, hours(24))).toBe("1 day");
    expect(waitingText(INTAKE, hours(53))).toBe("2 days");
    expect(waitingText(DECLINED, hours(53))).toBe("—");
  });
});
