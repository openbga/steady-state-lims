import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/Button";
import { Facts } from "@/components/Facts";
import { Section } from "@/components/Section";
import type { AccessionDetail } from "@/generated/AccessionDetail";
import { useHasCapability } from "@/lib/commands";
import { useFormatTime } from "@/lib/format";
import { CollectionHistoryDialog } from "../billing/CollectionHistorySection";
import { OrderBillingDialog } from "../billing/OrderBillingSection";
import { orNotRecorded } from "../subjects";
import { collectionTimeText } from "./labels";
import styles from "./receiving.module.css";

/**
 * Finish receiving's side column: the collection with links to its timing review and its
 * history, and, for people who may see it, the order's billing. History and billing open in a
 * dialog with the same actions as their own pages.
 */
export function AccessionSide({ accession }: { accession: AccessionDetail }) {
  const formatTime = useFormatTime();
  const orders = useHasCapability("enter_orders");
  const billing = useHasCapability("billing");
  const [dialog, setDialog] = useState<"history" | "billing" | null>(null);
  const close = () => setDialog(null);
  const { accessionId, collection } = accession;
  return (
    <div className={styles.side}>
      <Section title="Collection">
        <Facts
          items={[
            { label: "Collected", value: collectionTimeText(collection, formatTime) },
            { label: "Collected by", value: orNotRecorded(collection.collector) },
          ]}
        />
        <div className={styles.sideLinks}>
          <Link to={`/accessions/${accessionId}/collection-review`}>Collection timing review</Link>
          <Button variant="link" onPress={() => setDialog("history")}>
            Collection history
          </Button>
        </div>
      </Section>
      {(orders || billing) && (
        <Section title="Order billing">
          <p className={styles.hint}>Billing facts, evidence and financial follow-up.</p>
          <div className={styles.sideLinks}>
            <Button variant="link" onPress={() => setDialog("billing")}>
              Open order billing
            </Button>
          </div>
        </Section>
      )}
      {dialog === "history" && (
        <CollectionHistoryDialog accessionId={accessionId} onClose={close} />
      )}
      {dialog === "billing" && (
        <OrderBillingDialog
          orderId={accession.orderId}
          subjectId={accession.subjectId}
          onClose={close}
        />
      )}
    </div>
  );
}
