import { describe, expect, it } from "vitest";
import { getWeekComparison, type WeekHabit } from "./weekly-completion";

/**
 * S23 — this week against last week, day for day.
 *
 * The comparison is about HABIT COMPLETION, not the stats page's "Days Done"
 * (which counts schedule blocks that were written and reviewed). A Wednesday
 * compares Monday..Wednesday with the same three days last week, so a mid-week
 * look is a real answer instead of "not enough data yet".
 *
 * No card when either week has nothing to count: a percentage against an empty
 * week is noise, not a comparison.
 */

const DAILY = [1, 2, 3, 4, 5, 6, 7];
const WEDNESDAY = [3];

function habit(over: Partial<WeekHabit> = {}): WeekHabit {
  return {
    id: "h",
    targetDays: DAILY,
    type: "simple",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function log(habitId: string, date: string, over: Record<string, unknown> = {}) {
  return { habitId, date, completed: true, ...over };
}

describe("getWeekComparison — ranges", () => {
  it("starts weeks on Monday and compares the same weekdays last week", () => {
    // 2026-10-21 is a Wednesday.
    const withData = getWeekComparison(
      [habit()],
      [log("h", "2026-10-19"), log("h", "2026-10-12")],
      "2026-10-21"
    );
    expect(withData?.current.start).toBe("2026-10-19");
    expect(withData?.current.end).toBe("2026-10-21");
    expect(withData?.previous.start).toBe("2026-10-12");
    expect(withData?.previous.end).toBe("2026-10-14");
  });

  it("keeps Sunday in the week that began the Monday before", () => {
    const result = getWeekComparison(
      [habit()],
      [log("h", "2026-10-19"), log("h", "2026-10-12")],
      "2026-10-25"
    );
    expect(result?.current.start).toBe("2026-10-19");
    expect(result?.current.end).toBe("2026-10-25");
    expect(result?.previous.start).toBe("2026-10-12");
    expect(result?.previous.end).toBe("2026-10-18");
  });

  it("compares a Monday against the previous Monday alone", () => {
    const result = getWeekComparison(
      [habit()],
      [log("h", "2026-10-19"), log("h", "2026-10-12")],
      "2026-10-19"
    );
    expect(result?.current.end).toBe("2026-10-19");
    expect(result?.previous.start).toBe("2026-10-12");
    expect(result?.previous.end).toBe("2026-10-12");
  });
});

describe("getWeekComparison — counting", () => {
  it("counts due habit-days and completed habit-days for each week", () => {
    const result = getWeekComparison(
      [habit()],
      [
        log("h", "2026-10-19"),
        log("h", "2026-10-20"),
        log("h", "2026-10-12"),
        log("h", "2026-10-13", { completed: false }),
      ],
      "2026-10-21"
    );

    expect(result?.current.due).toBe(3);
    expect(result?.current.completed).toBe(2);
    expect(result?.previous.due).toBe(3);
    expect(result?.previous.completed).toBe(1);
    expect(result?.current.rate).toBeCloseTo(2 / 3, 5);
    expect(result?.previous.rate).toBeCloseTo(1 / 3, 5);
    expect(result?.deltaPp).toBe(33);
  });

  it("only counts a habit on the weekdays it is due", () => {
    const result = getWeekComparison(
      [habit({ id: "daily" }), habit({ id: "wed", targetDays: WEDNESDAY })],
      [
        log("daily", "2026-10-19"),
        log("daily", "2026-10-20"),
        log("wed", "2026-10-21"),
        log("daily", "2026-10-12"),
      ],
      "2026-10-21"
    );

    expect(result?.current.due).toBe(4); // 3 daily + Wednesday
    expect(result?.current.completed).toBe(3);
    expect(result?.previous.due).toBe(4); // 3 daily + last Wednesday
    expect(result?.previous.completed).toBe(1);
    expect(result?.deltaPp).toBe(50);
  });

  it("uses the strict completion rule for counted habits", () => {
    const counted = habit({ id: "counted", type: "counted", targetValue: 3 });
    const result = getWeekComparison(
      [counted],
      [
        log("counted", "2026-10-19", { value: 2 }), // short of target
        log("counted", "2026-10-20", { value: 3 }), // met
        log("counted", "2026-10-21", { value: 9 }), // met
        log("counted", "2026-10-12", { value: 3 }),
      ],
      "2026-10-21"
    );

    expect(result?.current.completed).toBe(2);
    expect(result?.previous.completed).toBe(1);
  });

  it("ignores logs for habits that are not due or no longer exist", () => {
    const result = getWeekComparison(
      [habit({ id: "wed", targetDays: WEDNESDAY })],
      [log("wed", "2026-10-19"), log("ghost", "2026-10-19"), log("wed", "2026-10-14")],
      "2026-10-21"
    );
    // Monday is not a Wednesday: the only counted days are 21 and 14.
    expect(result?.current.due).toBe(1);
    expect(result?.current.completed).toBe(0);
    expect(result?.previous.due).toBe(1);
    expect(result?.previous.completed).toBe(1);
  });
});

describe("getWeekComparison — when there is nothing to compare", () => {
  it("returns null when the habit did not exist last week", () => {
    const createdThisWeek = habit({ createdAt: "2026-10-20T08:00:00.000Z" });
    const result = getWeekComparison(
      [createdThisWeek],
      [log("h", "2026-10-20"), log("h", "2026-10-21")],
      "2026-10-21"
    );
    expect(result).toBeNull();
  });

  it("returns null when nothing is due this week", () => {
    const archivedBefore = habit({ archivedAt: "2026-10-18T12:00:00.000Z" });
    const result = getWeekComparison([archivedBefore], [log("h", "2026-10-12")], "2026-10-21");
    expect(result).toBeNull();
  });

  it("stops counting a habit on the day it was archived", () => {
    const archivedMidWeek = habit({ archivedAt: "2026-10-21T12:00:00.000Z" });
    const result = getWeekComparison(
      [archivedMidWeek],
      [log("h", "2026-10-19"), log("h", "2026-10-20"), log("h", "2026-10-12")],
      "2026-10-21"
    );

    expect(result?.current.due).toBe(2); // Monday and Tuesday only
    expect(result?.current.completed).toBe(2);
    expect(result?.previous.due).toBe(3);
    expect(result?.previous.completed).toBe(1);
    expect(result?.deltaPp).toBe(67);
  });
});
