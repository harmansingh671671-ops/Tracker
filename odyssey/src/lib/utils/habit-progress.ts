import { type Habit, type HabitLog } from "@/lib/db";
import { isHabitScheduledOnDate } from "./habit-colors";

/**
 * M9 - completion fraction header.
 *
 * The planner date strip already prints "3/5" inside each day pill, but that
 * number is small and easy to miss. This is the pure calculation behind the
 * header row that spells it out above the strip.
 *
 * Kept separate from the strip's inline copy so both surfaces are guaranteed
 * to agree, and so the arithmetic (in particular the empty-day case) is
 * unit-testable without mounting a component - this project runs vitest in a
 * node environment with no jsdom (vitest.config.ts).
 */

export interface DayHabitProgress {
  /** Habits whose schedule covers this date. */
  scheduledCount: number;
  /** Habits completed on this date, whether scheduled or not. */
  completedCount: number;
  /** Habits scheduled on this date OR completed on it. */
  eligibleCount: number;
  /**
   * The number the fraction is measured against: the scheduled count, falling
   * back to the eligible count on a rest day where something was still
   * completed. Never zero once `hasHabits` is true.
   */
  denominator: number;
  /** Display form of the fraction, e.g. "3/5". */
  fraction: string;
  /**
   * Whole-percent completion, or null when the day has nothing to complete.
   * Null rather than 0 so the UI can say "nothing scheduled" instead of
   * printing a misleading "0%".
   */
  percent: number | null;
  /** True when the day has at least one habit scheduled or completed. */
  hasHabits: boolean;
  /** True when every scheduled habit is done. Requires a non-empty day. */
  isAllCompleted: boolean;
}

/** True when the habit was logged complete on the given date. */
export function isHabitCompletedOnDate(
  habit: { id: string },
  dateStr: string,
  todayStr: string,
  todayLogs: Record<string, HabitLog>,
  historyLogs: Record<string, Record<string, boolean>>
): boolean {
  // Today's log lives in the dedicated store; past days live in history. Today's
  // entry is read from both so a completion logged just before midnight is not
  // lost when the date rolls over.
  if (dateStr === todayStr) {
    return Boolean(
      todayLogs[habit.id]?.completed || historyLogs[habit.id]?.[dateStr]
    );
  }
  return Boolean(historyLogs[habit.id]?.[dateStr]);
}

/**
 * Computes the completion fraction for a single calendar day.
 *
 * Mirrors the arithmetic the planner date strip uses per pill, so the header
 * row and the pills can never disagree.
 */
export function getDayHabitProgress(
  habits: Habit[] | undefined | null,
  dateStr: string,
  todayStr: string,
  todayLogs: Record<string, HabitLog> = {},
  historyLogs: Record<string, Record<string, boolean>> = {}
): DayHabitProgress {
  const list = habits || [];

  let scheduledCount = 0;
  let completedCount = 0;
  let eligibleCount = 0;

  for (const habit of list) {
    const isScheduled = isHabitScheduledOnDate(habit, dateStr);
    const isDone = isHabitCompletedOnDate(
      habit,
      dateStr,
      todayStr,
      todayLogs,
      historyLogs
    );

    if (isScheduled) scheduledCount++;
    if (isDone) completedCount++;
    if (isScheduled || isDone) eligibleCount++;
  }

  const denominator = scheduledCount || eligibleCount;
  const hasHabits = denominator > 0;

  // Guard both directions: an empty day must not produce NaN, and a day with
  // unscheduled completions can push the raw ratio past 1.
  const percent = hasHabits
    ? Math.min(100, Math.round((completedCount / denominator) * 100))
    : null;

  return {
    scheduledCount,
    completedCount,
    eligibleCount,
    denominator,
    fraction: `${completedCount}/${denominator}`,
    percent,
    hasHabits,
    isAllCompleted: scheduledCount > 0 && completedCount >= scheduledCount,
  };
}

export interface HeaderSlotKeys {
  icon: string;
  label: string;
}

/**
 * Slot keys for the completion header.
 *
 * Both slots are rendered into ONE AnimatePresence, so their keys must be
 * unique against each other - not merely unique within a slot. They are
 * therefore namespaced by slot id.
 *
 * This is not defensive noise: the icon and the label can legitimately hold
 * the same value. On a rest day both used to resolve to the bare string
 * "rest", which threw React's "Encountered two children with the same key"
 * on every empty day. `isAllCompleted` cannot save you there - it requires a
 * non-empty day, so on a rest day the icon is always "rest".
 *
 * Returned from here rather than inlined in the component because this
 * project runs vitest in a plain node environment with no jsdom
 * (vitest.config.ts), so a pure function is the only place the uniqueness
 * invariant can be tested.
 */
export function getHeaderSlotKeys(progress: DayHabitProgress): HeaderSlotKeys {
  const { isAllCompleted, hasHabits, fraction, percent } = progress;

  const iconState = isAllCompleted ? "done" : !hasHabits ? "rest" : "pending";
  const labelState = hasHabits ? `${fraction}:${percent ?? 0}` : "rest";

  return {
    icon: `icon:${iconState}`,
    label: `label:${labelState}`,
  };
}