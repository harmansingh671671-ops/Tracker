/**
 * Which hour is under a drag, shared by the rail's drag and the displaced
 * block's drag.
 *
 * Both drags keep something under the finger -- the real card cloned into a
 * ghost, or the displaced block's icon -- so the TOP element at the finger is
 * never the slot. Walking the whole stack is what makes both drags agree about
 * the hour beneath the same pixel, and there is only one copy of that walk.
 */

/** The hour slot under a point, or null if the point is not over the rail. */
export function hourSlotFromPoint(
  clientX: number,
  clientY: number
): HTMLElement | null {
  if (typeof document === "undefined") return null;
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    const slot = el.closest("[data-hour]");
    if (slot) return slot as HTMLElement;
  }
  return null;
}

/** The hour a slot stands for, or null if the element is not a slot. */
export function hourFromSlot(slot: Element | null): number | null {
  const raw = slot?.getAttribute("data-hour");
  if (raw == null) return null;
  const hour = parseInt(raw, 10);
  return Number.isNaN(hour) ? null : hour;
}

/**
 * The landing ring, as its own class rather than Tailwind's ring utilities.
 * Those two classes (`ring-2 ring-primary`) already mark the current hour and a
 * just-saved block, so a drag that ended on the current hour would have cleared
 * the "now" ring on the way out -- and a ring meant to say "you will land here"
 * must not be indistinguishable from one that says "this is now".
 */
const DROP_RING_CLASS = "planner-drop-ring";

/**
 * Draw or clear the landing ring. A release puts the block on the ringed hour,
 * so it is the one piece of the drag that must never be left behind: every
 * path that ends a drag clears it, including unmount.
 */
export function setHourHighlight(slot: Element | null, on: boolean): void {
  slot?.classList.toggle(DROP_RING_CLASS, on);
}
