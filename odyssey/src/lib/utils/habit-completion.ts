/**
 * Is this day done?
 *
 * One function, and every caller uses it. That is the entire point of this file.
 *
 * `BUG-5` reported a streak of 0 as 1 **in nine places**. Nine call sites each deciding for
 * themselves is how that happened. A counted habit adds a second way to be "logged but not
 * complete" -- which is exactly the shape that bug had -- so the predicate lives in one
 * place and the test suite pins it.
 *
 * See ADR 0003.
 */

import type { Habit, HabitLog } from "@/lib/db";

/**
 * The minimum of a habit that the predicate needs. Narrower than `Habit` on purpose, so a
 * caller with a partial record cannot be silently given the wrong answer.
 */
export interface CompletionSubject {
  type?: Habit["type"];
  targetValue?: number;
}

export interface CompletionRecord {
  completed?: boolean;
  value?: number;
}

/**
 * True when `log` counts as a completed day for `habit`.
 *
 * | type      | complete when                                   |
 * |-----------|-------------------------------------------------|
 * | `simple`  | `log.completed` -- unchanged behaviour           |
 * | `counted` | `value >= targetValue`                          |
 *
 * `log` may be absent: no log means no completion, for every type.
 */
export function isHabitComplete(
  habit: CompletionSubject,
  log: CompletionRecord | null | undefined
): boolean {
  if (!log) return false;

  // Absent type is `simple`, so a habit written before ADR 0003 behaves exactly as before.
  if ((habit.type ?? "simple") !== "counted") {
    return log.completed === true;
  }

  // A counted habit with no target is not measurable, so it cannot be complete. Falling
  // back to `completed` here would let a half-entered habit report a streak it never earned.
  const target = habit.targetValue;
  if (typeof target !== "number" || !Number.isFinite(target) || target <= 0) {
    return false;
  }

  const value = typeof log.value === "number" && Number.isFinite(log.value) ? log.value : 0;
  return value >= target;
}

/**
 * Whether a counted habit has logged anything at all, which is not the same as being done.
 *
 * The UI needs the distinction: a habit at 3 of 20 is *logged*, and shows progress. A habit
 * at 0 of 20 shows nothing.
 */
export function hasLoggedValue(
  habit: CompletionSubject,
  log: CompletionRecord | null | undefined
): boolean {
  if ((habit.type ?? "simple") !== "counted") return log?.completed === true;
  return typeof log?.value === "number" && log.value > 0;
}

/**
 * Progress toward a counted habit's target, clamped to 0..1.
 *
 * Returns 0 for a `simple` habit, because a simple habit has no partial state to show.
 */
export function completionRatio(
  habit: CompletionSubject,
  log: CompletionRecord | null | undefined
): number {
  if ((habit.type ?? "simple") !== "counted") return 0;
  const target = habit.targetValue;
  if (typeof target !== "number" || !Number.isFinite(target) || target <= 0) return 0;
  const value = typeof log?.value === "number" && Number.isFinite(log.value) ? log.value : 0;
  return Math.min(1, Math.max(0, value / target));
}

/**
 * Next value after `current`, given a step.
 *
 * Never goes below zero, and never returns a negative-step trap: decrementing at zero stays
 * at zero rather than going into debt, which would render as a nonsense fraction.
 */
export function nextValue(current: number, step: number, direction: 1 | -1): number {
  const base = Number.isFinite(current) && current > 0 ? current : 0;
  const magnitude = Number.isFinite(step) && step > 0 ? step : 1;
  return Math.max(0, base + magnitude * direction);
}