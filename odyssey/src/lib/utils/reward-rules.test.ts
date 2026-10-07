import { describe, it, expect } from "vitest";
import {
  DIAMONDS_PER_COMPLETION,
  XP_CREATION_DIAMONDS,
  XP_CREATION_XP,
  XP_PER_BLOCK_COMPLETED,
  XP_PER_BLOCK_COMPLETED_JOURNEY,
  XP_PER_COMPLETION,
  XP_PERFECT_DAY_BONUS,
  advanceStreakForSettlement,
  computeDayReward,
  isPerfectDay,
  type SchedulableHabit,
} from "./reward-rules";

// 2026-01-05 is a Monday. Deriving weekday numbers by hand is exactly the kind
// of thing that silently makes a test assert the wrong thing.
const MON = "2026-01-05";
const TUE = "2026-01-06";
const WED = "2026-01-07";
const THU = "2026-01-08";

/** Daily habit, due every day. */
function daily(id: string): SchedulableHabit {
  return { id, targetDays: [1, 2, 3, 4, 5, 6, 7] };
}

/** Due Mondays only. */
function mondayOnly(id: string): SchedulableHabit {
  return { id, targetDays: [1] };
}

function ids(...values: string[]): Set<string> {
  return new Set(values);
}

describe("isPerfectDay", () => {
  it("is true when every due habit is completed", () => {
    const habits = [daily("a"), daily("b")];
    expect(isPerfectDay(habits, MON, ids("a", "b"))).toBe(true);
  });

  it("is false when one due habit is outstanding", () => {
    const habits = [daily("a"), daily("b")];
    expect(isPerfectDay(habits, MON, ids("a"))).toBe(false);
  });

  it("ignores habits that were not due that day", () => {
    // The Monday-only habit is not due on Tuesday, so completing only the
    // Tuesday habit is still a perfect Tuesday.
    const habits = [daily("a"), mondayOnly("b")];
    expect(isPerfectDay(habits, TUE, ids("a"))).toBe(true);
  });

  it("does not count a non-due habit's completion towards the total", () => {
    const habits = [daily("a"), mondayOnly("b")];
    // On Monday the Monday-only habit IS due, so leaving it out is not perfect.
    expect(isPerfectDay(habits, MON, ids("a"))).toBe(false);
    expect(isPerfectDay(habits, MON, ids("a", "b"))).toBe(true);
  });

  // The load-bearing case: without an explicit due>0 check, `done >= due` is
  // 0 >= 0 and every rest day would pay a bonus for doing nothing.
  it("is false on a day with nothing scheduled", () => {
    const habits = [mondayOnly("a")];
    expect(isPerfectDay(habits, TUE, ids())).toBe(false);
  });

  it("is false with no habits at all", () => {
    expect(isPerfectDay([], MON, ids())).toBe(false);
    expect(isPerfectDay(null, MON, ids())).toBe(false);
    expect(isPerfectDay(undefined, MON, ids())).toBe(false);
  });

  it("is false on an empty day even when a habit was completed", () => {
    // Completion without a denominator must not read as perfection.
    const habits = [mondayOnly("a")];
    expect(isPerfectDay(habits, TUE, ids("a"))).toBe(false);
  });

  it("ignores completions of habits that no longer exist", () => {
    const habits = [daily("a")];
    expect(isPerfectDay(habits, MON, ids("a", "deleted-habit"))).toBe(true);
  });
});

describe("computeDayReward", () => {
  it("pays per completion when the day is not perfect", () => {
    const r = computeDayReward(3, false);
    expect(r.xp).toBe(3 * XP_PER_COMPLETION);
    expect(r.diamonds).toBe(3 * DIAMONDS_PER_COMPLETION);
    expect(r.perfectBonusXp).toBe(0);
  });

  it("adds the bonus on top of the per-completion pay", () => {
    const r = computeDayReward(4, true);
    expect(r.xp).toBe(4 * XP_PER_COMPLETION + XP_PERFECT_DAY_BONUS);
    expect(r.perfectBonusXp).toBe(XP_PERFECT_DAY_BONUS);
  });

  it("pays the bonus even for a single-habit perfect day", () => {
    const r = computeDayReward(1, true);
    expect(r.xp).toBe(XP_PER_COMPLETION + XP_PERFECT_DAY_BONUS);
  });

  it("never returns a negative or fractional amount", () => {
    expect(computeDayReward(0, false).xp).toBe(0);
    expect(computeDayReward(-5, false).xp).toBe(0);
    expect(computeDayReward(2.7, false).xp).toBe(2 * XP_PER_COMPLETION);
    // A "perfect" day with zero completions cannot occur via isPerfectDay, but
    // the arithmetic must still be total.
    expect(computeDayReward(0, true).xp).toBe(XP_PERFECT_DAY_BONUS);
  });
});

describe("advanceStreakForSettlement", () => {
  // ADR 0001 section 5: never advance by the number of days settled.
  it("does not advance on an empty settlement", () => {
    expect(advanceStreakForSettlement([], 12)).toBe(12);
  });

  it("advances by the run length for consecutive days", () => {
    expect(advanceStreakForSettlement([MON, TUE, WED], 5)).toBe(8);
  });

  it("counts only the longest run when days are not consecutive", () => {
    // TUE is missing, so this splits into a run of 1 (MON) and a run of 2
    // (WED, THU). The longest wins: +2, not +3.
    expect(advanceStreakForSettlement([MON, WED, THU], 5)).toBe(7);
  });

  it("does not add skipped days", () => {
    // The old claim did `streak + unclaimedDays.length`, which turned a week of
    // absence into +7 the moment the user opened the app. Seven scattered days
    // with gaps must not move the streak by seven.
    const aWeekOff = [
      "2026-01-05",
      "2026-01-08",
      "2026-01-11",
      "2026-01-14",
      "2026-01-17",
      "2026-01-20",
      "2026-01-23",
    ];
    expect(advanceStreakForSettlement(aWeekOff, 30)).toBe(31);
  });

  it("counts a full unbroken week as a run of seven", () => {
    // The counterpart to the test above: consecutive days DO all count.
    const aWeekOn = [
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
      "2026-01-08",
      "2026-01-09",
      "2026-01-10",
      "2026-01-11",
    ];
    expect(advanceStreakForSettlement(aWeekOn, 30)).toBe(37);
  });

  it("handles a single settled day", () => {
    expect(advanceStreakForSettlement([MON], 0)).toBe(1);
  });

  it("is order-independent", () => {
    expect(advanceStreakForSettlement([WED, MON, TUE], 5)).toBe(8);
  });

  it("does not double-count a repeated date", () => {
    expect(advanceStreakForSettlement([MON, MON], 5)).toBe(6);
  });

  it("clamps a corrupt negative streak to zero before advancing", () => {
    // -3 clamps to 0, then the single settled day advances it to 1.
    expect(advanceStreakForSettlement([MON], -3)).toBe(1);
  });

  it("crosses a month boundary correctly", () => {
    expect(advanceStreakForSettlement(["2026-01-31", "2026-02-01"], 5)).toBe(7);
  });
});

describe("reward rate constants", () => {
  // These are unapproved economy parameters (ADR 0001 section 7). The tests pin
  // the current values so a change is a deliberate edit rather than a drift, and
  // so the derivation between them stays visible.
  it("pins the current rates", () => {
    expect(XP_PER_COMPLETION).toBe(15);
    expect(DIAMONDS_PER_COMPLETION).toBe(1);
    expect(XP_PERFECT_DAY_BONUS).toBe(50);
    expect(XP_CREATION_XP).toBe(30);
    expect(XP_CREATION_DIAMONDS).toBe(5);
    expect(XP_PER_BLOCK_COMPLETED).toBe(10);
    // ECON-3: the journey screen pays more than the planner for the same block.
    expect(XP_PER_BLOCK_COMPLETED_JOURNEY).toBe(25);
  });
});