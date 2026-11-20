import { Facts } from "@/components/Facts";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import { Timestamp } from "@/components/Timestamp";
import type { ExportView, ImpactView, ReportDetail } from "../contract";
import { EXPORT_PURPOSES } from "../labels";

/** Printed when the latest revision's stored content cannot be read (NFR-07). */
const UNREADABLE = "Not available: the stored report content is damaged";

/**
 * The report's main facts in one card under the patient banner: the order and specimen as the
 * latest revision printed them, its release, the last export and impact after release.
 */
export function ReportSummary({ report }: { report: ReportDetail }) {
  const { overview } = report;
  const latest = report.revisions.at(-1);
  const printed = (value: (o: NonNullable<typeof overview>) => string) =>
    overview ? value(overview) : UNREADABLE;
  return (
    <Section title="Summary">
      <Facts
        layout="columns"
        items={[
          {
            label: "Client",
            value: printed((o) => [o.client, o.clientLocation].filter(Boolean).join(" – ")),
          },
          {
            label: "Ordering practitioner",
            value: printed((o) =>
              o.practitionerNpi ? `${o.practitioner} · NPI ${o.practitionerNpi}` : o.practitioner,
            ),
          },
          {
            label: "Specimen",
            value: printed((o) => [o.specimenType, ...o.containerLabels].join(" · ")),
          },
          { label: "Tests", value: printed((o) => o.tests.join(", ") || "None named") },
          { label: "Collected", value: printed((o) => o.collected ?? "Not provided") },
          {
            label: "Released",
            value: latest ? (
              <>
                <Timestamp value={latest.releasedAt} /> by {latest.releasedBy.displayName}
              </>
            ) : (
              "Not released"
            ),
          },
          { label: "Last export", value: <LastExport exports={report.exports} /> },
          { label: "Impact after release", value: <ImpactBadge impact={report.impact} /> },
        ]}
      />
    </Section>
  );
}

function LastExport({ exports }: { exports: readonly ExportView[] }) {
  const last = exports.reduce<ExportView | undefined>(
    (latest, each) => (latest && latest.exportedAt >= each.exportedAt ? latest : each),
    undefined,
  );
  if (!last) return "Not exported";
  const purpose = EXPORT_PURPOSES.find((each) => each.id === last.purpose)?.label ?? last.purpose;
  return (
    <>
      <Timestamp value={last.exportedAt} /> · {purpose}
    </>
  );
}

/**
 * Green "Nothing open" when no change waits for assessment and no correction is due;
 * otherwise, in warning tone, the open count or "Correction due". Only a current revision has
 * impact; the engine sends none for a superseded or withdrawn one, or while its content is
 * damaged.
 */
function ImpactBadge({ impact }: { impact: ImpactView | null }) {
  if (!impact) return "Not applicable";
  const open = impact.open.length;
  if (open > 0) {
    return (
      <StatusBadge tone="warning">{open === 1 ? "1 open item" : `${open} open items`}</StatusBadge>
    );
  }
  if (impact.correctionDue) return <StatusBadge tone="warning">Correction due</StatusBadge>;
  return <StatusBadge tone="success">Nothing open</StatusBadge>;
}
