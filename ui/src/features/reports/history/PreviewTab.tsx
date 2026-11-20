import type { UseQueryResult } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { QueryContent } from "@/components/QueryContent";
import { Section } from "@/components/Section";
import { Select } from "@/components/Select";
import { StatusBadge } from "@/components/StatusBadge";
import { Timestamp } from "@/components/Timestamp";
import { Toolbar } from "@/components/Toolbar";
import type { CommandError } from "@/generated/CommandError";
import { useCommandQuery } from "@/lib/commands";
import { useSearchParam } from "@/lib/searchParam";
import styles from "@/styles/layout.module.css";
import { ReportContent } from "../content/ReportContent";
import {
  GET_REPORT_REVISION,
  type ReportDetail,
  type RevisionDetail,
  type RevisionSummary,
} from "../contract";
import { ExportDialog } from "../delivery/ExportDialog";
import { AVAILABILITY, RELATIONSHIP } from "../labels";

/** The URL parameter holding the shown revision's number, such as `?revision=1`. */
const REVISION_PARAM = "revision";

interface PreviewTabProps {
  report: ReportDetail;
  /** The revision shown by default (`shownRevision`), already read for the Results tab. */
  shown: RevisionSummary | undefined;
  revision: UseQueryResult<RevisionDetail, CommandError>;
}

/**
 * A revision's printed content, the same data the PDF is rendered from (REQ-RPT-001, #4836).
 * The picker shows any released revision, the current one by default, with its number in the
 * URL. An earlier revision says what replaced it and offers its own export; the current one
 * is exported with Export PDF in the header. Each revision read is audited.
 */
export function PreviewTab({ report, shown, revision }: PreviewTabProps) {
  const [param, setParam] = useSearchParam(REVISION_PARAM);
  if (!shown) {
    return (
      <Section title="Preview">
        <p className={styles.hint}>No revision released yet.</p>
      </Section>
    );
  }
  const picked = report.revisions.find((each) => String(each.revisionNo) === param) ?? shown;
  const options = [...report.revisions].reverse().map((each) => ({
    id: String(each.revisionNo),
    label: `Revision ${each.revisionNo} (${AVAILABILITY[each.availability].label.toLowerCase()})`,
  }));
  return (
    <Section title="Preview">
      <Toolbar>
        <Select
          label="Showing"
          layout="inline"
          name={REVISION_PARAM}
          options={options}
          value={String(picked.revisionNo)}
          onChange={(next) => setParam(next === String(shown.revisionNo) ? null : next)}
        />
        {picked.availability !== "current" && (
          <StatusBadge
            tone={AVAILABILITY[picked.availability].tone}
            variant={AVAILABILITY[picked.availability].variant}
          >
            {AVAILABILITY[picked.availability].label}
          </StatusBadge>
        )}
        {picked.availability === "current" ? (
          <p className={styles.hint}>Export PDF at the top exports the current revision.</p>
        ) : (
          <ExportRevision revision={picked} reportNumber={report.reportNumber} />
        )}
      </Toolbar>
      {picked.availability === "superseded" && (
        <ReplacedNotice picked={picked} revisions={report.revisions} />
      )}
      {picked.revisionId === shown.revisionId ? (
        <Content revision={revision} />
      ) : (
        <PickedContent revisionId={picked.revisionId} />
      )}
    </Section>
  );
}

/** "You are viewing revision 1, which was replaced by revision 2 (Correction) on …". */
function ReplacedNotice({
  picked,
  revisions,
}: {
  picked: RevisionSummary;
  revisions: readonly RevisionSummary[];
}) {
  const { state } = useLocation();
  const next = revisions.find((each) => each.revisionNo === picked.revisionNo + 1);
  const current = revisions.some((each) => each.availability === "current");
  return (
    <Alert tone="warning">
      You are viewing revision {picked.revisionNo}
      {next && (
        <>
          , which was replaced by revision {next.revisionNo} ({RELATIONSHIP[next.relationship]}) on{" "}
          <Timestamp value={next.releasedAt} />
        </>
      )}
      .{" "}
      {current && (
        <Link to={{ search: "" }} replace state={state}>
          Show current revision
        </Link>
      )}
    </Alert>
  );
}

function ExportRevision({
  revision,
  reportNumber,
}: {
  revision: RevisionSummary;
  reportNumber: string;
}) {
  const [isExporting, setExporting] = useState(false);
  return (
    <>
      <Button onPress={() => setExporting(true)}>Export revision {revision.revisionNo}</Button>
      {isExporting && (
        <ExportDialog
          revisionId={revision.revisionId}
          reportNumber={`${reportNumber} revision ${revision.revisionNo}`}
          onClose={() => setExporting(false)}
        />
      )}
    </>
  );
}

/** A revision other than the default, read when picked (the audited revision read). */
function PickedContent({ revisionId }: { revisionId: string }) {
  const revision = useCommandQuery<RevisionDetail>(GET_REPORT_REVISION, {
    input: { revisionId },
  });
  return <Content revision={revision} />;
}

function Content({ revision }: { revision: UseQueryResult<RevisionDetail, CommandError> }) {
  return (
    <QueryContent query={revision} what="report content">
      {(loaded) => <ReportContent content={loaded.content} />}
    </QueryContent>
  );
}
