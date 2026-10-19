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
 *   `BUG-5` class of defect). A counted habit that fell short of its target but
 *   reached its **emergency minimum** also counts; see `emergencyMinimum`.
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
 * The "full day" bar (`compliance.ts` historically exported its own
 * `FULL_DAY_HOURS = 18`) now lives only in `day-status.ts`, which this module
 * already depends on for `evaluateDayCompletion`. Import it from there —
 * one definition, so the counter and the heatmap cannot disagree.
 */

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
 * The minimum a **counted** habit must reach for a day to still count toward its
 * days-done total — the habit's emergency version, as a number.
 *
 * Owner rule, 2026-10-19: the emergency version is the floor. Doing only the
 * two-minute version of a counted habit still earns the day, instead of losing
 * it for falling short of `targetValue`.
 *
 * Stored as a string but entered as a number for counted habits; anything that
 * does not parse as a positive number means **no floor**, so a legacy free-text
 * value like "Read 1 page" changes nothing. Returns 0 for every non-counted type.
 *
 * Deliberately read by the counter ONLY. A day at the floor is *not* "complete"
 * for the heatmap, the date strip, the confetti or the reward vault — those all
 * keep `isHabitComplete`, so they can disagree with this counter by intent.
 */
export function emergencyMinimum(habit: Habit): number {
  if ((habit.type ?? "simple") !== "counted") return 0;
  const raw = habit.emergencyVersion;
  if (!raw) return 0;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Days done for one habit: days it was **scheduled** for, and was complete on.
 *
 * The scheduling filter is the point (ADR 0005): a once-a-week habit ticked on
 * all seven days accrues one day, not seven — the same schedule-aware rule the
 * reward vault applies (ADR 0001 section 6.2).
 *
 * A counted day that fell short of `targetValue` but reached the emergency
 * minimum still counts; see `emergencyMinimum`.
 */
export function countDaysDoneForHabit(
  habit: Habit,
  completedByDate: CompletedByDate = {},
  valueByDate: ValueByDate = {}
): number {
  const floor = emergencyMinimum(habit);
  let count = 0;
  for (const date of Object.keys(completedByDate)) {
    if (!isHabitScheduledOnDate(habit, date)) continue;
    const log = { completed: completedByDate[date], value: valueByDate[date] };
    // Routes through the one shared predicate, so a counted habit below its
    // target (or a slip on a quit habit) cannot be counted as a day done.
    if (isHabitComplete(habit, log)) {
      count++;
      continue;
    }
    if (floor > 0) {
      const value = typeof log.value === "number" && Number.isFinite(log.value) ? log.value : 0;
      if (value >= floor) count++;
    }
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
