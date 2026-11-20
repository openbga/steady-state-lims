import { screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "@/lib/test/a11y";
import { engineError, mockCommands } from "@/lib/test/ipc";
import { chooseWithKeyboard, typeInto, WALKTHROUGH_TIMEOUT_MS } from "@/lib/test/keyboard";
import { renderRoutes } from "@/lib/test/router";
import {
  ACCESSION,
  ACCESSION_CONTEXT,
  ACCESSION_ID,
  CLIENTS,
  ITEM_ID,
  ORDER,
  ORDER_ID,
  orderAccessionContext,
  PRACTITIONERS,
  SUBJECT_VIEW,
  sessionWith,
} from "../testData";
import { NewAccessionPage } from "./NewAccessionPage";

const ACCEPTED_ORDER = {
  ...ORDER,
  status: "accepted",
  items: ORDER.items.map((item) => ({ ...item, state: "accepted" })),
};

const SPECIMEN_TYPES = [
  { id: "st-1", code: "urine", name: "Urine", versionInEffect: null, draftVersion: null },
  { id: "st-2", code: "oral_fluid", name: "Oral fluid", versionInEffect: null, draftVersion: null },
];

function renderPage(commands: Record<string, (args: unknown) => unknown> = {}) {
  mockCommands({
    // The patient's name in the banner links to the patient for people who enter orders.
    current_session: () => sessionWith(["accession", "enter_orders"]),
    get_order: () => ACCEPTED_ORDER,
    get_subject: () => SUBJECT_VIEW,
    list_clients: () => CLIENTS,
    list_practitioners: () => PRACTITIONERS,
    list_specimen_types: () => SPECIMEN_TYPES,
    get_order_accession_context: () => ACCESSION_CONTEXT,
    ...commands,
  });
  return renderRoutes(
    [{ path: "/orders/:orderId/accession", element: <NewAccessionPage /> }],
    `/orders/${ORDER_ID}/accession`,
  );
}

/** A date, a time and a named time zone typed as another zone than the laboratory's. */
async function enterCollection(user: UserEvent, zone = "America/New_York") {
  await typeInto(user, /^Collection date/, "2026-10-12");
  await typeInto(user, /^Collection time/, "08:30");
  await user.click(screen.getByRole("button", { name: "Other time zone or UTC offset…" }));
  await typeInto(user, /^Time zone/, zone);
}

const receive = () => screen.getByRole("button", { name: "Receive specimens" });

/** An order with a second test, for oral fluid, waiting for material. */
function twoTests() {
  const original = ORDER.items[0];
  const item = ACCESSION_CONTEXT.items[0];
  if (!original || !item) throw new Error("Missing fixture");
  return {
    get_order: () => ({
      ...ACCEPTED_ORDER,
      items: [
        original,
        {
          ...original,
          itemId: "eligible-2",
          orderableCode: "OF",
          orderableName: "Oral fluid panel",
        },
      ],
    }),
    get_order_accession_context: () =>
      orderAccessionContext({
        items: [
          item,
          { ...item, orderItemId: "eligible-2", requiredSpecimenTypeCodes: ["oral_fluid"] },
        ],
      }),
  };
}

describe("NewAccessionPage (REQ-SPC-001, REQ-SPC-002)", { timeout: WALKTHROUGH_TIMEOUT_MS }, () => {
  it("receives the only waiting test's material: date, time and time zone as recorded", async () => {
    const create = vi.fn(() => ACCESSION);
    const { user, container } = renderPage({ create_accession: create });
    expect(
      await screen.findByRole("heading", { level: 1, name: "Receive specimens · Patient, Test" }),
    ).toBeTruthy();
    // The only test waiting is chosen already, and says so.
    const test = await screen.findByRole("checkbox", { name: /SYN-SCR Synthetic drug screen/ });
    expect(test).toHaveProperty("checked", true);
    expect(screen.getByText("Selected: the only test waiting for material")).toBeTruthy();
    // One summary line: the patient with the MRN, the order by when it was received, client.
    const banner = await screen.findByRole("region", { name: "Patient identity" });
    expect(within(banner).getByText("MRN-00001")).toBeTruthy();
    expect(within(banner).getByRole("link", { name: /^Received/ })).toHaveProperty(
      "href",
      expect.stringContaining(`/orders/${ORDER_ID}`),
    );
    expect(await within(banner).findByText(/Synthetic Clinic/)).toBeTruthy();
    // Nothing assumed: the date and time are empty, and Receive specimens says what is missing.
    expect(receive()).toHaveProperty("disabled", true);
    expect(
      screen.getByText(
        "Fill in the required fields: collection date, time, time zone and containers.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("not set")).toBeTruthy();
    // The test's specimen type fills in the first row; mL is where the unit starts.
    expect(screen.getAllByText("Urine (urine)").length).toBeGreaterThan(0);
    await expectNoA11yViolations(container, { wholePage: true });

    await enterCollection(user);
    await typeInto(user, /^Containers/, "2");
    await typeInto(user, /^Volume$/, "30.0");
    await user.click(screen.getByRole("radio", { name: /Estimated/ }));
    expect(screen.getByText("All required fields are filled in.")).toBeTruthy();
    await user.click(receive());

    expect(await screen.findByText(`Navigated to /accessions/${ACCESSION_ID}`)).toBeTruthy();
    expect(screen.getByText("Accession A26000001 created")).toBeTruthy();
    expect(create).toHaveBeenCalledWith({
      input: {
        orderId: ORDER_ID,
        orderItemIds: [ITEM_ID],
        collection: {
          time: { kind: "zoned", local: "2026-10-12T08:30", timeZone: "America/New_York" },
          observations: [],
        },
        specimens: [
          {
            specimenTypeCode: "urine",
            containerCount: 2,
            volume: "30.0",
            volumeUnit: "mL",
            volumeKind: "estimated",
          },
        ],
      },
    });
  });

  it("sends a UTC offset as supplied when the requisition gives one", async () => {
    const create = vi.fn(() => ACCESSION);
    const { user } = renderPage({ create_accession: create });
    await screen.findByRole("checkbox", { name: /SYN-SCR/ });
    await typeInto(user, /^Collection date/, "2026-10-12");
    await typeInto(user, /^Collection time/, "08:30");
    await user.click(screen.getByRole("button", { name: "Other time zone or UTC offset…" }));
    await user.click(screen.getByRole("button", { name: "Use a UTC offset" }));
    await typeInto(user, /^UTC offset/, "-05:00");
    await typeInto(user, /^Containers/, "1");
    await user.click(receive());
    await screen.findByText(`Navigated to /accessions/${ACCESSION_ID}`);
    expect(create).toHaveBeenCalledWith({
      input: expect.objectContaining({
        collection: {
          time: { kind: "datetime", local: "2026-10-12T08:30", utcOffsetMinutes: -300 },
          observations: [],
        },
      }),
    });
  });

  it("records a date without a time when the time is not on the requisition", async () => {
    const create = vi.fn(() => ACCESSION);
    const { user } = renderPage({ create_accession: create });
    await user.click(await screen.findByRole("checkbox", { name: "Time not on the requisition" }));
    const time = screen.getByRole("textbox", { name: /^Collection time/ });
    expect(time).toHaveProperty("disabled", true);
    expect(time.getAttribute("placeholder")).toBe("Not on the requisition");
    expect(screen.getByText('The report will show "time not recorded".')).toBeTruthy();
    expect(screen.queryByText(/^Time zone:/)).toBeNull();
    await typeInto(user, /^Collection date/, "2026-10-12");
    await typeInto(user, /^Containers/, "1");
    await user.click(receive());
    await screen.findByText(`Navigated to /accessions/${ACCESSION_ID}`);
    expect(create).toHaveBeenCalledWith({
      input: expect.objectContaining({
        collection: { time: { kind: "date", date: "2026-10-12" }, observations: [] },
      }),
    });
  });

  it("records an unknown collection, and a blank volume as unknown, never a guess", async () => {
    const create = vi.fn(() => ACCESSION);
    const { user } = renderPage({ create_accession: create });
    await user.click(await screen.findByRole("checkbox", { name: "Date not on the requisition" }));
    expect(screen.getByRole("textbox", { name: /^Collection date/ })).toHaveProperty(
      "disabled",
      true,
    );
    const noTime = screen.getByRole("checkbox", { name: "Time not on the requisition" });
    expect(noTime).toHaveProperty("checked", true);
    expect(noTime).toHaveProperty("disabled", true);
    expect(screen.getByText(/billing for this order will be held/)).toBeTruthy();
    await typeInto(user, /^Containers/, "1");
    await user.click(receive());
    await screen.findByText(`Navigated to /accessions/${ACCESSION_ID}`);
    expect(create).toHaveBeenCalledWith({
      input: expect.objectContaining({
        // Fields left empty are left out of the input, not sent as "".
        collection: { time: { kind: "unknown" }, observations: [] },
        specimens: [{ specimenTypeCode: "urine", containerCount: 1, volumeKind: "unknown" }],
      }),
    });
  });

  it("asks whether a typed volume was measured or estimated (REQ-SPC-003)", async () => {
    const { user } = renderPage();
    await user.click(await screen.findByRole("checkbox", { name: "Date not on the requisition" }));
    await typeInto(user, /^Containers/, "1");
    await typeInto(user, /^Volume$/, "30");
    expect(screen.getByText("Fill in the required fields: Measured or Estimated.")).toBeTruthy();
    expect(receive()).toHaveProperty("disabled", true);
    await user.click(screen.getByRole("radio", { name: /Measured/ }));
    expect(receive()).toHaveProperty("disabled", false);
  });

  it("lists several waiting tests unchosen, and a row for each specimen type they need", async () => {
    const create = vi.fn(() => ACCESSION);
    const { user } = renderPage({ ...twoTests(), create_accession: create });
    const screenTest = await screen.findByRole("checkbox", { name: /SYN-SCR/ });
    expect(screenTest).toHaveProperty("checked", false);
    expect(screen.queryByText(/Selected: the only test/)).toBeNull();
    expect(
      screen.getByText(
        "Fill in the required fields: a test, collection date, time, time zone, specimen type and containers.",
      ),
    ).toBeTruthy();
    await user.click(screenTest);
    await user.click(screen.getByRole("checkbox", { name: /Oral fluid panel/ }));
    const rows = screen.getByRole("list", { name: "Specimens received" });
    expect(within(rows).getAllByRole("listitem")).toHaveLength(2);
    expect(within(rows).getAllByRole("button", { name: /Remove specimen/ })).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Remove specimen 2" }));
    expect(within(rows).getAllByRole("listitem")).toHaveLength(1);
    expect(within(rows).queryByRole("button", { name: /Remove specimen/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Add another specimen" }));
    expect(within(rows).getAllByRole("listitem")).toHaveLength(2);
  });

  it("lists tests that cannot be received now, with the reason and their accession", async () => {
    const original = ORDER.items[0];
    const item = ACCESSION_CONTEXT.items[0];
    if (!original || !item) throw new Error("Missing fixture");
    renderPage({
      get_order: () => ({
        ...ACCEPTED_ORDER,
        items: [
          original,
          { ...original, itemId: "allocated", orderableCode: "OLD", orderableName: "Old test" },
          { ...original, itemId: "held", orderableCode: "HOLD", orderableName: "Held test" },
        ],
      }),
      get_order_accession_context: () =>
        orderAccessionContext({
          items: [
            item,
            {
              ...item,
              orderItemId: "allocated",
              eligible: false,
              reason: "Already assigned to an accession.",
              accessionId: ACCESSION_ID,
              accessionNumber: "A26000001",
            },
            {
              ...item,
              orderItemId: "held",
              eligible: false,
              reason: "Order authority is on hold.",
            },
          ],
        }),
    });
    await screen.findByRole("checkbox", { name: /SYN-SCR/ });
    expect(screen.queryByRole("checkbox", { name: /Old test|Held test/ })).toBeNull();
    expect(screen.getByText(/Order authority is on hold/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Accession A26000001" })).toHaveProperty(
      "href",
      expect.stringContaining(`/accessions/${ACCESSION_ID}`),
    );
    const side = screen.getByRole("complementary", { name: "Receiving" });
    expect(side.textContent).toContain("Tests waiting for material: 1");
    expect(side.textContent).toContain("Already received: 1");
    expect(within(side).getByRole("link", { name: "Open order" })).toBeTruthy();
  });

  it("opens the created accession after eligibility refresh removes its tests", async () => {
    let saved = false;
    const { user } = renderPage({
      get_order_accession_context: () =>
        saved
          ? orderAccessionContext({
              items: ACCESSION_CONTEXT.items.map((item) => ({
                ...item,
                eligible: false,
                reason: "Already accessioned",
                accessionId: ACCESSION_ID,
                accessionNumber: "A26000001",
              })),
              allowedActions: [],
            })
          : ACCESSION_CONTEXT,
      create_accession: () => {
        saved = true;
        return ACCESSION;
      },
    });
    await user.click(await screen.findByRole("checkbox", { name: "Date not on the requisition" }));
    await typeInto(user, /^Containers/, "1");
    await user.click(receive());
    expect(await screen.findByText(`Navigated to /accessions/${ACCESSION_ID}`)).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it.each(["get_order", "get_order_accession_context"])(
    "opens the saved accession even if the %s refresh fails",
    async (command) => {
      let saved = false;
      let finishRefresh: (() => void) | undefined;
      const otherCommand = command === "get_order" ? "get_order_accession_context" : "get_order";
      const otherData = command === "get_order" ? ACCESSION_CONTEXT : ACCEPTED_ORDER;
      const create = vi.fn(() => {
        saved = true;
        return ACCESSION;
      });
      const { user } = renderPage({
        [command]: () =>
          saved
            ? Promise.reject(engineError("internal", "The saved order could not be refreshed."))
            : command === "get_order"
              ? ACCEPTED_ORDER
              : ACCESSION_CONTEXT,
        [otherCommand]: () =>
          saved
            ? new Promise((resolve) => {
                finishRefresh = () => resolve(otherData);
              })
            : otherData,
        create_accession: create,
      });
      await user.click(
        await screen.findByRole("checkbox", { name: "Date not on the requisition" }),
      );
      await typeInto(user, /^Containers/, "1");
      await user.click(receive());
      await screen.findByText("The saved order could not be refreshed.");
      expect(screen.getByRole("textbox", { name: /^Containers/ })).toHaveProperty("value", "1");
      if (!finishRefresh) throw new Error("The other invalidation did not start");
      finishRefresh();
      expect(await screen.findByText(`Navigated to /accessions/${ACCESSION_ID}`)).toBeTruthy();
      expect(create).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("alertdialog")).toBeNull();
    },
  );

  it("checks the date's format before creating", async () => {
    const create = vi.fn();
    const { user } = renderPage({ create_accession: create });
    await user.click(await screen.findByRole("checkbox", { name: "Time not on the requisition" }));
    await typeInto(user, /^Collection date/, "12/10/2026");
    await typeInto(user, /^Containers/, "0");
    await user.click(receive());
    expect(await screen.findByText("Enter the date as YYYY-MM-DD.")).toBeTruthy();
    expect(screen.getByText("Enter a whole number of 1 or more.")).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it("shows the engine's refusal, such as a test on hold, and keeps every entry", async () => {
    const { user } = renderPage({
      create_accession: () =>
        Promise.reject(engineError("gate_blocked", "A test on this order has an open hold.")),
    });
    await user.click(await screen.findByRole("checkbox", { name: "Date not on the requisition" }));
    await typeInto(user, /^Containers/, "1");
    await user.click(receive());
    expect(await screen.findByText("A test on this order has an open hold.")).toBeTruthy();
    expect(screen.getByText(/corr-test-0001/)).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /SYN-SCR/ })).toHaveProperty("checked", true);
    expect(screen.getByRole("textbox", { name: /^Containers/ })).toHaveProperty("value", "1");
  });

  it("maps an engine time zone refusal to the field and keeps what was typed", async () => {
    const message = "Enter a collection-site timezone such as America/New_York.";
    const { user } = renderPage({
      create_accession: () =>
        Promise.reject(
          engineError("validation", "Check the collection timezone.", {
            fieldErrors: [{ field: "collection.time.timeZone", code: "invalid_zone", message }],
          }),
        ),
    });
    await screen.findByRole("checkbox", { name: /SYN-SCR/ });
    await enterCollection(user, "Unknown/Zone");
    await typeInto(user, /^Containers/, "1");
    await user.click(receive());
    expect(await screen.findByText(message)).toBeTruthy();
    const field = screen.getByRole("textbox", { name: /^Time zone/ });
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(field).toHaveProperty("value", "Unknown/Zone");
  });

  it("asks before leaving typed input, by Cancel", async () => {
    const { user } = renderPage();
    await screen.findByRole("checkbox", { name: /SYN-SCR/ });
    await typeInto(user, /^Containers/, "2");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    const stay = await screen.findByRole("alertdialog", { name: "Leave without saving?" });
    await user.click(within(stay).getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("textbox", { name: /^Containers/ })).toHaveProperty("value", "2");
  });

  it("continues an existing accession when no eligible work remains", async () => {
    const first = ACCESSION_CONTEXT.items[0];
    if (!first) throw new Error("Missing fixture");
    renderPage({
      get_order_accession_context: () =>
        orderAccessionContext({
          items: [
            {
              ...first,
              eligible: false,
              reason: "Already assigned to an accession.",
              accessionId: ACCESSION_ID,
              accessionNumber: "A26000001",
            },
          ],
          accessions: [
            {
              accessionId: ACCESSION_ID,
              accessionNumber: "A26000001",
              createdAt: ACCESSION.createdAt,
              specimenCount: 1,
              pendingReceiptCount: 1,
            },
          ],
          allowedActions: [],
        }),
    });
    expect(await screen.findByText("No tests available to receive")).toBeTruthy();
    expect(screen.queryByRole("form", { name: "Receive specimens" })).toBeNull();
    const existing = screen.getByRole("list", { name: "Existing accessions" });
    expect(within(existing).getByRole("link", { name: "Accession A26000001" })).toBeTruthy();
    expect(existing.textContent).toContain("1 need receipt review");
  });

  it("chooses a specimen type when the tests need none it can fill in", async () => {
    const item = ACCESSION_CONTEXT.items[0];
    if (!item) throw new Error("Missing fixture");
    const { user } = renderPage({
      get_order_accession_context: () =>
        orderAccessionContext({ items: [{ ...item, requiredSpecimenTypeCodes: [] }] }),
    });
    await screen.findByRole("checkbox", { name: /SYN-SCR/ });
    await chooseWithKeyboard(user, /Specimen type$/, "Oral fluid (oral_fluid)");
    expect(screen.getAllByText("Oral fluid (oral_fluid)").length).toBeGreaterThan(0);
  });

  it("shows a load failure with a retry", async () => {
    renderPage({ get_order: () => Promise.reject(engineError("not_found", "No such order.")) });
    expect(await screen.findByText("No such order.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("explains when no specimen types are set up", async () => {
    renderPage({ list_specimen_types: () => [] });
    expect(await screen.findByText("No specimen types are set up")).toBeTruthy();
  });
});
