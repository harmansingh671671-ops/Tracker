import { type Habit } from "@/lib/db";

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
 */
export function resolveKeystoneHabit(
  habits: Habit[],
  keystoneId?: string
): Habit | null {
  if (!keystoneId) return null;
  return habits.find((h) => h.id === keystoneId && !h.archivedAt) ?? null;
}

/**
 * The habits list with the keystone first.
 *
 * No keystone, or one that is stale/archived, leaves the incoming order alone —
 * so the page needs no branch of its own.
 */
export function orderHabitsForDisplay(
  habits: Habit[],
  keystoneId?: string
): Habit[] {
  const keystone = resolveKeystoneHabit(habits, keystoneId);
  if (!keystone) return habits.slice();
  return [keystone, ...habits.filter((h) => h.id !== keystone.id)];
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
