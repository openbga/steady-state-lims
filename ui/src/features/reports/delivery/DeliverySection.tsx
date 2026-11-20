import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/Button";
import { DataGrid, type DataGridColumn } from "@/components/DataGrid";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import { Timestamp } from "@/components/Timestamp";
import type { Tone } from "@/components/tones";
import styles from "@/styles/layout.module.css";
import type { ObligationStatus, ObligationView } from "../contract";
import { obligationPath } from "../paths";
import { deliveryCount } from "./deliveryCount";
import { ObligationDialog } from "./ObligationDialog";
import { useObligationActions } from "./obligationActions";

/**
 * The badge's tone by the engine's status code; the words are the engine's short label
 * (REQ-RPT-011). A blocked badge carries its reason in the label.
 */
const STATUS_TONE: Record<ObligationStatus, Tone> = {
  handed_off: "success",
  closed: "success",
  awaiting: "info",
  attention: "warning",
  paused: "neutral",
  blocked: "danger",
};

/** The last recorded attempt: when it was observed and who attested it. */
const lastAttempt = (row: ObligationView) => row.attempts.at(-1);

const COLUMNS: readonly DataGridColumn<ObligationView>[] = [
  {
    id: "destination",
    header: "Destination",
    cell: (row) => row.destination.label,
    identifier: true,
    wrap: true,
  },
  { id: "method", header: "Method", cell: (row) => row.status.method, width: 200, wrap: true },
  {
    id: "status",
    header: "Status",
    cell: (row) => (
      <StatusBadge tone={STATUS_TONE[row.status.code]}>{row.status.shortLabel}</StatusBadge>
    ),
    width: 270,
  },
  {
    id: "when",
    header: "When",
    cell: (row) => {
      const last = lastAttempt(row);
      return last ? <Timestamp value={last.observedAt} /> : "—";
    },
    sortValue: (row) => lastAttempt(row)?.observedAt ?? "",
    width: 170,
  },
  {
    id: "by",
    header: "By",
    cell: (row) => lastAttempt(row)?.recordedBy.displayName ?? "—",
    width: 160,
  },
];

interface DeliverySectionProps {
  obligations: readonly ObligationView[];
  /**
   * Where Add destination adds an obligation: the current revision and the order's client,
   * when the engine allows it for this report; `null` otherwise.
   */
  addTo: { revisionId: string; clientId: string } | null;
}

/**
 * A report's delivery obligations (REQ-RPT-003, REQ-RPT-011), one row per destination with
 * the method, a short status badge, and when and by whom the last attempt was attested, as
 * the engine words them. The row menu holds the actions the engine allows. A row opens its
 * obligation in the delivery workspace, which holds every obligation not yet closed; a closed
 * one has no view beyond its row, because the engine has no read of one obligation by ID.
 */
export function DeliverySection({ obligations, addTo }: DeliverySectionProps) {
  const actions = useObligationActions();
  const navigate = useNavigate();
  const [isAdding, setAdding] = useState(false);
  const open = (row: ObligationView) => {
    if (row.status.code !== "closed") void navigate(obligationPath(row.obligationId));
  };
  const firstOpen = obligations.find((each) => each.status.code !== "closed");
  const count = deliveryCount(obligations);
  return (
    <Section
      title="Delivery"
      actions={
        <>
          {count && (
            <StatusBadge tone={count.tone}>
              {`${count.handedOff} of ${count.owed} handed off`}
            </StatusBadge>
          )}
          {firstOpen && <Link to={obligationPath(firstOpen.obligationId)}>Open in Delivery</Link>}
          {addTo && <Button onPress={() => setAdding(true)}>Add destination</Button>}
        </>
      }
    >
      {obligations.length === 0 ? (
        <p className={styles.hint}>No delivery obligations.</p>
      ) : (
        <DataGrid
          label="Delivery obligations"
          columns={COLUMNS}
          rows={obligations}
          getRowId={(row) => row.obligationId}
          onRowAction={open}
          rowActions={actions.rowActions}
        />
      )}
      {actions.dialog}
      {isAdding && addTo && (
        <ObligationDialog mode={{ kind: "add", ...addTo }} onClose={() => setAdding(false)} />
      )}
    </Section>
  );
}
