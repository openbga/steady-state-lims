import { useEffect } from "react";

/**
 * The laboratory's time zone as last read on this computer, so the sign-in and lock screens
 * show times as the app does before anyone is signed in. A time zone is not patient data.
 */
const KEY = "vibe-tox.lab-time-zone-v1";

/** The time zone saved at the last sign-in on this computer; `null` (UTC) before the first. */
export function lastLabTimeZone(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    // An unavailable store means times show in UTC, labelled as such.
    return null;
  }
}

/** Keeps the saved time zone in step with the laboratory profile while someone is signed in. */
export function useRememberLabTimeZone(timeZone: string | null | undefined) {
  useEffect(() => {
    if (!timeZone) return;
    try {
      localStorage.setItem(KEY, timeZone);
    } catch {
      // Continue: the signed-out screens then show UTC.
    }
  }, [timeZone]);
}
