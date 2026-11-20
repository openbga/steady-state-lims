import type { ImportAttemptDetail } from "@/generated/ImportAttemptDetail";
import type { ImportRowOutcome } from "@/generated/ImportRowOutcome";
import type { Choice } from "@/lib/choices";
import type { Status } from "../labels";
import { importAttemptPath } from "../paths";

/** What happened to a row, worded as the attempt's counts word it. */
const ROW_OUTCOMES: Record<ImportRowOutcome, Status> = {
  new: { label: "New result", tone: "success" },
  retained: { label: "Measured, not ordered (kept)", tone: "info" },
  duplicate: { label: "Duplicate", tone: "neutral" },
  reprocessed: { label: "Reprocessed", tone: "info" },
  qc: { label: "QC row", tone: "neutral" },
  quarantined: { label: "Quarantined", tone: "warning" },
};

export function rowOutcomeStatus(outcome: ImportRowOutcome): Status {
  return ROW_OUTCOMES[outcome];
}

/** Each outcome the row filter offers, in the order of the counts. */
export const ROW_OUTCOME_FILTERS: readonly Choice<ImportRowOutcome>[] = (
  ["new", "duplicate", "reprocessed", "qc", "quarantined", "retained"] as const
).map((id) => ({ id, label: ROW_OUTCOMES[id].label }));

/** The address parameter of the row filter. */
export const ROW_FILTER_PARAM = "happened";

/** The attempt's Rows tab, showing only the rows with `outcome` when one is given. */
export function importRowsPath(importAttemptId: string, outcome?: ImportRowOutcome): string {
  const rows = `${importAttemptPath(importAttemptId)}/rows`;
  return outcome ? `${rows}?${new URLSearchParams({ [ROW_FILTER_PARAM]: outcome })}` : rows;
}

/** Rows the list holds: every row but those not read as results or set aside. */
const listedCount = (attempt: ImportAttemptDetail) =>
  attempt.rowsNew +
  attempt.rowsDuplicate +
  attempt.rowsReprocessed +
  attempt.rowsQc +
  attempt.rowsQuarantined +
  attempt.rowsRetained;

/**
 * Why the attempt lists no rows: a whole-attempt failure, no rows to list, or an attempt
 * imported before rows were recorded on it.
 */
export function noRowsText(attempt: ImportAttemptDetail): string {
  const what = attempt.file === null ? "message" : "file";
  if (attempt.failureCode !== null) {
    const failure = attempt.file === null ? "Message failure" : "File failure";
    return `No row was imported: the whole ${what} was held. See ${failure} above.`;
  }
  if (listedCount(attempt) === 0) return `The ${what} had no result or QC rows.`;
  return "This attempt was imported before rows were listed on the attempt, so only its counts are shown.";
}
