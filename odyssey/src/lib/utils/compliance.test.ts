import { describe, it, expect } from "vitest";
import { FULL_DAY_HOURS } from "./day-status";
import {
  buildDaysDoneMap,
  countDaysDoneForHabit,
  countScheduleCompliedDays,
  emergencyMinimum,
  isScheduleCompliedDay,
} from "./compliance";
import type { Habit, ScheduleBlock } from "@/lib/db";

const USER = "u1";

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    userId: USER,
    name: "Read",
    icon: "📖",
    category: "Craft & Skill",
    frequency: "daily",
    // Every day of the week by default, so a scheduling test must opt into a
    // narrower `targetDays`.
    targetDays: [1, 2, 3, 4, 5, 6, 7],
    currentStreak: 0,
    longestStreak: 0,
    totalCompletions: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

/** Minimal block; `evaluateDayCompletion` only reads `date` and `status`. */
function block(status: ScheduleBlock["status"], date = "2026-10-05", i = 0): ScheduleBlock {
  return {
    id: `${date}-b${i}`,
    userId: USER,
    date,
    startTime: `${String(i % 24).padStart(2, "0")}:00`,
    endTime: `${String((i % 24) + 1).padStart(2, "0")}:00`,
    title: "t",
    category: "work",
    status,
    isCommitted: false,
    createdAt: "2026-10-05T00:00:00.000Z",
  };
}

const fullDay = (status: ScheduleBlock["status"], date = "2026-10-05"): ScheduleBlock[] =>
  Array.from({ length: FULL_DAY_HOURS }, (_, i) => block(status, date, i));

describe("countScheduleCompliedDays — the app-wide counter", () => {
  it("counts nothing with no blocks", () => {
    expect(countScheduleCompliedDays([])).toBe(0);
    expect(isScheduleCompliedDay([])).toBe(false);
    expect(isScheduleCompliedDay(undefined)).toBe(false);
  });

  it("does not count a day that is fully reviewed but under the full-day bar", () => {
    // 17 hours, every one reviewed. The old `fully_completed` status accepted
    // this; the owner's rule does not (ADR 0005).
    const blocks = Array.from({ length: FULL_DAY_HOURS - 1 }, (_, i) => block("completed", "2026-10-05", i));
    expect(isScheduleCompliedDay(blocks)).toBe(false);
  });

  it("counts a fully written and fully reviewed day", () => {
    expect(isScheduleCompliedDay(fullDay("completed"))).toBe(true);
    expect(countScheduleCompliedDays(fullDay("completed"))).toBe(1);
  });

  it("counts a missed hour as reviewed", () => {
    // A missed hour is a reviewed hour -- the three-state review model. So a
    // full day that is half missed is still a complied day.
    const blocks = fullDay("completed");
    for (let i = 0; i < 9; i++) blocks[i] = block("missed", "2026-10-05", i);
    expect(isScheduleCompliedDay(blocks)).toBe(true);
  });

  it("refuses a day with one hour left unreviewed", () => {
    const blocks = fullDay("completed");
    blocks[blocks.length - 1] = block("pending", "2026-10-05", 99);
    expect(isScheduleCompliedDay(blocks)).toBe(false);
  });

  it("groups by date rather than counting every block at once", () => {
    const blocks = [
      ...fullDay("completed", "2026-10-05"),
      ...fullDay("completed", "2026-10-06"),
      // A third day left unreviewed.
      ...fullDay("pending", "2026-10-07"),
    ];
    expect(countScheduleCompliedDays(blocks)).toBe(2);
  });
});

describe("emergencyMinimum — the counted-habit floor", () => {
  it("reads a positive number out of the emergency version", () => {
    expect(emergencyMinimum(habit({ type: "counted", emergencyVersion: " 3 " }))).toBe(3);
  });

  it("is 0 when unset, zero, or not a number", () => {
    expect(emergencyMinimum(habit({ type: "counted" }))).toBe(0);
    expect(emergencyMinimum(habit({ type: "counted", emergencyVersion: "0" }))).toBe(0);
    expect(emergencyMinimum(habit({ type: "counted", emergencyVersion: "-2" }))).toBe(0);
    expect(emergencyMinimum(habit({ type: "counted", emergencyVersion: "nope" }))).toBe(0);
  });

  it("is 0 for a non-counted habit even when the field is set", () => {
    expect(emergencyMinimum(habit({ type: "avoid", emergencyVersion: "1" }))).toBe(0);
    expect(emergencyMinimum(habit({ emergencyVersion: "1" }))).toBe(0);
  });
});

describe("countDaysDoneForHabit — the per-habit counter", () => {
  it("counts a completed scheduled day", () => {
    expect(countDaysDoneForHabit(habit(), { "2026-10-05": true })).toBe(1);
  });

  it("ignores a completion on a day the habit was not scheduled", () => {
    // Monday-only habit, but 2026-10-06 is a Tuesday.
    expect(countDaysDoneForHabit(habit({ targetDays: [1] }), { "2026-10-06": true })).toBe(0);
  });

  it("does not count a counted habit below its target", () => {
    const counted = habit({ type: "counted", targetValue: 20 });
    expect(countDaysDoneForHabit(counted, { "2026-10-05": true }, { "2026-10-05": 3 })).toBe(0);
  });

  it("counts a counted habit at or above its target", () => {
    const counted = habit({ type: "counted", targetValue: 20 });
    expect(countDaysDoneForHabit(counted, { "2026-10-05": true }, { "2026-10-05": 20 })).toBe(1);
  });

  it("counts a counted day that only reached the emergency minimum", () => {
    // Owner rule 2026-10-19: doing only the two-minute version still earns the
    // day. Target 20, emergency floor 1.
    const counted = habit({ type: "counted", targetValue: 20, emergencyVersion: "1" });
    expect(countDaysDoneForHabit(counted, { "2026-10-05": true }, { "2026-10-05": 1 })).toBe(1);
  });

  it("still does not count a counted day below the emergency minimum", () => {
    const counted = habit({ type: "counted", targetValue: 20, emergencyVersion: "5" });
    expect(countDaysDoneForHabit(counted, { "2026-10-05": true }, { "2026-10-05": 4 })).toBe(0);
  });

  it("does not count an emergency day with no logged value", () => {
    // A floor must never invent a day the user never logged.
    const counted = habit({ type: "counted", targetValue: 20, emergencyVersion: "1" });
    expect(countDaysDoneForHabit(counted, { "2026-10-05": false }, {})).toBe(0);
  });

  it("does not count an emergency-minimum day the habit was not scheduled for", () => {
    // 2026-10-06 is a Tuesday; the habit is Monday-only.
    const counted = habit({
      type: "counted",
      targetValue: 20,
      targetDays: [1],
      emergencyVersion: "1",
    });
    expect(countDaysDoneForHabit(counted, { "2026-10-06": true }, { "2026-10-06": 1 })).toBe(0);
  });

  it("ignores an emergency version that is not a positive number", () => {
    // Legacy free text for a counted habit — no floor, so the strict rule holds.
    const counted = habit({ type: "counted", targetValue: 20, emergencyVersion: "Read 1 page" });
    expect(countDaysDoneForHabit(counted, { "2026-10-05": true }, { "2026-10-05": 1 })).toBe(0);
  });

  it("never applies the emergency minimum to a simple habit", () => {
    const simple = habit({ type: "simple", emergencyVersion: "1" });
    expect(countDaysDoneForHabit(simple, { "2026-10-05": false })).toBe(0);
  });

  it("does not count a slip for a quit habit, but does count a clean day", () => {
    const quit = habit({ type: "avoid" });
    const log = { "2026-10-05": false, "2026-10-06": true };
    const values = { "2026-10-05": 1, "2026-10-06": 0 };
    expect(countDaysDoneForHabit(quit, log, values)).toBe(1);
  });

  it("drops a day again when the completion is undone (derived, not incremented)", () => {
    expect(countDaysDoneForHabit(habit(), { "2026-10-05": true })).toBe(1);
    expect(countDaysDoneForHabit(habit(), { "2026-10-05": false })).toBe(0);
  });

  it("counts each day once", () => {
    const map = buildDaysDoneMap(
      [habit()],
      { h1: { "2026-10-05": true, "2026-10-06": true } },
      {}
    );
    expect(map.h1).toBe(2);
  });

  it("has no entry for a log whose habit row is gone", () => {
    expect(buildDaysDoneMap([], { ghost: { "2026-10-05": true } }, {})).toEqual({});
  });

  it("always returns an entry per habit, zero included", () => {
    const map = buildDaysDoneMap(
      [habit({ id: "a" }), habit({ id: "b" })],
      { a: { "2026-10-05": true } },
      {}
    );
    expect(map).toEqual({ a: 1, b: 0 });
  });
});
