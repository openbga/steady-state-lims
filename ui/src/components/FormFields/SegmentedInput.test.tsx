import { screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "@/lib/test/a11y";
import { chooseSegment, expectChosen } from "@/lib/test/keyboard";
import { renderWithProviders } from "@/lib/test/render";
import { SegmentedInput } from "./SegmentedInput";

function Harness({ onSubmit }: { onSubmit: (values: { source: string | null }) => void }) {
  const form = useForm<{ source: string | null }>({ defaultValues: { source: null } });
  return (
    <FormProvider {...form}>
      <form aria-label="Synthetic form" onSubmit={form.handleSubmit(onSubmit)}>
        <SegmentedInput
          name="source"
          label="Received as"
          hiddenSuffix=" for SYN-1"
          options={[
            { id: "paper", label: "Paper" },
            { id: "fax", label: "Fax" },
          ]}
          tip={<p>Synthetic explanation.</p>}
          isRequired
        />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}

it("starts empty, asks for a required choice, focuses it and submits the chosen option", async () => {
  const onSubmit = vi.fn();
  const { user, container } = renderWithProviders(<Harness onSubmit={onSubmit} />);
  for (const radio of screen.getAllByRole("radio")) expect(radio).toHaveProperty("checked", false);
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("Choose received as.")).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Paper" }));
  await user.click(screen.getByRole("button", { name: "About received as" }));
  expect(await screen.findByText("Synthetic explanation.")).toBeTruthy();
  await user.keyboard("{Escape}");
  await chooseSegment(user, "Received as for SYN-1", "Fax");
  expectChosen("Received as for SYN-1", "Fax");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(onSubmit.mock.calls[0]?.[0]).toEqual({ source: "fax" });
  await expectNoA11yViolations(container);
});
