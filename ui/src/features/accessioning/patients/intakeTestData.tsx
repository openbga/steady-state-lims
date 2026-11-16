import type { IntakeDeferralCounts } from "@/generated/IntakeDeferralCounts";
import type { IntakeDeferralPage } from "@/generated/IntakeDeferralPage";
import type { IntakeDeferralView } from "@/generated/IntakeDeferralView";
import { mockCommands } from "@/lib/test/ipc";
import { renderRoutes } from "@/lib/test/router";
import { SUMMARY, sessionWith } from "../testData";
import { IncompleteIntakePage } from "./IncompleteIntakePage";

export const CLERK = "00000000-0000-7000-8000-000000000e31";
export const REVIEWER = "00000000-0000-7000-8000-000000000e32";

export const INTAKE: IntakeDeferralView = {
  intakeId: "synthetic-intake",
  revision: 1,
  suppliedName: "Incomplete Person",
  birthEvidenceKind: "unknown",
  birthEvidenceText: null,
  sourceReference: "Synthetic source 42",
  reason: "Complete birth date not supplied",
  recordedBy: CLERK,
  recordedByDisplay: "Test Intake Clerk",
  recordedAt: "2026-11-05T10:00:00.000000000Z",
  disposition: null,
  subjectId: null,
  dispositionSource: null,
  dispositionReason: null,
  disposedBy: null,
  disposedAt: null,
};

/** One engine page of `rows`, counted by state unless `counts` says otherwise. */
export function intakePage(
  rows: IntakeDeferralView[],
  counts?: IntakeDeferralCounts,
): IntakeDeferralPage {
  const count = (state: string | null) => rows.filter((row) => row.disposition === state).length;
  return {
    rows,
    counts: counts ?? {
      awaiting: count(null),
      resolved: count("resolved"),
      declined: count("declined"),
    },
  };
}

/** The intake page at `path`, with the engine mocked; `capabilities` of the signed-in person. */
export function renderIntake(
  commands: Record<string, (args: unknown) => unknown> = {},
  { path = "/patients/incomplete-intake", capabilities = ["enter_orders"] } = {},
) {
  mockCommands({
    current_session: () => sessionWith(capabilities),
    list_intake_deferrals: () => intakePage([INTAKE]),
    search_subjects: () => [SUMMARY],
    ...commands,
  });
  return renderRoutes(
    [{ path: "/patients/incomplete-intake", element: <IncompleteIntakePage /> }],
    path,
  );
}
