import { type RefObject, useEffect, useState } from "react";
import type { TooltipTriggerState } from "react-aria-components";

/**
 * Open while the pointer is on `ref` or its grid cell has keyboard focus; the grid keeps
 * focus on the cell, not on its content, so `TooltipTrigger` cannot serve. Escape closes
 * it until the next hover or focus.
 */
export function useCellTooltip(ref: RefObject<HTMLElement | null>): TooltipTriggerState {
  const [open, setOpen] = useState(false);
  // Subscribes to the focus of the grid cell, which the grid renders around this content.
  useEffect(() => {
    const cell = ref.current?.closest<HTMLElement>('[role="gridcell"]');
    if (!cell) return;
    const show = () => setOpen(true);
    const hide = () => setOpen(false);
    cell.addEventListener("focus", show);
    cell.addEventListener("blur", hide);
    return () => {
      cell.removeEventListener("focus", show);
      cell.removeEventListener("blur", hide);
    };
  }, [ref]);
  // Subscribes to Escape while open, so the tooltip can be dismissed without moving.
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [open]);
  return {
    isOpen: open,
    shouldSkipAnimation: true,
    open: () => setOpen(true),
    close: () => setOpen(false),
  };
}
