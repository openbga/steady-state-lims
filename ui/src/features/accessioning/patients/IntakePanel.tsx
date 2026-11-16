import { Link } from "react-router";
import { DetailPanel } from "@/components/DetailPanel";
import { Facts } from "@/components/Facts";
import { type ActionItem, RecordActions } from "@/components/RowActions";
import { Timestamp } from "@/components/Timestamp";
import type { IntakeDeferralView } from "@/generated/IntakeDeferralView";
import { usePersonText } from "@/lib/person";
import { birthEvidence, IntakeStateBadge } from "./intakeLabels";

interface IntakePanelProps {
  intake: IntakeDeferralView;
  actions: readonly ActionItem[];
  onClose: () => void;
  onPrevious: (() => void) | undefined;
  onNext: (() => void) | undefined;
}

/**
 * One incomplete intake in view mode: the evidence as supplied and, once recorded, its
 * terminal disposition. Open intake offers its dispositions; the evidence never changes.
 */
export function IntakePanel({ intake, actions, ...navigation }: IntakePanelProps) {
  const person = usePersonText();
  const recorded = (at: string, by: string, display?: string) => (
    <>
      <Timestamp value={at} /> by {person(by, display)}
    </>
  );
  return (
    <DetailPanel
      identifier={`Intake: ${intake.suppliedName}`}
      status={<IntakeStateBadge intake={intake} />}
      actions={actions.length > 0 && <RecordActions items={actions} />}
      {...navigation}
    >
      <Facts
        items={[
          { label: "Birth information", value: birthEvidence(intake) },
          { label: "Source reference", value: intake.sourceReference },
          { label: "Reason", value: intake.reason },
          {
            label: "Recorded",
            value: recorded(intake.recordedAt, intake.recordedBy, intake.recordedByDisplay),
          },
        ]}
      />
      {intake.disposedAt && intake.disposedBy && (
        <Facts
          items={[
            { label: "Disposition source", value: intake.dispositionSource },
            { label: "Disposition reason", value: intake.dispositionReason },
            {
              label: "Disposition recorded",
              value: recorded(intake.disposedAt, intake.disposedBy, intake.disposedByDisplay),
            },
            ...(intake.subjectId
              ? [
                  {
                    label: "Patient",
                    value: <Link to={`/patients/${intake.subjectId}`}>Open resolved patient</Link>,
                  },
                ]
              : []),
          ]}
        />
      )}
    </DetailPanel>
  );
}
