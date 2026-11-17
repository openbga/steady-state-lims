import type { BirthEvidenceKind } from "@/generated/BirthEvidenceKind";
import type { IntakeDeferralView } from "@/generated/IntakeDeferralView";

/** The labels of the intake form's "Available birth information" choices. */
const BIRTH_EVIDENCE_LABELS: Record<BirthEvidenceKind, string> = {
  unknown: "Unknown",
  partial_date: "Partial date",
  supplied_age: "Supplied age",
};

/** Birth information as supplied: "Unknown", or the kind and its exact text ("Partial date: 1985"). */
export function birthEvidenceText(
  intake: Pick<IntakeDeferralView, "birthEvidenceKind" | "birthEvidenceText">,
): string {
  const label = BIRTH_EVIDENCE_LABELS[intake.birthEvidenceKind];
  return intake.birthEvidenceText === null ? label : `${label}: ${intake.birthEvidenceText}`;
}
