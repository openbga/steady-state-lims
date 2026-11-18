import type { UseQueryResult } from "@tanstack/react-query";
import { DataGrid, type DataGridColumn } from "@/components/DataGrid";
import { QueryContent } from "@/components/QueryContent";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import type { CommandError } from "@/generated/CommandError";
import type { ToxReportData } from "@/generated/ToxReportData";
import type { ToxResultRow } from "@/generated/ToxResultRow";
import styles from "@/styles/layout.module.css";
import { ReportContent } from "../content/ReportContent";
import type { RevisionDetail } from "../contract";
import { OTHER_TEST_STATUS } from "../labels";

/** One printed result row with the test it belongs to. */
interface ResultLine extends ToxResultRow {
  id: string;
  test: string;
}

/** Every printed result row of a revision, test by test, in printed order. */
const resultLines = (content: ToxReportData): ResultLine[] =>
  content.resultGroups.flatMap((group, index) =>
    group.rows.map((row) => ({ ...row, id: `${index}:${row.analyte}`, test: group.name })),
  );

/** How many result rows the revision prints, for the Results tab's count. */
export const resultCount = (detail: RevisionDetail | undefined) =>
  detail && resultLines(detail.content).length;

/**
 * The engine's comparison wording. Only "Meets cutoff" stands out, as a neutral badge:
 * results are colored only by the laboratory's flags (UI standards, "Result flags"), and a
 * row without a cutoff comparison has no code.
 */
function Comparison({ row }: { row: ResultLine }) {
  if (row.comparisonCode === "meets_cutoff") {
    return <StatusBadge tone="neutral">{row.comparison}</StatusBadge>;
  }
  return row.comparison;
}

const COLUMNS: readonly DataGridColumn<ResultLine>[] = [
  { id: "analyte", header: "Analyte", cell: (row) => row.analyte, identifier: true, wrap: true },
  // The exact value as printed, such as 512.4, <5.0 or Below LOD; never reformatted.
  { id: "result", header: "Result", cell: (row) => row.result, width: 140 },
  { id: "units", header: "Units", cell: (row) => row.units || "—", width: 110 },
  // The engine prints cutoff and quantitation limits together, such as "Cutoff 50 ng/mL; LOQ
  // 5 ng/mL", and the UI does not take that apart.
  { id: "limits", header: "Limits", cell: (row) => row.limits, wrap: true },
  { id: "comparison", header: "Comparison", cell: (row) => <Comparison row={row} />, width: 190 },
];

/** With more than one test, each row names its test first. */
const WITH_TEST: readonly DataGridColumn<ResultLine>[] = [
  { id: "test", header: "Test", cell: (row) => row.test, width: 200, wrap: true },
  ...COLUMNS,
];

interface ResultsTabProps {
  /** The revision shown by default, read with the audited `get_report_revision`. */
  revision: UseQueryResult<RevisionDetail, CommandError>;
  /** Whether the report has a released revision at all. */
  isReleased: boolean;
}

/**
 * The results as the current revision prints them (REQ-RPT-001): every value, unit, limit and
 * comparison is the engine's text from the stored report content, the same data the PDF is
 * rendered from. A withdrawn report shows its last revision's results under the withdrawal
 * notice.
 */
export function ResultsTab({ revision, isReleased }: ResultsTabProps) {
  return (
    <Section title="Results">
      {isReleased ? (
        <QueryContent query={revision} what="report results">
          {(loaded) => <Results content={loaded.content} />}
        </QueryContent>
      ) : (
        <p className={styles.hint}>No revision released yet.</p>
      )}
    </Section>
  );
}

/** The revision exactly as the PDF prints it, from the same data (REQ-RPT-001). */
export function PreviewTab({ revision, isReleased }: ResultsTabProps) {
  return (
    <Section title="Preview">
      {isReleased ? (
        <QueryContent query={revision} what="report content">
          {(loaded) => <ReportContent content={loaded.content} />}
        </QueryContent>
      ) : (
        <p className={styles.hint}>No revision released yet.</p>
      )}
    </Section>
  );
}

function Results({ content }: { content: ToxReportData }) {
  const lines = resultLines(content);
  return (
    <>
      {lines.length === 0 ? (
        <p className={styles.hint}>No results reported.</p>
      ) : (
        <DataGrid
          label="Results"
          columns={content.resultGroups.length > 1 ? WITH_TEST : COLUMNS}
          rows={lines}
          getRowId={(row) => row.id}
        />
      )}
      {content.otherTests.length > 0 && (
        <p className={styles.hint}>
          Not reported in this revision:{" "}
          {content.otherTests
            .map((test) => `${test.name} (${OTHER_TEST_STATUS[test.status]})`)
            .join(", ")}
          .
        </p>
      )}
    </>
  );
}
