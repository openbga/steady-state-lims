import { useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { Navigate, useNavigate } from "react-router";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Form } from "@/components/Form";
import { useToast } from "@/components/Toast";
import type { AccessionDetail } from "@/generated/AccessionDetail";
import type { CreateAccessionInput } from "@/generated/CreateAccessionInput";
import type { OrderAccessionContext } from "@/generated/OrderAccessionContext";
import type { OrderDetail } from "@/generated/OrderDetail";
import type { SpecimenTypeView } from "@/generated/SpecimenTypeView";
import { useCommandMutation } from "@/lib/commands";
import { UnsavedChangesGuard } from "@/lib/UnsavedChangesGuard";
import { GET_ORDER, LIST_ORDERS } from "../orders/contract";
import { ORDER_ACCESSION_CONTEXT } from "../useOrderAccessionContext";
import { AccessionTestSelection } from "./AccessionTestSelection";
import { type AccessionFormValues, EMPTY_RECEIPT, toCreateAccessionInput } from "./accessionValues";
import { CREATE_ACCESSION } from "./contract";
import { ReceiveCollection } from "./ReceiveCollection";
import { ReceiveSide } from "./ReceiveSide";
import { ReceiveTests } from "./ReceiveTests";
import { missingEntries, missingText } from "./receiveProgress";
import styles from "./receiving.module.css";
import { SpecimenRows } from "./SpecimenRows";

interface AccessionFormProps {
  order: OrderDetail;
  context: OrderAccessionContext;
  specimenTypes: readonly SpecimenTypeView[];
}

const FIELD_PATHS = {
  "collection.time.timeZone": "timeZone",
  "collection.utcOffsetMinutes": "utcOffset",
  "collection.date": "collectedDate",
  "collection.time": "collectedTime",
  "collection.collector": "collector",
};

/**
 * Receive specimens (REQ-SPC-001, REQ-SPC-002): three numbered boxes (the tests for this
 * material, the collection, the specimens received) beside what comes next and the order's
 * counts. Receive specimens works once every required entry is in, as the line beside it says;
 * Cancel opens the order. A failed or stale command keeps every entered field for correction.
 */
export function AccessionForm({ order, context, specimenTypes }: AccessionFormProps) {
  const eligible = context.items.filter((item) => item.eligible);
  const form = useForm<AccessionFormValues>({
    defaultValues: {
      ...EMPTY_RECEIPT,
      // The only test waiting is the one this material is for; with several, none is assumed.
      orderItemIds: eligible.length === 1 ? eligible.map((item) => item.orderItemId) : [],
    },
  });
  const [savedId, setSavedId] = useState<string | null>(null);
  const create = useCreateAccession(order.orderId, setSavedId);
  // Keep this component mounted while mutation invalidation updates eligibility, so its
  // success callback can release the unsaved-input guard and open the created accession.
  const canReceive = context.allowedActions.includes("create_accession") && eligible.length > 0;
  const blocked = !canReceive && !create.isPending;
  return (
    <FormProvider {...form}>
      <UnsavedChangesGuard
        form="Receive specimens"
        when={form.formState.isDirty && savedId === null}
      />
      {savedId !== null && <Navigate to={`/accessions/${savedId}`} />}
      {blocked ? (
        <>
          <EmptyState
            title="No tests available to receive"
            description="Review this order's test status or continue an existing accession below."
          />
          <AccessionTestSelection order={order} context={context} />
        </>
      ) : (
        <div className={styles.receiveLayout}>
          <Form
            aria-label="Receive specimens"
            stickyActions
            fieldPaths={FIELD_PATHS}
            onSubmit={form.handleSubmit((values) => create.submit(values))}
            error={create.error}
            errorTitle="The specimens were not saved"
            actions={<ReceiveActions orderId={order.orderId} isPending={create.isPending} />}
          >
            <div className={styles.boxes}>
              <ReceiveTests order={order} context={context} />
              <ReceiveCollection />
              <SpecimenRowsForTests context={context} specimenTypes={specimenTypes} />
            </div>
          </Form>
          <ReceiveSide context={context} />
        </div>
      )}
    </FormProvider>
  );
}

function useCreateAccession(orderId: string, onCreated: (accessionId: string) => void) {
  const toast = useToast();
  const create = useCommandMutation<AccessionDetail, { input: CreateAccessionInput }>(
    CREATE_ACCESSION,
    { invalidates: [GET_ORDER, LIST_ORDERS, ORDER_ACCESSION_CONTEXT] },
  );
  const submit = (values: AccessionFormValues) =>
    create.mutate(
      { input: toCreateAccessionInput(orderId, values) },
      {
        onSuccess: (accession) => {
          toast.show({
            tone: "success",
            title: `Accession ${accession.accessionNumber} created`,
            description: "Check the container labels and record each receipt decision.",
          });
          onCreated(accession.accessionId);
        },
      },
    );
  return { submit, isPending: create.isPending, error: create.error };
}

/** Box 3, with the specimen types the chosen tests need. */
function SpecimenRowsForTests({
  context,
  specimenTypes,
}: {
  context: OrderAccessionContext;
  specimenTypes: readonly SpecimenTypeView[];
}) {
  const chosen = useWatch<AccessionFormValues, "orderItemIds">({ name: "orderItemIds" });
  const required = [
    ...new Set(
      context.items
        .filter((item) => chosen.includes(item.orderItemId))
        .flatMap((item) => item.requiredSpecimenTypeCodes),
    ),
  ];
  return <SpecimenRows specimenTypes={specimenTypes} requiredTypes={required} />;
}

/** Receive specimens, Cancel, and what is still missing. */
function ReceiveActions({ orderId, isPending }: { orderId: string; isPending: boolean }) {
  const navigate = useNavigate();
  const values = useWatch<AccessionFormValues>() as AccessionFormValues;
  const missing = missingEntries(values);
  return (
    <>
      <Button type="submit" variant="primary" isPending={isPending} isDisabled={missing.length > 0}>
        Receive specimens
      </Button>
      <Button isDisabled={isPending} onPress={() => navigate(`/orders/${orderId}`)}>
        Cancel
      </Button>
      <p role="status" className={styles.missing}>
        {missingText(missing)}
      </p>
    </>
  );
}
