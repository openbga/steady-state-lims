import { X } from "lucide-react";
import { Button } from "react-aria-components";
import styles from "./RecordPicker.module.css";

interface ChipsProps {
  ids: readonly string[];
  labelOf: (id: string) => string;
  onRemove: (id: string) => void;
  /** The field's label, naming each remove button, such as "Remove SYN-SCR from Find tests". */
  fieldLabel: string;
}

/** The records chosen in a multiple picker, inside the field before its search text. */
export function Chips({ ids, labelOf, onRemove, fieldLabel }: ChipsProps) {
  return ids.map((id) => {
    const text = labelOf(id);
    return (
      <span key={id} className={styles.chip} title={text}>
        <span className={styles.chipText}>{text}</span>
        <Button
          // Out of the ComboBox's button slot, which would make it a second list opener.
          slot={null}
          aria-label={`Remove ${text} from ${fieldLabel}`}
          className={styles.chipRemove}
          onPress={() => onRemove(id)}
        >
          <X aria-hidden="true" />
        </Button>
      </span>
    );
  });
}
