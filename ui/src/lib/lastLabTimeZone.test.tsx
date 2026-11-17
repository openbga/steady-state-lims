import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { lastLabTimeZone, useRememberLabTimeZone } from "./lastLabTimeZone";

describe("last laboratory time zone", () => {
  beforeEach(() => localStorage.clear());

  it("is UTC (null) until a signed-in session reads the profile, then that zone", () => {
    expect(lastLabTimeZone()).toBeNull();
    const { rerender } = renderHook(({ zone }) => useRememberLabTimeZone(zone), {
      initialProps: { zone: undefined as string | null | undefined },
    });
    expect(lastLabTimeZone()).toBeNull();
    rerender({ zone: "America/Chicago" });
    expect(lastLabTimeZone()).toBe("America/Chicago");
    // A profile without a zone, or one still loading, keeps the last known zone.
    rerender({ zone: null });
    expect(lastLabTimeZone()).toBe("America/Chicago");
  });
});
