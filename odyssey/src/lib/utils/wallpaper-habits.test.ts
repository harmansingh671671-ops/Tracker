import { describe, expect, it } from "vitest";
import type { Habit } from "@/lib/db";
import { selectDynamicHabits, selectWallpaperHabits } from "./wallpaper-habits";

/**
 * S22 -- unlogged habits take precedence in the wallpaper's rotating row.
 *
 * These tests are the gate for the whole feature. They pin four things that the
 * screen-level probe cannot prove cheaply:
 *   1. without completion information the wallpaper keeps its old time-only order
 *      (the native payload and any legacy caller must not change behaviour);
 *   2. with it, habits due today and not done come first, in the existing
 *      time-of-day order, then due-and-done, then habits not due today;
 *   3. the keystone keeps the first slot even when it is already done;
 *   4. the input array is never mutated.
 */
function habit(id: string, name: string, timeOfDay: string, extra: Partial<Habit> = {}): Habit {
  return {
    id,
    userId: "u1",
    name,
    icon: "✨",
    category: "Vitality & Fitness",
    period: "morning",
    frequency: "daily",
    timeOfDay,
    currentStreak: 0,
    longestStreak: 0,
    totalCompletions: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  } as Habit;
}

const ids = (habits: Habit[]) => habits.map((h) => h.id);

// 2026-10-23 is a Friday (1=Mon .. 7=Sun).
const FRIDAY = "2026-10-23";

// At hour 8 the existing distance score ranks: weekly(09:00)=1, mid(12:00)=4,
// late(20:00)=12, early(06:00)=14.
const early = habit("early", "Early", "06:00 AM");
const mid = habit("mid", "Mid", "12:00 PM");
const late = habit("late", "Late", "08:00 PM");
// Due Mondays only, so not due on Friday.
const weekly = habit("weekly", "Weekly", "09:00 AM", { frequency: "weekly", targetDays: [1] });

const all = [early, mid, late, weekly];

describe("selectDynamicHabits (unchanged behaviour)", () => {
  it("still chooses by time-of-day distance", () => {
    expect(ids(selectDynamicHabits(all, 8, 3))).toEqual(["weekly", "mid", "late"]);
  });

  it("returns the input untouched when it fits", () => {
    const three = [early, mid, late];
    expect(selectDynamicHabits(three, 8, 4)).toEqual(three);
  });
});

describe("selectWallpaperHabits", () => {
  it("without completion information keeps today's behaviour: input order when everything fits", () => {
    expect(ids(selectWallpaperHabits(all, { hour: 8, maxCount: 4 }))).toEqual([
      "early",
      "mid",
      "late",
      "weekly",
    ]);
  });

  it("without completion information still chooses by time when there are more habits than slots", () => {
    // Five habits against three slots: this is the branch a "just slice the
    // first N" regression would otherwise pass, because every test above fits.
    const five = [...all, habit("fifth", "Fifth", "10:00 AM")];
    expect(ids(selectWallpaperHabits(five, { hour: 8, maxCount: 3 }))).toEqual([
      "weekly",
      "fifth",
      "mid",
    ]);
  });

  it("keeps the keystone first without completion information", () => {
    expect(ids(selectWallpaperHabits(all, { hour: 8, maxCount: 4, keystoneId: "mid" }))).toEqual([
      "mid",
      "early",
      "late",
      "weekly",
    ]);
  });

  it("puts habits that are due today and not done FIRST, in time order", () => {
    const picked = selectWallpaperHabits(all, {
      hour: 8,
      maxCount: 4,
      dateStr: FRIDAY,
      completedIds: new Set(["mid"]),
    });
    expect(ids(picked)).toEqual(["late", "early", "mid", "weekly"]);
  });

  it("puts due-and-done after due-and-unlogged, and habits not due today last", () => {
    const picked = selectWallpaperHabits(all, {
      hour: 8,
      maxCount: 4,
      dateStr: FRIDAY,
      completedIds: new Set(["mid", "early"]),
    });
    // unlogged: late(12). done: early(14), mid(4) in time order -> mid, early.
    // not due: weekly.
    expect(ids(picked)).toEqual(["late", "mid", "early", "weekly"]);
  });

  it("keeps the keystone in the first slot even when it is done", () => {
    const picked = selectWallpaperHabits(all, {
      hour: 8,
      maxCount: 4,
      dateStr: FRIDAY,
      completedIds: new Set(["mid"]),
      keystoneId: "mid",
    });
    expect(ids(picked)).toEqual(["mid", "late", "early", "weekly"]);
  });

  it("never duplicates the keystone", () => {
    const picked = selectWallpaperHabits(all, {
      hour: 8,
      maxCount: 4,
      dateStr: FRIDAY,
      completedIds: new Set(),
      keystoneId: "late",
    });
    // Nothing is done, so time-of-day decides the rest: mid(4) then early(14).
    expect(ids(picked)).toEqual(["late", "mid", "early", "weekly"]);
    expect(new Set(ids(picked)).size).toBe(picked.length);
  });

  it("respects maxCount, and the keystone survives the cut", () => {
    const picked = selectWallpaperHabits(all, {
      hour: 8,
      maxCount: 2,
      dateStr: FRIDAY,
      completedIds: new Set(),
      keystoneId: "early",
    });
    // The cut is mid, late; the keystone still takes a slot, so late drops.
    expect(picked).toHaveLength(2);
    expect(ids(picked)).toEqual(["early", "mid"]);
  });

  it("reorders even when every habit fits (there are fewer than maxCount)", () => {
    const three = [early, mid, late];
    const picked = selectWallpaperHabits(three, {
      hour: 8,
      maxCount: 4,
      dateStr: FRIDAY,
      completedIds: new Set(["mid"]),
    });
    expect(ids(picked)).toEqual(["late", "early", "mid"]);
  });

  it("ignores an archived keystone", () => {
    const archived = habit("old", "Old", "10:00 AM", {
      archivedAt: "2026-10-01T00:00:00.000Z",
    });
    const picked = selectWallpaperHabits([...all, archived], {
      hour: 8,
      maxCount: 4,
      dateStr: FRIDAY,
      completedIds: new Set(),
      keystoneId: "old",
    });
    expect(picked.map((h) => h.id)).not.toContain("old");
  });

  it("does not mutate the array it was given", () => {
    const input = [...all];
    const before = ids(input);
    selectWallpaperHabits(input, {
      hour: 8,
      maxCount: 4,
      dateStr: FRIDAY,
      completedIds: new Set(["mid"]),
      keystoneId: "early",
    });
    expect(ids(input)).toEqual(before);
  });

  it("a completion set without a date cannot reorder anything (no date means no due-ness)", () => {
    expect(
      ids(selectWallpaperHabits(all, { hour: 8, maxCount: 4, completedIds: new Set(["mid"]) }))
    ).toEqual(["early", "mid", "late", "weekly"]);
  });
});
