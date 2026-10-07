/**
 * M8 -- daily capacity indicator.
 *
 * Answers one question about a day: is this a lot? It is a **readout, never a
 * gate** -- nothing here blocks saving, hides a habit, or refuses a schedule.
 * That is a hard rule, not a nicety: the product principle is that AI and hints
 * *suggest* and the user decides (`MASTER_TODO_REVISED.md` I2, "Suggest
 * lightening; never block").
 *
 * ## These thresholds are hypotheses, not validated limits
 *
 * `MASTER_TODO_REVISED.md` §21 gives them as sample defaults and §22.3 says
 * outright to "treat these thresholds as starting hypotheses, not validated
 * limits". They are therefore named constants in one place so changing one is a
 * single edit with no behavioural drift elsewhere -- the same treatment ADR 0001
 * §7 gives the XP rates.
 *
 * There is a genuine gap in the source material, resolved here rather than
 * papered over: §19 labels heavy as "8+ habits" while §21 says "8+ habits **or**
 * six planned hours". So 6 and 7 habits are neither light nor heavy by count
 * alone. They fall in **Balanced**, and a day is heavy on *either* signal. Both
 * signals are used because §21 L811 is explicit that a warning must "compare
 * total planned hours to the user's waking/available window, not just the habit
 * count" -- eight 5-minute habits is not a heavy day.
 */
import type { Habit } from "@/lib/db";
import { isHabitScheduledOnDate } from "./habit-colors";

/** Upper bound (inclusive) of the light band. */
export const CAPACITY_LIGHT_MAX_HABITS = 3;

/** Habit count at which a day becomes heavy regardless of hours. */
export const CAPACITY_HEAVY_MIN_HABITS = 8;

/** Planned hours at which a day becomes heavy regardless of habit count. */
export const CAPACITY_HEAVY_MIN_HOURS = 6;

export type CapacityLevel = "light" | "balanced" | "heavy";

export interface DayCapacity {
  level: CapacityLevel;
  /** Compact form for the badge, e.g. "Light Day · 3 habits". */
  label: string;
  /**
   * Spoken description. The colour is never the only signal (accessibility rule
   * 5.3 #3), so the level is always carried in words as well.
   */
  description: string;
  habitCount: number;
  plannedHours: number;
  /** Which signal(s) put the day where it is -- useful when the two disagree. */
  basis: "habits" | "hours" | "both" | "empty";
}

function pluralHabits(n: number): string {
  return n === 1 ? "1 habit" : `${n} habits`;
}

function formatHours(h: number): string {
  // Whole hours need no decimal; a half hour does. Trailing ".0" would read as
  // false precision on a value that was rounded from minutes.
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}

/**
 * Classifies one day's load, or returns `null` when there is nothing to say.
 *
 * `null` for an empty day is deliberate. A rest day is not a "Light Day (0
 * habits)" -- it is a day with no plan, and inventing a label for it puts a
 * confident word where the honest answer is silence. This is the same rule M7
 * follows for a habit that has never been completed.
 */
export function getDayCapacity(
  habitCount: number,
  plannedHours: number
): DayCapacity | null {
  const habits = Math.max(0, Math.floor(habitCount) || 0);
  const hours = Math.max(0, plannedHours || 0);

  if (habits === 0 && hours === 0) {
    return null;
  }

  const heavyByHabits = habits >= CAPACITY_HEAVY_MIN_HABITS;
  const heavyByHours = hours >= CAPACITY_HEAVY_MIN_HOURS;

  const level: CapacityLevel =
    heavyByHabits || heavyByHours
      ? "heavy"
      : habits <= CAPACITY_LIGHT_MAX_HABITS
        ? "light"
        : "balanced";

  const basis: DayCapacity["basis"] =
    habits === 0 ? "hours" : heavyByHabits && heavyByHours ? "both" : heavyByHabits ? "habits" : heavyByHours ? "hours" : "empty";

  /**
   * The label quotes the signal that actually decided it.
   *
   * A first pass always showed the hours, which produced "Heavy Day · 0h
   * planned" for a day that was heavy purely because it had nine habits in it.
   * That reads as a contradiction — heavy, but nothing planned — and sends the
   * reader looking for a bug that is not there.
   */
  const label =
    level === "heavy"
      ? basis === "hours"
        ? `Heavy Day · ${formatHours(hours)} planned`
        : basis === "both"
          ? `Heavy Day · ${pluralHabits(habits)} · ${formatHours(hours)}`
          : `Heavy Day · ${pluralHabits(habits)}`
      : level === "light"
        ? `Light Day · ${pluralHabits(habits)}`
        : `Balanced · ${pluralHabits(habits)}`;

  const description =
    level === "heavy"
      ? `Heavy day: ${pluralHabits(habits)} scheduled, ${formatHours(hours)} planned. Consider doing less.`
      : level === "light"
        ? `Light day: ${pluralHabits(habits)} scheduled.`
        : `Balanced day: ${pluralHabits(habits)} scheduled.`;

  return { level, label, description, habitCount: habits, plannedHours: hours, basis };
}

/**
 * Counts the habits actually scheduled on a date.
 *
 * Counts *scheduled*, not total, because an off-schedule habit does not add
 * load to that day -- the same rule ADR 0001 §6.2 applies to rewards, and
 * reusing it here keeps "what the day asks of you" consistent across surfaces.
 */
export function countScheduledHabits(
  habits: Habit[] | undefined | null,
  dateStr: string
): number {
  if (!habits || habits.length === 0) return 0;
  let count = 0;
  for (const habit of habits) {
    if (isHabitScheduledOnDate(habit, dateStr)) count++;
  }
  return count;
}