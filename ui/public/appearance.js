// Paints the page in the appearance last used on this computer before its first render, so the
// sign-in screen never flashes light for a person who chose Dark (#4789). A classic script file
// in <head>, as the CSP allows no inline script; src/lib/appearance.ts owns the key and rule
// and applies them again, with the window's title bar, once the app loads.
try {
  const last = localStorage.getItem("vibe-tox.appearance-v1.last");
  const dark =
    last === "dark" ||
    (last !== "light" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
} catch {
  // Preferences are optional: the app applies the default when it loads.
}
