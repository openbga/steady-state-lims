import type { ReactNode } from "react";
import styles from "./Facts.module.css";

interface Fact {
  label: string;
  value: ReactNode;
}

/**
 * Labelled values of one record, as a description list: label, then value, per row.
 * `compact` wraps the facts in a line; `columns` sets them in equal columns, label above value,
 * as a record page's summary card.
 */
export function Facts({
  items,
  layout,
}: {
  items: readonly Fact[];
  layout?: "compact" | "columns";
}) {
  return (
    <dl className={styles.facts} data-layout={layout}>
      {items.map(({ label, value }) => (
        <div key={label} className={styles.fact}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
