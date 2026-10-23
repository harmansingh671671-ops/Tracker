import { describe, expect, it } from "vitest";
import type { ScheduleBlock } from "@/lib/db";
import { FULL_DAY_HOURS } from "./day-status";
import { evaluateDayLoad } from "./day-load";

/**
 * S18 — the day "plate" warning: the schedule must say it out loud when the
 * day's planned hours exceed the waking window. The counting MUST share the
 * clock-hour grid with day-status (BUG-17's lesson: two day-total definitions
 * is exactly how the "24/33h" bug was born), so plannedHours here equals the
 * stats popup's planned number by construction.
 */

function block(partial: Partial<ScheduleBlock> & Pick<ScheduleBlock, "startTime" | "endTime">): ScheduleBlock {
  return {
    id: "b_" + Math.random().toString(36).slice(2),
    userId: "u_test",
    date: "2026-10-23",
    title: partial.title ?? "Block",
    category: partial.category ?? "work",
    status: partial.status ?? "pending",
    isCommitted: false,
    createdAt: "2026-10-23T00:00:00.000Z",
    ...partial,
  };
}

describe("evaluateDayLoad", () => {
  it("empty day: 0 planned, the standard waking window (fallback = FULL_DAY_HOURS), nothing over", () => {
    const s = evaluateDayLoad([]);
    expect(s.plannedHours).toBe(0);
    expect(s.wakingHours).toBe(FULL_DAY_HOURS);
    expect(s.isOverloaded).toBe(false);
    expect(s.overloadHours).toBe(0);
  });

  it("undefined blocks behave like an empty day", () => {
    // @ts-expect-error — the schedule page may pass an undefined day cache
    const s = evaluateDayLoad(undefined);
    expect(s.plannedHours).toBe(0);
    expect(s.wakingHours).toBe(FULL_DAY_HOURS);
    expect(s.isOverloaded).toBe(false);
  });

  it("a sleep-less day falls back to the standard waking window (18h) — a normal 10-hour plan is fine", () => {
    const s = evaluateDayLoad([
      block({ startTime: "09:00", endTime: "17:00" }),
      block({ startTime: "19:00", endTime: "21:00" }),
    ]);
    expect(s.plannedHours).toBe(10);
    expect(s.wakingHours).toBe(18);
    expect(s.isOverloaded).toBe(false);
  });

  it("sleep carves the waking window: 00:00–08:00 sleep leaves 16 waking hours", () => {
    const s = evaluateDayLoad([
      block({ startTime: "00:00", endTime: "08:00", category: "sleep" }),
    ]);
    expect(s.plannedHours).toBe(8); // sleep IS planned
    expect(s.wakingHours).toBe(16);
    expect(s.isOverloaded).toBe(false);
  });

  it("night hours count as planned: a 7h night + blocks filling the whole waking day = 18h in 17h waking", () => {
    const blocks = [
      block({ startTime: "00:00", endTime: "07:00", category: "sleep" }),
      block({ startTime: "07:00", endTime: "18:00", category: "work" }),
    ];
    const s = evaluateDayLoad(blocks);
    expect(s.plannedHours).toBe(18); // 7 sleep hours + 11 waking hours, all planned
    expect(s.wakingHours).toBe(17); // 24 − 7 asleep hours
    expect(s.isOverloaded).toBe(true);
    expect(s.overloadHours).toBe(1);
  });

  it("overlapping duplicates count once on the clock (BUG-17's grid), not per record", () => {
    const s = evaluateDayLoad([
      block({ startTime: "09:00", endTime: "10:00" }),
      block({ startTime: "09:00", endTime: "10:00", title: "Duplicate autofill" }),
    ]);
    expect(s.plannedHours).toBe(1);
    expect(s.isOverloaded).toBe(false);
  });

  it("a legacy capitalized 'Sleep' category still carves the waking window", () => {
    const s = evaluateDayLoad([
      block({ startTime: "06:00", endTime: "18:00", category: "Sleep" as never }),
    ]);
    expect(s.plannedHours).toBe(12);
    expect(s.wakingHours).toBe(12);
    expect(s.isOverloaded).toBe(false);
  });

  it("a backup-restored 'Sleep ' (trailing space, outside the union) still carves the waking window", () => {
    // every other schedule read path normalizes before matching; the carve
    // must not silently un-wake a day whose sleep category came from a backup
    const s = evaluateDayLoad([
      block({ startTime: "06:00", endTime: "18:00", category: "Sleep " as never }),
    ]);
    expect(s.plannedHours).toBe(12);
    expect(s.wakingHours).toBe(12);
    expect(s.isOverloaded).toBe(false);
  });

  it("end <= start parses as a one-hour block (the hour-23 writer's shape)", () => {
    const s = evaluateDayLoad([
      block({ startTime: "23:00", endTime: "00:00" }),
    ]);
    expect(s.plannedHours).toBe(1);
  });

  it("midnight-independent: overload is planned minus waking, exactly", () => {
    const s = evaluateDayLoad([
      block({ startTime: "00:00", endTime: "06:00", category: "sleep" }), // waking 18
      block({ startTime: "00:00", endTime: "12:00" }),
      block({ startTime: "12:00", endTime: "18:00" }),
      block({ startTime: "18:00", endTime: "22:00" }),
    ]);
    // planned = 6 (sleep) + 6 + 6 + 4 = 22; waking = 18
    expect(s.plannedHours).toBe(22);
    expect(s.wakingHours).toBe(18);
    expect(s.isOverloaded).toBe(true);
    expect(s.overloadHours).toBe(4);
  });
});
