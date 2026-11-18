import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lastAppearance } from "./appearance";

// The path is relative to the repository root, where the npm scripts run Vitest.
const bootScript = readFileSync("ui/public/appearance.js", "utf8");
const LAST_KEY = "vibe-tox.appearance-v1.last";

/** Runs the script index.html loads before the first render, as the webview would. */
function runBootScript() {
  delete document.documentElement.dataset.theme;
  new Function(bootScript)();
  return document.documentElement.dataset.theme;
}

describe("the sign-in screen's appearance (#4789)", () => {
  afterEach(() => localStorage.clear());

  it("is the appearance last used on this computer, System when none was", () => {
    expect(lastAppearance()).toBe("system");
    localStorage.setItem(LAST_KEY, "dark");
    expect(lastAppearance()).toBe("dark");
    localStorage.setItem(LAST_KEY, "damaged");
    expect(lastAppearance()).toBe("system");
  });

  it("is painted before the first render from the same key", () => {
    localStorage.setItem(LAST_KEY, "dark");
    expect(runBootScript()).toBe("dark");
    localStorage.setItem(LAST_KEY, "light");
    expect(runBootScript()).toBe("light");
  });

  it("follows the operating system when System or nothing was last used", () => {
    const dark = vi.fn(() => ({ matches: true }));
    vi.stubGlobal("matchMedia", dark);
    expect(runBootScript()).toBe("dark");
    localStorage.setItem(LAST_KEY, "system");
    expect(runBootScript()).toBe("dark");
    expect(dark).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
    vi.unstubAllGlobals();
    expect(runBootScript()).toBe("light");
  });
});
