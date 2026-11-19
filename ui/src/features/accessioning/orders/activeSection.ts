import { type SyntheticEvent, useEffect } from "react";
import styles from "./OrderForm.module.css";

/**
 * Marks the section card last clicked or focused, anywhere inside it, until another card is:
 * its border shows where the person is working. Presentation only, kept on the element.
 */
function markActiveSection(event: SyntheticEvent<HTMLDivElement>) {
  const cards = [...event.currentTarget.children].filter((child) => child.tagName === "SECTION");
  // A popover's content (the "?" tips) is elsewhere in the page: it changes nothing.
  const card = cards.find((each) => each.contains(event.target as Node));
  if (!card) return;
  for (const other of cards) other.toggleAttribute("data-active", other === card);
}

export const activeSection = { onPointerDown: markActiveSection, onFocus: markActiveSection };

/**
 * A click outside every card clears the mark. A click in a popover (a list's options, a "?"
 * tip, a calendar) belongs to the field that opened it, so it keeps the mark.
 */
function clearActiveSectionOnOutsideClick(event: PointerEvent) {
  const target = event.target as Element;
  if (target.closest?.("[data-trigger]")) return;
  for (const card of document.querySelectorAll(`.${styles.stepFields} > section[data-active]`)) {
    if (!card.contains(target)) card.removeAttribute("data-active");
  }
}

export function useClearActiveSectionOutside() {
  useEffect(() => {
    document.addEventListener("pointerdown", clearActiveSectionOnOutsideClick);
    return () => document.removeEventListener("pointerdown", clearActiveSectionOnOutsideClick);
  }, []);
}
