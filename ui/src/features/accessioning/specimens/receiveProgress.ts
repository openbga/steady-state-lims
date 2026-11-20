import type { AccessionFormValues } from "./accessionValues";

const filled = (text: string) => text.trim() !== "";

/**
 * The required entries Receive specimens still needs, named as the screen names them, in the
 * screen's order: none once the form can be sent. The engine checks every value again.
 */
export function missingEntries(values: AccessionFormValues): string[] {
  const missing: string[] = [];
  if (values.orderItemIds.length === 0) missing.push("a test");
  const kind = values.timeKind;
  if (kind !== "unknown" && !filled(values.collectedDate)) missing.push("collection date");
  if ((kind === "zoned" || kind === "datetime") && !filled(values.collectedTime)) {
    missing.push("time");
  }
  if (kind === "zoned" && !filled(values.timeZone)) missing.push("time zone");
  if (kind === "datetime" && !filled(values.utcOffset)) missing.push("UTC offset");
  const specimens = values.specimens;
  if (specimens.some((specimen) => specimen.specimenTypeCode === null)) {
    missing.push("specimen type");
  }
  if (specimens.some((specimen) => !filled(specimen.containerCount))) missing.push("containers");
  if (specimens.some((specimen) => specimen.volumeKind === null)) missing.push("Volume is");
  const measured = (how: string | null) => how === "measured" || how === "estimated";
  if (specimens.some((specimen) => measured(specimen.volumeKind) && !filled(specimen.volume))) {
    missing.push("volume");
  }
  return missing;
}

/** "Fill in the required fields: collection date, time and time zone." */
export function missingText(missing: readonly string[]): string {
  if (missing.length === 0) return "All required fields are filled in.";
  const last = missing.at(-1);
  const list = missing.length === 1 ? last : `${missing.slice(0, -1).join(", ")} and ${last}`;
  return `Fill in the required fields: ${list}.`;
}
