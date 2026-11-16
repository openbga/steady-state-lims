import { useNavigate } from "react-router";
import type { GridRowActions } from "@/components/DataGrid";
import type { ActionItem } from "@/components/RowActions";
import type { IntakeDeferralView } from "@/generated/IntakeDeferralView";
import type { IntakeDisposition } from "@/generated/IntakeDisposition";
import { allowedActionItems } from "@/lib/allowedActions";
import { useHasCapability } from "@/lib/commands";

/** The dispositions of open intake, in the order the panel and the row menu show them. */
const DISPOSITIONS = [
  { id: "resolved", label: "Resolve with verified patient" },
  { id: "declined", label: "Record declined intake" },
] as const;

/** The Audit trail filtered on one intake: its recording and its disposition. */
export const intakeAuditPath = (intake: IntakeDeferralView) =>
  `/audit?${new URLSearchParams({ recordType: "intake_deferral", recordId: intake.intakeId })}`;

interface IntakeActions {
  /** The open intake's dispositions, for its side panel. */
  actionsOf: (intake: IntakeDeferralView) => ActionItem[];
  /** Whether the person may open the Audit trail (`view_audit`). */
  canViewAudit: boolean;
  /** The row menu: Open, the dispositions, then View in audit trail. */
  rowActions: GridRowActions<IntakeDeferralView>;
}

/**
 * The actions on one intake. Open intake is resolved or declined, each through its dialog
 * (`dispose`); a disposition is final. Reading the list and recording a disposition need the
 * same capability, so every open intake shown offers both. Engine request: `allowedActions`
 * on `IntakeDeferralView` would replace the open-intake condition.
 */
export function useIntakeActions(
  open: (intake: IntakeDeferralView) => void,
  dispose: (intake: IntakeDeferralView, disposition: IntakeDisposition) => void,
): IntakeActions {
  const navigate = useNavigate();
  const canViewAudit = useHasCapability("view_audit");
  const actionsOf = (intake: IntakeDeferralView) =>
    allowedActionItems(
      DISPOSITIONS,
      intake.disposition === null ? ["resolved", "declined"] : [],
      (id) => dispose(intake, id),
    );
  const rowItems = (intake: IntakeDeferralView): ActionItem[] => [
    { id: "open", label: "Open", onAction: () => open(intake) },
    ...actionsOf(intake),
    ...(canViewAudit
      ? [
          {
            id: "audit",
            label: "View in audit trail",
            onAction: () => navigate(intakeAuditPath(intake)),
          },
        ]
      : []),
  ];
  return {
    actionsOf,
    canViewAudit,
    rowActions: { label: (row) => row.suppliedName, hasItems: () => true, items: rowItems },
  };
}
