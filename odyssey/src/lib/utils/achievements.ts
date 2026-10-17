import { readJson, writeJson } from "./logger";

export const ACHIEVEMENT_STORAGE_KEY = "odyssey_achievements_celebrated";

export interface Achievement {
  id: string;
  title: string;
  narrative: string;
  threshold: number;
}

export const STREAK_MILESTONES: Achievement[] = [
  { id: "streak-3", title: "3-day streak", narrative: "Three days in a row. Momentum is real.", threshold: 3 },
  { id: "streak-7", title: "7-day streak", narrative: "A whole week of showing up. That's a habit forming.", threshold: 7 },
  { id: "streak-14", title: "14-day streak", narrative: "Two weeks steady. The routine is yours now.", threshold: 14 },
  { id: "streak-30", title: "30-day streak", narrative: "A month of consistency. Quietly remarkable.", threshold: 30 },
];

export function getAchievement(id: string): Achievement | undefined {
  return STREAK_MILESTONES.find((a) => a.id === id);
}

/**
 * Returns the ids of streak milestones crossed when moving from `prev` to `next`.
 * Only counts upward crossings (prev < threshold <= next). A demotion or no-change
 * yields nothing -- the same refusal logic as M14's rank dialog.
 */
export function newlyCrossedStreakMilestones(prev: number, next: number): string[] {
  const safePrev = Number.isFinite(prev) ? Math.max(0, Math.floor(prev)) : 0;
  const safeNext = Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0;
  if (safeNext <= safePrev) return [];
  return STREAK_MILESTONES.filter(
    (a) => safePrev < a.threshold && safeNext >= a.threshold
  ).map((a) => a.id);
}

type CelebratedMap = Record<string, string[]>;

function readCelebrated(): CelebratedMap {
  const v = readJson<CelebratedMap>(ACHIEVEMENT_STORAGE_KEY, {});
  if (v && typeof v === "object" && !Array.isArray(v)) return v;
  return {};
}

function writeCelebrated(map: CelebratedMap): void {
  writeJson(ACHIEVEMENT_STORAGE_KEY, map);
}

export function hasCelebrated(habitId: string, achievementId: string): boolean {
  const map = readCelebrated();
  const list = map[habitId];
  return Array.isArray(list) && list.includes(achievementId);
}

export function markCelebrated(habitId: string, achievementId: string): void {
  const map = readCelebrated();
  const list = Array.isArray(map[habitId]) ? map[habitId] : [];
  if (!list.includes(achievementId)) list.push(achievementId);
  map[habitId] = list;
  writeCelebrated(map);
}

/**
 * Returns the achievements that should fire for a habit moving from `prev` to `next`,
 * excluding any already celebrated. Marks them celebrated as a side effect so a reload
 * cannot re-fire them.
 */
export function consumeNewAchievements(habitId: string, prev: number, next: number): Achievement[] {
  const ids = newlyCrossedStreakMilestones(prev, next);
  const result: Achievement[] = [];
  for (const id of ids) {
    if (hasCelebrated(habitId, id)) continue;
    const a = getAchievement(id);
    if (a) {
      result.push(a);
      markCelebrated(habitId, id);
    }
  }
  return result;
}