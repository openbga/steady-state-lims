import { Alert } from "@/components/Alert";
import { DATE_FORMAT, TextInput } from "@/components/FormFields";
import type { CorrectLotInput } from "@/generated/CorrectLotInput";
import type { LotView } from "@/generated/LotView";
import { CommandDialog } from "@/lib/CommandDialog";
import { labelOf, omittedIfBlank } from "@/lib/choices";
import { LOT_HISTORY, LOT_QUERIES } from "../contract";
import { MATERIAL_KINDS } from "../labels";
import { hasSampleLabel } from "./RegisterLotDialog";

interface Values {
  productName: string;
  lotNumber: string;
  levelText: string;
  sampleLabel: string;
  expiresOn: string;
  reason: string;
}

/** The values a correction may change, as the input sends them. */
function corrected(lot: LotView, values: Values) {
  return {
    productName: values.productName.trim(),
    lotNumber: values.lotNumber.trim(),
    levelText: omittedIfBlank(values.levelText),
    sampleLabel: hasSampleLabel(lot.materialKind) ? omittedIfBlank(values.sampleLabel) : undefined,
    expiresOn: values.expiresOn.trim(),
  };
}

function changesSomething(lot: LotView, values: Values): boolean {
  const next = corrected(lot, values);
  return (
    next.productName !== lot.productName ||
    next.lotNumber !== lot.lotNumber ||
    (next.levelText ?? null) !== lot.levelText ||
    (next.sampleLabel ?? null) !== lot.sampleLabel ||
    next.expiresOn !== lot.expiresOn
  );
}

/**
 * Corrects an active lot's values as a new revision with a reason (#4558). The material never
 * changes. Runs keep the values they used; new runs, QC positions and imports use the corrected
 * ones. The engine refuses a lot number the product already has and a sample label another
 * active lot uses.
 */
export function CorrectLotDialog({ lot, onClose }: { lot: LotView; onClose: () => void }) {
  const material = labelOf(MATERIAL_KINDS, lot.materialKind);
  return (
    <CommandDialog<Values, CorrectLotInput, LotView>
      title={`Correct lot ${lot.lotNumber}`}
      submitLabel="Save correction"
      command={{ name: "correct_lot", invalidates: [...LOT_QUERIES, LOT_HISTORY] }}
      defaultValues={{
        productName: lot.productName,
        lotNumber: lot.lotNumber,
        levelText: lot.levelText ?? "",
        sampleLabel: lot.sampleLabel ?? "",
        expiresOn: lot.expiresOn,
        reason: "",
      }}
      toInput={(values) => ({
        lotId: lot.lotId,
        expectedRevision: lot.revision,
        ...corrected(lot, values),
        reason: values.reason.trim(),
      })}
      canSubmit={(values) => changesSomething(lot, values)}
      successTitle={(_, result) => `Lot ${result.lotNumber} corrected`}
      onClose={onClose}
    >
      <Alert tone="info" compact>
        <ul>
          <li>
            The material stays {material}. To fix a wrong material, withdraw this lot and register a
            new one.
          </li>
          <li>
            Runs that already used this lot keep the values they recorded. New runs, QC positions
            and imports use the corrected values.
          </li>
          <li>Save correction is available once a value has changed.</li>
        </ul>
      </Alert>
      <TextInput name="productName" label="Product" isRequired />
      <TextInput name="lotNumber" label="Lot number" isRequired />
      <TextInput name="levelText" label="Level" description="Such as Level 1, for controls." />
      {hasSampleLabel(lot.materialKind) && (
        <TextInput
          name="sampleLabel"
          label="Sample label"
          description="The label the analyzer sends for this control or calibrator. No other active lot may use it."
          isRequired
        />
      )}
      <TextInput
        name="expiresOn"
        label="Expires on"
        format={DATE_FORMAT}
        description="A date in the past makes the lot expired: it can't be used for new work."
        isRequired
      />
      <TextInput
        name="reason"
        label="Reason"
        isRequired
        description="Why the lot is corrected, up to 1000 characters."
      />
    </CommandDialog>
  );
}
