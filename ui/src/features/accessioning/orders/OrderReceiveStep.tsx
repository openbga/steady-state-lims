import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Section } from "@/components/Section";
import type { OrderAccessionContext } from "@/generated/OrderAccessionContext";
import type { OrderDetail } from "@/generated/OrderDetail";
import type { SpecimenTypeView } from "@/generated/SpecimenTypeView";
import { AccessionTestSelection } from "../specimens/AccessionTestSelection";
import type { AccessionFormValues } from "../specimens/accessionValues";
import { CollectionFields } from "../specimens/CollectionFields";
import { SpecimenList } from "../specimens/SpecimenList";
import { activeSection, useClearActiveSectionOutside } from "./activeSection";
import styles from "./OrderForm.module.css";
import { OrderSteps } from "./OrderSteps";
import { OrderSummary, type SummaryPart } from "./OrderSummary";

/**
 * New order's Specimens step around the Receive specimens form: the order bar at Specimens,
 * the accepted order's notice, and the summary with Finish later, which leaves the accepted
 * order for receiving later from its page.
 */
export function OrderReceiveLayout({
  order,
  isPending,
  children,
}: {
  order: OrderDetail;
  isPending: boolean;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const values = useWatch<AccessionFormValues>() as AccessionFormValues;
  const parts = receiveParts(values);
  const ready = parts.every((part) => part.done);
  return (
    <div className={styles.entry}>
      <OrderSteps step="specimens" withSpecimens />
      <div className={styles.main}>
        <div className={styles.accepted}>
          <Alert tone="success" title="Order accepted.">
            Its requisition and tests are saved; corrections go through the{" "}
            <Link to={`/orders/${order.orderId}`}>order page</Link>.
          </Alert>
        </div>
        {children}
      </div>
      <OrderSummary
        parts={parts}
        hint={
          ready
            ? "Collection and specimens are filled in."
            : "Receive specimens works once collection and every specimen are filled in."
        }
        actionLabel="Finish later"
        onAction={() => navigate(`/orders/${order.orderId}`)}
        isPending={isPending}
      />
    </div>
  );
}

/** The fields of the Specimens step, one card each: collection, specimens, tests. */
export function OrderReceiveFields({
  order,
  context,
  specimenTypes,
}: {
  order: OrderDetail;
  context: OrderAccessionContext;
  specimenTypes: readonly SpecimenTypeView[];
}) {
  useClearActiveSectionOutside();
  return (
    <div className={styles.stepFields} {...activeSection}>
      <CollectionFields variant="surface" />
      <Section title="Specimens received">
        <SpecimenList specimenTypes={specimenTypes} />
      </Section>
      <AccessionTestSelection
        order={order}
        context={context}
        selectable
        title="Tests in this accession"
        variant="surface"
      />
    </div>
  );
}

/** The action row of the Specimens step: where labels come next, and Receive specimens. */
export function OrderReceiveActions({ isPending }: { isPending: boolean }) {
  return (
    <>
      <p className={styles.actionsStart}>
        Labels print on the next page, before the receipt decision.
      </p>
      <Button type="submit" variant="primary" isPending={isPending}>
        Receive specimens
        <ChevronRight aria-hidden="true" />
      </Button>
    </>
  );
}

const DONE_ORDER: readonly SummaryPart[] = [
  { label: "Patient", done: true },
  { label: "Ordering source", done: true },
  { label: "Authority to test", done: true },
  { label: "Tests", done: true },
  { label: "Order accepted", done: true },
];

/** The saved order's parts, then whether collection and every specimen are filled in. */
function receiveParts(values: AccessionFormValues): SummaryPart[] {
  return [
    ...DONE_ORDER,
    { label: "Collection", done: collectionDone(values) },
    {
      label: "Specimens",
      done: values.specimens.length > 0 && values.specimens.every(specimenDone),
    },
  ];
}

const filled = (text: string) => text.trim() !== "";

function collectionDone(values: AccessionFormValues): boolean {
  switch (values.timeKind) {
    case "unknown":
      return true;
    case "date":
      return filled(values.collectedDate);
    case "zoned":
      return (
        filled(values.collectedDate) && filled(values.collectedTime) && filled(values.timeZone)
      );
    case "datetime":
      return (
        filled(values.collectedDate) && filled(values.collectedTime) && filled(values.utcOffset)
      );
    default:
      return false;
  }
}

function specimenDone(specimen: AccessionFormValues["specimens"][number]): boolean {
  if (specimen.specimenTypeCode === null || !filled(specimen.containerCount)) return false;
  if (specimen.volumeKind === "unknown") return true;
  return specimen.volumeKind !== null && filled(specimen.volume) && filled(specimen.volumeUnit);
}
