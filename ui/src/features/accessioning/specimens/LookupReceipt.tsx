import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { Toolbar } from "@/components/Toolbar";
import type { AccessionDetail } from "@/generated/AccessionDetail";
import type { ContainerLookup } from "@/generated/ContainerLookup";
import { useCommandQuery, useHasCapability } from "@/lib/commands";
import { GET_ACCESSION } from "./contract";
import { specimenTitle } from "./labels";
import { ReceiptDecisionDialog } from "./ReceiptDecisionDialog";
import { ReceiptOutcome } from "./ReceiptOutcome";
import styles from "./receiving.module.css";

/**
 * The receipt step of a looked-up container (REQ-SPC-002). While its specimen waits for a
 * decision, it says so and links to the accession's Finish receiving; people with
 * `accession` record the decision here, in the same dialog. A decision recorded while the
 * container is shown is followed by where work continues. Only then is the accession read,
 * an audited read the dialog needs for the specimen's revision and containers.
 */
export function LookupReceipt({ lookup }: { lookup: ContainerLookup }) {
  const { acceptance } = lookup;
  const [wasPending] = useState(acceptance === "received");
  const canDecide = useHasCapability("accession");
  const accession = useCommandQuery<AccessionDetail>(
    GET_ACCESSION,
    { input: { accessionId: lookup.accessionId } },
    { enabled: canDecide && wasPending },
  );
  const index =
    accession.data?.specimens.findIndex(
      (each) => each.specimenId === lookup.container.specimenId,
    ) ?? -1;
  const specimen = index === -1 ? undefined : accession.data?.specimens[index];
  if (acceptance === "received") {
    return (
      <ReceiptPending
        lookup={lookup}
        canDecide={canDecide}
        accession={accession}
        specimen={specimen && { view: specimen, title: specimenTitle(specimen, index) }}
      />
    );
  }
  if (!wasPending) return null;
  return (
    <ReceiptOutcome
      acceptance={acceptance}
      decision={specimen?.decisions.at(-1)}
      material={lookup.container.labelCode}
    />
  );
}

interface ReceiptPendingProps {
  lookup: ContainerLookup;
  canDecide: boolean;
  accession: ReturnType<typeof useCommandQuery<AccessionDetail>>;
  specimen: { view: AccessionDetail["specimens"][number]; title: string } | undefined;
}

function ReceiptPending({ lookup, canDecide, accession, specimen }: ReceiptPendingProps) {
  const navigate = useNavigate();
  const [deciding, setDeciding] = useState(false);
  const allowed = specimen?.view.allowedActions.includes("record_receipt_decision") ?? false;
  return (
    <Alert tone="info" title="This specimen waits for a receipt decision.">
      <p>
        {canDecide
          ? "Record the decision to finish receiving this container."
          : "Someone who receives specimens records the decision on Finish receiving."}
      </p>
      <div className={styles.noticeActions}>
        <Toolbar>
          {canDecide && (accession.isPending || allowed) && (
            <Button
              variant="primary"
              isPending={accession.isPending}
              onPress={() => setDeciding(true)}
            >
              Record receipt decision
            </Button>
          )}
          <Button onPress={() => navigate(`/accessions/${lookup.accessionId}`)}>
            Open Finish receiving
          </Button>
        </Toolbar>
      </div>
      {accession.isError && (
        <ErrorState
          title="The receipt decision cannot be recorded here"
          error={accession.error}
          onRetry={() => void accession.refetch()}
        />
      )}
      {deciding && specimen && (
        <ReceiptDecisionDialog
          specimen={specimen.view}
          title={specimen.title}
          onClose={() => setDeciding(false)}
        />
      )}
    </Alert>
  );
}
