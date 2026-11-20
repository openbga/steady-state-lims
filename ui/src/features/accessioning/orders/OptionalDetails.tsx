import { Plus } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Section } from "@/components/Section";
import { DiagnosisList } from "./DiagnosisList";
import { MedicationList } from "./MedicationList";
import styles from "./OrderForm.module.css";
import type { OrderFormValues } from "./orderValues";
import { PocResultList } from "./PocResultList";
import { StandingOrderChoice } from "./StandingOrders";

type Part = "diagnoses" | "medications" | "pointOfCare" | "standing";

interface OptionalDetailsProps {
  subjectId: string;
  /** Whether the saved order opens with its order billing ready to add. */
  addBilling: boolean;
  onAddBilling: (add: boolean) => void;
}

/**
 * Evidence many requisitions do not carry (REQ-ORD-005, REQ-ORD-007), as small buttons with
 * their counts rather than open forms. A part with entries stays open so its fields, and any
 * error on them, are always visible. Nothing is suggested or prefilled.
 */
export function OptionalDetails({ subjectId, addBilling, onAddBilling }: OptionalDetailsProps) {
  const { control } = useFormContext<OrderFormValues>();
  const [diagnoses, medications, pointOfCare, standingOrderId] = useWatch({
    control,
    name: ["diagnoses", "medications", "pointOfCareResults", "standingOrderId"],
  });
  const [opened, setOpened] = useState<ReadonlySet<Part>>(new Set());
  const ids = { diagnoses: useId(), medications: useId(), pointOfCare: useId(), standing: useId() };
  const shown = (part: Part, used: boolean) => used || opened.has(part);
  const toggle = (part: Part) =>
    setOpened((current) => {
      const next = new Set(current);
      if (!next.delete(part)) next.add(part);
      return next;
    });
  const parts: { part: Part; label: string; used: boolean; content: ReactNode }[] = [
    {
      part: "diagnoses",
      label: `Diagnoses (${diagnoses.length})`,
      used: diagnoses.length > 0,
      content: <DiagnosisList />,
    },
    {
      part: "medications",
      label: `Medications (${medications.length})`,
      used: medications.length > 0,
      content: <MedicationList />,
    },
    {
      part: "pointOfCare",
      label: `Point-of-care results (${pointOfCare.length})`,
      used: pointOfCare.length > 0,
      content: <PocResultList />,
    },
    {
      part: "standing",
      label: "Standing authority",
      used: standingOrderId !== null,
      content: <StandingOrderChoice subjectId={subjectId} />,
    },
  ];
  return (
    <Section title="Only if the requisition has them">
      <div className={styles.chips}>
        {parts.map(({ part, label, used }) => (
          <Button
            key={part}
            variant="quiet"
            aria-expanded={shown(part, used)}
            aria-controls={shown(part, used) ? ids[part] : undefined}
            onPress={() => toggle(part)}
          >
            <Plus aria-hidden="true" />
            {label}
          </Button>
        ))}
        <Button variant="quiet" aria-pressed={addBilling} onPress={() => onAddBilling(!addBilling)}>
          <Plus aria-hidden="true" />
          Order billing
        </Button>
      </div>
      {parts.map(
        ({ part, used, content }) =>
          shown(part, used) && (
            <div key={part} id={ids[part]}>
              {content}
            </div>
          ),
      )}
      <BillingNote addBilling={addBilling} onAddBilling={onAddBilling} />
    </Section>
  );
}

/** Order billing is added on the saved order; an empty one warns but never blocks saving. */
function BillingNote({ addBilling, onAddBilling }: Omit<OptionalDetailsProps, "subjectId">) {
  if (addBilling) {
    return (
      <Alert tone="info" title="Order billing opens after saving">
        The saved order opens with its Order billing section, ready to confirm the billing
        selection.
      </Alert>
    );
  }
  return (
    <Alert tone="warning" title="Order billing is empty.">
      <div className={styles.billingNote}>
        <p>You can save without it; billing for this order is held until it is added.</p>
        <Button onPress={() => onAddBilling(true)}>Add order billing</Button>
      </div>
    </Alert>
  );
}
