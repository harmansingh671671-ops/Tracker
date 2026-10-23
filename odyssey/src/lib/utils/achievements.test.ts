import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  newlyCrossedDayMilestones,
  consumeNewAchievements,
  hasCelebrated,
  markCelebrated,
  getAchievement,
  DAYS_MILESTONES,
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

describe("newlyCrossedDayMilestones", () => {
  it("fires on upward crossing", () => {
    expect(newlyCrossedDayMilestones(2, 3)).toEqual(["streak-3"]);
    expect(newlyCrossedDayMilestones(2, 7)).toEqual(["streak-3", "streak-7"]);
  });
  it("does not fire on no-change or a decrease", () => {
    expect(newlyCrossedDayMilestones(3, 3)).toEqual([]);
    expect(newlyCrossedDayMilestones(5, 2)).toEqual([]);
  });
  it("handles non-finite safely", () => {
    expect(newlyCrossedDayMilestones(NaN, 3)).toEqual(["streak-3"]);
    expect(newlyCrossedDayMilestones(2, NaN)).toEqual([]);
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
  it("catalogue has 8 milestones: 3/7/14/21/30/60/100/365 (S24 spec, MASTER_TODO_REVISED §1016)", () => {
    // S24: the ladder users see is per-habit DAYS DONE (ADR 0005) — the
    // `streak-*` ids are internal keys only, kept so celebrated flags survive.
    expect(DAYS_MILESTONES.map((a) => a.threshold)).toEqual([3, 7, 14, 21, 30, 60, 100, 365]);
  });
  it("fires the big rungs on upward crossing", () => {
    expect(newlyCrossedDayMilestones(20, 21)).toEqual(["streak-21"]);
    expect(newlyCrossedDayMilestones(59, 60)).toEqual(["streak-60"]);
    expect(newlyCrossedDayMilestones(99, 100)).toEqual(["streak-100"]);
    expect(newlyCrossedDayMilestones(364, 365)).toEqual(["streak-365"]);
  });
  it("a restore jump lists every rung it passes in ASCENDING order (the popup takes them one at a time)", () => {
    expect(newlyCrossedDayMilestones(0, 366)).toEqual([
      "streak-3", "streak-7", "streak-14", "streak-21", "streak-30", "streak-60", "streak-100", "streak-365",
    ]);
  });
  it("already being past a big rung never re-fires it", () => {
    expect(newlyCrossedDayMilestones(100, 101)).toEqual([]);
    expect(newlyCrossedDayMilestones(365, 366)).toEqual([]);
  });
  it("every rung has a title and a narrative (warm-copy rule: never celebrate an empty promise)", () => {
    for (const a of DAYS_MILESTONES) {
      expect(a.title.trim().length).toBeGreaterThan(0);
      expect(a.narrative.trim().length).toBeGreaterThan(0);
      expect(a.id.trim().length).toBeGreaterThan(0);
    }
    const ids = DAYS_MILESTONES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});