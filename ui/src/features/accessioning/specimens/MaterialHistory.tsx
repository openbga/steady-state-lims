import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { NavigateOptions } from "react-router";
import { Button } from "@/components/Button";
import { QueryContent } from "@/components/QueryContent";
import { Section } from "@/components/Section";
import { Tabs } from "@/components/Tabs";
import { Timestamp } from "@/components/Timestamp";
import { Toolbar } from "@/components/Toolbar";
import type { ContainerView } from "@/generated/ContainerView";
import type { MaterialHistoryEntry } from "@/generated/MaterialHistoryEntry";
import type { MaterialHistoryPage } from "@/generated/MaterialHistoryPage";
import type { MaterialHistorySnapshot } from "@/generated/MaterialHistorySnapshot";
import { useCommandQuery } from "@/lib/commands";
import { usePersonText } from "@/lib/person";
import { DetailsTip } from "./DetailsTip";
import { labelJobStatus } from "./labels";

const PAGE_SIZE = 50;
const FIRST: Cursor = { offset: 0, snapshot: null };

interface Cursor {
  offset: number;
  snapshot: MaterialHistorySnapshot | null;
}

/**
 * A container's material history (`get_container_history`, an audited read), 50 events per
 * stream per page. The snapshot keeps a page's membership while browsing; `refresh` starts
 * again from the latest history.
 */
export function useMaterialHistory(containerId: string) {
  const client = useQueryClient();
  const [cursor, setCursor] = useState<Cursor>(FIRST);
  const query = useCommandQuery<MaterialHistoryPage>("get_container_history", {
    input: { containerId, ...cursor },
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["get_container_history"], refetchType: "none" });
    if (cursor.offset === 0 && cursor.snapshot === null) return query.refetch();
    setCursor(FIRST);
  };
  return { query, offset: cursor.offset, setCursor, refresh };
}

type MaterialHistoryState = ReturnType<typeof useMaterialHistory>;

/** The History tabs, in order; the first is shown when the address names none. */
export const HISTORY_TABS = ["moves", "holds", "terminal", "labels"] as const;
export type HistoryTab = (typeof HISTORY_TABS)[number];

const TAB_NAMES: Record<HistoryTab, string> = {
  moves: "Location moves",
  holds: "Holds and releases",
  terminal: "Terminal events",
  labels: "Label jobs",
};

interface MaterialHistoryProps {
  container: ContainerView;
  history: MaterialHistoryState;
  tab: HistoryTab;
  /** The address of each tab, and the options that keep the lookup on screen. */
  tabHref: (tab: HistoryTab) => string;
  routerOptions: NavigateOptions;
}

/**
 * Label jobs, holds and releases, location moves and terminal events, one tab each with its
 * true count: moves and holds from the engine's totals, the others as read in full.
 */
export function MaterialHistory({
  container,
  history,
  tab,
  tabHref,
  routerOptions,
}: MaterialHistoryProps) {
  const page = history.query.data;
  const terminal = page ? terminalEvents(page) : [];
  const counts: Record<HistoryTab, number | undefined> = {
    moves: page?.totals.moves,
    holds: page?.totals.holds,
    terminal: page && terminal.length,
    labels: container.labelJobs.length,
  };
  const tabs = HISTORY_TABS.map((id) => ({
    id,
    label: counts[id] === undefined ? TAB_NAMES[id] : `${TAB_NAMES[id]} (${counts[id]})`,
    href: tabHref(id),
  }));
  return (
    <Section title="History">
      <Tabs label="History" tabs={tabs} selectedId={tab} routerOptions={routerOptions}>
        {tab === "labels" ? (
          <LabelJobs container={container} />
        ) : (
          <QueryContent query={history.query} what="material history">
            {(loaded) => <StreamTab tab={tab} page={loaded} history={history} />}
          </QueryContent>
        )}
      </Tabs>
    </Section>
  );
}

function terminalEvents(page: MaterialHistoryPage): MaterialHistoryEntry[] {
  return [page.depletion, page.disposal].filter((e): e is MaterialHistoryEntry => e !== null);
}

const EMPTY: Record<Exclude<HistoryTab, "labels">, string> = {
  moves: "No location moves recorded for this container.",
  holds: "No holds placed on this container.",
  terminal: "Not marked depleted or disposed.",
};

function StreamTab({
  tab,
  page,
  history,
}: {
  tab: Exclude<HistoryTab, "labels">;
  page: MaterialHistoryPage;
  history: MaterialHistoryState;
}) {
  const entries = tab === "terminal" ? terminalEvents(page) : page[tab];
  const total = tab === "terminal" ? entries.length : page.totals[tab];
  const { offset, setCursor } = history;
  return (
    <>
      {entries.length === 0 ? <p>{EMPTY[tab]}</p> : <HistoryList entries={entries} />}
      {tab !== "terminal" && total > PAGE_SIZE && (
        <Toolbar>
          <Button
            isDisabled={offset === 0}
            onPress={() =>
              setCursor({ offset: Math.max(0, offset - PAGE_SIZE), snapshot: page.snapshot })
            }
          >
            Previous history
          </Button>
          <Button
            isDisabled={offset + PAGE_SIZE >= total}
            onPress={() => setCursor({ offset: offset + PAGE_SIZE, snapshot: page.snapshot })}
          >
            Next history
          </Button>
        </Toolbar>
      )}
      <DetailsTip
        note="Times come from separate streams and don't set a shared order."
        label="About history order"
      >
        <p>
          Moves follow committed sequence where known. Other streams are displayed separately;
          recorded times do not establish a shared event order. Pages retain their membership while
          browsing; Refresh starts from the latest history.
        </p>
      </DetailsTip>
    </>
  );
}

function HistoryList({ entries }: { entries: MaterialHistoryEntry[] }) {
  const person = usePersonText();
  return (
    <ul>
      {entries.map((e) => (
        <li key={e.id}>
          {e.description}. Recorded by {person(e.actor, e.actorDisplay)},{" "}
          <Timestamp value={e.recordedAt} />. {e.reason && `Reason: ${e.reason}.`}{" "}
          {e.kind === "move" &&
            (e.causalSequence === null
              ? "Legacy chronology unresolved."
              : `Committed sequence ${e.causalSequence}.`)}
        </li>
      ))}
    </ul>
  );
}

/** Every requested print and reprint of the container, oldest first. */
function LabelJobs({ container }: { container: ContainerView }) {
  return (
    <>
      {container.labelJobs.length === 0 ? (
        <p>No labels requested.</p>
      ) : (
        <ul>
          {container.labelJobs.map((job) => (
            <li key={job.jobId}>
              {labelJobStatus(job).label}. <Timestamp value={job.requestedAt} />
            </li>
          ))}
        </ul>
      )}
      <DetailsTip
        note="A queued or handed-off job does not prove a label printed."
        label="About label job outcomes"
      >
        <p>
          Refresh after an interruption, then check the physical printer and label before requesting
          a reasoned reprint of the same barcode.
        </p>
      </DetailsTip>
    </>
  );
}
