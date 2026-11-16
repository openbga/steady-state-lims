import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { Button, Dialog, DialogTrigger, Popover, VisuallyHidden } from "react-aria-components";
import { Checkbox } from "@/components/Checkbox";
import formStyles from "@/components/Form/Form.module.css";
import selectStyles from "@/components/Select/Select.module.css";
import type { WorkQueueArea } from "@/generated/WorkQueueArea";
import { AREAS } from "./areas";
import styles from "./workqueues.module.css";

const ALL_AREAS = "All areas";

interface AreaFilterProps {
  /** The chosen areas; none means every area. */
  value: readonly WorkQueueArea[];
  onChange: (value: WorkQueueArea[]) => void;
  /** How many queues each area would list, and every area together. */
  counts: Readonly<Record<WorkQueueArea, number>>;
  total: number;
}

/** An area's name and, at the far edge, how many queues it lists ("Reports, 5 queues"). */
function OptionText({ label, count }: { label: string; count: number }) {
  return (
    <span className={styles.areaOption}>
      <span>
        {label}
        <VisuallyHidden elementType="span">
          {`, ${count} ${count === 1 ? "queue" : "queues"}`}
        </VisuallyHidden>
      </span>
      <span aria-hidden="true" className={styles.areaCount}>
        {count}
      </span>
    </span>
  );
}

/**
 * The Area button above Work queues (ticket #4776): a checklist of the work areas with how
 * many queues each would list. Ticking "All areas" clears the others; the button names what
 * is chosen ("Front desk, Reports").
 */
export function AreaFilter({ value, onChange, counts, total }: AreaFilterProps) {
  const labelId = useId();
  const valueId = useId();
  const chosen =
    value.length === 0
      ? ALL_AREAS
      : AREAS.filter((area) => value.includes(area.id))
          .map((area) => area.label)
          .join(", ");
  const toggle = (area: WorkQueueArea, isSelected: boolean) =>
    onChange(isSelected ? [...value, area] : value.filter((each) => each !== area));
  return (
    <div className={formStyles.field} data-layout="inline">
      <span id={labelId} className={formStyles.label}>
        Area
      </span>
      <DialogTrigger>
        <Button
          aria-labelledby={`${labelId} ${valueId}`}
          className={`${formStyles.control} ${selectStyles.trigger}`}
        >
          <span id={valueId}>{chosen}</span>
          <ChevronDown aria-hidden="true" className={selectStyles.chevron} />
        </Button>
        <Popover placement="bottom start" className={selectStyles.popover}>
          <Dialog aria-label="Areas" className={styles.areaDialog}>
            <Checkbox isSelected={value.length === 0} onChange={() => onChange([])}>
              <OptionText label={ALL_AREAS} count={total} />
            </Checkbox>
            <hr className={styles.areaRule} />
            {AREAS.map((area) => (
              <Checkbox
                key={area.id}
                isSelected={value.includes(area.id)}
                onChange={(isSelected) => toggle(area.id, isSelected)}
              >
                <OptionText label={area.label} count={counts[area.id]} />
              </Checkbox>
            ))}
            <p className={styles.areaNote}>Your choice is remembered next time.</p>
          </Dialog>
        </Popover>
      </DialogTrigger>
    </div>
  );
}
