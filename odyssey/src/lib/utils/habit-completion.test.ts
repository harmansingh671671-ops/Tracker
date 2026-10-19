import { describe, it, expect } from "vitest";
import {
  isHabitComplete,
  hasLoggedValue,
  completionRatio,
  nextValue,
  isHabitSlipped,
} from "./habit-completion";

/**
 * `B3` / `S13`, per ADR 0003.
 *
 * The single test that matters most is the one in the middle of this file: a counted habit
 * that has been logged but has NOT reached its target. It must not report complete, because
 * `BUG-5` already shipped the consequence of a completion being counted when it was not
 * earned, in nine places.
 */

const simple = { type: "simple" as const };
const counted = (target: number) => ({ type: "counted" as const, targetValue: target });
const avoid = { type: "avoid" as const };

// =========================================================================
describe("isHabitComplete - simple habits must not change", () => {
  it("behaves exactly as before for a habit with no type recorded", () => {
    // This is every habit in the database today. If this test needs changing, the
    // migration has rewritten someone's history.
    expect(isHabitComplete({}, { completed: true })).toBe(true);
    expect(isHabitComplete({}, { completed: false })).toBe(false);
    expect(isHabitComplete({ type: "simple" }, { completed: true })).toBe(true);
  });

  it("treats an absent log as not complete", () => {
    expect(isHabitComplete(simple, null)).toBe(false);
    expect(isHabitComplete(simple, undefined)).toBe(false);
    expect(isHabitComplete(counted(20), undefined)).toBe(false);
  });

  it("ignores a value on a simple habit rather than being confused by one", () => {
    expect(isHabitComplete(simple, { completed: true, value: 0 })).toBe(true);
  });
});

// =========================================================================
describe("isHabitComplete - counted habits", () => {
  it("is complete at or above the target", () => {
    expect(isHabitComplete(counted(20), { value: 20 })).toBe(true);
    expect(isHabitComplete(counted(20), { value: 25 })).toBe(true);
  });

  it("is NOT complete below the target", () => {
    expect(isHabitComplete(counted(20), { value: 19 })).toBe(false);
    expect(isHabitComplete(counted(20), { value: 3 })).toBe(false);
  });

  it("⚠️ a logged-but-unfinished day is NOT complete - the BUG-5 shape", () => {
    // `completed: true` is a display cache for a counted habit, not the authority.
    // If this ever returns true, a streak gets counted that was never earned.
    expect(isHabitComplete(counted(20), { completed: true, value: 3 })).toBe(false);
  });

  it("treats a missing or non-finite value as zero, not as complete", () => {
    expect(isHabitComplete(counted(20), { completed: true })).toBe(false);
    expect(isHabitComplete(counted(20), { value: NaN })).toBe(false);
    expect(isHabitComplete(counted(20), { value: -5 })).toBe(false);
  });

  it("refuses to complete a counted habit that has no usable target", () => {
    // Falling back to `completed` here would let a half-entered habit report a streak.
    expect(isHabitComplete({ type: "counted" }, { completed: true, value: 99 })).toBe(false);
    expect(isHabitComplete(counted(0), { value: 99 })).toBe(false);
    expect(isHabitComplete(counted(-5), { value: 99 })).toBe(false);
    expect(isHabitComplete(counted(NaN), { value: 99 })).toBe(false);
  });

  it("handles a fractional target", () => {
    // "1.5 cups" is a real thing, and must not be rounded into a different answer.
    expect(isHabitComplete(counted(1.5), { value: 1.5 })).toBe(true);
    expect(isHabitComplete(counted(1.5), { value: 1.4 })).toBe(false);
  });
});

// =========================================================================
describe("hasLoggedValue - logged is not the same as done", () => {
  it("distinguishes progress from completion", () => {
    expect(hasLoggedValue(counted(20), { value: 3 })).toBe(true);
    expect(hasLoggedValue(counted(20), { value: 0 })).toBe(false);
    expect(hasLoggedValue(counted(20), undefined)).toBe(false);
  });

  it("for a simple habit, logged means checked", () => {
    expect(hasLoggedValue(simple, { completed: true })).toBe(true);
    expect(hasLoggedValue(simple, { completed: false })).toBe(false);
  });
});

// =========================================================================
describe("completionRatio", () => {
  it("is progress toward the target, clamped to 0..1", () => {
    expect(completionRatio(counted(20), { value: 5 })).toBe(0.25);
    expect(completionRatio(counted(20), { value: 20 })).toBe(1);
    expect(completionRatio(counted(20), { value: 40 })).toBe(1);
    expect(completionRatio(counted(20), { value: 0 })).toBe(0);
    expect(completionRatio(counted(20), undefined)).toBe(0);
  });

  it("is 0 for a simple habit, which has no partial state", () => {
    expect(completionRatio(simple, { completed: true })).toBe(0);
    expect(completionRatio({}, { completed: true, value: 99 })).toBe(0);
  });

  it("is 0 rather than Infinity or NaN when the target is unusable", () => {
    expect(completionRatio({ type: "counted" }, { value: 10 })).toBe(0);
    expect(completionRatio(counted(0), { value: 10 })).toBe(0);
  });
});

// =========================================================================
describe("isHabitComplete - avoid (quit) habits", () => {
  it("is complete when the day is clean", () => {
    expect(isHabitComplete(avoid, { completed: true, value: 0 })).toBe(true);
    expect(isHabitComplete(avoid, { completed: true })).toBe(true);
  });

  it("⚠️ is NOT complete when the user slipped - the day that ends the run", () => {
    // If this returns true, a quit streak counts the day the user most needs counted
    // against them. This is `BUG-5`'s shape for the one habit type that has a violation.
    expect(isHabitComplete(avoid, { completed: false, value: 1 })).toBe(false);
  });

  it("is not complete for a day with no log", () => {
    expect(isHabitComplete(avoid, undefined)).toBe(false);
    expect(isHabitComplete(avoid, null)).toBe(false);
  });
});

// =========================================================================
describe("isHabitSlipped - the avoid violation state", () => {
  it("is true for an avoid habit carrying a slip value", () => {
    expect(isHabitSlipped(avoid, { completed: false, value: 1 })).toBe(true);
    expect(isHabitSlipped(avoid, { value: 2 })).toBe(true);
  });

  it("is false for a clean, unlogged, or value-less avoid day", () => {
    expect(isHabitSlipped(avoid, { completed: true, value: 0 })).toBe(false);
    expect(isHabitSlipped(avoid, { completed: true })).toBe(false);
    expect(isHabitSlipped(avoid, undefined)).toBe(false);
    expect(isHabitSlipped(avoid, null)).toBe(false);
  });

  it("never marks a non-avoid habit as slipped, whatever its value", () => {
    // `value` means "progress" on a counted habit; reading it as a slip there would turn
    // every logged counted day into a violation.
    expect(isHabitSlipped(counted(20), { value: 20 })).toBe(false);
    expect(isHabitSlipped(simple, { completed: true, value: 1 })).toBe(false);
    expect(isHabitSlipped({}, { value: 5 })).toBe(false);
  });
});

// =========================================================================
describe("nextValue", () => {
  it("steps up and down", () => {
    expect(nextValue(3, 1, 1)).toBe(4);
    expect(nextValue(3, 5, 1)).toBe(8);
    expect(nextValue(8, 5, -1)).toBe(3);
  });

  it("never goes below zero - a count cannot go into debt", () => {
    expect(nextValue(0, 1, -1)).toBe(0);
    expect(nextValue(2, 5, -1)).toBe(0);
    expect(nextValue(3, 10, -1)).toBe(0);
  });

  it("survives junk input without producing NaN", () => {
    expect(nextValue(NaN, 1, 1)).toBe(1);
    expect(nextValue(5, 0, 1)).toBe(6);
    expect(nextValue(5, -2, 1)).toBe(6);
    expect(nextValue(-5, 1, 1)).toBe(1);
  });
});