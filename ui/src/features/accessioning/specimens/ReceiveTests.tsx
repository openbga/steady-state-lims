import { useContext } from "react";
import { FormValidationContext, VisuallyHidden } from "react-aria-components";
import { Controller, useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/Checkbox";
import { Section } from "@/components/Section";
import type { OrderAccessionContext } from "@/generated/OrderAccessionContext";
import type { OrderDetail } from "@/generated/OrderDetail";
import { AccessionTestSelection } from "./AccessionTestSelection";
import type { AccessionFormValues } from "./accessionValues";
import styles from "./receiving.module.css";

interface ReceiveTestsProps {
  order: OrderDetail;
  context: OrderAccessionContext;
}

/**
 * Box 1, the order's tests waiting for material, one checkbox row each with the specimen
 * types it needs. The only test waiting is chosen already, and says so; with several, none is
 * chosen for the person. Tests that cannot be received now, and earlier accessions, are listed
 * below with the engine's reason.
 */
export function ReceiveTests({ order, context }: ReceiveTestsProps) {
  const { control } = useFormContext<AccessionFormValues>();
  const engineError = useContext(FormValidationContext).orderItemIds;
  const eligible = context.items.filter((item) => item.eligible);
  const names = new Map(
    order.items.map((item) => [item.itemId, `${item.orderableCode} ${item.orderableName}`]),
  );
  const others = context.items.length > eligible.length || context.accessions.length > 0;
  return (
    <Section title="1 · Tests for this material">
      <Controller
        control={control}
        name="orderItemIds"
        rules={{ validate: (ids: string[]) => ids.length > 0 || "Choose at least one test." }}
        render={({ field, fieldState }) => (
          <fieldset className={styles.testRows}>
            <VisuallyHidden elementType="legend">Tests for this material</VisuallyHidden>
            {eligible.map((item) => (
              <div key={item.orderItemId} className={styles.testRow}>
                <Checkbox
                  isSelected={field.value.includes(item.orderItemId)}
                  onChange={(selected) =>
                    field.onChange(
                      selected
                        ? [...field.value, item.orderItemId]
                        : field.value.filter((id) => id !== item.orderItemId),
                    )
                  }
                >
                  <strong>{names.get(item.orderItemId) ?? item.orderItemId}</strong>
                  {item.requiredSpecimenTypeCodes.map((code) => (
                    <span key={code} className={styles.typeBadge}>
                      {code}
                    </span>
                  ))}
                </Checkbox>
                {eligible.length === 1 && (
                  <span className={styles.testNote}>
                    Selected: the only test waiting for material
                  </span>
                )}
              </div>
            ))}
            {(fieldState.error?.message ?? engineError) && (
              <p className={styles.fieldError}>
                {fieldState.error?.message ?? String(engineError)}
              </p>
            )}
          </fieldset>
        )}
      />
      {others && <AccessionTestSelection order={order} context={context} />}
    </Section>
  );
}
