import type { ObligationView } from "../contract";

/**
 * Delivery in one count: obligations handed off out of those still owed. A closed obligation
 * (redirected, or closed with a reason) is owed no longer and is left out. Green once every
 * owed obligation is handed off, warning while any is open; `null` when none is owed. The
 * report's header chip and its Delivery tab show the same count. "Handed off" is staff
 * attestation, never proof of receipt (REQ-RPT-011).
 */
export function deliveryCount(obligations: readonly ObligationView[]) {
  const owed = obligations.filter((each) => each.status.code !== "closed");
  if (owed.length === 0) return null;
  const handedOff = owed.filter((each) => each.status.code === "handed_off").length;
  return {
    handedOff,
    owed: owed.length,
    tone: handedOff === owed.length ? ("success" as const) : ("warning" as const),
  };
}
