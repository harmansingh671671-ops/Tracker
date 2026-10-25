import { describe, expect, it } from "vitest";
import { isFrogBonusWindow, todaysFrogHabit } from "./frog";

/**
 * S21 — who is today's frog, and when does finishing it pay?
 *
 * The frog is the highest-priority habit DUE that day, fixed by the habit list
 * (not by what is already done), so ticking it never makes the frog jump to a
 * different habit. Quit habits are not frogs: their "completion" is a clean day,
 * and paying a bonus for not slipping would reward the wrong thing.
 */

const DAILY = [1, 2, 3, 4, 5, 6, 7];
const WEDNESDAY = [3];

function habit(over: Record<string, unknown> = {}) {
  return {
    id: "h",
    name: "Habit",
    priority: "focus",
    targetDays: DAILY,
    type: "simple",
    ...over,
  };
}

describe("todaysFrogHabit", () => {
  it("picks the highest priority habit due that day", () => {
    const habits = [
      habit({ id: "optional", priority: "optional" }),
      habit({ id: "critical", priority: "critical" }),
      habit({ id: "focus", priority: "focus" }),
    ];
    expect(todaysFrogHabit(habits, "2026-10-24")?.id).toBe("critical");
  });

  it("keeps the stored order when priorities tie", () => {
    expect(todaysFrogHabit([habit({ id: "first" }), habit({ id: "second" })], "2026-10-24")?.id).toBe("first");
  });

  it("ignores habits that are not due that day", () => {
    // 2026-10-24 is a Saturday, so a Wednesday-only habit is not a candidate.
    const habits = [
      habit({ id: "wednesday", priority: "critical", targetDays: WEDNESDAY }),
      habit({ id: "daily", priority: "optional" }),
    ];
    expect(todaysFrogHabit(habits, "2026-10-24")?.id).toBe("daily");
  });

  it("ignores archived habits", () => {
    const habits = [
      habit({ id: "archived", priority: "critical", archivedAt: "2026-10-01T00:00:00.000Z" }),
      habit({ id: "live", priority: "optional" }),
    ];
    expect(todaysFrogHabit(habits, "2026-10-24")?.id).toBe("live");
  });

  it("does not make a quit habit the frog", () => {
    const habits = [
      habit({ id: "quit", priority: "critical", type: "avoid" }),
      habit({ id: "do", priority: "optional" }),
    ];
    expect(todaysFrogHabit(habits, "2026-10-24")?.id).toBe("do");
  });

  it("returns null when nothing is due", () => {
    expect(todaysFrogHabit([habit({ id: "wed", targetDays: WEDNESDAY })], "2026-10-24")).toBeNull();
    expect(todaysFrogHabit([], "2026-10-24")).toBeNull();
  });
});

describe("isFrogBonusWindow", () => {
  it("counts the local morning before 10:00", () => {
    expect(isFrogBonusWindow(new Date(2026, 9, 24, 0, 0))).toBe(true);
    expect(isFrogBonusWindow(new Date(2026, 9, 24, 9, 59))).toBe(true);
  });

  it("closes at exactly 10:00 and stays closed", () => {
    expect(isFrogBonusWindow(new Date(2026, 9, 24, 10, 0))).toBe(false);
    expect(isFrogBonusWindow(new Date(2026, 9, 24, 23, 30))).toBe(false);
  });
});
