import type { ReactNode } from "react";
import { Radio, RadioGroup } from "react-aria-components";
import { Controller, useFormContext } from "react-hook-form";
import { FieldTip } from "@/components/Form";
import { FieldHelp } from "@/components/Form/FieldHelp";
import { FieldLabel } from "@/components/Form/FieldLabel";
import formStyles from "@/components/Form/Form.module.css";
import styles from "./SegmentedInput.module.css";

interface SegmentedInputProps {
  /** The form path; also the key for engine field errors. */
  name: string;
  label: string;
  /** A few short choices, all shown at once. */
  options: readonly { id: string; label: string }[];
  isRequired?: boolean;
  description?: string;
  /** A longer explanation behind a "?" beside the label. */
  tip?: ReactNode;
  /** Read after the label by screen readers only, such as " for SYN-SCR" in a test's row. */
  hiddenSuffix?: string;
  /** The buttons share the field's whole width, for choices that share a row on purpose. */
  fill?: boolean;
}

/**
 * A choice of a few short options shown side by side as one row of buttons, bound to the
 * surrounding react-hook-form form. Nothing is chosen at first (REQ-ORD-005); a required one
 * asks to be chosen when the form is checked. Arrow keys move between the options.
 */
export function SegmentedInput({
  name,
  label,
  options,
  isRequired,
  description,
  tip,
  hiddenSuffix,
  fill,
}: SegmentedInputProps) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      rules={{ required: isRequired ? `Choose ${label.toLowerCase()}.` : false }}
      render={({ field, fieldState }) => (
        <RadioGroup
          ref={(group) =>
            // The form focuses an invalid field: the chosen option, or the first one.
            field.ref({
              focus: () =>
                (
                  group?.querySelector<HTMLInputElement>("input:checked") ??
                  group?.querySelector<HTMLInputElement>("input")
                )?.focus(),
            })
          }
          name={field.name}
          value={field.value ?? null}
          onChange={field.onChange}
          isRequired={isRequired}
          isInvalid={fieldState.error ? true : undefined}
          validationBehavior="aria"
          orientation="horizontal"
          className={formStyles.field}
        >
          <span className={styles.labelRow}>
            <FieldLabel isRequired={isRequired} hiddenSuffix={hiddenSuffix}>
              {label}
            </FieldLabel>
            {tip && <FieldTip label={`About ${label.toLowerCase()}`}>{tip}</FieldTip>}
          </span>
          <div className={styles.segments} data-fill={fill || undefined}>
            {options.map((option) => (
              <Radio key={option.id} value={option.id} className={styles.segment}>
                {option.label}
              </Radio>
            ))}
          </div>
          <FieldHelp description={description} errorMessage={fieldState.error?.message} />
        </RadioGroup>
      )}
    />
  );
}
