import { describe, it, expect } from "vitest";
import { getHabitScheduledDays, isHabitScheduledOnDate } from "./habit-colors";

describe("getHabitScheduledDays", () => {
  it("prefers explicit targetDays over targetDaysPerWeek", () => {
    // An explicit day list must win, otherwise a habit set to Tue/Thu would
    // silently drift to a weekly-count schedule.
    const days = getHabitScheduledDays({ targetDays: [2, 4], targetDaysPerWeek: 5 });
    expect(days).toEqual([2, 4]);
  });

  it("falls back to every day for 7-per-week", () => {
    expect(getHabitScheduledDays({ targetDaysPerWeek: 7 })).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("maps 5-per-week to the working week", () => {
    expect(getHabitScheduledDays({ targetDaysPerWeek: 5 })).toEqual([1, 2, 3, 4, 5]);
  });

  it("spaces a 3-per-week habit out", () => {
    expect(getHabitScheduledDays({ targetDaysPerWeek: 3 })).toEqual([1, 3, 5]);
  });

  it("returns contiguous early days for other counts in 1..6", () => {
    expect(getHabitScheduledDays({ targetDaysPerWeek: 1 })).toEqual([1]);
    expect(getHabitScheduledDays({ targetDaysPerWeek: 2 })).toEqual([1, 2]);
    expect(getHabitScheduledDays({ targetDaysPerWeek: 6 })).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("defaults to every day when nothing is configured", () => {
    expect(getHabitScheduledDays({})).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("defaults to every day for out-of-range counts", () => {
    expect(getHabitScheduledDays({ targetDaysPerWeek: 0 })).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(getHabitScheduledDays({ targetDaysPerWeek: 10 })).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("ignores an empty targetDays array rather than scheduling nothing", () => {
    // An empty array is "unset", not "never" -- scheduling a daily habit to
    // zero days would silently make it untrackable.
    expect(getHabitScheduledDays({ targetDays: [], targetDaysPerWeek: 3 })).toEqual([1, 3, 5]);
  });
});

describe("isHabitScheduledOnDate", () => {
  const weekdays = { targetDaysPerWeek: 7 };

  it("accepts any valid date for an all-week habit", () => {
    expect(isHabitScheduledOnDate(weekdays, "2026-10-04")).toBe(true); // Sunday
    expect(isHabitScheduledOnDate(weekdays, "2026-10-05")).toBe(true); // Monday
  });

  it("maps Sunday to 7, not 0", () => {
    // JS getDay() is 0=Sunday; the schedule uses 1=Mon..7=Sun. Getting this
    // wrong silently shifts every weekly habit by one day.
    const sundayOnly = { targetDays: [7] };
    expect(isHabitScheduledOnDate(sundayOnly, "2026-10-04")).toBe(true); // Sunday
    expect(isHabitScheduledOnDate(sundayOnly, "2026-10-05")).toBe(false); // Monday
  });

  it("maps Monday to 1", () => {
    const mondayOnly = { targetDays: [1] };
    expect(isHabitScheduledOnDate(mondayOnly, "2026-10-05")).toBe(true);
    expect(isHabitScheduledOnDate(mondayOnly, "2026-10-06")).toBe(false);
  });

  it("checks a mid-week date against a 5-day week", () => {
    const workweek = { targetDaysPerWeek: 5 };
    expect(isHabitScheduledOnDate(workweek, "2026-10-05")).toBe(true); // Monday
    expect(isHabitScheduledOnDate(workweek, "2026-10-09")).toBe(true); // Friday
    expect(isHabitScheduledOnDate(workweek, "2026-10-10")).toBe(false); // Saturday
    expect(isHabitScheduledOnDate(workweek, "2026-10-11")).toBe(false); // Sunday
  });

  it("returns true for a missing date rather than blocking the habit", () => {
    // A bad/missing date must not read as "not scheduled", or the habit would
    // disappear from the UI instead of erroring visibly.
    expect(isHabitScheduledOnDate(weekdays, "")).toBe(true);
  });

  it("covers every day of a known week exactly once", () => {
    const week = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];
    const workweek = { targetDaysPerWeek: 5 };
    expect(week.filter((d) => isHabitScheduledOnDate(workweek, d))).toHaveLength(5);
  });
});
