import { Globe } from "lucide-react";
import { useContext, useState } from "react";
import { VisuallyHidden } from "react-aria-components";
import { useFormContext, useWatch } from "react-hook-form";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { TimePickerButton } from "@/components/FieldPicker";
import formStyles from "@/components/Form/Form.module.css";
import { DATE_FORMAT, TextInput } from "@/components/FormFields";
import { Section } from "@/components/Section";
import { LabTimeZoneContext } from "@/lib/format";
import type { AccessionFormValues } from "./accessionValues";
import { OFFSET_FORMAT, TIME_FORMAT } from "./formats";
import styles from "./receive.module.css";

const NOT_ON_REQUISITION = "Not on the requisition";

/**
 * Box 2, the collection as the requisition states it (REQ-SPC-002): date (calendar) and time
 * (clock), both empty, and who collected. Time not on the requisition records Date only; Date
 * not on the requisition records Unknown, with the time too. A date and time need the
 * collection site's time zone: the laboratory's in one press, or another named zone or a UTC
 * offset. Nothing is filled in for the person.
 */
export function ReceiveCollection() {
  const { control, setValue, clearErrors } = useFormContext<AccessionFormValues>();
  const kind = useWatch({ control, name: "timeKind" });
  const set = (name: "collectedDate" | "collectedTime", value: string) =>
    setValue(name, value, { shouldDirty: true });
  const setKind = (next: AccessionFormValues["timeKind"]) => {
    setValue("timeKind", next, { shouldDirty: true });
    if (next === "date" || next === "unknown") set("collectedTime", "");
    if (next === "unknown") set("collectedDate", "");
    clearErrors(["collectedDate", "collectedTime"]);
  };
  const noDate = kind === "unknown";
  const noTime = noDate || kind === "date";
  return (
    <Section title="2 · Collection">
      <div className={styles.collectionRow}>
        {noDate ? (
          <TextInput
            name="collectedDate"
            label="Collection date"
            placeholder={NOT_ON_REQUISITION}
            isDisabled
          />
        ) : (
          <TextInput
            name="collectedDate"
            label="Collection date"
            format={DATE_FORMAT}
            isRequired
            isPastOnly
          />
        )}
        {noTime ? (
          <TextInput
            name="collectedTime"
            label="Collection time"
            placeholder={NOT_ON_REQUISITION}
            isDisabled
          />
        ) : (
          <TextInput
            name="collectedTime"
            label="Collection time"
            format={TIME_FORMAT}
            isRequired
            picker={(value, pick) => (
              <TimePickerButton label="Choose the collection time" value={value} onPick={pick} />
            )}
          />
        )}
        <TextInput name="collector" label="Collected by" />
      </div>
      <div className={styles.collectionChecks}>
        <Checkbox
          isSelected={noTime}
          isDisabled={noDate}
          onChange={(selected) => setKind(selected ? "date" : "zoned")}
        >
          Time not on the requisition
        </Checkbox>
        <Checkbox
          isSelected={noDate}
          onChange={(selected) => setKind(selected ? "unknown" : "date")}
        >
          Date not on the requisition
        </Checkbox>
      </div>
      {!noTime && <TimeZoneLine />}
      {kind === "date" && (
        <Alert tone="info" compact>
          The report will show "time not recorded".
        </Alert>
      )}
      {noDate && (
        <Alert tone="warning" compact>
          Without a collection date, billing for this order will be held ("Date of service
          unknown"), and correcting it later requires a collection correction and quality review.
          Choose Date not on the requisition only if no date was supplied.
        </Alert>
      )}
    </Section>
  );
}

/**
 * The collection site's time zone under the date and time: not set, with the laboratory's
 * zone one press away; set, with Change; or, for a requisition that states another zone, a
 * named zone or a UTC offset typed as supplied.
 */
function TimeZoneLine() {
  const { control, setValue } = useFormContext<AccessionFormValues>();
  const labTimeZone = useContext(LabTimeZoneContext);
  const [kind, timeZone] = useWatch({ control, name: ["timeKind", "timeZone"] });
  const [other, setOther] = useState(false);
  const choose = (zone: string) => {
    setValue("timeKind", "zoned", { shouldDirty: true });
    setValue("timeZone", zone, { shouldDirty: true, shouldValidate: true });
    setValue("utcOffset", "", { shouldDirty: true });
    setOther(false);
  };
  if (!other && kind === "zoned" && timeZone.trim() !== "") {
    return (
      <p className={styles.timeZoneLine}>
        <Globe aria-hidden="true" />
        Time zone:{" "}
        <strong>{timeZone === labTimeZone ? `${timeZone} (laboratory)` : timeZone}</strong>
        {" · "}
        <Button variant="link" onPress={() => choose("")}>
          Change
        </Button>
      </p>
    );
  }
  return (
    <div className={styles.timeZoneLine}>
      <Globe aria-hidden="true" />
      <span>
        Time zone
        <span className={formStyles.required} aria-hidden="true">
          {" *"}
        </span>
        <VisuallyHidden> (required)</VisuallyHidden>:
      </span>
      {!other && <span className={styles.notSet}>not set</span>}
      {labTimeZone && (
        <Button onPress={() => choose(labTimeZone)}>
          Use laboratory time zone ({labTimeZone})
        </Button>
      )}
      {other ? (
        <OtherTimeZone />
      ) : (
        <Button variant="link" onPress={() => setOther(true)}>
          Other time zone or UTC offset…
        </Button>
      )}
    </div>
  );
}

/** A named zone or, when the requisition gives one, a UTC offset: the one typed is used. */
function OtherTimeZone() {
  const { control, setValue } = useFormContext<AccessionFormValues>();
  const kind = useWatch({ control, name: "timeKind" });
  const offset = kind === "datetime";
  return (
    <span className={styles.otherZone}>
      {offset ? (
        <TextInput
          name="utcOffset"
          label="UTC offset"
          description="As supplied, such as -05:00."
          format={OFFSET_FORMAT}
          isRequired
        />
      ) : (
        <TextInput
          name="timeZone"
          label="Time zone"
          description="The collection site's, such as America/New_York."
          isRequired
        />
      )}
      <Button
        variant="link"
        onPress={() => setValue("timeKind", offset ? "zoned" : "datetime", { shouldDirty: true })}
      >
        {offset ? "Use a named time zone" : "Use a UTC offset"}
      </Button>
    </span>
  );
}
