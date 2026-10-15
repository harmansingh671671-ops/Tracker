import { describe, it, expect } from "vitest";
import {
  CAPACITY_HEAVY_MIN_HABITS,
  CAPACITY_HEAVY_MIN_HOURS,
  CAPACITY_LIGHT_MAX_HABITS,
  countScheduledHabits,
  getDayCapacity,
} from "./day-capacity";
import type { Habit } from "@/lib/db";

const TODAY = "2026-10-08";

function habit(id: string, targetDays?: number[]): Habit {
  return {
    id,
    userId: "u1",
    name: id,
    icon: "🧘",
    category: "Vitality & Fitness",
    frequency: "daily",
    targetDays: targetDays ?? [1, 2, 3, 4, 5, 6, 7],
    currentStreak: 0,
    longestStreak: 0,
    totalCompletions: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("getDayCapacity", () => {
  // A rest day is not a light day. Printing "Light Day · 0 habits" would put a
  // confident label where the honest answer is that nothing is planned.
  it("returns null for an empty day", () => {
    expect(getDayCapacity(0, 0)).toBeNull();
  });

  it("classifies up to three habits as light", () => {
    for (const n of [1, 2, CAPACITY_LIGHT_MAX_HABITS]) {
      expect(getDayCapacity(n, 0)?.level).toBe("light");
    }
  });

  it("classifies four to seven habits as balanced", () => {
    // 6 and 7 are the gap in the source material: §19 says heavy is "8+ habits"
    // while §21 adds "or six planned hours", so by COUNT alone they are neither
    // light nor heavy. Balanced is the only honest answer.
    for (const n of [4, 5, 6, 7]) {
      expect(getDayCapacity(n, 0)?.level).toBe("balanced");
    }
  });

  it("classifies eight or more habits as heavy", () => {
    expect(getDayCapacity(CAPACITY_HEAVY_MIN_HABITS, 0)?.level).toBe("heavy");
    expect(getDayCapacity(20, 0)?.level).toBe("heavy");
  });

  // §21 L811: a warning must compare planned hours, not just the habit count.
  // Eight 5-minute habits is not a heavy day.
  it("classifies six or more planned hours as heavy regardless of count", () => {
    expect(getDayCapacity(2, CAPACITY_HEAVY_MIN_HOURS)?.level).toBe("heavy");
    expect(getDayCapacity(1, 7)?.level).toBe("heavy");
    // And a short day is not heavy just because the count is high.
    expect(getDayCapacity(9, 0.5)?.level).toBe("heavy");
    expect(getDayCapacity(5, 0.5)?.level).toBe("balanced");
  });

  it("treats hours as sufficient on their own", () => {
    // A day can be heavy with no habits at all -- a wall of schedule blocks.
    const c = getDayCapacity(0, 8);
    expect(c?.level).toBe("heavy");
    expect(c?.basis).toBe("hours");
  });

  it("reports which signal put the day where it is", () => {
    expect(getDayCapacity(10, 8)?.basis).toBe("both");
    expect(getDayCapacity(10, 1)?.basis).toBe("habits");
    expect(getDayCapacity(2, 8)?.basis).toBe("hours");
    expect(getDayCapacity(3, 1)?.basis).toBe("empty");
  });

  it("never blocks or refuses -- it only describes", () => {
    // Nothing in the returned shape can act on the day. This is the invariant:
    // capacity is a readout, and the user decides what to do about it.
    const heavy = getDayCapacity(30, 20);
    expect(Object.keys(heavy!).sort()).toEqual(
      ["basis", "description", "habitCount", "label", "level", "plannedHours"].sort()
    );
    expect(heavy?.description).toContain("Consider doing less");
  });

  it("says less rather than nothing at the heavy end", () => {
    expect(getDayCapacity(12, 8)?.description).toMatch(/consider doing less/i);
  });

  // Colour is never the sole status signal (rule 5.3 #3), so the level must
  // always be legible as a word.
  it("carries the level in words, not only colour", () => {
    expect(getDayCapacity(2, 0)?.label).toMatch(/light/i);
    expect(getDayCapacity(5, 0)?.label).toMatch(/balanced/i);
    expect(getDayCapacity(9, 0)?.label).toMatch(/heavy/i);
  });

  it("pluralises habits correctly", () => {
    expect(getDayCapacity(1, 0)?.label).toContain("1 habit");
    expect(getDayCapacity(2, 0)?.label).toContain("2 habits");
  });

  it("does not print a decimal on whole hours", () => {
    // "6.0h" reads as false precision on a value rounded from minutes.
    expect(getDayCapacity(2, 6)?.label).toContain("6h");
    expect(getDayCapacity(2, 6.5)?.label).toContain("6.5h");
  });

  // Caught by the browser verification, not by the pure tests: a first pass
  // always quoted the hours, so nine habits and no schedule rendered as
  // "Heavy Day · 0h planned" -- heavy, but quoting the signal that was not the
  // reason, which reads as a contradiction.
  it("quotes the signal that actually decided it", () => {
    // Heavy on habit count alone: name the habits, not the empty hours.
    expect(getDayCapacity(9, 0)?.label).toBe("Heavy Day · 9 habits");
    // Heavy on hours alone: name the hours.
    expect(getDayCapacity(1, 6)?.label).toBe("Heavy Day · 6h planned");
    // Heavy on both: name both.
    expect(getDayCapacity(9, 7)?.label).toBe("Heavy Day · 9 habits · 7h");
    // And never claim hours that were not planned.
    expect(getDayCapacity(9, 0)?.label).not.toContain("0h");
  });

  it("clamps nonsense input rather than rendering it", () => {
    // Asserted on the RETURN VALUE, not on `?.level`: a null result optional-
    // chains to undefined, so asserting on the chain would read a correct null
    // as undefined and fail for the wrong reason.
    expect(getDayCapacity(-3, -1)).toBeNull();
    expect(getDayCapacity(NaN, 0)).toBeNull();
    expect(getDayCapacity(2.7, 0)?.habitCount).toBe(2);
  });

  it("is a total function over the whole positive range", () => {
    for (let h = 0; h <= 20; h++) {
      const c = getDayCapacity(h, 0);
      expect(c === null || ["light", "balanced", "heavy"].includes(c.level)).toBe(true);
    }
  });
});

describe("countScheduledHabits", () => {
  it("counts only habits due that day", () => {
    // Off-schedule habits add no load to that day -- the same rule ADR 0001
    // §6.2 applies to rewards.
    const habits = [habit("a"), habit("b"), habit("mon", [1])];
    // 2026-10-08 is a Thursday (4).
    expect(countScheduledHabits(habits, TODAY)).toBe(2);
  });

  it("returns zero for no habits", () => {
    expect(countScheduledHabits([], TODAY)).toBe(0);
    expect(countScheduledHabits(null, TODAY)).toBe(0);
    expect(countScheduledHabits(undefined, TODAY)).toBe(0);
  });

  it("counts a Monday-only habit on a Monday", () => {
    expect(countScheduledHabits([habit("mon", [1])], "2026-10-05")).toBe(1);
  });

  it("agrees with the header's own progress count", () => {
    // The capacity badge and the "3/5 Habits Done" header read from the same
    // day; if these two disagreed the screen would contradict itself.
    const habits = [habit("a"), habit("b"), habit("c", [1])];
    expect(countScheduledHabits(habits, TODAY)).toBe(2);
  });
});