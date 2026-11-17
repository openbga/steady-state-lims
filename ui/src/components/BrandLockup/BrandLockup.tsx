// The desktop icon is the one source of the mark.
import mark from "../../../../src-tauri/app-icon.svg";
import styles from "./BrandLockup.module.css";

/** The existing mark and full product name (docs/development/packaging.md). */
export function BrandLockup() {
  return (
    <span className={styles.lockup}>
      <img className={styles.mark} src={mark} alt="" />
      <span className={styles.text}>
        <span className={styles.product}>OpenBGA Toxicology LIMS</span>
      </span>
    </span>
  );
}
