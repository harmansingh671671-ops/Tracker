import { describe, it, expect } from "vitest";
import {
  PAUSE_PRESETS,
  normalizePauseDays,
  pauseUntil,
  isPauseActive,
  lastTouchedDate,
  isHabitStale,
} from "./habit-lifecycle";

/**
 * B13 acceptance contract (red first, cruise playbook 2026-10-26).
 *
 * The 14-day review offers pause/archive/keep; pause hides a habit and lifts
 * its expectations without touching any number (all counters are derived from
 * `habitLogs`, B25 — a pause bends nothing). Pause end-date arithmetic and the
 * 14-day staleness threshold live in ONE pure module so the store, the cards
 * and the review card cannot drift, mirroring `compliance.ts`.
 *
 * Date discipline: everything is `YYYY-MM-DD` local strings compared as
 * strings, never through `Date` timezone parsing (the BUG-11 family).
 */

const TODAY = "2026-10-26";

describe("pause length choices", () => {
  it("offers exactly the three preset chips the owner chose (3/7/30)", () => {
    expect(PAUSE_PRESETS).toEqual([3, 7, 30]);
  });

  it("normalizes the custom 1-30 input, rejecting out-of-range and non-integers", () => {
    expect(normalizePauseDays(1)).toBe(1);
    expect(normalizePauseDays(14)).toBe(14);
    expect(normalizePauseDays(30)).toBe(30);
    expect(normalizePauseDays(0)).toBeNull();
    expect(normalizePauseDays(-2)).toBeNull();
    expect(normalizePauseDays(31)).toBeNull();
    expect(normalizePauseDays(2.5)).toBeNull();
    expect(normalizePauseDays(NaN)).toBeNull();
  });
});

describe("pause end-date arithmetic", () => {
  it("shifts the local date forward by whole days, across month ends", () => {
    // The owner chose chips + custom; the end date is derived, never typed.
    expect(pauseUntil("2026-10-26", 3)).toBe("2026-10-29");
    expect(pauseUntil("2026-10-26", 7)).toBe("2026-11-02");
    expect(pauseUntil("2026-10-26", 30)).toBe("2026-11-25");
    expect(pauseUntil("2026-10-30", 7)).toBe("2026-11-06"); // month rollover
    expect(pauseUntil("2026-12-30", 7)).toBe("2027-01-06"); // year rollover
  });

  it("keeps the pause active through its end day and expires the day after", () => {
    expect(isPauseActive("2026-11-02", "2026-11-02")).toBe(true);
    expect(isPauseActive("2026-11-02", "2026-11-03")).toBe(false);
  });

  it("treats an absent or empty end date as not paused", () => {
    expect(isPauseActive(undefined, TODAY)).toBe(false);
    expect(isPauseActive("", TODAY)).toBe(false);
  });
});

describe("the 14-day staleness threshold", () => {
  it("is stale from the LAST TOUCHED day, not the creation date, once any day was logged", () => {
    // Any logged day counts as touch — a partial counted fill (B16's crisis
    // minimum included) keeps a habit active in the review's eyes.
    expect(isHabitStale("2026-10-01", "2026-01-01", TODAY)).toBe(true); // 25d quiet
    expect(isHabitStale("2026-10-12", "2026-01-01", TODAY)).toBe(true); // exactly 14 quiet days
    expect(isHabitStale("2026-10-13", "2026-01-01", TODAY)).toBe(false); // 13 quiet days
    expect(isHabitStale(TODAY, "2026-01-01", TODAY)).toBe(false);
  });

  it("falls back to the creation date for a habit never touched at all", () => {
    expect(isHabitStale(null, "2026-10-12", TODAY)).toBe(true); // touched once at creation, 14 quiet since
    expect(isHabitStale(null, "2026-10-13", TODAY)).toBe(false);
    expect(isHabitStale(null, "2026-09-20", TODAY)).toBe(true); // 36d idle young habit
  });
});

describe("lastTouchedDate", () => {
  it("returns the newest log date, or null when the logs array is empty", () => {
    const logs = [{ date: "2026-08-01" }, { date: "2026-10-02" }, { date: "2026-09-15" }];
    expect(lastTouchedDate(logs)).toBe("2026-10-02");
    expect(lastTouchedDate([])).toBeNull();
  });
});
