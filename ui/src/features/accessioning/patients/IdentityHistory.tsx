import { Link } from "react-router";
import { Facts } from "@/components/Facts";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import { Timestamp } from "@/components/Timestamp";
import type { IntakeDeferralView } from "@/generated/IntakeDeferralView";
import { useHasCapability } from "@/lib/commands";
import { usePersonText } from "@/lib/person";
import styles from "../accessioning.module.css";
import history from "./IdentityHistory.module.css";
import { birthEvidenceText } from "./intakeEvidence";

/** The intake page listing resolved intake, with this one open in its panel. */
const intakePath = (intakeId: string) =>
  `/patients/incomplete-intake?show=resolved&open=${intakeId}`;
/** The audit trail of one intake record. */
const intakeAuditPath = (intakeId: string) =>
  `/audit?recordType=intake_deferral&recordId=${intakeId}`;

/**
 * Incomplete identity intake resolved with this patient (DM-06): what was supplied at first,
 * and who resolved it, when and from what source. Shown only when there is such an intake.
 */
export function IdentityHistory({ intakes }: { intakes: readonly IntakeDeferralView[] }) {
  if (intakes.length === 0) return null;
  return (
    <Section title="Identity history">
      <p className={styles.hint}>
        Resolved from incomplete intake. What was supplied at first stays on the intake; it was not
        copied into the patient's details.
      </p>
      <ul className={history.intakes}>
        {intakes.map((intake) => (
          <ResolvedIntake key={intake.intakeId} intake={intake} />
        ))}
      </ul>
    </Section>
  );
}

function ResolvedIntake({ intake }: { intake: IntakeDeferralView }) {
  const person = usePersonText();
  const canOpenIntake = useHasCapability("enter_orders");
  const canViewAudit = useHasCapability("view_audit");
  return (
    <li className={history.intake}>
      <div className={history.header}>
        <StatusBadge tone="info">Resolved from incomplete intake</StatusBadge>
        {canOpenIntake ? (
          <Link to={intakePath(intake.intakeId)}>{intake.sourceReference}</Link>
        ) : (
          <span>{intake.sourceReference}</span>
        )}
      </div>
      <Facts
        items={[
          { label: "Supplied as", value: intake.suppliedName },
          { label: "Birth information", value: birthEvidenceText(intake) },
          {
            label: "Resolved",
            value: (
              <>
                {intake.disposedAt && <Timestamp value={intake.disposedAt} />} by{" "}
                {intake.disposedBy && person(intake.disposedBy, intake.disposedByDisplay)}
              </>
            ),
          },
          { label: "Source", value: intake.dispositionSource },
        ]}
      />
      {canViewAudit && (
        <div>
          <Link to={intakeAuditPath(intake.intakeId)}>View in audit trail</Link>
        </div>
      )}
    </li>
  );
}
