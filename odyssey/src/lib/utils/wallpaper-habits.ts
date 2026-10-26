import { type Habit } from "@/lib/db";
import { getLocalTodayStr, isHabitScheduledOnDate } from "./habit-colors";
import { isPauseActive, isPauseWindowOn } from "./habit-lifecycle";
import { withKeystoneOnWallpaper } from "./keystone";

/**
 * S22 — how the wallpaper chooses its rotating four habits.
 *
 * This module is pure: no canvas, no React, no database. Both wallpaper surfaces
 * (the on-screen preview and the generated canvas) call `selectWallpaperHabits`,
 * so they cannot disagree about which four habits appear or in what order.
 *
 * The rule layers on top of the S19 keystone rather than replacing it: the
 * keystone keeps the first slot, and "unlogged first" applies to the rest.
 */

/**
 * The time-of-day score used before S22.
 *
 * Kept byte-for-byte (and moved here from wallpaper-generator) so that callers
 * without completion information — including the native payload — behave exactly
 * as they did. A habit "belongs" to the hour nearest the current one.
 */
function parseHabitHour(h: Habit): number {
  if (h.timeOfDay) {
    const match = h.timeOfDay.match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
    if (match) {
      let hour = parseInt(match[1], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === "PM" && hour < 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;
      return hour;
    }
    const rawLower = h.timeOfDay.toLowerCase();
    if (rawLower.includes("morn")) return 8;
    if (rawLower.includes("afternoon")) return 14;
    if (rawLower.includes("even") || rawLower.includes("night")) return 20;
  }
  if (h.period === "morning") return 8;
  if (h.period === "afternoon") return 14;
  if (h.period === "evening") return 20;

  const name = (h.name || "").toLowerCase();
  const cat = (h.category || "").toLowerCase();
  if (name.includes("morn") || name.includes("sun") || name.includes("wake")) return 7;
  if (name.includes("night") || name.includes("bed") || name.includes("sleep")) return 22;
  if (name.includes("lunch") || name.includes("noon")) return 12;
  if (name.includes("dinner") || name.includes("even")) return 19;
  if (cat.includes("mind") || cat.includes("spirit")) return 9;
  if (cat.includes("health") || cat.includes("vital")) return 11;
  if (cat.includes("learn") || cat.includes("work")) return 15;

  return 12;
}

function timeScore(h: Habit, currentHour: number): number {
  const targetH = parseHabitHour(h);
  const dist = (targetH - currentHour + 24) % 24;
  return dist > 14 ? 24 - dist + 12 : dist;
}

export function selectDynamicHabits(
  habits: Habit[] = [],
  currentHour: number = new Date().getHours(),
  maxCount: number = 4
): Habit[] {
  if (!habits || habits.length === 0) return [];
  // B13: a habit paused today has no place on a "what's next" wallpaper row.
  // The dateless legacy path has only "now" to answer with, so it uses today.
  const today = getLocalTodayStr();
  const eligible = habits.filter(
    (h) => !h.archivedAt && !isPauseActive(h.pausedUntil, today)
  );
  if (eligible.length === 0) return [];
  if (eligible.length <= maxCount) return eligible;

  const scored = eligible.map((h, idx) => ({
    habit: h,
    score: timeScore(h, currentHour),
    originalIndex: idx,
  }));

  scored.sort((a, b) => a.score - b.score || a.originalIndex - b.originalIndex);
  return scored.slice(0, maxCount).map((s) => s.habit);
}

export interface WallpaperHabitOptions {
  hour?: number;
  maxCount?: number;
  /** The day being shown; required for "due today" to mean anything. */
  dateStr?: string;
  /** Habit ids completed on `dateStr`. An empty set means "nothing done". */
  completedIds?: ReadonlySet<string>;
  keystoneId?: string;
}

/**
 * The wallpaper's four habits.
 *
 * Without both `dateStr` and `completedIds` this is exactly the old behaviour:
 * time-of-day choice, with the keystone pinned first. That keeps the native
 * payload and any legacy caller untouched.
 *
 * With them, the pool is ordered in three groups — due today and unlogged, due
 * today and done, then everything else (a weekly habit that is not due today has
 * no business leading a "what is left today" row) — each group keeping the
 * existing time-of-day order. The keystone is applied last so it keeps the first
 * slot even when it is already done: it is an anchor, not a to-do.
 */
export function selectWallpaperHabits(
  habits: Habit[] = [],
  options: WallpaperHabitOptions = {}
): Habit[] {
  const {
    hour = new Date().getHours(),
    maxCount = 4,
    dateStr,
    completedIds,
    keystoneId,
  } = options;

  if (!dateStr || !completedIds) {
    return withKeystoneOnWallpaper(
      selectDynamicHabits(habits, hour, maxCount),
      habits,
      keystoneId,
      maxCount
    );
  }

  const group = (habit: Habit): number => {
    if (!isHabitScheduledOnDate(habit, dateStr)) return 2;
    return completedIds.has(habit.id) ? 1 : 0;
  };

  const ordered = habits
    .filter((habit) => !habit.archivedAt && !isPauseWindowOn(habit, dateStr))
    .map((habit, index) => ({
      habit,
      group: group(habit),
      score: timeScore(habit, hour),
      index,
    }))
    .sort((a, b) => a.group - b.group || a.score - b.score || a.index - b.index)
    .map((entry) => entry.habit);

  return withKeystoneOnWallpaper(
    ordered.slice(0, maxCount),
    habits,
    keystoneId,
    maxCount
  );
}
