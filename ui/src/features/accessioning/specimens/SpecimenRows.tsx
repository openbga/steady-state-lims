import { Plus, X } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/Button";
import { ChoiceInput, SegmentedInput, TextInput } from "@/components/FormFields";
import { Section } from "@/components/Section";
import type { SpecimenTypeView } from "@/generated/SpecimenTypeView";
import { type AccessionFormValues, EMPTY_SPECIMEN } from "./accessionValues";
import { COUNT_FORMAT, VOLUME_FORMAT } from "./formats";
import styles from "./receiving.module.css";

/** Units offered for a volume; mL is where a new row starts. */
const UNITS = ["mL", "L"].map((unit) => ({ id: unit, label: unit }));

/** How a typed volume was obtained. Without a volume, the volume is recorded as unknown. */
const VOLUME_IS = [
  { id: "measured", label: "Measured" },
  { id: "estimated", label: "Estimated" },
];

const NEW_ROW = { ...EMPTY_SPECIMEN, volumeUnit: "mL" };

interface SpecimenRowsProps {
  specimenTypes: readonly SpecimenTypeView[];
  /** The specimen types the chosen tests need: each gets a row, filled in, if none has it. */
  requiredTypes: readonly string[];
}

/**
 * Box 3, the specimens received, one row each: type, containers, volume, unit and whether the
 * volume was measured or estimated, with Remove while there is more than one (REQ-SPC-001,
 * REQ-SPC-003). Choosing tests fills in the types they need; each can still be changed.
 */
export function SpecimenRows({ specimenTypes, requiredTypes }: SpecimenRowsProps) {
  const { control, getValues, setValue } = useFormContext<AccessionFormValues>();
  const rows = useFieldArray({ control, name: "specimens" });
  const typeOptions = specimenTypes.map((type) => ({
    id: type.code,
    label: `${type.name} (${type.code})`,
  }));
  const needed = requiredTypes.join(" ");
  useEffect(() => {
    const current = getValues("specimens");
    const missing = needed
      .split(" ")
      .filter((code) => code && !current.some((row) => row.specimenTypeCode === code));
    for (const code of missing) {
      const empty = getValues("specimens").findIndex((row) => row.specimenTypeCode === null);
      if (empty >= 0) setValue(`specimens.${empty}.specimenTypeCode`, code);
      else rows.append({ ...NEW_ROW, specimenTypeCode: code });
    }
  }, [needed, getValues, setValue, rows.append]);
  return (
    <Section
      title={
        <>
          3 · Specimens received <span className={styles.countBadge}>{rows.fields.length}</span>
        </>
      }
    >
      <ol className={styles.specimenList} aria-label="Specimens received">
        {rows.fields.map((field, index) => (
          <li key={field.id} className={styles.specimenRow}>
            <span className={styles.specimenNumber}>{index + 1}</span>
            <div className={styles.typeCell}>
              <ChoiceInput
                name={`specimens.${index}.specimenTypeCode`}
                label="Specimen type"
                options={typeOptions}
                isRequired
              />
            </div>
            <TextInput
              name={`specimens.${index}.containerCount`}
              label="Containers"
              format={COUNT_FORMAT}
              isRequired
            />
            <SpecimenVolume index={index} />
            {rows.fields.length > 1 && (
              <Button
                variant="quiet"
                onPress={() => rows.remove(index)}
                aria-label={`Remove specimen ${index + 1}`}
              >
                <X aria-hidden="true" />
                Remove
              </Button>
            )}
          </li>
        ))}
      </ol>
      <div>
        <Button variant="link" onPress={() => rows.append(NEW_ROW)}>
          <Plus aria-hidden="true" />
          Add another specimen
        </Button>
      </div>
    </Section>
  );
}

/** Volume and unit as supplied, then Measured or Estimated, needed once a volume is typed. */
function SpecimenVolume({ index }: { index: number }) {
  const { control } = useFormContext<AccessionFormValues>();
  const volume = useWatch({ control, name: `specimens.${index}.volume` });
  return (
    <>
      <TextInput name={`specimens.${index}.volume`} label="Volume" format={VOLUME_FORMAT} />
      <ChoiceInput name={`specimens.${index}.volumeUnit`} label="Unit" options={UNITS} />
      <div className={styles.volumeIsCell}>
        <SegmentedInput
          name={`specimens.${index}.volumeKind`}
          label="Volume is"
          options={VOLUME_IS}
          hiddenSuffix={` for specimen ${index + 1}`}
          isRequired={volume.trim() !== ""}
        />
      </div>
    </>
  );
}
