// An instrument's service status in words (REQ-ANA-007): bench setup records it, and the
// instruments of laboratory setup show it.
import type { Tone } from "@/components/tones";
import type { InstrumentStatus } from "@/generated/InstrumentStatus";
import { ANALYZER_TONES } from "./listenerDetail";

/** `null` means nobody has recorded a status yet; the engine treats that as not ready. */
export function instrumentStatus(status: InstrumentStatus | null): { label: string; tone: Tone } {
  if (status === "in_service") return { label: "In service", tone: ANALYZER_TONES.working };
  if (status === "out_of_service") return { label: "Out of service", tone: ANALYZER_TONES.off };
  return { label: "Status not recorded", tone: "warning" };
}
