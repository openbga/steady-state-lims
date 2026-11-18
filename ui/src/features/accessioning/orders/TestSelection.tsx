import { X } from "lucide-react";
import { useContext, useRef } from "react";
import { FormValidationContext } from "react-aria-components";
import {
  useController,
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
} from "react-hook-form";
import { Button } from "@/components/Button";
import { SegmentedInput } from "@/components/FormFields";
import { Inset } from "@/components/Inset";
import { Section } from "@/components/Section";
import type { OrderableVersionView } from "@/generated/OrderableVersionView";
import styles from "../accessioning.module.css";
import { REFLEX_AUTHORIZATIONS, SEQUENCE_ROLES } from "./labels";
import formStyles from "./OrderForm.module.css";
import type { OrderFormValues } from "./orderValues";
import { orderableLabel } from "./references";
import { TestChecklist } from "./TestChecklist";

/**
 * The tests marked on the requisition, from the current approved catalog, with the testing
 * sequence role and reflex authority each one carries (REQ-ORD-001, REQ-ORD-003,
 * REQ-RES-002). Nothing is preselected.
 */
export function TestSelection({ orderables }: { orderables: readonly OrderableVersionView[] }) {
  const { control } = useFormContext<OrderFormValues>();
  const selection = useRef<HTMLDivElement>(null);
  const items = useFieldArray({
    control,
    name: "items",
    rules: { validate: (value) => value.length > 0 || "Choose at least one test." },
  });
  const selected = useWatch({ control, name: "items" });
  const { errors } = useFormState({ control, name: "items" });

  // A range selection can change several IDs. Retain supplied fields on every surviving item.
  function change(next: string[]) {
    const current = selected.map((item) => item.orderableVersionId);
    const added = next.filter((id) => !current.includes(id)).map(emptyItem);
    const removed = current.flatMap((id, index) => (next.includes(id) ? [] : [index]));
    if (added.length && removed.length) {
      items.replace(
        next.map((id) => selected.find((item) => item.orderableVersionId === id) ?? emptyItem(id)),
      );
    } else if (added.length) items.append(added, { shouldFocus: false });
    else if (removed.length) items.remove(removed);
  }

  return (
    <Section title="Tests">
      <div ref={selection} className={styles.group}>
        <TestChecklist
          legend="Tests ordered"
          name="tests"
          orderables={orderables}
          idOf={versionId}
          chosen={selected.map((item) => item.orderableVersionId)}
          onChange={change}
          isRequired
          errorMessage={errors.items?.root?.message}
        >
          <ul className={styles.list} aria-label="Chosen tests">
            {items.fields.length === 0 && (
              <li className={styles.hint}>
                No tests chosen yet. Search above for each test or panel marked on the requisition.
              </li>
            )}
            {items.fields.map((field, index) => {
              const orderable = orderables.find((each) => each.id === field.orderableVersionId);
              return (
                <li key={field.id}>
                  <ReflexFields
                    index={index}
                    orderable={orderable}
                    others={orderables.filter((each) => each.id !== field.orderableVersionId)}
                    onRemove={() => {
                      items.remove(index);
                      selection.current?.querySelector<HTMLInputElement>("input")?.focus();
                    }}
                  />
                </li>
              );
            })}
          </ul>
          {items.fields.length > 1 && <ApplyToAll count={items.fields.length} />}
        </TestChecklist>
      </div>
    </Section>
  );
}

/**
 * Copies the first test's sequence role and reflex testing to the other tests, for a
 * requisition that states them once for all. Each test's reflex scope stays its own.
 */
function ApplyToAll({ count }: { count: number }) {
  const { getValues, setValue } = useFormContext<OrderFormValues>();
  function apply() {
    const [first] = getValues("items");
    for (let index = 1; index < count; index += 1) {
      for (const name of ["sequenceRole", "reflexAuthorization"] as const) {
        setValue(`items.${index}.${name}`, first?.[name] ?? null, { shouldDirty: true });
      }
    }
  }
  return (
    <p className={formStyles.hint}>
      With more than one test:{" "}
      <Button variant="quiet" onPress={apply}>
        Apply the first test's choices to all tests
      </Button>
    </p>
  );
}

function emptyItem(orderableVersionId: string): OrderFormValues["items"][number] {
  return {
    orderableVersionId,
    sequenceRole: null,
    reflexAuthorization: null,
    reflexScopeOrderableIds: [],
  };
}

interface ReflexFieldsProps {
  index: number;
  title: string;
  /** The other orderables a reflex may extend to. */
  others: readonly OrderableVersionView[];
}

interface TestRowProps extends Omit<ReflexFieldsProps, "title"> {
  /** `undefined` for a version no longer in the active catalog. */
  orderable: OrderableVersionView | undefined;
  onRemove: () => void;
}

/** One chosen test: its name, then its sequence role, reflex testing and × on the same row. */
function ReflexFields({ index, orderable, others, onRemove }: TestRowProps) {
  const { control } = useFormContext<OrderFormValues>();
  const authorization = useWatch({ control, name: `items.${index}.reflexAuthorization` });
  const title = orderable ? orderableLabel(orderable) : "Test";
  return (
    <Inset as="fieldset">
      <legend className={formStyles.testName}>
        {orderable ? (
          <>
            <strong>{orderable.name}</strong>{" "}
            <span className={formStyles.hint}>{orderable.code}</span>
          </>
        ) : (
          title
        )}
      </legend>
      <div className={formStyles.selectedFields}>
        <SegmentedInput
          name={`items.${index}.sequenceRole`}
          label="Sequence role"
          hiddenSuffix={` for ${title}`}
          options={SEQUENCE_ROLES}
          tip={
            <p>
              The test's place in the testing sequence, as the requisition states it. Never inferred
              from the test or the panel name.
            </p>
          }
          isRequired
        />
        <SegmentedInput
          name={`items.${index}.reflexAuthorization`}
          label="Reflex testing"
          hiddenSuffix={` for ${title}`}
          options={REFLEX_AUTHORIZATIONS}
          isRequired
        />
        <Button variant="quiet" aria-label={`Remove ${title}`} onPress={onRemove}>
          <X aria-hidden="true" />
        </Button>
      </div>
      {authorization === "authorized" && (
        <ReflexScope index={index} title={title} others={others} />
      )}
    </Inset>
  );
}

const versionId = (orderable: OrderableVersionView) => orderable.id;
const orderableId = (orderable: OrderableVersionView) => orderable.orderableId;

/**
 * The tests a reflex may extend to, by stable orderable ID, found like the tests ordered.
 * The engine's error for the scope shows under it.
 */
function ReflexScope({ index, title, others }: ReflexFieldsProps) {
  const { control } = useFormContext<OrderFormValues>();
  const { field, fieldState } = useController({
    control,
    name: `items.${index}.reflexScopeOrderableIds`,
  });
  const engineError = useContext(FormValidationContext)[field.name];
  const engineMessage = Array.isArray(engineError) ? engineError.join(" ") : engineError;
  return (
    <TestChecklist
      legend="Reflex tests authorized"
      name={`reflex tests for ${title}`}
      orderables={others}
      idOf={orderableId}
      chosen={field.value}
      onChange={field.onChange}
      errorMessage={fieldState.error?.message ?? engineMessage}
    />
  );
}
