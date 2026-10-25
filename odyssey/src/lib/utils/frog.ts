import { isHabitScheduledOnDate } from "./habit-colors";
import { habitPriorityRank } from "./habit-priority";

/**
 * S21 — the frog.
 *
 * The frog is the highest-priority habit due that day. It is derived from the
 * habit list, never from what is already done, so ticking a habit cannot make
 * the frog jump to a different one mid-day.
 *
 * Quit habits are excluded: their "completion" is a clean day, and paying a
 * bonus for not slipping would reward the wrong thing.
 */
export interface FrogHabit {
  id: string;
  priority?: unknown;
  targetDays?: number[];
  targetDaysPerWeek?: number;
  type?: string;
  archivedAt?: string;
}

/** Local hour at which the frog bonus closes. Before 10:00 pays, 10:00 does not. */
export const FROG_BONUS_CUTOFF_HOUR = 10;

export function todaysFrogHabit<T extends FrogHabit>(
  habits: readonly T[],
  dateStr: string
): T | null {
  let frog: T | null = null;

  for (const habit of habits) {
    if (habit.archivedAt) continue;
    if (habit.type === "avoid") continue;
    if (!isHabitScheduledOnDate(habit, dateStr)) continue;
    // Strict `<` keeps the stored order on a tie, the same rule S22 uses.
    if (frog === null || habitPriorityRank(habit) < habitPriorityRank(frog)) {
      frog = habit;
    }
  }

  return frog;
}

/** True inside the local morning window, i.e. before the cutoff hour. */
export function isFrogBonusWindow(now: Date): boolean {
  return now.getHours() < FROG_BONUS_CUTOFF_HOUR;
}
