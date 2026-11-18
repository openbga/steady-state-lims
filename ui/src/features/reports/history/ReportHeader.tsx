import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/Button";
import { type ActionItem, MoreActions } from "@/components/RowActions";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ADD_DELIVERY_OBLIGATION,
  type ObligationView,
  PREPARE_REPORT_CANDIDATE,
  type ReportDetail,
  WITHDRAW_REPORT,
} from "../contract";
import { ExportDialog } from "../delivery/ExportDialog";
import { ObligationDialog } from "../delivery/ObligationDialog";
import { AVAILABILITY, COMPLETENESS, RELATIONSHIP } from "../labels";
import { workspacePath } from "../paths";
import { WithdrawDialog } from "./WithdrawDialog";

/** The current revision, the one released and not yet superseded. */
const currentOf = (report: ReportDetail) =>
  report.revisions.find((each) => each.availability === "current");

/**
 * The revision the report page shows by default: the current one, or the last one of a
 * withdrawn report; `undefined` before the first release.
 */
export const shownRevision = (report: ReportDetail) => currentOf(report) ?? report.revisions.at(-1);

/**
 * Delivery in one chip: obligations handed off out of those still owed. A closed obligation
 * (redirected, or closed with a reason) is owed no longer and is left out. Green once every
 * owed obligation is handed off, warning while any is open; `null` when none is owed.
 * "Handed off" is staff attestation, never proof of receipt, so the chip never claims
 * receipt (REQ-RPT-011).
 */
export function deliveryChip(obligations: readonly ObligationView[]) {
  const owed = obligations.filter((each) => each.status.code !== "closed");
  if (owed.length === 0) return null;
  const handedOff = owed.filter((each) => each.status.code === "handed_off").length;
  return {
    label: `Handed off ${handedOff} of ${owed.length}`,
    tone: handedOff === owed.length ? ("success" as const) : ("warning" as const),
  };
}

/**
 * The report's state under its title: availability, the latest revision's completeness, its
 * number and kind, and delivery.
 */
export function ReportChips({ report }: { report: ReportDetail }) {
  const latest = report.revisions.at(-1);
  const availability = report.availability && AVAILABILITY[report.availability];
  const delivery = deliveryChip(report.obligations);
  return (
    <>
      <StatusBadge tone={availability?.tone ?? "neutral"}>
        {availability?.label ?? "Not released"}
      </StatusBadge>
      {latest && (
        <>
          <StatusBadge tone={COMPLETENESS[latest.completeness].tone}>
            {COMPLETENESS[latest.completeness].label}
          </StatusBadge>
          <StatusBadge tone="neutral">
            {`Revision ${latest.revisionNo} · ${RELATIONSHIP[latest.relationship]}`}
          </StatusBadge>
        </>
      )}
      {delivery && <StatusBadge tone={delivery.tone}>{delivery.label}</StatusBadge>}
    </>
  );
}

type OpenDialog = "export" | "add" | "withdraw" | null;

/**
 * Export PDF of the current revision is the one main button. Preparing the next revision and
 * adding a destination sit in More actions, with Withdraw report last, below a line, in
 * danger text, each only when the engine's `allowedActions` names it; the engine still
 * decides. An earlier revision is exported from its own page.
 */
export function ReportActions({ report }: { report: ReportDetail }) {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const allows = (action: string) => report.allowedActions.includes(action);
  const current = currentOf(report);
  const close = () => setDialog(null);
  const items: ActionItem[] = [];
  if (allows(PREPARE_REPORT_CANDIDATE)) {
    items.push({
      id: PREPARE_REPORT_CANDIDATE,
      label: "Prepare next revision",
      onAction: () => void navigate(workspacePath(report.specimenId)),
    });
  }
  if (allows(ADD_DELIVERY_OBLIGATION) && current) {
    items.push({
      id: ADD_DELIVERY_OBLIGATION,
      label: "Add destination",
      onAction: () => setDialog("add"),
    });
  }
  if (allows(WITHDRAW_REPORT) && current) {
    items.push({
      id: WITHDRAW_REPORT,
      label: "Withdraw report",
      onAction: () => setDialog("withdraw"),
      variant: "danger",
      isSeparated: items.length > 0,
    });
  }
  return (
    <>
      {current && (
        <Button variant="primary" onPress={() => setDialog("export")}>
          Export PDF (revision {current.revisionNo}, current)
        </Button>
      )}
      <MoreActions items={items} label="More actions" />
      {dialog === "export" && current && (
        <ExportDialog
          revisionId={current.revisionId}
          reportNumber={report.reportNumber}
          onClose={close}
        />
      )}
      {dialog === "add" && current && (
        <ObligationDialog
          mode={{ kind: "add", revisionId: current.revisionId, clientId: report.clientId }}
          onClose={close}
        />
      )}
      {dialog === "withdraw" && current && (
        <WithdrawDialog
          reportId={report.reportId}
          reportNumber={report.reportNumber}
          currentRevisionNo={current.revisionNo}
          onClose={close}
        />
      )}
    </>
  );
}
