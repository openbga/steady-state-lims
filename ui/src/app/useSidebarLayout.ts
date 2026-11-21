import { type KeyboardEvent, useEffect, useState } from "react";

import { useResizeDrag } from "@/lib/useResizeDrag";

const LAYOUT_KEY = "vibe-tox.navigation.layout-v1";
const NAV_MIN = 224;
export const NAV_MAX = 360;
const NAV_DEFAULT = 288;
/** The first-start width before Default existed; such a saved width still means Default. */
const OLD_DEFAULT = 256;
export const NAV_RAIL = 56;
const NAV_STEP = 16;

/** The widths the navigation menu offers; a dragged or keyboard width is none of them. */
export const NAV_PRESETS = [
  { id: "compact", label: "Compact", width: NAV_MIN },
  { id: "default", label: "Default", width: NAV_DEFAULT },
  { id: "wide", label: "Wide", width: NAV_MAX },
] as const;
export type NavPreset = (typeof NAV_PRESETS)[number]["id"];

interface Layout {
  width: number;
  collapsed: boolean;
  preset: NavPreset | null;
}

function clampWidth(width: number) {
  return Math.min(NAV_MAX, Math.max(NAV_MIN, Math.round(width)));
}

function readLayout(): Layout {
  const fallback: Layout = { width: NAV_DEFAULT, collapsed: false, preset: "default" };
  try {
    const value: unknown = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "null");
    if (typeof value !== "object" || value === null) return fallback;
    const collapsed = "collapsed" in value && value.collapsed === true;
    const saved =
      "width" in value && typeof value.width === "number" && Number.isFinite(value.width)
        ? clampWidth(value.width)
        : null;
    // A layout saved before the presets has no preset; an untouched one kept the old first width.
    const chosen =
      "preset" in value ? value.preset : saved === null || saved === OLD_DEFAULT ? "default" : null;
    const preset = NAV_PRESETS.find((option) => option.id === chosen);
    if (preset) return { width: preset.width, collapsed, preset: preset.id };
    return { width: saved ?? NAV_DEFAULT, collapsed, preset: null };
  } catch {
    // Preferences are optional: a damaged or unavailable store must not prevent navigation.
    return fallback;
  }
}

/** Local presentation only. Persist after a drag ends, not on every pointer movement. */
export function useSidebarLayout() {
  const [layout, setLayout] = useState(readLayout);
  const width = layout.collapsed ? NAV_RAIL : layout.width;
  const resize = (next: number) =>
    setLayout({ width: clampWidth(next), collapsed: false, preset: null });
  const choose = (preset: NavPreset) => {
    const option = NAV_PRESETS.find((candidate) => candidate.id === preset);
    if (option) setLayout({ width: option.width, collapsed: false, preset });
  };
  const toggle = () => setLayout((last) => ({ ...last, collapsed: !last.collapsed }));

  const { dragging, pointerProps } = useResizeDrag({
    size: width,
    axis: "x",
    onResize: (next) => {
      if (!layout.collapsed || next >= NAV_MIN) resize(next);
    },
    onCancel: () => setLayout(layout),
  });

  useEffect(() => {
    if (dragging) return;
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch {
      // Continue with in-memory preferences when this webview cannot persist them.
    }
  }, [layout, dragging]);

  function onKeyDown(event: KeyboardEvent) {
    if (layout.collapsed && event.key === "ArrowLeft") {
      event.preventDefault();
      return;
    }
    const sizes: Record<string, number> = {
      ArrowLeft: layout.width - NAV_STEP,
      ArrowRight: layout.collapsed ? layout.width : layout.width + NAV_STEP,
      Home: NAV_MIN,
      End: NAV_MAX,
    };
    const next = sizes[event.key];
    if (event.key === "Enter") toggle();
    else if (next !== undefined) resize(next);
    else return;
    event.preventDefault();
  }

  return {
    width,
    collapsed: layout.collapsed,
    preset: layout.preset,
    dragging,
    choose,
    toggle,
    separatorProps: { onKeyDown, ...pointerProps },
  };
}
