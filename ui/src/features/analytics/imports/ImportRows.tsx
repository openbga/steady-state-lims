import { Link, useLocation, useSearchParams } from "react-router";
import { DataGrid, type DataGridColumn } from "@/components/DataGrid";
import { Select } from "@/components/Select";
import { StatusBadge } from "@/components/StatusBadge";
import { Toolbar } from "@/components/Toolbar";
import type { ImportAttemptDetail } from "@/generated/ImportAttemptDetail";
import type { ImportRowView } from "@/generated/ImportRowView";
import { choiceOf } from "@/lib/choices";
import styles from "@/styles/layout.module.css";
import { receivedValueText } from "../labels";
import { runQcPath, specimenResultsPath } from "../paths";
import { receivedColumns } from "./receivedColumns";
import { noRowsText, ROW_FILTER_PARAM, ROW_OUTCOME_FILTERS, rowOutcomeStatus } from "./rowOutcomes";

/** The option for "no filter". */
const ANY = "any";

/** A patient row opens its sample's results in review; a QC row, its run's QC review. */
function OpenLink({ row }: { row: ImportRowView }) {
  if (row.outcome === "qc" && row.runId !== null) {
    return <Link to={runQcPath(row.runId)}>QC review</Link>;
  }
  if (row.outcome !== "qc" && row.outcome !== "quarantined" && row.specimenId !== null) {
    return <Link to={specimenResultsPath(row.specimenId)}>Result review</Link>;
  }
  return "—";
}

/** Source text is shown as plain text, exactly as received; nothing is converted. */
const COLUMNS: readonly DataGridColumn<ImportRowView>[] = [
  ...receivedColumns<ImportRowView>(),
  { id: "analyte", header: "Analyte", cell: (row) => row.analyteName ?? "Not mapped", width: 160 },
  { id: "value", header: "Value as received", cell: receivedValueText, width: 180, wrap: true },
  {
    id: "happened",
    header: "What happened",
    cell: (row) => {
      const status = rowOutcomeStatus(row.outcome);
      return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
    },
    width: 230,
  },
  { id: "open", header: "Open", cell: (row) => <OpenLink row={row} /> },
];

const getRowId = (row: ImportRowView) => String(row.rowNo);

const rowsText = (count: number) => `${count} ${count === 1 ? "row" : "rows"}`;

/**
 * Every row the attempt placed, in received order, with its value exactly as received and
 * what happened to it (REQ-ANA-003). The filter, kept in the address as `?happened=`, shows
 * one outcome; the attempt's counts link here with it set. Rows not read as results and rows
 * set aside are counted above and listed on their own tab, not here.
 */
export function ImportRows({ attempt }: { attempt: ImportAttemptDetail }) {
  const [params, setParams] = useSearchParams();
  const { state } = useLocation();
  const happened = choiceOf(ROW_OUTCOME_FILTERS, params.get(ROW_FILTER_PARAM));
  const rows = happened ? attempt.rows.filter((row) => row.outcome === happened) : attempt.rows;
  const choose = (next: string | null) => {
    const outcome = choiceOf(ROW_OUTCOME_FILTERS, next);
    setParams(outcome ? { [ROW_FILTER_PARAM]: outcome } : {}, { replace: true, state });
  };
  if (attempt.rows.length === 0) {
    return (
      <>
        <h2 className={styles.subheading}>Rows of the attempt</h2>
        <p className={styles.hint}>{noRowsText(attempt)}</p>
      </>
    );
  }
  return (
    <>
      <h2 className={styles.subheading}>Rows of the attempt</h2>
      <Toolbar
        variant="collection"
        align="end"
        count={
          happened ? `${rowsText(rows.length)} of ${attempt.rows.length}` : rowsText(rows.length)
        }
      >
        <Select
          label="What happened"
          name="happened"
          options={[{ id: ANY, label: "Every row" }, ...ROW_OUTCOME_FILTERS]}
          value={happened ?? ANY}
          onChange={choose}
        />
      </Toolbar>
      {rows.length === 0 ? (
        <p className={styles.hint}>No row of this attempt had this outcome.</p>
      ) : (
        <DataGrid
          label="Rows of the attempt"
          columns={COLUMNS}
          rows={rows}
          getRowId={getRowId}
          fill
        />
      )}
    </>
  );
}
