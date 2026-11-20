import { Link } from "react-router";
import { Section } from "@/components/Section";
import type { OrderAccessionContext } from "@/generated/OrderAccessionContext";
import styles from "./receive.module.css";
import receiving from "./receiving.module.css";

/**
 * Receive specimens' side column: what comes after this step, and the order's tests still
 * waiting for material against those already received, with a link to the order.
 */
export function ReceiveSide({ context }: { context: OrderAccessionContext }) {
  const waiting = context.items.filter((item) => item.eligible).length;
  const received = context.items.filter((item) => item.accessionId !== null).length;
  return (
    <aside className={receiving.side} aria-label="Receiving">
      <Section title="Next">
        <ol className={styles.nextList}>
          <li>Receive specimens creates the accession number.</li>
          <li>Print and stick the labels.</li>
          <li>Finish receipt: scan each label and record the receipt decision.</li>
        </ol>
      </Section>
      <Section title="Order">
        <dl className={styles.orderCounts}>
          <div>
            <dt>Tests waiting for material:</dt> <dd>{waiting}</dd>
          </div>
          <div>
            <dt>Already received:</dt> <dd>{received}</dd>
          </div>
        </dl>
        <Link to={`/orders/${context.orderId}`}>Open order</Link>
      </Section>
    </aside>
  );
}
