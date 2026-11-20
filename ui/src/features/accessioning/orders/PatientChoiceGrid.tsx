import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { DataGrid, type DataGridColumn } from "@/components/DataGrid";
import type { OrderPatientChoice } from "@/generated/OrderPatientChoice";
import { useFormatBirthDate, useFormatDay } from "@/lib/format";
import { IdentityHoldBadge } from "../IdentityHoldBadge";
import { identifierText, orNotRecorded, subjectName } from "../subjects";
import styles from "./PatientStep.module.css";

const name = (choice: OrderPatientChoice) => subjectName(choice.subject);

/**
 * What tells patients apart (REQ-IDN-001): the name with any open identity hold, the birth
 * date with the age, the sex, the active identifiers and the latest order. The › shows that
 * the whole row chooses the patient.
 */
function choiceColumns(
  formatBirthDate: (birthDate: string) => string,
  formatDay: (timestamp: string) => string,
): DataGridColumn<OrderPatientChoice>[] {
  return [
    {
      id: "name",
      header: "Name",
      cell: (choice) => (
        <span className={styles.name}>
          {name(choice)}
          {choice.subject.openIdentityHolds > 0 && (
            <IdentityHoldBadge count={choice.subject.openIdentityHolds} />
          )}
        </span>
      ),
      identifier: true,
    },
    {
      id: "birthDate",
      header: "Birth date",
      cell: (choice) => formatBirthDate(choice.subject.birthDate),
    },
    {
      id: "sex",
      header: "Sex",
      cell: (choice) => orNotRecorded(choice.subject.administrativeSex),
      width: 112,
    },
    {
      id: "identifiers",
      header: "Identifiers",
      cell: (choice) => identifierText(choice.subject.identifiers),
    },
    {
      id: "lastOrder",
      header: "Last order",
      cell: (choice) => (
        <span className={styles.lastOrder}>
          {choice.lastOrder
            ? `${formatDay(choice.lastOrder.receivedAt)} · ${choice.lastOrder.clientName}`
            : "No orders"}
          <ChevronRight aria-hidden="true" className={styles.chevron} />
        </span>
      ),
    },
  ];
}

const getRowId = (choice: OrderPatientChoice) => choice.subject.subjectId;

interface PatientChoiceGridProps {
  choices: readonly OrderPatientChoice[];
  onChoose: (subjectId: string) => void;
}

/** Matching patients; a click on a row, or the arrow keys and Enter, chooses the patient. */
export function PatientChoiceGrid({ choices, onChoose }: PatientChoiceGridProps) {
  const formatBirthDate = useFormatBirthDate();
  const formatDay = useFormatDay();
  const columns = useMemo(
    () => choiceColumns(formatBirthDate, formatDay),
    [formatBirthDate, formatDay],
  );
  return (
    <DataGrid
      label="Matching patients"
      columns={columns}
      rows={choices}
      getRowId={getRowId}
      onRowAction={(choice) => onChoose(choice.subject.subjectId)}
    />
  );
}
