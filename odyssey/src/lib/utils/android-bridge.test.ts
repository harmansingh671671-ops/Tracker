import { describe, it, expect } from "vitest";
import { buildNativeSchedulePayload } from "./android-bridge";
import type { WallpaperData } from "./wallpaper-generator";

/**
 * BUG-5 regression guard.
 *
 * `buildNativeSchedulePayload` had **no tests at all**, which is how
 * `currentStreak || 1` survived: a `|| 1` against a zero streak is invisible
 * to `tsc`, invisible to lint, and invisible to any suite that did not
 * construct the payload. It reached the lock screen, where the native side
 * renders the number inside an amber achievement pill.
 *
 * These tests exist to make a falsified zero impossible to reintroduce
 * silently. The rule they encode is narrow on purpose: a streak is a count,
 * so anything that is not a positive finite number is 0 -- never 1, and never
 * some other quantity such as the journey day.
 */

function payload(overrides: Partial<WallpaperData> = {}) {
  return JSON.parse(buildNativeSchedulePayload({
    dateStr: "2026-10-15",
    chapter: "Chapter 1",
    activeDay: 7,
    rankName: "Consistent",
    rankBadge: "C",
    userLevel: 3,
    userStreak: 0,
    plannedHours: 6,
    blocks: [],
    habits: [],
    ...overrides,
  } as WallpaperData));
}

function habit(over: Record<string, unknown> = {}) {
  return {
    id: "h1", name: "Read", icon: "📖", category: "Craft & Skill",
    period: "evening", timeOfDay: "20:00", currentStreak: 0, ...over,
  };
}

describe("buildNativeSchedulePayload — streak honesty (BUG-5)", () => {
  it("reports a genuine zero streak as 0, not 1", () => {
    const p = payload({ habits: [habit({ currentStreak: 0 })] as never });
    expect(p.habits[0].currentStreak).toBe(0);
  });

  it("passes a real streak through untouched", () => {
    const p = payload({ habits: [habit({ currentStreak: 12 })] as never });
    expect(p.habits[0].currentStreak).toBe(12);
  });

  it("reports the user's zero streak as 0, not the journey day", () => {
    // activeDay is 7 here. Falling back to it is what rendered "7 DAYS STREAK".
    const p = payload({ userStreak: 0, activeDay: 7 });
    expect(p.userStreak).toBe(0);
  });

  it("keeps placeholder habits at 0 even when the user has a streak", () => {
    // No habits supplied -> the two placeholder rows are used. They are not
    // the user's habits, so they must not inherit the user's streak.
    const p = payload({ habits: [], userStreak: 42 });
    expect(p.habits).toHaveLength(2);
    for (const h of p.habits) expect(h.currentStreak).toBe(0);
  });

  it.each([
    ["negative", -3],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["null", null],
    ["undefined", undefined],
    ["a non-numeric string", "many"],
  ])("coerces %s to 0 rather than to 1", (_label, bad) => {
    // IndexedDB is not type-checked, so a habit written by an older build can
    // hold anything. Every one of these used to become 1.
    const p = payload({ habits: [habit({ currentStreak: bad })] as never });
    expect(p.habits[0].currentStreak).toBe(0);
  });

  it("coerces a numeric string to its number instead of discarding it", () => {
    // This assertion was written as "becomes 0" and was wrong: a habit whose
    // streak round-tripped through storage as "7" really does have a 7-day
    // streak, and flattening it to 0 would throw away the user's history --
    // trading one false number for another. Coercing to 7 is the honest answer,
    // and it is also what stops the value reaching Kotlin as a string at all.
    const p = payload({ habits: [habit({ currentStreak: "7" })] as never });
    expect(p.habits[0].currentStreak).toBe(7);
  });

  it("never emits 1 for a value that is absent", () => {
    const p = payload({ habits: [habit({ currentStreak: undefined })] as never });
    expect(p.habits[0].currentStreak).not.toBe(1);
  });

  it("floors a fractional streak rather than passing a decimal to the native side", () => {
    const p = payload({ habits: [habit({ currentStreak: 4.7 })] as never });
    expect(p.habits[0].currentStreak).toBe(4);
  });

  it("keeps every other field of the payload intact", () => {
    // The fix must not quietly reshape the contract the Kotlin side reads.
    const p = payload({ habits: [habit({ currentStreak: 5 })] as never });
    expect(p.habits[0]).toMatchObject({
      id: "h1", name: "Read", icon: "📖",
      category: "Craft & Skill", period: "evening", timeOfDay: "20:00",
    });
    expect(p.dateStr).toBe("2026-10-15");
    expect(p.rankName).toBe("Consistent");
  });
});