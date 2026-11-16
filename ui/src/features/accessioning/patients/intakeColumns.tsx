import type { DataGridColumn } from "@/components/DataGrid";
import { Timestamp } from "@/components/Timestamp";
import type { IntakeDeferralView } from "@/generated/IntakeDeferralView";
import { birthEvidence, IntakeStateBadge, intakeStateLabel } from "./intakeLabels";

const HOUR_MS = 60 * 60 * 1000;
const HOURS_PER_DAY = 24;

const plural = (count: number, one: string) => `${count} ${one}${count === 1 ? "" : "s"}`;

/**
 * How long open intake has waited since it was recorded, as of `now` (milliseconds since the
 * epoch), such as "5 hours" or "2 days"; "—" once it has a disposition.
 */
export function waitingText(intake: IntakeDeferralView, now: number): string {
  if (intake.disposition !== null) return "—";
  const hours = Math.floor((now - Date.parse(intake.recordedAt)) / HOUR_MS);
  if (Number.isNaN(hours)) return "Unknown";
  if (hours < 1) return "Under 1 hour";
  if (hours < HOURS_PER_DAY) return plural(hours, "hour");
  return plural(Math.floor(hours / HOURS_PER_DAY), "day");
}

/** The intake list's columns, with Waiting worked out as of `now`. */
export function intakeColumns(now: number): readonly DataGridColumn<IntakeDeferralView>[] {
  return [
    {
      id: "name",
      header: "Name as supplied",
      cell: (row) => row.suppliedName,
      sortValue: (row) => row.suppliedName,
      identifier: true,
    },
    { id: "evidence", header: "Birth information", cell: birthEvidence, sortValue: birthEvidence },
    {
      id: "source",
      header: "Source reference",
      cell: (row) => row.sourceReference,
      sortValue: (row) => row.sourceReference,
    },
    {
      id: "time",
      header: "Received",
      cell: (row) => <Timestamp value={row.recordedAt} />,
      sortValue: (row) => row.recordedAt,
      width: 190,
    },
    {
      id: "waiting",
      header: "Waiting",
      cell: (row) => waitingText(row, now),
      // By how long it has waited; intake with a disposition has stopped waiting.
      sortValue: (row) => (row.disposition === null ? now - Date.parse(row.recordedAt) : -1),
      width: 120,
    },
    {
      id: "state",
      header: "Disposition",
      cell: (row) => <IntakeStateBadge intake={row} />,
      sortValue: intakeStateLabel,
      width: 240,
    },
  ];
}
