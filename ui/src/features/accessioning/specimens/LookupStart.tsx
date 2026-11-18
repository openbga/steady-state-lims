import { useNavigate } from "react-router";
import { DataGrid, type DataGridColumn } from "@/components/DataGrid";
import { EmptyState } from "@/components/EmptyState";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import { Timestamp } from "@/components/Timestamp";
import accessioning from "../accessioning.module.css";
import { acceptanceStatus } from "./labels";
import { type RecentLookup, useRecentLookups } from "./recentLookups";

const COLUMNS: readonly DataGridColumn<RecentLookup>[] = [
  {
    id: "barcode",
    header: "Barcode",
    cell: (row) => <span className={accessioning.code}>{row.labelCode}</span>,
    width: 150,
    identifier: true,
  },
  { id: "accession", header: "Accession", cell: (row) => row.accessionNumber, width: 150 },
  { id: "patient", header: "Patient", cell: (row) => row.patient },
  {
    id: "specimen",
    header: "Specimen",
    cell: (row) => {
      const status = acceptanceStatus(row.acceptance);
      return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
    },
    width: 240,
  },
  {
    id: "lookedUp",
    header: "Looked up",
    cell: (row) => <Timestamp value={row.lookedUpAt} />,
    width: 170,
  },
];

/**
 * Container lookup before a scan: what to do and what the page will show, then the
 * containers this person looked up in this session. Opening one looks it up again.
 */
export function LookupStart() {
  const navigate = useNavigate();
  const { entries } = useRecentLookups();
  return (
    <>
      <EmptyState
        title="Scan a container to see it here"
        description="The field is ready: scan the label on the tube, or type the barcode and press Enter. You will see its specimen and receipt decision, location, volume, holds, label printing and history, and the actions you can take."
      />
      {entries.length > 0 && (
        <Section
          title={
            <>
              Your recent lookups <span className={accessioning.hint}>(this session)</span>
            </>
          }
        >
          <DataGrid
            label="Your recent lookups in this session"
            columns={COLUMNS}
            rows={entries}
            getRowId={(row) => row.labelCode}
            onRowAction={(row) =>
              navigate(`/containers?${new URLSearchParams({ labelCode: row.labelCode })}`)
            }
          />
        </Section>
      )}
    </>
  );
}
