import { useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { ChoiceInput, TextInput } from "@/components/FormFields";
import type { IntakeDeferralView } from "@/generated/IntakeDeferralView";
import type { IntakeDisposition } from "@/generated/IntakeDisposition";
import type { RecordIntakeDeferralInput } from "@/generated/RecordIntakeDeferralInput";
import type { ResolveIntakeDeferralInput } from "@/generated/ResolveIntakeDeferralInput";
import type { SubjectSummary } from "@/generated/SubjectSummary";
import { CommandDialog } from "@/lib/CommandDialog";
import { optionalText } from "@/lib/choices";
import { IdentityBanner } from "@/lib/IdentityBanner";
import { BIRTH_EVIDENCE_KINDS } from "./intakeLabels";
import { PatientDirectory } from "./PatientDirectory";

const LIST = "list_intake_deferrals";

/** Record incomplete intake: the supplied evidence, kept exactly as supplied. */
export function RecordIntakeDialog({ onClose }: { onClose: () => void }) {
  return (
    <CommandDialog<RecordIntakeDeferralInput, RecordIntakeDeferralInput>
      title="Record incomplete identity intake"
      submitLabel="Retain incomplete intake"
      command={{ name: "record_intake_deferral", invalidates: [LIST] }}
      defaultValues={{ suppliedName: "", birthEvidenceText: "", sourceReference: "", reason: "" }}
      toInput={(v) => ({
        ...v,
        suppliedName: v.suppliedName.trim(),
        birthEvidenceText: optionalText(v.birthEvidenceText ?? ""),
        sourceReference: v.sourceReference.trim(),
        reason: v.reason.trim(),
      })}
      successTitle="Incomplete intake retained"
      onClose={onClose}
    >
      <TextInput name="suppliedName" label="Name as supplied" isRequired />
      <ChoiceInput
        name="birthEvidenceKind"
        label="Available birth information"
        options={BIRTH_EVIDENCE_KINDS}
        isRequired
      />
      <BirthEvidenceTextInput />
      <TextInput name="sourceReference" label="Source reference" isRequired />
      <TextInput name="reason" label="Reason intake is deferred" isRequired />
    </CommandDialog>
  );
}

/** The supplied text: required for a partial date or a supplied age, optional for Unknown. */
function BirthEvidenceTextInput() {
  const kind = useWatch({ name: "birthEvidenceKind" });
  return (
    <TextInput
      name="birthEvidenceText"
      label="Exact supplied date or age text"
      description="Required for partial date or age. Do not complete a date or convert age to a birth date."
      isRequired={kind === "partial_date" || kind === "supplied_age"}
      requiredMessage="Enter the partial date or age exactly as supplied."
    />
  );
}

/**
 * A disposition being recorded for one open intake. Resolving first chooses the verified
 * patient; `patient` is set once chosen.
 */
export interface DispositionStep {
  intake: IntakeDeferralView;
  disposition: IntakeDisposition;
  patient?: SubjectSummary;
}

interface DispositionDialogsProps {
  step: DispositionStep;
  onChange: (step: DispositionStep | null) => void;
}

/**
 * Resolve with verified patient (choose the patient, then record the disposition) or Record
 * declined intake. The disposition is terminal and carries the intake's revision.
 */
export function DispositionDialogs({ step, onChange }: DispositionDialogsProps) {
  const navigate = useNavigate();
  const { intake, disposition, patient } = step;
  const close = () => onChange(null);
  if (disposition === "resolved" && !patient) {
    return (
      <Dialog
        title="Choose verified patient"
        description={`For the intake of ${intake.suppliedName}.`}
        isOpen
        onOpenChange={(open) => !open && close()}
        size="wide"
        actions={<Button onPress={close}>Cancel</Button>}
      >
        <p>
          First obtain source-backed complete identity. Register a patient separately if needed,
          then return here and explicitly select the verified record. Never derive a date from age
          or partial dates.
        </p>
        <Button onPress={() => navigate("/patients/register")}>Register verified patient</Button>
        <PatientDirectory onChoose={(chosen) => onChange({ ...step, patient: chosen })} />
      </Dialog>
    );
  }
  return (
    <CommandDialog<{ sourceReference: string; reason: string }, ResolveIntakeDeferralInput>
      title={
        disposition === "resolved" ? "Resolve incomplete identity intake" : "Record declined intake"
      }
      submitLabel="Record disposition"
      command={{ name: "resolve_intake_deferral", invalidates: [LIST] }}
      defaultValues={{ sourceReference: "", reason: "" }}
      toInput={(v) => ({
        intakeId: intake.intakeId,
        expectedRevision: intake.revision,
        disposition,
        subjectId: disposition === "resolved" ? (patient?.subjectId ?? null) : null,
        sourceReference: v.sourceReference.trim(),
        reason: v.reason.trim(),
      })}
      successTitle="Intake disposition recorded"
      onClose={close}
    >
      {patient && <IdentityBanner subject={patient} />}
      <p>
        The supplied evidence remains unchanged. This records a terminal disposition; it does not
        create an order, merge patients or remove identity holds.
      </p>
      <TextInput name="sourceReference" label="Verification or decline source" isRequired />
      <TextInput name="reason" label="Disposition reason" isRequired />
    </CommandDialog>
  );
}
