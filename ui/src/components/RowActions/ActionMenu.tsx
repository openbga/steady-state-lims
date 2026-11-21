import { Check } from "lucide-react";
import { Menu, MenuItem, Popover } from "react-aria-components";
import styles from "./RowActions.module.css";

/** One action on a record, taken from the record's `allowedActions`. */
export interface ActionItem {
  /** Stable key, such as the engine's action name. */
  id: string;
  /** What the action does, in laboratory terms, such as "Withdraw lot". */
  label: string;
  /** Runs when the item is chosen; usually opens the action's dialog. */
  onAction: () => void;
  /** `danger` for destructive actions: red text, never a red fill. */
  variant?: "danger";
  /** Starts a group below a line, such as a destructive action kept apart from the rest. */
  isSeparated?: boolean;
}

/**
 * The popover menu shared by `RowActions` and `MoreActions`, placed inside a `MenuTrigger`.
 * The first item takes focus when it opens, so the keyboard can act at once. With `selectedId`
 * it is a choice of one, such as a width: the chosen item shows a check mark, and `null`
 * checks none.
 */
export function ActionMenu({
  items,
  selectedId,
  placement = "bottom end",
}: {
  items: readonly ActionItem[];
  selectedId?: string | null;
  /** Where the menu opens from its button; the default lines its right edge up with the button. */
  placement?: "bottom end" | "bottom start";
}) {
  const choice = selectedId !== undefined;
  return (
    <Popover placement={placement} className={styles.popover}>
      <Menu
        items={items}
        autoFocus="first"
        className={styles.menu}
        selectionMode={choice ? "single" : undefined}
        disallowEmptySelection={choice}
        selectedKeys={choice && selectedId !== null ? [selectedId] : []}
      >
        {(item) => (
          <MenuItem
            id={item.id}
            textValue={item.label}
            onAction={item.onAction}
            className={[
              styles.item,
              item.variant === "danger" && styles.danger,
              item.isSeparated && styles.separated,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {({ isSelected }) => (
              <>
                {choice && (
                  <Check
                    aria-hidden="true"
                    className={styles.check}
                    visibility={isSelected ? "visible" : "hidden"}
                  />
                )}
                {item.label}
              </>
            )}
          </MenuItem>
        )}
      </Menu>
    </Popover>
  );
}
