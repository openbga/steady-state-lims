import { Link, useNavigate } from "react-router";
import { DataGrid, type DataGridColumn } from "@/components/DataGrid";
import { QueryContent } from "@/components/QueryContent";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import { Timestamp } from "@/components/Timestamp";
import type { ListPartnerMessages } from "@/generated/ListPartnerMessages";
import type { PartnerMessagePage } from "@/generated/PartnerMessagePage";
import type { PartnerMessageRow } from "@/generated/PartnerMessageRow";
import { useCommandQuery, useHasCapability } from "@/lib/commands";
import styles from "@/styles/layout.module.css";
import { LIST_PARTNER_MESSAGES, MANAGE_CONFIGURATION } from "../contract";
import { interfaceRecord, interfaceStatus, logsPath } from "./interfaceStatus";

type Row = PartnerMessageRow;

function columns(reportNumber: string): readonly DataGridColumn<Row>[] {
  return [
    {
      id: "connection",
      header: "Connection",
      cell: (row) => (
        <Link to={logsPath(row, reportNumber)}>{row.connection?.name ?? "None matched"}</Link>
      ),
      sortValue: (row) => row.connection?.name ?? "",
      identifier: true,
      wrap: true,
    },
    { id: "record", header: "Revision", cell: interfaceRecord, width: 170 },
    {
      id: "status",
      header: "Status",
      cell: (row) => {
        const status = interfaceStatus(row);
        return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
      },
      width: 270,
    },
    {
      id: "at",
      header: "When",
      cell: (row) => <Timestamp value={row.at} />,
      sortValue: (row) => row.at,
      defaultSort: "desc",
      width: 170,
    },
  ];
}

interface InterfaceDeliveriesProps {
  reportId: string;
  reportNumber: string;
}

/**
 * The report's messages through Interfaces (#4725; REQ-INT-002, REQ-RPT-011): HL7 results over
 * MLLP, files written to a folder or SFTP server, and unrouted messages with the decision a
 * person recorded. Each status is what Interfaces records, never proof that the partner
 * processed the report, so these rows are not counted as handed off. Shown only to people who
 * may open Interfaces › Logs, where each row leads.
 */
export function InterfaceDeliveries(props: InterfaceDeliveriesProps) {
  const allowed = useHasCapability(MANAGE_CONFIGURATION);
  return allowed ? <InterfaceMessages {...props} /> : null;
}

function InterfaceMessages({ reportId, reportNumber }: InterfaceDeliveriesProps) {
  const navigate = useNavigate();
  const input: ListPartnerMessages = { view: "all", reportId, hideTests: true };
  const messages = useCommandQuery<PartnerMessagePage>(LIST_PARTNER_MESSAGES, { input });
  return (
    <Section title="Interfaces">
      <p className={styles.hint}>
        As Interfaces records them. A written file or an acknowledgement is not proof that the
        partner processed the report, so these are not counted as handed off.
      </p>
      <QueryContent query={messages} what="interface messages">
        {(page) =>
          page.rows.length === 0 ? (
            <p className={styles.hint}>No messages through Interfaces for this report.</p>
          ) : (
            <DataGrid
              label="Interface messages"
              columns={columns(reportNumber)}
              rows={page.rows}
              getRowId={(row) => row.deliveryId ?? row.messageId}
              onRowAction={(row) => void navigate(logsPath(row, reportNumber))}
            />
          )
        }
      </QueryContent>
    </Section>
  );
}
