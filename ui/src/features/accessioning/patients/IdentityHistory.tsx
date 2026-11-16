import { Link } from "react-router";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import { Timestamp } from "@/components/Timestamp";
import type { IntakeDeferralView } from "@/generated/IntakeDeferralView";
import { useHasCapability } from "@/lib/commands";
import { usePersonText } from "@/lib/person";
import styles from "../accessioning.module.css";
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
  const person = usePersonText();
  const canOpenIntake = useHasCapability("enter_orders");
  const canViewAudit = useHasCapability("view_audit");
  if (intakes.length === 0) return null;
  return (
    <Section title="Identity history">
      <p className={styles.hint}>
        This patient was chosen to resolve incomplete identity intake. The intake keeps what was
        supplied at first; it was not copied into the patient's details.
      </p>
      <ul className={styles.list}>
        {intakes.map((intake) => (
          <li key={intake.intakeId}>
            <div className={styles.listRow}>
              <StatusBadge tone="info">Resolved from incomplete intake</StatusBadge>
              <span>
                Intake{" "}
                {canOpenIntake ? (
                  <Link to={intakePath(intake.intakeId)}>{intake.sourceReference}</Link>
                ) : (
                  intake.sourceReference
                )}{" "}
                · supplied as <strong>{intake.suppliedName}</strong>, birth information{" "}
                <strong>{birthEvidenceText(intake)}</strong>
              </span>
            </div>
            <p className={styles.hint}>
              Resolved {intake.disposedAt && <Timestamp value={intake.disposedAt} />} by{" "}
              {intake.disposedBy && person(intake.disposedBy, intake.disposedByDisplay)} · source:{" "}
              {intake.dispositionSource}
              {canViewAudit && (
                <>
                  {" "}
                  · <Link to={intakeAuditPath(intake.intakeId)}>View in audit trail</Link>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
