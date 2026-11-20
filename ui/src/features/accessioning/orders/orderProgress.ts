import type { FieldPath } from "react-hook-form";
import type { OrderFormValues } from "./orderValues";

/** The two steps of order details, in the order of the paper requisition. */
export type OrderStep = "requisition" | "tests";

/** Step 1, Requisition: who ordered, who pays, and the authority to test. */
export const REQUISITION_FIELDS: FieldPath<OrderFormValues>[] = [
  "clientId",
  "clientLocationId",
  "practitionerId",
  "sourceKind",
  "billingResponsibility",
  "templateKind",
  "templateName",
  "templateConfirmed",
  "placerOrderId",
  "placerAuthority",
  "sourceDocumentRef",
  "facilitySetting",
  "authority.kind",
  "authority.documentRef",
];

const REQUISITION_ROOTS = new Set(REQUISITION_FIELDS.map((name) => name.split(".")[0]));

/** The step holding the first of these invalid form fields; Tests when none is on step 1. */
export function stepOfFields(names: readonly string[]): OrderStep {
  return names.some((name) => REQUISITION_ROOTS.has(name.split(/[.[]/)[0] ?? ""))
    ? "requisition"
    : "tests";
}

/** Which parts of the requisition hold every required entry, for the order summary. */
export interface OrderProgress {
  orderingSource: boolean;
  authority: boolean;
  tests: boolean;
}

export function orderProgress(values: OrderFormValues): OrderProgress {
  const template =
    values.templateKind === "clinic_template"
      ? Boolean(values.templateName.trim() && values.templateConfirmed)
      : values.templateKind !== null;
  return {
    orderingSource: Boolean(
      values.clientId &&
        values.practitionerId &&
        values.sourceKind &&
        values.billingResponsibility &&
        template,
    ),
    authority: values.authority.kind !== null,
    tests:
      values.items.length > 0 &&
      values.items.every((item) => item.sequenceRole && item.reflexAuthorization),
  };
}

export const isComplete = (progress: OrderProgress) =>
  progress.orderingSource && progress.authority && progress.tests;
