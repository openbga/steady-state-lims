import { useEffect } from "react";
import { Link, type NavigateOptions } from "react-router";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Facts } from "@/components/Facts";
import { LoadingState } from "@/components/LoadingState";
import { RefreshControl } from "@/components/RefreshControl";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import type { ContainerLookup } from "@/generated/ContainerLookup";
import { useCommandQuery } from "@/lib/commands";
import { subjectName } from "../subjects";
import { ContainerMaterial } from "./ContainerMaterial";
import { HoldCount, LatestLabelJob } from "./containerColumns";
import { FIND_CONTAINER } from "./contract";
import { LookupReceipt } from "./LookupReceipt";
import { acceptanceStatus, containerStateLabel, volumeText } from "./labels";
import styles from "./lookup.module.css";
import { type HistoryTab, MaterialHistory, useMaterialHistory } from "./MaterialHistory";
import { useRecentLookups } from "./recentLookups";

/** `find_container`, an audited read: each scan is one lookup, shared by the banner and card. */
export function useContainerLookup(labelCode: string) {
  return useCommandQuery<ContainerLookup>(FIND_CONTAINER, { input: { labelCode } });
}

interface ContainerResultProps {
  labelCode: string;
  /** The History tab the address names. */
  tab: HistoryTab;
  tabHref: (tab: HistoryTab) => string;
  routerOptions: NavigateOptions;
}

/** The looked-up container, or why there is none. */
export function ContainerResult({ labelCode, ...history }: ContainerResultProps) {
  const match = useContainerLookup(labelCode);
  if (match.isPending) return <LoadingState label={`Looking up ${labelCode}…`} />;
  if (match.error?.code === "not_found") {
    return (
      <EmptyState
        title={`No container has the barcode ${labelCode}`}
        description="Check the label and scan again."
      />
    );
  }
  if (match.isError) {
    return <ErrorState title={`${labelCode} could not be looked up`} error={match.error} />;
  }
  return <FoundContainer lookup={match.data} match={match} {...history} />;
}

/** Adds the lookup to this session's recent lookups, and keeps its state current there. */
function useRemembered(lookup: ContainerLookup, readAt: number) {
  const { remember } = useRecentLookups();
  const { subject } = lookup;
  useEffect(() => {
    remember({
      labelCode: lookup.container.labelCode,
      accessionNumber: lookup.accessionNumber,
      patient: subjectName(subject),
      acceptance: lookup.acceptance,
      lookedUpAt: new Date(readAt).toISOString(),
    });
  }, [remember, lookup, subject, readAt]);
}

interface FoundContainerProps extends Omit<ContainerResultProps, "labelCode"> {
  lookup: ContainerLookup;
  match: ReturnType<typeof useContainerLookup>;
}

/**
 * One card for the container: its acceptance in the title, one Refresh for the container and
 * its history, its facts, receipt step and actions; then its History.
 */
function FoundContainer({ lookup, match, tab, tabHref, routerOptions }: FoundContainerProps) {
  const { container, accessionId, accessionNumber } = lookup;
  const history = useMaterialHistory(container.containerId);
  useRemembered(lookup, match.dataUpdatedAt);
  const acceptance = acceptanceStatus(lookup.acceptance);
  const refresh = {
    dataUpdatedAt: match.dataUpdatedAt,
    isFetching: match.isFetching || history.query.isFetching,
    refetch: () => Promise.all([match.refetch(), history.refresh()]),
  };
  return (
    <>
      <Section
        title={
          <span className={styles.title}>
            Container {container.labelCode}
            <StatusBadge tone={acceptance.tone}>{acceptance.label}</StatusBadge>
          </span>
        }
        actions={<RefreshControl query={refresh} />}
      >
        <Facts
          layout="compact"
          items={[
            {
              label: "Accession",
              value: <Link to={`/accessions/${accessionId}`}>{accessionNumber}</Link>,
            },
            {
              label: "Specimen",
              value: `${lookup.specimenTypeCode} · ${container.kind === "primary" ? "Primary" : "Aliquot"}`,
            },
            { label: "State", value: containerStateLabel(container.state) },
            { label: "Volume", value: volumeText(container) },
            { label: "Location", value: container.location?.name ?? "Not recorded" },
            { label: "Holds", value: <HoldCount count={container.openHolds.length} /> },
            { label: "Label printing", value: <LatestLabelJob container={container} /> },
          ]}
        />
        <LookupReceipt lookup={lookup} />
        <ContainerMaterial container={container} />
      </Section>
      <MaterialHistory
        container={container}
        history={history}
        tab={tab}
        tabHref={tabHref}
        routerOptions={routerOptions}
      />
    </>
  );
}
