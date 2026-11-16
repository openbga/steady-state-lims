import { useState } from "react";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { DataGrid, type DataGridColumn } from "@/components/DataGrid";
import { DetailLayout } from "@/components/DetailPanel";
import { Page, PageHeader } from "@/components/Page";
import { QueryContent } from "@/components/QueryContent";
import { RefreshControl } from "@/components/RefreshControl";
import { Timestamp } from "@/components/Timestamp";
import type { IntakeDeferralView } from "@/generated/IntakeDeferralView";
import { allowedActionItems } from "@/lib/allowedActions";
import { useCommandPages } from "@/lib/commands";
import { useOpenRecord } from "@/lib/openRecord";
import { openRecordPanel } from "@/lib/openRecordPanel";
import { DispositionDialogs, type DispositionStep, RecordIntakeDialog } from "./IntakeDialogs";
import { IntakePanel } from "./IntakePanel";
import { birthEvidence, IntakeStateBadge, intakeStateLabel } from "./intakeLabels";

const intakeId = (row: IntakeDeferralView) => row.intakeId;

const COLUMNS: readonly DataGridColumn<IntakeDeferralView>[] = [
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
    id: "state",
    header: "Disposition",
    cell: (row) => <IntakeStateBadge intake={row} />,
    sortValue: intakeStateLabel,
    width: 240,
  },
];

/** The dispositions of open intake, in the order the panel shows them. */
const ACTIONS = [
  { id: "resolved", label: "Resolve with verified patient" },
  { id: "declined", label: "Record declined intake" },
] as const;

/**
 * Incomplete identity intake (DM-06): supplied identity evidence retained while a complete
 * birth date is unavailable. These records never authorize orders or testing. An intake opens
 * in a side panel (`?open=`); open intake is resolved to a verified patient or declined, each
 * with its source and reason.
 */
export function IncompleteIntakePage() {
  const record = useOpenRecord();
  const [includeClosed, setIncludeClosed] = useState(false);
  const query = useCommandPages<IntakeDeferralView, string>("list_intake_deferrals", {
    key: { includeClosed },
    pageArgs: (afterId) => ({ input: { includeClosed, afterId: afterId ?? null } }),
    nextCursor: (page) => (page.length === 50 ? page.at(-1)?.intakeId : undefined),
  });
  const [recording, setRecording] = useState(false);
  const [step, setStep] = useState<DispositionStep | null>(null);
  const rows = query.data?.pages.flat();
  // Engine request: `allowedActions` on `IntakeDeferralView` would replace this condition;
  // reading the list and recording a disposition need the same capability.
  const actionsOf = (intake: IntakeDeferralView) =>
    allowedActionItems(ACTIONS, intake.disposition === null ? ["resolved", "declined"] : [], (id) =>
      setStep({ intake, disposition: id }),
    );
  const panel = openRecordPanel(record, rows, intakeId, (intake) => (
    <IntakePanel
      intake={intake}
      actions={actionsOf(intake)}
      onClose={record.close}
      onPrevious={record.previous}
      onNext={record.next}
    />
  ));
  return (
    <Page layout="collection">
      <PageHeader
        title="Incomplete identity intake"
        breadcrumbs={[{ label: "Patients", href: "/patients" }]}
        description="Retain supplied identity evidence while a complete birth date is unavailable. These records do not authorize orders or testing."
        actions={
          <Button variant="primary" onPress={() => setRecording(true)}>
            Record incomplete intake
          </Button>
        }
      />
      <DetailLayout panel={panel}>
        <Checkbox isSelected={includeClosed} onChange={setIncludeClosed}>
          Include resolved and declined intake
        </Checkbox>
        <RefreshControl query={query} />
        <QueryContent query={query} what="incomplete intake">
          {() => (
            <DataGrid
              label="Incomplete intake records"
              columns={COLUMNS}
              rows={rows ?? []}
              getRowId={intakeId}
              openRowId={record.openId}
              onOrderChange={record.followOrder}
              onRowAction={(row, order) => record.open(row.intakeId, order)}
              fill
            />
          )}
        </QueryContent>
        {query.hasNextPage && (
          <Button isPending={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()}>
            Load more intake records
          </Button>
        )}
      </DetailLayout>
      {recording && <RecordIntakeDialog onClose={() => setRecording(false)} />}
      {step && <DispositionDialogs step={step} onChange={setStep} />}
    </Page>
  );
}
