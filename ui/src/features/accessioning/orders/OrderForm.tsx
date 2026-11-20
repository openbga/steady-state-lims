import { ChevronLeft, ChevronRight } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { Navigate, useNavigate } from "react-router";
import { Button } from "@/components/Button";
import { Form } from "@/components/Form";
import { useToast } from "@/components/Toast";
import type { OrderDetail } from "@/generated/OrderDetail";
import type { RegisterOrderInput } from "@/generated/RegisterOrderInput";
import { activeCards, useClearActiveCardOutside } from "@/lib/activeCards";
import { useCommandMutation, useHasCapability } from "@/lib/commands";
import { toValidationErrors } from "@/lib/errors";
import { UnsavedChangesGuard } from "@/lib/UnsavedChangesGuard";
import { AuthorityFields } from "./AuthorityFields";
import { FIND_ORDER_PATIENTS, LIST_ORDERS, REGISTER_ORDER } from "./contract";
import { OptionalDetails } from "./OptionalDetails";
import styles from "./OrderForm.module.css";
import { OrderSteps } from "./OrderSteps";
import { OrderSummary, orderParts } from "./OrderSummary";
import { orderPath } from "./orderColumns";
import {
  isComplete,
  type OrderStep,
  orderProgress,
  REQUISITION_FIELDS,
  stepOfFields,
} from "./orderProgress";
import { EMPTY_ORDER, ORDER_FIELD_PATHS, toRegisterOrderInput } from "./orderValues";
import { RequisitionFields } from "./RequisitionFields";
import type { OrderReferences } from "./references";
import { TestSelection } from "./TestSelection";
import { useAcceptForReceiving } from "./useAcceptForReceiving";

interface OrderFormProps {
  subjectId: string;
  references: OrderReferences;
  /** The order saved and accepted to receive its specimens here, in the Specimens step. */
  onAccepted?: ((order: OrderDetail) => void) | undefined;
}

/** Where the saved order opens: straight to receiving, and with its order billing open. */
function savedOrderPath(orderId: string, receive: boolean, billing: boolean): string {
  const query = [receive && "next=receive", billing && "billing=open"].filter(Boolean).join("&");
  return `${orderPath(orderId)}${query ? `?${query}` : ""}`;
}

const useRegisterOrder = () =>
  useCommandMutation<OrderDetail, { input: RegisterOrderInput }>(REGISTER_ORDER, {
    invalidates: [LIST_ORDERS, FIND_ORDER_PATIENTS],
  });

/**
 * Records a requisition as received, in two steps that follow the paper form: Requisition
 * (who ordered, who pays, authority to test), then Tests and the optional details. Save order
 * leaves it waiting for a decision (REQ-ORD-001) and opens it. Accept order and receive
 * specimens also accepts it and goes on to the Specimens step, unless order billing was asked
 * for next or the order cannot be accepted: then the saved order opens. Back keeps every value;
 * leaving with typed input asks first.
 */
export function OrderForm({ subjectId, references, onAccepted }: OrderFormProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const form = useForm({ defaultValues: EMPTY_ORDER });
  const [step, setStep] = useState<OrderStep>("requisition");
  const [addBilling, setAddBilling] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const receive = useRef(false);
  const canReceive = useHasCapability("accession");
  const progress = orderProgress(useWatch({ control: form.control }) as typeof EMPTY_ORDER);
  const register = useRegisterOrder();
  const openSaved = (order: OrderDetail) =>
    setSavedPath(savedOrderPath(order.orderId, receive.current, addBilling));
  const accept = useAcceptForReceiving({
    onAccepted: (order) => onAccepted?.(order),
    onNotAccepted: openSaved,
  });
  const receiveHere = () => receive.current && !addBilling && onAccepted !== undefined;
  const save = form.handleSubmit(
    (values) =>
      register.mutate(
        { input: toRegisterOrderInput(subjectId, values) },
        {
          onSuccess: (order) => {
            if (receiveHere()) {
              accept.acceptSaved(order);
              return;
            }
            toast.show({ tone: "success", title: "Order received" });
            openSaved(order);
          },
          // A refused field on the other step: show that step, where the field shows the error.
          onError: (error) =>
            setStep(stepOfFields(Object.keys(toValidationErrors(error, ORDER_FIELD_PATHS)))),
        },
      ),
    (errors) => setStep(stepOfFields(Object.keys(errors))),
  );
  async function next() {
    if (await form.trigger(REQUISITION_FIELDS, { shouldFocus: true })) setStep("tests");
  }
  // Enter in a field of the first step checks it and moves on; it never saves.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (step === "tests") return save(event);
    event.preventDefault();
    return next();
  }
  return (
    <FormProvider {...form}>
      {/* Before the redirect, so the guard is released when the saved order opens. */}
      <UnsavedChangesGuard form="New order" when={form.formState.isDirty && savedPath === null} />
      {savedPath !== null && <Navigate to={savedPath} />}
      <div className={styles.entry}>
        <OrderSteps step={step} />
        <div className={styles.main}>
          <Form
            aria-label="New order"
            stickyActions
            onSubmit={onSubmit}
            error={register.error}
            errorTitle="The order was not saved"
            fieldPaths={ORDER_FIELD_PATHS}
            actions={
              <StepActions
                step={step}
                canReceive={canReceive}
                canSave={isComplete(progress)}
                isPending={register.isPending || accept.isPending}
                onBack={() => setStep("requisition")}
                receive={receive}
              />
            }
          >
            <StepFields
              step={step}
              subjectId={subjectId}
              references={references}
              addBilling={addBilling}
              onAddBilling={setAddBilling}
            />
          </Form>
        </div>
        <OrderSummary
          parts={orderParts(progress)}
          hint={
            isComplete(progress)
              ? "All required fields are filled in."
              : "Save order works once the required fields are filled in."
          }
          actionLabel="Cancel"
          onAction={() => navigate(-1)}
          isPending={register.isPending || accept.isPending}
        />
      </div>
    </FormProvider>
  );
}

interface StepFieldsProps extends OrderFormProps {
  step: OrderStep;
  addBilling: boolean;
  onAddBilling: (add: boolean) => void;
}

/** Both steps stay mounted, so Back keeps every value and every field's error. */
function StepFields({ step, subjectId, references, addBilling, onAddBilling }: StepFieldsProps) {
  useClearActiveCardOutside();
  return (
    <>
      <div hidden={step !== "requisition"} className={styles.stepFields} {...activeCards}>
        <RequisitionFields
          clients={references.clients
            .filter((c) => c.active)
            .map((c) => ({ ...c, locations: c.locations.filter((l) => l.active) }))}
          practitioners={references.practitioners.filter((p) => p.active)}
        />
        <AuthorityFields />
      </div>
      <div hidden={step !== "tests"} className={styles.stepFields} {...activeCards}>
        <TestSelection orderables={references.orderables} />
        <OptionalDetails
          subjectId={subjectId}
          addBilling={addBilling}
          onAddBilling={onAddBilling}
        />
      </div>
    </>
  );
}

interface StepActionsProps {
  step: OrderStep;
  canReceive: boolean;
  canSave: boolean;
  isPending: boolean;
  onBack: () => void;
  /** Whether the submit button pressed goes on to receiving. */
  receive: { current: boolean };
}

/** One Next on the first step; Back, Save order and receiving on the second. */
function StepActions(props: StepActionsProps) {
  if (props.step === "requisition") {
    return (
      <>
        <p className={styles.actionsStart}>
          Tip: Enter or Next checks this step and moves on to Tests.
        </p>
        {/* A submit button, so Enter in a field of this step checks it and moves on too. */}
        <Button type="submit" variant="primary">
          Next: Tests
          <ChevronRight aria-hidden="true" />
        </Button>
      </>
    );
  }
  const saving = { isPending: props.isPending, isDisabled: !props.canSave };
  return (
    <>
      <span className={styles.actionsStart}>
        <Button isDisabled={props.isPending} onPress={props.onBack}>
          <ChevronLeft aria-hidden="true" />
          Back: Requisition
        </Button>
      </span>
      <Button
        type="submit"
        variant={props.canReceive ? "secondary" : "primary"}
        {...saving}
        onPress={() => {
          props.receive.current = false;
        }}
      >
        Save order
      </Button>
      {props.canReceive && (
        <Button
          type="submit"
          variant="primary"
          {...saving}
          onPress={() => {
            props.receive.current = true;
          }}
        >
          Accept order and receive specimens
          <ChevronRight aria-hidden="true" />
        </Button>
      )}
    </>
  );
}
