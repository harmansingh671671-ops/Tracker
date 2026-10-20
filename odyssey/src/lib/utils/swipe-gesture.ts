/**
 * B4 — pure decision helpers for the habit-card gestures. Extracted so the
 * thresholds are testable: this repo has no component-test harness, so every
 * number the gesture shell depends on lives here instead of in the component.
 *
 * Owner feedback (2026-10-20, second round): swipes must work DIRECTLY, not
 * via a deliberate hold-then-drag. A casual touch swipe always drifts
 * vertically in its first few pixels, so the horizontal-vs-vertical decision
 * is made ONCE — from the earliest travel past the slop, the C2 grab-to-drag
 * lesson — and is never revisited. After the lock, a horizontally-locked
 * gesture commits at a shorter distance even if the finger wanders up or
 * down (the list may even scroll underneath); a vertically-locked gesture is
 * a scroll and stays inert to the end.
 */

/** Total movement past which a press stops being a hold. Matches the 12px the
 * long-press-to-edit gesture used before B4 replaced it. */
export const GESTURE_START_PX = 12;

/** Movement needed before the gesture's axis is decided. Below this the drag
 * is still undecided; C2's grab-to-drag work used the same 8px slop and it
 * matches the browser's own scroll slop. */
export const GESTURE_SLOP_PX = 8;

/** Horizontal distance a horizontally-locked swipe must cover to commit its
 * action on release. Reduced from 56px (first B4 build) after the owner
 * reported needing a deliberate hold-then-drag before a swipe registered. */
export const SWIPE_COMMIT_PX = 40;

export type GestureAxis = "x" | "y";
export type SwipeDirection = "left" | "right";

/**
 * Decide which axis a drag belongs to, once, from the first slop of travel.
 * Returns null while the gesture has not yet moved the slop (undecided),
 * "x" for a horizontal gesture (a swipe candidate) and "y" for a scroll.
 * The first move wins: a horizontal start stays horizontal whatever the
 * finger does later, and vice versa.
 */
export function decideGestureAxis(dx: number, dy: number): GestureAxis | null {
  if (Math.hypot(dx, dy) < GESTURE_SLOP_PX) return null;
  return Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
}

/**
 * Commit decision for a drag on a LOCKED axis. Only "x" can commit; a locked
 * vertical gesture is a scroll and never commits. Returns null when the swipe
 * is too short to have committed — the card then falls through to its tap
 * handler (which the browser itself suppresses for anything beyond a small
 * travel, so a dead zone does not arise in practice on touch).
 */
export function swipeDirection(
  axis: GestureAxis | null,
  dx: number
): SwipeDirection | null {
  if (axis !== "x") return null;
  if (Math.abs(dx) < SWIPE_COMMIT_PX) return null;
  return dx < 0 ? "left" : "right";
}

/** B4: "+X" is half the target, rounded DOWN (owner decision), e.g. a target
 * of 15 gives +7. Reaches 0 for a target of 1; the card hides the +X rectangle
 * in that case rather than showing a "+0". */
export function halfTargetFloor(targetValue: number | undefined): number {
  if (typeof targetValue !== "number" || !Number.isFinite(targetValue) || targetValue <= 0) return 0;
  return Math.floor(targetValue / 2);
}
