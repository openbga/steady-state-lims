import { useState } from "react";
import { Button } from "@/components/Button";
import { DataGrid } from "@/components/DataGrid";
import { DetailLayout } from "@/components/DetailPanel";
import { Page, PageHeader } from "@/components/Page";
import { QueryContent } from "@/components/QueryContent";
import type { IntakeDeferralView } from "@/generated/IntakeDeferralView";
import { optionalText } from "@/lib/choices";
import { useOpenRecord } from "@/lib/openRecord";
import { openRecordPanel } from "@/lib/openRecordPanel";
import { DispositionDialogs, type DispositionStep, RecordIntakeDialog } from "./IntakeDialogs";
import { IntakePanel } from "./IntakePanel";
import { IntakeToolbar, useIntakePages } from "./IntakeToolbar";
import { useIntakeActions } from "./intakeActions";
import { intakeColumns } from "./intakeColumns";
import { useShowParam } from "./intakeLabels";

const intakeId = (row: IntakeDeferralView) => row.intakeId;

const DESCRIPTION =
  "Retain supplied identity evidence while a complete birth date is unavailable. These records do not authorize orders or testing.";

/** The empty list's wording, for a find or for the Show filter. */
const emptyText = (searched: boolean) =>
  searched
    ? {
        title: "No intake matches",
        description:
          "No intake in this list has this text in its name as supplied or source reference.",
      }
    : {
        title: "No intake to show",
        description:
          "Choose another Show filter, or record incomplete intake when source evidence exists.",
      };

/**
 * Incomplete identity intake (DM-06): supplied identity evidence retained while a complete
 * birth date is unavailable. These records never authorize orders or testing. The engine
 * finds intake by part of the name as supplied or the source reference, filters it by Show
 * (`?show=`, open intake by default) and counts each state, before paging. The find text
 * names a person, so it stays in memory, out of the address. An intake opens in a side panel
 * (`?open=`); open intake is resolved to a verified patient or declined, from the panel or
 * the row's menu, each with its source and reason.
 */
export function IncompleteIntakePage() {
  const record = useOpenRecord();
  const [show, setShow] = useShowParam();
  const [search, setSearch] = useState("");
  const searched = optionalText(search);
  const query = useIntakePages(show, searched);
  const [recording, setRecording] = useState(false);
  const [step, setStep] = useState<DispositionStep | null>(null);
  const rows = query.data?.pages.flatMap((page) => page.rows);
  const { actionsOf, canViewAudit, rowActions } = useIntakeActions(
    (intake) => record.open(intake.intakeId),
    (intake, disposition) => setStep({ intake, disposition }),
  );
  const panel = openRecordPanel(
    record,
    rows,
    intakeId,
    (intake) => (
      <IntakePanel
        intake={intake}
        actions={actionsOf(intake)}
        canViewAudit={canViewAudit}
        onClose={record.close}
        onPrevious={record.previous}
        onNext={record.next}
      />
    ),
    show !== "all" && <Button onPress={() => setShow("all")}>Show all intake</Button>,
  );
  return (
    <Page layout="collection">
      <PageHeader
        title="Incomplete identity intake"
        breadcrumbs={[{ label: "Patients", href: "/patients" }]}
        description={DESCRIPTION}
        actions={
          <Button variant="primary" onPress={() => setRecording(true)}>
            Record incomplete intake
          </Button>
        }
      />
      <DetailLayout panel={panel}>
        <IntakeToolbar
          query={query}
          search={search}
          onSearch={setSearch}
          show={show}
          onShow={setShow}
        />
        <QueryContent
          query={query}
          what="incomplete intake"
          empty={{ when: () => rows?.length === 0, ...emptyText(searched !== null) }}
        >
          {() => (
            <DataGrid
              label="Incomplete intake records"
              columns={intakeColumns(Date.now())}
              rows={rows ?? []}
              getRowId={intakeId}
              openRowId={record.openId}
              onOrderChange={record.followOrder}
              onRowAction={(row, order) => record.open(row.intakeId, order)}
              rowActions={rowActions}
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
