import { type SyntheticEvent, useEffect } from "react";

const ACTIVE = "[data-active-cards] section[data-active]";

/** The outermost section card around the target, inside the marked area. */
function cardOf(target: Element, area: Element): Element | null {
  let card: Element | null = null;
  for (let at = target.closest("section"); at && area.contains(at); ) {
    card = at;
    at = at.parentElement?.closest("section") ?? null;
  }
  return card;
}

/**
 * Marks the card last clicked or focused, anywhere inside it, until another card is: its accent
 * border (`styles/global.css`) shows where the person is working. A popover's content (a list's
 * options, a "?" tip, a calendar) is elsewhere in the page and changes nothing. Presentation
 * only, kept on the elements.
 */
function markCard(event: SyntheticEvent<HTMLElement>) {
  const card = cardOf(event.target as Element, event.currentTarget);
  if (!card) return;
  for (const other of document.querySelectorAll(ACTIVE)) {
    if (other !== card) other.removeAttribute("data-active");
  }
  card.setAttribute("data-active", "");
}

/** Spread on the element holding a screen's cards. */
export const activeCards = {
  "data-active-cards": "",
  onPointerDown: markCard,
  onFocus: markCard,
};

/** A click outside every card clears the mark; one in a popover a field opened keeps it. */
function clearOnOutsideClick(event: PointerEvent) {
  const target = event.target as Element;
  if (target.closest?.("[data-trigger]")) return;
  for (const card of document.querySelectorAll(ACTIVE)) {
    if (!card.contains(target)) card.removeAttribute("data-active");
  }
}

/** Call once on a screen that uses `activeCards`. */
export function useClearActiveCardOutside() {
  useEffect(() => {
    document.addEventListener("pointerdown", clearOnOutsideClick);
    return () => document.removeEventListener("pointerdown", clearOnOutsideClick);
  }, []);
}
