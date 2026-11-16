import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { DataGrid, type DataGridColumn } from "@/components/DataGrid";
import { EmptyState } from "@/components/EmptyState";
import { ListCount } from "@/components/ListLimit";
import { Page, PageHeader } from "@/components/Page";
import { QueryContent } from "@/components/QueryContent";
import { RefreshControl } from "@/components/RefreshControl";
import { Toolbar } from "@/components/Toolbar";
import { useCommandQuery } from "@/lib/commands";
import { Age } from "./Age";
import { AreaFilter } from "./AreaFilter";
import { areaLabel, useAreaChoice } from "./areas";
import { useCheckedCounts } from "./checkedCounts";
import { LIST_WORK_QUEUES, type WorkQueueSummary } from "./contract";
import { QueueCount } from "./QueueCount";
import { type QueueRow, queuePath, queueView } from "./queueRows";
import styles from "./workqueues.module.css";

/** `?empty=show` lists the queues with nothing waiting too. */
const EMPTY_PARAM = "empty";

const COLUMNS: readonly DataGridColumn<QueueRow>[] = [
  {
    id: "area",
    header: "Area",
    cell: (row) => <span className={styles.area}>{areaLabel(row.area)}</span>,
    sortValue: (row) => areaLabel(row.area),
    width: 140,
  },
  {
    id: "queue",
    header: "Queue",
    cell: (row) => row.label,
    sortValue: (row) => row.label,
    identifier: true,
  },
  {
    id: "count",
    header: "Items",
    cell: (row) => <QueueCount row={row} checked={row.checked} />,
    sortValue: (row) => row.count ?? row.checked?.count ?? -1,
    align: "end",
    width: 200,
  },
  {
    id: "oldest",
    header: "Oldest item waiting",
    cell: (row) => <Age since={row.oldestSince ?? row.checked?.oldestSince ?? null} />,
    sortValue: (row) => row.oldestSince ?? row.checked?.oldestSince ?? undefined,
    // Most recent first; queues with nothing waiting stay at the bottom.
    defaultSort: "desc",
    width: 320,
  },
  { id: "next", header: "Next action", cell: (row) => row.nextAction },
];

/**
 * Nothing to list: either every queue in the chosen areas is empty and hidden, or none of the
 * person's queues belongs to the chosen areas.
 */
function NoQueuesShown({
  emptyHidden,
  onShowEmpty,
  onAllAreas,
}: {
  emptyHidden: boolean;
  onShowEmpty: () => void;
  onAllAreas: () => void;
}) {
  return emptyHidden ? (
    <EmptyState
      title="Nothing waiting"
      description="Every queue in the chosen areas is empty."
      action={<Button onPress={onShowEmpty}>Show empty queues</Button>}
    />
  ) : (
    <EmptyState
      title="No queues in the chosen areas"
      description="None of your work queues belongs to these areas."
      action={<Button onPress={onAllAreas}>Show all areas</Button>}
    />
  );
}

/**
 * The work waiting across the laboratory (REQ-OPS-004), one row per queue the signed-in
 * person may work: how many items wait, how long the oldest has waited, and what to do next.
 * Empty queues are hidden unless asked for, and the Area choice is remembered for each person
 * (ticket #4776). Other people change the queues, so the time of the last read shows beside
 * Refresh, which also forgets the counts found by opening queues not counted yet.
 */
export function WorkQueuesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const queues = useCommandQuery<WorkQueueSummary[]>(LIST_WORK_QUEUES);
  const checked = useCheckedCounts();
  const [areas, chooseAreas] = useAreaChoice();
  const showEmpty = params.get(EMPTY_PARAM) === "show";
  const view = useMemo(
    () => queueView(queues.data ?? [], checked.counts, areas, showEmpty),
    [queues.data, checked.counts, areas, showEmpty],
  );
  const setShowEmpty = (show: boolean) =>
    setParams(
      (last) => {
        const next = new URLSearchParams(last);
        if (show) next.set(EMPTY_PARAM, "show");
        else next.delete(EMPTY_PARAM);
        return next;
      },
      { replace: true },
    );
  const refresh = {
    dataUpdatedAt: queues.dataUpdatedAt,
    isFetching: queues.isFetching,
    refetch: () => {
      checked.clear();
      return queues.refetch();
    },
  };
  return (
    <Page layout="collection">
      <PageHeader title="Work queues" />
      <Toolbar
        variant="collection"
        count={queues.data && <ListCount shown={view.shown.length} noun="queues" one="queue" />}
        actions={<RefreshControl query={refresh} />}
      >
        <AreaFilter value={areas} onChange={chooseAreas} counts={view.counts} total={view.total} />
        <Checkbox isSelected={showEmpty} onChange={setShowEmpty}>
          {`Show empty queues (${view.empty})`}
        </Checkbox>
      </Toolbar>
      <QueryContent
        query={queues}
        what="work queues"
        loadingRows={8}
        empty={{
          when: (rows) => rows.length === 0,
          title: "No work queues",
          description: "None of your capabilities has a work queue.",
        }}
      >
        {() =>
          view.shown.length === 0 ? (
            <NoQueuesShown
              emptyHidden={view.empty > 0 && !showEmpty}
              onShowEmpty={() => setShowEmpty(true)}
              onAllAreas={() => chooseAreas([])}
            />
          ) : (
            <DataGrid
              label="Work queues"
              columns={COLUMNS}
              rows={view.shown}
              getRowId={(row) => row.queue}
              onRowAction={(row) => navigate(queuePath(row))}
              fill
            />
          )
        }
      </QueryContent>
    </Page>
  );
}
