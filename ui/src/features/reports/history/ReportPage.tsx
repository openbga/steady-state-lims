import { useParams } from "react-router";
import { Alert } from "@/components/Alert";
import { Page, PageHeader } from "@/components/Page";
import { QueryContent } from "@/components/QueryContent";
import { RefreshControl } from "@/components/RefreshControl";
import { Timestamp } from "@/components/Timestamp";
import { useCommandQuery } from "@/lib/commands";
import { IdentityBanner } from "@/lib/IdentityBanner";
import { useRecordSequence } from "@/lib/recordSequence";
import styles from "@/styles/layout.module.css";
import { GET_REPORT, RECORD_IMPACT_ASSESSMENT, type ReportDetail } from "../contract";
import { DeliverySection } from "../delivery/DeliverySection";
import { reportPath } from "../paths";
import { ExportsSection } from "./ExportsSection";
import { ImpactSection } from "./ImpactSection";
import { IncidentsSection } from "./IncidentsSection";
import { ReportActions, ReportChips } from "./ReportHeader";
import { RevisionsSection } from "./RevisionsSection";

/** Where the breadcrumb leads when the report was not opened from a list. */
const HOME = { label: "Reports", href: "/reports" };

/**
 * One report's history (REQ-RPT-002, REQ-RPT-003, REQ-RPT-013): every revision, impact after
 * release, delivery obligations and attempts, exports, preservation incidents and any
 * withdrawal, under status chips and the patient banner. Actions are offered only when the
 * report's `allowedActions`, computed by the engine for the signed-in person, names them; the
 * engine still decides. Opening this screen is recorded in the audit trail.
 */
export function ReportPage() {
  const { reportId = "" } = useParams();
  const report = useCommandQuery<ReportDetail>(GET_REPORT, { input: { reportId } });
  const { list, sequence } = useRecordSequence(reportId, HOME, reportPath);
  const data = report.data;
  // One header in every state, so Previous and Next keep focus while the next report loads.
  return (
    <Page>
      <PageHeader
        title={data ? `Report ${data.reportNumber}` : "Report"}
        chips={data && <ReportChips report={data} />}
        description="Opening this screen is recorded in the audit trail."
        breadcrumbs={[list, { label: data?.reportNumber ?? "Report", href: reportPath(reportId) }]}
        sequence={sequence}
        actions={data && <ReportActions report={data} />}
      />
      {data && (
        <IdentityBanner
          subject={data.subject}
          specimen={{
            accessionNumber: data.accessionNumber,
            accessionId: data.accessionId,
            orderId: data.orderId,
          }}
        />
      )}
      <RefreshControl query={report} />
      <QueryContent query={report} what="report">
        {(loaded) => <ReportHistory report={loaded} />}
      </QueryContent>
    </Page>
  );
}

function ReportHistory({ report }: { report: ReportDetail }) {
  const allows = (action: string) => report.allowedActions.includes(action);
  return (
    <div className={styles.stack}>
      {report.withdrawal && (
        <Alert tone="info" title="This report is withdrawn">
          Withdrawn <Timestamp value={report.withdrawal.withdrawnAt} /> by{" "}
          {report.withdrawal.withdrawnBy.displayName} at revision {report.withdrawal.revisionNo}.
          Reason: {report.withdrawal.reason}
        </Alert>
      )}
      {report.impact && (
        <ImpactSection impact={report.impact} canAssess={allows(RECORD_IMPACT_ASSESSMENT)} />
      )}
      <RevisionsSection
        revisions={report.revisions}
        reportTitle={`Report ${report.reportNumber}`}
      />
      <DeliverySection obligations={report.obligations} />
      <ExportsSection exports={report.exports} revisions={report.revisions} />
      {<IncidentsSection incidents={report.incidents} revisions={report.revisions} />}
    </div>
  );
}
