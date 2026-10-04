/**
 * Synchronous mirror of the habit store in localStorage.
 *
 * IndexedDB is where habits are actually stored and stays the source of truth.
 * The problem is that reading it is ASYNCHRONOUS, so on every cold load the
 * store is empty until the queries resolve, and anything derived from it
 * renders a placeholder or, worse, a wrong number. This mirror lets the first
 * paint show the real, last-known-good values synchronously, with the
 * authoritative IndexedDB read still running behind it to correct anything
 * that changed.
 *
 * This is the same pattern the planner already uses for schedule blocks
 * (`getCachedBlocks` / `setCachedBlocks`); habits needed the same treatment.
 *
 * IndexedDB remains authoritative: nothing here is ever read back into the
 * database, so a stale or corrupt cache can cost a momentary wrong number but
 * can never corrupt or resurrect deleted data.
 */

import { type Habit, type HabitLog } from "@/lib/db";

/** Cache is scoped per user so one profile can never show another's habits. */
const cacheKey = (userId: string) => `odyssey_habits_cache_${userId}`;

/**
 * Refuse to write beyond this. localStorage is typically ~5MB and shared with
 * the rest of the origin; a runaway history should cost us the cache, never an
 * exception in the middle of a state update.
 */
const MAX_CACHE_BYTES = 2 * 1024 * 1024;

export interface HabitCache {
  /** Date the `todayLogs` slice was captured for, so a stale day is not reused. */
  capturedDate: string;
  habits: Habit[];
  todayLogs: Record<string, HabitLog>;
  historyLogs: Record<string, Record<string, boolean>>;
}

/**
 * Checked PER CALL, never cached at module load. A module-level constant would
 * freeze to `false` whenever this module is first imported before a `window`
 * exists (server render, early import) and would then be permanently disabled
 * for the life of the bundle. Matches the inline guard in utils/journey.ts.
 */
const storageUsable = (): boolean =>
  typeof window !== "undefined" && typeof localStorage !== "undefined";

export function readHabitCache(userId: string): HabitCache | null {
  if (!storageUsable()) return null;
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HabitCache>;
    // Validate shape. A cache from an older build, or a partial write, must
    // degrade to "no cache" rather than feed malformed data into the store.
    if (!Array.isArray(parsed.habits) || !parsed.historyLogs) return null;
    return {
      capturedDate: typeof parsed.capturedDate === "string" ? parsed.capturedDate : "",
      habits: parsed.habits,
      todayLogs: parsed.todayLogs && typeof parsed.todayLogs === "object" ? parsed.todayLogs : {},
      historyLogs: parsed.historyLogs,
    };
  } catch {
    return null;
  }
}

export function writeHabitCache(userId: string, cache: HabitCache): void {
  if (!storageUsable()) return;
  try {
    const payload = JSON.stringify(cache);
    if (payload.length > MAX_CACHE_BYTES) {
      // Too large to mirror safely. Drop any stale copy so we stop carrying it.
      try {
        localStorage.removeItem(cacheKey(userId));
      } catch {}
      return;
    }
    localStorage.setItem(cacheKey(userId), payload);
  } catch {
    /* Quota or private-mode failure. The cache is an optimisation only. */
  }
}

export function clearHabitCache(userId: string): void {
  if (!storageUsable()) return;
  try {
    localStorage.removeItem(cacheKey(userId));
  } catch {}
}