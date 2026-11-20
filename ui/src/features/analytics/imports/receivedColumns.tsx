import type { DataGridColumn } from "@/components/DataGrid";
import styles from "@/styles/layout.module.css";

/** A received row's place and identifiers, as the analyzer or file sent them. */
interface ReceivedRow {
  recordPath: string;
  sampleLabel: string | null;
  testCode: string | null;
}

/** The Record, Sample label and Test code columns of received rows, as plain text. */
export function receivedColumns<Row extends ReceivedRow>(): DataGridColumn<Row>[] {
  return [
    {
      id: "record",
      header: "Record",
      identifier: true,
      cell: (row) => <span className={styles.code}>{row.recordPath}</span>,
      width: 120,
    },
    { id: "sample", header: "Sample label", cell: (row) => row.sampleLabel ?? "—", width: 140 },
    { id: "code", header: "Test code", cell: (row) => row.testCode ?? "—", width: 110 },
  ];
}
