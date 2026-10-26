import { type Habit } from "@/lib/db";
import { getLocalTodayStr } from "./habit-colors";
import { isPauseActive } from "./habit-lifecycle";

/**
 * S19 — the keystone habit: ONE habit per user, stored as a profile reference.
 *
 * All three rules live here so every surface (habits list, heatmap, wallpaper
 * preview, generated wallpaper) reads the same pin instead of re-deriving it.
 */

/**
 * The habit the id points at, or null.
 *
 * An archived keystone resolves to nothing: archiving retires the pin without
 * rewriting the profile, and a vanished reference is never trusted.
 *
 * B13: a PAUSED keystone also resolves to nothing for "today" surfaces — a
 * paused habit is not expected of the user, so it must not lead the list or
 * hold a wallpaper slot. Its archivedAt/pause fields are untouched; resume
 * brings the pin straight back.
 */
export function resolveKeystoneHabit(
  habits: Habit[],
  keystoneId?: string
): Habit | null {
  if (!keystoneId) return null;
  const today = getLocalTodayStr();
  return (
    habits.find(
      (h) =>
        h.id === keystoneId &&
        !h.archivedAt &&
        !isPauseActive(h.pausedUntil, today)
    ) ?? null
  );
}

/**
 * The habits list with the keystone first and PAUSED habits last (B13, owner
 * rule: a paused habit stays visible, at the bottom, with its resume control).
 * Archived habits keep their position: the store already filters them out
 * before any display ordering runs.
 *
 * No keystone, or one that is stale/archived, leaves the incoming order alone
 * within its own group — so the page needs no branch of its own.
 */
export function orderHabitsForDisplay(
  habits: Habit[],
  keystoneId?: string
): Habit[] {
  const keystone = resolveKeystoneHabit(habits, keystoneId);
  const today = getLocalTodayStr();
  const withoutKeystone = habits.filter((h) => h.id !== keystone?.id);
  const isPausedToday = (h: Habit) =>
    !h.archivedAt && isPauseActive(h.pausedUntil, today);
  const active = withoutKeystone.filter((h) => !isPausedToday(h));
  const paused = withoutKeystone.filter(isPausedToday);
  let ordered = [...active, ...paused];
  if (keystone) ordered = [keystone, ...ordered];
  return ordered;
}

/**
 * The wallpaper's rotating habit row with the keystone held in it.
 *
 * Wrapping is required rather than sorting the input: `selectDynamicHabits`
 * returns its input untouched when there are `<= maxCount` habits, so ordering
 * alone would lose the pin on a short list.
 */
export function withKeystoneOnWallpaper(
  picks: Habit[],
  allHabits: Habit[],
  keystoneId?: string,
  maxCount = 4
): Habit[] {
  if (maxCount <= 0) return [];
  // Resolve from the whole list, not from `picks`: the picker may have left the
  // keystone out entirely, and it still earns a permanent place.
  const keystone = resolveKeystoneHabit(allHabits, keystoneId);
  if (!keystone) return picks.slice(0, maxCount);
  return [keystone, ...picks.filter((h) => h.id !== keystone.id)].slice(0, maxCount);
}
