import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  newlyCrossedStreakMilestones,
  consumeNewAchievements,
  hasCelebrated,
  markCelebrated,
  getAchievement,
  STREAK_MILESTONES,
  ACHIEVEMENT_STORAGE_KEY,
} from "./achievements";
import { remove } from "./logger";

function mkStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
}

beforeEach(() => {
  const s = mkStorage();
  vi.stubGlobal("window", { localStorage: s });
  vi.stubGlobal("localStorage", s);
  remove(ACHIEVEMENT_STORAGE_KEY);
});

describe("newlyCrossedStreakMilestones", () => {
  it("fires on upward crossing", () => {
    expect(newlyCrossedStreakMilestones(2, 3)).toEqual(["streak-3"]);
    expect(newlyCrossedStreakMilestones(2, 7)).toEqual(["streak-3", "streak-7"]);
  });
  it("does not fire on no-change or demotion", () => {
    expect(newlyCrossedStreakMilestones(3, 3)).toEqual([]);
    expect(newlyCrossedStreakMilestones(5, 2)).toEqual([]);
  });
  it("handles non-finite safely", () => {
    expect(newlyCrossedStreakMilestones(NaN, 3)).toEqual(["streak-3"]);
    expect(newlyCrossedStreakMilestones(2, NaN)).toEqual([]);
  });
});

describe("consumeNewAchievements", () => {
  it("fires once and marks celebrated", () => {
    const first = consumeNewAchievements("h1", 2, 3);
    expect(first.map((a) => a.id)).toEqual(["streak-3"]);
    expect(hasCelebrated("h1", "streak-3")).toBe(true);
    const second = consumeNewAchievements("h1", 3, 4);
    expect(second).toEqual([]);
  });
  it("different habits tracked separately", () => {
    consumeNewAchievements("h1", 2, 3);
    const r = consumeNewAchievements("h2", 2, 3);
    expect(r.map((a) => a.id)).toEqual(["streak-3"]);
  });
  it("getAchievement resolves", () => {
    expect(getAchievement("streak-7")?.threshold).toBe(7);
    expect(getAchievement("nope")).toBeUndefined();
  });
  it("catalogue has 4 milestones", () => {
    expect(STREAK_MILESTONES.length).toBe(4);
  });
});