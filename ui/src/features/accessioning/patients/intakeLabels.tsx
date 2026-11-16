import { StatusBadge } from "@/components/StatusBadge";
import type { Tone } from "@/components/tones";
import type { BirthEvidenceKind } from "@/generated/BirthEvidenceKind";
import type { IntakeDeferralCounts } from "@/generated/IntakeDeferralCounts";
import type { IntakeDeferralView } from "@/generated/IntakeDeferralView";
import type { IntakeDisposition } from "@/generated/IntakeDisposition";
import type { IntakeShow } from "@/generated/IntakeShow";
import { type Choice, choiceOf, labelOf } from "@/lib/choices";
import { useSearchParam } from "@/lib/searchParam";

// Labels for incomplete identity intake, shared by the form, the list and the side panel.

/** The kinds of birth information, worded as the form offers them. */
export const BIRTH_EVIDENCE_KINDS: readonly Choice<BirthEvidenceKind>[] = [
  { id: "unknown", label: "Unknown" },
  { id: "partial_date", label: "Partial date" },
  { id: "supplied_age", label: "Supplied age" },
];

/**
 * The birth information as supplied, such as "Partial date: 1985". The supplied text is shown
 * exactly as entered; Unknown without text shows the kind alone.
 */
export function birthEvidence(
  intake: Pick<IntakeDeferralView, "birthEvidenceKind" | "birthEvidenceText">,
): string {
  const kind = labelOf(BIRTH_EVIDENCE_KINDS, intake.birthEvidenceKind);
  return intake.birthEvidenceText === null ? kind : `${kind}: ${intake.birthEvidenceText}`;
}

/** Where an intake stands: awaiting verified identity until a disposition is recorded. */
type IntakeState = "awaiting" | IntakeDisposition;

/** Each state with its badge tone: open intake needs a person; a disposition is final. */
const INTAKE_STATES: readonly (Choice<IntakeState> & { tone: Tone })[] = [
  { id: "awaiting", label: "Awaiting verified identity", tone: "warning" },
  { id: "resolved", label: "Resolved", tone: "neutral" },
  { id: "declined", label: "Declined", tone: "neutral" },
];

function stateOf(intake: Pick<IntakeDeferralView, "disposition">) {
  const id = intake.disposition ?? "awaiting";
  return INTAKE_STATES.find((state) => state.id === id) ?? { id, label: id, tone: "neutral" };
}

/** The intake's state label, such as "Declined". */
export const intakeStateLabel = (intake: Pick<IntakeDeferralView, "disposition">) =>
  stateOf(intake).label;

/** The intake's state as a status badge. */
export function IntakeStateBadge({ intake }: { intake: Pick<IntakeDeferralView, "disposition"> }) {
  const state = stateOf(intake);
  return <StatusBadge tone={state.tone}>{state.label}</StatusBadge>;
}

/** The Show filter's choices: each state, then All. */
const SHOW_CHOICES: readonly Choice<IntakeShow>[] = [...INTAKE_STATES, { id: "all", label: "All" }];

/** The Show filter's options, each with how many intake records the engine counted. */
export function showOptions(counts: IntakeDeferralCounts | undefined): Choice<IntakeShow>[] {
  return SHOW_CHOICES.map(({ id, label }) => {
    if (counts === undefined) return { id, label };
    const count = id === "all" ? counts.awaiting + counts.resolved + counts.declined : counts[id];
    return { id, label: `${label} (${count})` };
  });
}

/**
 * The Show filter in the address (`?show=`), so the work queue's link, Back and reload keep
 * it: `awaiting` (the default), `resolved`, `declined` or `all`. An unknown value shows open
 * intake.
 */
export function useShowParam(): [IntakeShow, (show: string | null) => void] {
  const [value, setValue] = useSearchParam("show");
  return [
    choiceOf(SHOW_CHOICES, value) ?? "awaiting",
    (show) => setValue(choiceOf(SHOW_CHOICES, show) ?? "awaiting"),
  ];
}
