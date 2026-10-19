/**
 * Days done — the cumulative counters that replaced the streak (ADR 0005).
 *
 * `BUG-15` recorded that the streak was `+1 / -1` arithmetic on a toggle, so
 * un-ticking an *old* day moved the *current* streak. Both counters here are
 * **derived from the rows that already exist** and are never incremented. A
 * derived count cannot drift, and editing a past day simply lowers the count
 * rather than corrupting a running number — which closes `BUG-15` by
 * construction, on the web.
 *
 * Two counters, defined by the owner (ADR 0005):
 *
 * - **Per habit (`days done`)** — a day counts for a habit only when that habit
 *   was *scheduled* for the day AND the day is genuinely complete
 *   (`isHabitComplete`, so a counted habit at 3 of 20 does not count — the
 *   `BUG-5` class of defect).
 * - **Schedule (`days done`, app-wide)** — a day counts only when the user
 *   **wrote all the hours and reviewed all of them**: at least 18 planned hours
 *   and every block reviewed to `completed`/`missed` (`isCompletelyDone`).
 *
 * Pure: no IndexedDB, no stores.
 */

import type { Habit, ScheduleBlock } from "@/lib/db";
import { isHabitScheduledOnDate } from "./habit-colors";
import { isHabitComplete } from "./habit-completion";
import { evaluateDayCompletion } from "./day-status";

/**
 * The "full day" bar, in planned hours — the single number that decides whether
 * a schedule day can ever count. Deliberately the same bar `day-status.ts` uses
 * for `isCompletelyDone`, so the two can never disagree.
 */
export const FULL_DAY_HOURS = 18;

/** True when this day's blocks make it a complied schedule day. */
export function isScheduleCompliedDay(blocks: ScheduleBlock[] | undefined | null): boolean {
  if (!blocks || blocks.length === 0) return false;
  // `dayNumber` only feeds the display stat, not the yes/no, so 0 is passed
  // rather than forcing the caller to compute a journey day.
  return evaluateDayCompletion(blocks, "", 0).isCompletelyDone;
}

/**
 * How many days in `blocks` are complied schedule days.
 *
 * Groups by `date` first, because `evaluateDayCompletion` is per-day: a single
 * global list would compare one day's planned hours against every block in the
 * database and let an 18-block day anywhere satisfy the bar for all of them.
 */
export function countScheduleCompliedDays(blocks: ScheduleBlock[]): number {
  const byDate = new Map<string, ScheduleBlock[]>();
  for (const b of blocks) {
    const list = byDate.get(b.date);
    if (list) list.push(b);
    else byDate.set(b.date, [b]);
  }
  let count = 0;
  for (const list of byDate.values()) {
    if (isScheduleCompliedDay(list)) count++;
  }
  return count;
}

/**
 * One habit's per-date history, as the habit store already holds it:
 * `historyLogs[habitId][date]` is the completion, `historyValues[habitId][date]`
 * the counted value / slip count. Reading the store's maps (rather than the
 * `habitLogs` rows again) is why this needs no database read.
 */
export type CompletedByDate = Record<string, boolean>;
export type ValueByDate = Record<string, number>;

/**
 * Days done for one habit: days it was **scheduled** for, and was complete on.
 *
 * The scheduling filter is the point (ADR 0005): a once-a-week habit ticked on
 * all seven days accrues one day, not seven — the same schedule-aware rule the
 * reward vault applies (ADR 0001 section 6.2).
 */
export function countDaysDoneForHabit(
  habit: Habit,
  completedByDate: CompletedByDate = {},
  valueByDate: ValueByDate = {}
): number {
  let count = 0;
  for (const date of Object.keys(completedByDate)) {
    if (!isHabitScheduledOnDate(habit, date)) continue;
    // Routes through the one shared predicate, so a counted habit below its
    // target (or a slip on a quit habit) cannot be counted as a day done.
    if (!isHabitComplete(habit, { completed: completedByDate[date], value: valueByDate[date] })) continue;
    count++;
  }
  return count;
}

/** `habitId -> days done` for every habit given. */
export function buildDaysDoneMap(
  habits: readonly Habit[],
  historyLogs: Record<string, CompletedByDate>,
  historyValues: Record<string, ValueByDate>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const h of habits) {
    result[h.id] = countDaysDoneForHabit(h, historyLogs[h.id], historyValues[h.id]);
  }
  return result;
}
