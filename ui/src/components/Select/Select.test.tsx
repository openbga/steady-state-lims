import { screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/Button";
import { Form } from "@/components/Form";
import { expectNoA11yViolations } from "@/lib/test/a11y";
import { engineError } from "@/lib/test/ipc";
import { renderWithProviders } from "@/lib/test/render";
import { Select } from "./Select";

const OPTIONS = [
  { id: "a", label: "Synthetic panel A" },
  { id: "b", label: "Synthetic panel B" },
];

function Harness({
  initial = null,
  isClearable,
}: {
  initial?: string | null;
  isClearable?: boolean;
}) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <>
      <Select
        label="Panel"
        name="panel"
        options={OPTIONS}
        value={value}
        onChange={setValue}
        isClearable={isClearable}
      />
      <output>{value ?? "none"}</output>
    </>
  );
}

describe("Select", () => {
  it("chooses an option with the keyboard", async () => {
    const { user, container } = renderWithProviders(<Harness />);
    await expectNoA11yViolations(container);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    await user.click(await screen.findByRole("option", { name: "Synthetic panel B" }));
    expect(screen.getByText("b", { selector: "output" })).toBeTruthy();
  });

  // The invalid border and red placeholder hang on the select's `data-invalid` from React
  // Aria, which lands on the field wrapper rather than the trigger (ticket #4359).
  function expectInvalidEmpty(name: string) {
    const trigger = screen.getByRole("button", { name: new RegExp(name) });
    expect(trigger.parentElement?.hasAttribute("data-invalid")).toBe(true);
    expect(trigger.querySelector("[data-placeholder]")?.textContent).toBe("Select…");
  }

  it("marks an empty required choice invalid with its message", async () => {
    const { container } = renderWithProviders(
      <Select
        label="Received as"
        name="sourceKind"
        options={OPTIONS}
        value={null}
        onChange={() => undefined}
        isRequired
        errorMessage="Choose received as."
      />,
    );
    expectInvalidEmpty("Received as");
    expect(screen.getByText("Choose received as.")).toBeTruthy();
    await expectNoA11yViolations(container);
  });

  it("marks a choice the engine refused invalid", () => {
    const error = engineError("validation", "Check the highlighted fields.", {
      fieldErrors: [{ field: "panel", code: "required", message: "Choose a panel." }],
    });
    renderWithProviders(
      <Form
        aria-label="Order"
        onSubmit={() => undefined}
        error={error}
        actions={<Button type="submit">Save</Button>}
      >
        <Select label="Panel" name="panel" options={OPTIONS} value={null} onChange={() => {}} />
      </Form>,
    );
    expectInvalidEmpty("Panel");
    expect(screen.getByText("Choose a panel.")).toBeTruthy();
  });

  describe("clearing a form field's choice", () => {
    // The trigger alone carries aria-expanded; the clear button's name also ends in "Panel".
    const trigger = () => screen.getByRole("button", { name: /Panel/, expanded: false });
    const clearButton = () => screen.queryByRole("button", { name: "Clear Panel" });
    const shown = () => screen.getByText(/./, { selector: "output" }).textContent;

    it("offers the clear button only while a value is chosen", async () => {
      const { user, container } = renderWithProviders(<Harness isClearable />);
      expect(clearButton()).toBeNull();
      await user.click(trigger());
      await user.click(await screen.findByRole("option", { name: "Synthetic panel A" }));
      expect(clearButton()).toBeTruthy();
      await expectNoA11yViolations(container);
    });

    // Select.module.css shows the X over the arrow on these states; jsdom applies no CSS.
    it("marks the states that show the X: pointer on it, or keyboard focus on the field", async () => {
      const { user } = renderWithProviders(<Harness initial="a" isClearable />);
      await user.hover(clearButton() as HTMLElement);
      expect(clearButton()?.hasAttribute("data-hovered")).toBe(true);
      await user.unhover(clearButton() as HTMLElement);
      expect(clearButton()?.hasAttribute("data-hovered")).toBe(false);
      await user.tab();
      expect(trigger().hasAttribute("data-focus-visible")).toBe(true);
      expect(trigger().nextElementSibling).toBe(clearButton());
    });

    it("clears on click without opening the list, keeping focus on the field", async () => {
      const { user } = renderWithProviders(<Harness initial="a" isClearable />);
      await user.click(clearButton() as HTMLElement);
      expect(shown()).toBe("none");
      expect(trigger().querySelector("[data-placeholder]")?.textContent).toBe("Select…");
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(document.activeElement).toBe(trigger());
      expect(clearButton()).toBeNull();
    });

    it("is reached by Tab after the field, without opening the list", async () => {
      const { user } = renderWithProviders(<Harness initial="a" isClearable />);
      await user.tab();
      await user.tab();
      expect(document.activeElement).toBe(clearButton());
      await user.keyboard("{Enter}");
      expect(shown()).toBe("none");
      expect(document.activeElement).toBe(trigger());
    });

    it.each(["Delete", "Backspace"])("clears with %s on the focused field", async (key) => {
      const { user } = renderWithProviders(<Harness initial="b" isClearable />);
      await user.tab();
      await user.keyboard(`{${key}}`);
      expect(shown()).toBe("none");
      expect(screen.queryByRole("listbox")).toBeNull();
    });

    it("leaves a collection filter without a clear button or clearing keys", async () => {
      const { user } = renderWithProviders(<Harness initial="a" />);
      expect(clearButton()).toBeNull();
      await user.tab();
      await user.keyboard("{Delete}{Backspace}");
      expect(shown()).toBe("a");
    });

    it("offers no clear button on a disabled field", () => {
      renderWithProviders(
        <Select
          label="Panel"
          name="panel"
          options={OPTIONS}
          value="a"
          onChange={() => undefined}
          isClearable
          isDisabled
        />,
      );
      expect(clearButton()).toBeNull();
    });
  });
});
