import { useEffect, useState } from "react";
import { call } from "./ipc";

/** The signed-in person's Appearance choice; "system" follows the operating system. */
export type Appearance = "light" | "dark" | "system";

export const APPEARANCES: { id: Appearance; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

const KEY_PREFIX = "vibe-tox.appearance-v1.";
/** The appearance last applied for anyone on this computer, for the sign-in screen (#4789).
 * ui/public/appearance.js reads the same key before the first render. */
const LAST_KEY = `${KEY_PREFIX}last`;
const DARK_QUERY = "(prefers-color-scheme: dark)";

let current: Appearance = "system";

function paint() {
  const dark =
    current === "dark" || (current === "system" && window.matchMedia?.(DARK_QUERY).matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

/**
 * Applies an appearance to the page (tokens.css reads `data-theme`) and to the window's title
 * bar. While "system" is chosen, the page follows the operating system as it changes.
 */
export function applyAppearance(appearance: Appearance) {
  current = appearance;
  paint();
  // Presentation only: the page is already themed if the shell cannot change the title bar.
  call("set_window_theme", { theme: appearance === "system" ? null : appearance }).catch(
    () => undefined,
  );
}

window.matchMedia?.(DARK_QUERY).addEventListener("change", () => {
  if (current === "system") paint();
});

function readSaved(key: string): Appearance {
  try {
    const saved = localStorage.getItem(key);
    return APPEARANCES.find((option) => option.id === saved)?.id ?? "system";
  } catch {
    // Preferences are optional: a damaged or unavailable store means the default.
    return "system";
  }
}

function save(key: string, appearance: Appearance) {
  try {
    localStorage.setItem(key, appearance);
  } catch {
    // Continue with the in-memory choice when this webview cannot persist it.
  }
}

/** The appearance last used on this computer: the sign-in screen's, at start and after sign-out. */
export function lastAppearance(): Appearance {
  return readSaved(LAST_KEY);
}

/**
 * The person's appearance, remembered on this computer for each account and applied at once.
 * It is also kept as this computer's last appearance, so it stays applied after sign-out and
 * lock, and the sign-in screen shows it at the next start, until the next person's replaces it.
 */
export function useAppearance(userId: string) {
  const [appearance, setAppearance] = useState(() => readSaved(KEY_PREFIX + userId));
  useEffect(() => {
    applyAppearance(appearance);
    save(LAST_KEY, appearance);
  }, [appearance]);
  function choose(next: Appearance) {
    setAppearance(next);
    save(KEY_PREFIX + userId, next);
  }
  return [appearance, choose] as const;
}
