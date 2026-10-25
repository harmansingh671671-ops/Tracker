import { isHabitScheduledOnDate } from "./habit-colors";
import { isHabitComplete } from "./habit-completion";

/**
 * S23 — habit completion, this week against the same days last week.
 *
 * This is deliberately NOT the stats page's "Days Done": that counts schedule
 * blocks that were written and reviewed. This counts habit-days.
 *
 * Pure on purpose. The page owns loading; this owns the arithmetic, so the
 * comparison can be tested without a database.
 */

export interface WeekHabit {
  id: string;
  targetDays?: number[];
  targetDaysPerWeek?: number;
  type?: "simple" | "counted" | "avoid";
  targetValue?: number;
  /** ISO timestamp. A habit does not count before the day it was created. */
  createdAt?: string;
  /** ISO timestamp. A habit stops counting on the day it was archived. */
  archivedAt?: string;
}

export interface WeekLog {
  habitId: string;
  date: string;
  completed?: boolean;
  value?: number;
}

export interface WeekWindow {
  /** Monday, `YYYY-MM-DD`. */
  start: string;
  /** Inclusive end of the window. */
  end: string;
  due: number;
  completed: number;
  /** 0..1. Zero when nothing was due, though such a window is not shown. */
  rate: number;
}

export interface WeekComparison {
  current: WeekWindow;
  previous: WeekWindow;
  /** Percentage-point difference, rounded once for display. */
  deltaPp: number;
}

function parse(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function format(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const date = parse(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return format(date);
}

/** Monday of the week containing `dateStr`. Sunday belongs to the Monday before. */
function mondayOf(dateStr: string): string {
  const day = parse(dateStr).getUTCDay(); // 0=Sun .. 6=Sat
  const offset = (day + 6) % 7;
  return addDays(dateStr, -offset);
}

function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

/** The stored date portion, so a timestamp never shifts across a timezone. */
function storedDate(value: string | undefined): string | null {
  return value ? value.slice(0, 10) : null;
}

function isDueOn(habit: WeekHabit, dateStr: string): boolean {
  const created = storedDate(habit.createdAt);
  if (created && created > dateStr) return false;

  const archived = storedDate(habit.archivedAt);
  if (archived && archived <= dateStr) return false;

  return isHabitScheduledOnDate(habit, dateStr);
}

function countWindow(
  habits: readonly WeekHabit[],
  logsByHabitDate: ReadonlyMap<string, WeekLog>,
  start: string,
  end: string
): WeekWindow {
  let due = 0;
  let completed = 0;

  for (const date of eachDay(start, end)) {
    for (const habit of habits) {
      if (!isDueOn(habit, date)) continue;
      due++;
      const log = logsByHabitDate.get(`${habit.id}|${date}`);
      if (log && isHabitComplete(habit, log)) completed++;
    }
  }

  return { start, end, due, completed, rate: due === 0 ? 0 : completed / due };
}

/**
 * The comparison, or null when either week has nothing to count.
 *
 * A percentage against an empty week is noise, not a comparison -- and a habit
 * created this week would otherwise claim a fake 0% for last week.
 */
export function getWeekComparison(
  habits: readonly WeekHabit[],
  logs: readonly WeekLog[],
  todayStr: string
): WeekComparison | null {
  const currentStart = mondayOf(todayStr);
  const previousStart = addDays(currentStart, -7);
  const previousEnd = addDays(todayStr, -7);

  const logsByHabitDate = new Map<string, WeekLog>();
  for (const log of logs) logsByHabitDate.set(`${log.habitId}|${log.date}`, log);

  const current = countWindow(habits, logsByHabitDate, currentStart, todayStr);
  const previous = countWindow(habits, logsByHabitDate, previousStart, previousEnd);

  if (current.due === 0 || previous.due === 0) return null;

  return {
    current,
    previous,
    deltaPp: Math.round((current.rate - previous.rate) * 100),
  };
}
