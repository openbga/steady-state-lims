import { Controller, useFormContext } from "react-hook-form";
import { type RecordOption, RecordPicker } from "@/components/RecordPicker";

interface RecordPickerInputProps {
  /** The form path of the chosen record's ID; also the key for engine field errors. */
  name: string;
  label: string;
  options: readonly RecordOption[];
  isRequired?: boolean;
  isDisabled?: boolean;
  description?: string;
  /** Shown in the empty field, such as "Select…". */
  placeholder?: string;
  /** Called after the form value changes, such as to clear a choice that depends on it. */
  onChange?: (value: string | null) => void;
  /** Engine search: see `RecordPicker`. */
  onInputChange?: (text: string) => void;
  isLoading?: boolean;
}

/**
 * A `RecordPicker` bound to the surrounding react-hook-form form. It starts empty (REQ-ORD-005)
 * and, like every form dropdown, its choice can be emptied again with its clear button
 * (UI standards, "A form's dropdown can be emptied again").
 * For a dependent choice, the parent's `onChange` sets the child to `null`, for example
 * `onChange={() => form.setValue("locationId", null)}`, and the child gets only the parent's
 * records as `options`.
 */
export function RecordPickerInput({ name, label, onChange, ...picker }: RecordPickerInputProps) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      rules={{ required: picker.isRequired ? `Choose ${label.toLowerCase()}.` : false }}
      render={({ field, fieldState }) => (
        <RecordPicker
          {...picker}
          isClearable
          label={label}
          name={field.name}
          inputRef={field.ref}
          value={field.value ?? null}
          onChange={(value) => {
            field.onChange(value);
            onChange?.(value);
          }}
          errorMessage={fieldState.error?.message}
        />
      )}
    />
  );
}
