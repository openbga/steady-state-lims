import { ChevronDown, X } from "lucide-react";
import { type Ref, useCallback, useRef } from "react";
import {
  Select as AriaSelect,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  SelectValue,
} from "react-aria-components";
import { FieldHelp } from "@/components/Form/FieldHelp";
import { FieldLabel } from "@/components/Form/FieldLabel";
import formStyles from "@/components/Form/Form.module.css";
import styles from "./Select.module.css";

interface SelectOption {
  id: string;
  label: string;
}

interface SelectProps {
  label: string;
  /** Compact collection filter; form fields keep their stacked label. */
  layout?: "inline";
  /**
   * The label is read by screen readers only, for a filter whose options name it ("All
   * connections", "All outcomes") or a row whose columns do.
   */
  isLabelHidden?: boolean;
  name: string;
  options: readonly SelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  /**
   * A form field's choice can be emptied again: a clear button takes the arrow's place
   * while the pointer is on it or the field has keyboard focus, and Delete or Backspace on
   * the field clears it too. Collection filters leave it off.
   */
  isClearable?: boolean;
  description?: string;
  errorMessage?: string | undefined;
  /** The trigger button, so a form can focus the field when it is invalid. */
  inputRef?: Ref<HTMLButtonElement>;
}

export function Select({
  label,
  layout,
  isLabelHidden,
  options,
  onChange,
  description,
  errorMessage,
  isRequired,
  isClearable = false,
  placeholder = "Select…",
  inputRef,
  ...rest
}: SelectProps) {
  const [trigger, triggerRef] = useTriggerRef(inputRef);
  // A form's empty value may be null, undefined or "": only a listed choice can be cleared.
  const canClear =
    isClearable && !rest.isDisabled && options.some((option) => option.id === rest.value);
  // Focus stays on the field, so the person carries on from where they were.
  const clear = () => {
    onChange(null);
    trigger.current?.focus();
  };
  const button = (
    <Button
      ref={triggerRef}
      className={`${formStyles.control} ${styles.trigger}`}
      onKeyDown={(event) => {
        if (canClear && (event.key === "Delete" || event.key === "Backspace")) clear();
        else event.continuePropagation();
      }}
    >
      <SelectValue className={styles.value} />
      <ChevronDown aria-hidden="true" className={styles.chevron} />
    </Button>
  );
  return (
    <AriaSelect
      {...rest}
      data-layout={layout}
      validationBehavior="aria"
      placeholder={placeholder}
      isRequired={isRequired}
      isInvalid={errorMessage === undefined ? undefined : true}
      onChange={(key) => onChange(key === null ? null : String(key))}
      className={formStyles.field}
    >
      <FieldLabel isRequired={isRequired} isHidden={isLabelHidden}>
        {label}
      </FieldLabel>
      {isClearable ? (
        <div className={styles.clearable}>
          {button}
          {canClear && <ClearButton label={label} onPress={clear} />}
        </div>
      ) : (
        button
      )}
      <FieldHelp description={description} errorMessage={errorMessage} />
      <Popover className={styles.popover}>
        <ListBox items={options} className={styles.listBox}>
          {(option) => (
            <ListBoxItem id={option.id} className={styles.option}>
              {option.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}

function ClearButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Button
      // Out of the Select's button slot, which would make it a second list opener.
      slot={null}
      aria-label={`Clear ${label}`}
      className={styles.clear}
      onPress={onPress}
    >
      <X aria-hidden="true" />
    </Button>
  );
}

/** The trigger for the Select itself, also handed to the form through `inputRef`. */
function useTriggerRef(inputRef: Ref<HTMLButtonElement> | undefined) {
  const trigger = useRef<HTMLButtonElement | null>(null);
  const ref = useCallback(
    (node: HTMLButtonElement | null) => {
      trigger.current = node;
      if (typeof inputRef === "function") inputRef(node);
      else if (inputRef) inputRef.current = node;
    },
    [inputRef],
  );
  return [trigger, ref] as const;
}
