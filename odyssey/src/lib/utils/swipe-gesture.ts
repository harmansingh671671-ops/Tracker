/**
 * B4 — pure decision helpers for the habit-card gestures. Extracted so the
 * thresholds are testable: this repo has no component-test harness, so every
 * number the gesture shell depends on lives here instead of in the component.
 */

/** Total movement past which a press stops being a hold. Matches the 12px the
 * long-press-to-edit gesture used before B4 replaced it, so a scroll during a
 * press cancels the hold exactly the same way it always did. */
export const GESTURE_START_PX = 12;

/** Horizontal distance a swipe must cover to commit its action on release. */
export const SWIPE_COMMIT_PX = 56;

/** A swipe only commits while it is horizontal: if the vertical component
 * catches up to this ratio of the horizontal one, the touch is a list scroll
 * and the card must not fire. */
export const SWIPE_AXIS_RATIO = 1.2;

export type SwipeDirection = "left" | "right";

/**
 * Decide the committed action of a pointer release that tracked a drag.
 * Returns null when the movement was a scroll (vertical dominant) or too
 * short to have committed — the card then falls through to its tap handler.
 */
export function swipeDirection(dx: number, dy: number): SwipeDirection | null {
  if (Math.abs(dy) * SWIPE_AXIS_RATIO > Math.abs(dx)) return null;
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
