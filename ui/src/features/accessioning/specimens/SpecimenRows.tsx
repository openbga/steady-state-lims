import { Plus, X } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/Button";
import { ChoiceInput, SegmentedInput, TextInput } from "@/components/FormFields";
import type { SpecimenTypeView } from "@/generated/SpecimenTypeView";
import { type AccessionFormValues, EMPTY_SPECIMEN } from "./accessionValues";
import { COUNT_FORMAT, VOLUME_FORMAT } from "./formats";
import { VOLUME_KINDS } from "./labels";
import styles from "./receiving.module.css";

/**
 * The specimens received in New order's Specimens step, one row each: its number, type,
 * containers and volume, with × to remove it while there is more than one, and Add specimen
 * below. The same values as `SpecimenList` (REQ-SPC-001, REQ-SPC-003); nothing is chosen for
 * the user.
 */
export function SpecimenRows({ specimenTypes }: { specimenTypes: readonly SpecimenTypeView[] }) {
  const { control } = useFormContext<AccessionFormValues>();
  const specimens = useFieldArray({ control, name: "specimens" });
  const typeOptions = specimenTypes.map((type) => ({ id: type.code, label: type.name }));
  return (
    <div className={styles.specimenRows}>
      <ol className={styles.specimenList} aria-label="Specimens received">
        {specimens.fields.map((field, index) => (
          <li key={field.id} className={styles.specimenRow}>
            <span className={styles.specimenNumber} aria-hidden="true">
              {index + 1}
            </span>
            <ChoiceInput
              name={`specimens.${index}.specimenTypeCode`}
              label="Specimen type"
              options={typeOptions}
              isRequired
            />
            <TextInput
              name={`specimens.${index}.containerCount`}
              label="Containers"
              format={COUNT_FORMAT}
              isRequired
            />
            <SpecimenVolume index={index} />
            {specimens.fields.length > 1 && (
              <Button
                variant="quiet"
                aria-label={`Remove specimen ${index + 1}`}
                onPress={() => specimens.remove(index)}
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </li>
        ))}
      </ol>
      <div className={styles.addSpecimen}>
        <Button variant="quiet" onPress={() => specimens.append(EMPTY_SPECIMEN)}>
          <Plus aria-hidden="true" />
          Add specimen
        </Button>
      </div>
    </div>
  );
}

/** How the volume was obtained, then the volume and its unit; Unknown empties both. */
function SpecimenVolume({ index }: { index: number }) {
  const { control, setValue, clearErrors } = useFormContext<AccessionFormValues>();
  const kind = useWatch({ control, name: `specimens.${index}.volumeKind` });
  const unknown = kind === "unknown";
  useEffect(() => {
    if (!unknown) return;
    setValue(`specimens.${index}.volume`, "");
    setValue(`specimens.${index}.volumeUnit`, "");
    clearErrors([`specimens.${index}.volume`, `specimens.${index}.volumeUnit`]);
  }, [unknown, index, setValue, clearErrors]);
  const known = kind === "measured" || kind === "estimated";
  return (
    <>
      <SegmentedInput
        name={`specimens.${index}.volumeKind`}
        label="Volume is"
        options={VOLUME_KINDS}
        hiddenSuffix={` for specimen ${index + 1}`}
        isRequired
      />
      <TextInput
        name={`specimens.${index}.volume`}
        label="Volume"
        format={VOLUME_FORMAT}
        isRequired={known}
        isDisabled={unknown}
      />
      <TextInput
        name={`specimens.${index}.volumeUnit`}
        label="Unit"
        isRequired={known}
        isDisabled={unknown}
      />
    </>
  );
}
