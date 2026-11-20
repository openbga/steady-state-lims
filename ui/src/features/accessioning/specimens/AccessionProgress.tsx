import type { AccessionSpecimenView } from "@/generated/AccessionSpecimenView";
import styles from "./receiving.module.css";

/** Whether every specimen of the accession has a receipt decision. */
export const allDecided = (specimens: readonly AccessionSpecimenView[]) =>
  specimens.every((specimen) => specimen.acceptance !== "received");

/**
 * How many of the accession's specimens have a receipt decision, with the held and rejected
 * counts: a bar and one line. Recorded decisions finish receipt; they do not mean the material
 * is ready for testing.
 */
export function AccessionProgress({ specimens }: { specimens: readonly AccessionSpecimenView[] }) {
  const count = (acceptance: AccessionSpecimenView["acceptance"]) =>
    specimens.filter((specimen) => specimen.acceptance === acceptance).length;
  const recorded = specimens.length - count("received");
  return (
    <div className={styles.progress}>
      <span className={styles.progressLabel}>Receipt decisions</span>
      <div
        role="progressbar"
        aria-label="Receipt decisions recorded"
        aria-valuemin={0}
        aria-valuemax={specimens.length}
        aria-valuenow={recorded}
        className={styles.progressBar}
      >
        <span
          className={styles.progressFill}
          style={{ width: `${(100 * recorded) / Math.max(specimens.length, 1)}%` }}
        />
      </div>
      <strong>{`${recorded} of ${specimens.length} recorded`}</strong>
      <span className={styles.progressCounts}>
        {`· Held ${count("held")} · Rejected ${count("rejected")}`}
      </span>
    </div>
  );
}
