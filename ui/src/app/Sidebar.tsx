import { ChevronsDownUp, Ellipsis, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type ReactNode, useRef } from "react";
import { Button, MenuTrigger, Tooltip, TooltipTrigger } from "react-aria-components";
import { ActionMenu } from "@/components/RowActions/ActionMenu";
import styles from "./Sidebar.module.css";
import { SideNav, useNavState } from "./SideNav";
import { NAV_MAX, NAV_PRESETS, NAV_RAIL, useSidebarLayout } from "./useSidebarLayout";

/** The navigation frame keeps its controls fixed while the work-area list scrolls. */
export function Sidebar({ capabilities }: { capabilities: readonly string[] }) {
  const layout = useSidebarLayout();
  const nav = useNavState(capabilities);
  return (
    <aside
      aria-label="Navigation sidebar"
      className={styles.sidebar}
      data-collapsed={layout.collapsed || undefined}
      data-resizing={layout.dragging || undefined}
      // Runtime geometry from the resize control; all visual styling stays in the CSS module.
      style={{ width: layout.width }}
    >
      <SidebarControls layout={layout} onCollapseAll={nav.anyOpen ? nav.collapseAll : undefined} />
      <SideNav nav={nav} collapsed={layout.collapsed} />
      {/* biome-ignore lint/a11y/useSemanticElements: A focusable ARIA window splitter has drag and keyboard behavior; it is not a static hr. */}
      <div
        role="separator"
        tabIndex={0}
        aria-label="Navigation width"
        aria-orientation="vertical"
        aria-controls="main-navigation"
        aria-valuemin={NAV_RAIL}
        aria-valuemax={NAV_MAX}
        aria-valuenow={layout.width}
        aria-valuetext={layout.collapsed ? "Collapsed" : `${layout.width} pixels`}
        className={styles.resize}
        {...layout.separatorProps}
      />
    </aside>
  );
}

/**
 * The header buttons. Collapse all sections shows only while an area is open; it hides once
 * pressed, so focus moves to the width options button beside it.
 */
function SidebarControls({
  layout,
  onCollapseAll,
}: {
  layout: ReturnType<typeof useSidebarLayout>;
  onCollapseAll: (() => void) | undefined;
}) {
  const options = useRef<HTMLButtonElement>(null);
  const ToggleIcon = layout.collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = layout.collapsed ? "Expand navigation" : "Collapse navigation";
  return (
    <div className={styles.controls}>
      {!layout.collapsed && <span className={styles.title}>Navigation</span>}
      {!layout.collapsed && onCollapseAll && (
        <ControlTooltip label="Collapse all sections" placement="bottom">
          <Button
            aria-label="Collapse all sections"
            aria-controls="main-navigation"
            onPress={() => {
              onCollapseAll();
              options.current?.focus();
            }}
            className={styles.control}
          >
            <ChevronsDownUp aria-hidden="true" />
          </Button>
        </ControlTooltip>
      )}
      {!layout.collapsed && (
        <MenuTrigger>
          <Button ref={options} aria-label="Navigation width options" className={styles.control}>
            <Ellipsis aria-hidden="true" />
          </Button>
          <ActionMenu
            selectedId={layout.preset}
            items={NAV_PRESETS.map((option) => ({
              id: option.id,
              label: option.label,
              onAction: () => layout.choose(option.id),
            }))}
          />
        </MenuTrigger>
      )}
      <ControlTooltip label={toggleLabel}>
        <Button
          aria-label={toggleLabel}
          aria-expanded={!layout.collapsed}
          aria-controls="main-navigation"
          onPress={layout.toggle}
          className={styles.control}
        >
          <ToggleIcon aria-hidden="true" />
        </Button>
      </ControlTooltip>
    </div>
  );
}

function ControlTooltip({
  label,
  placement = "right",
  children,
}: {
  label: string;
  placement?: "right" | "bottom";
  children: ReactNode;
}) {
  return (
    <TooltipTrigger>
      {children}
      <Tooltip placement={placement} className={styles.tooltip}>
        {label}
      </Tooltip>
    </TooltipTrigger>
  );
}
