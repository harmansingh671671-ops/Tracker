import { describe, it, expect } from "vitest";
import {
  findMerge,
  findOccupantAtHour,
  hourOfLabel,
  isBlockEntirelyPast,
  rangeEndHour,
  rangeEndMinutes,
  endHourLabel,
  calculateBlockHeight,
  getDurationHours,
  BASE_HOUR_HEIGHT_PX,
} from "./planner-block-time";
import type { ScheduleBlock } from "@/lib/db";

const mk = (
  id: string,
  title: string,
  category: string,
  startTime: string,
  endTime: string
): ScheduleBlock =>
  ({
    id,
    title,
    category,
    startTime,
    endTime,
    date: "2026-11-01",
  }) as ScheduleBlock;

describe("hour arithmetic", () => {
  it("parses hour labels", () => {
    expect(hourOfLabel("09:30")).toBe(9);
    expect(hourOfLabel("garbage")).toBeNull();
  });

  it("reads 24:00 as hour 24 and a wrap end as its far side", () => {
    expect(rangeEndHour("21:00", "24:00")).toBe(24);
    expect(rangeEndHour("23:00", "06:00")).toBe(30);
    expect(rangeEndHour("09:00", "11:00")).toBe(11);
  });

  it("never labels an end below midnight as 24:00", () => {
    expect(endHourLabel(12)).toBe("12:00");
    expect(endHourLabel(24)).toBe("24:00");
  });

  it("reads minute-precise ends and carries midnight wraps", () => {
    expect(rangeEndMinutes("09:30", "11:15")).toBe(675);
    expect(rangeEndMinutes("23:30", "00:15")).toBe(1455);
    expect(rangeEndMinutes("09:00", "24:00")).toBe(1440);
  });
});

describe("findMerge (C2 same-title adjacency)", () => {
  it("merges an adjacent hour that repeats the title, case-insensitive", () => {
    const r = findMerge({
      title: "Writing",
      category: "work",
      startHour: 9,
      endHour: 10,
      candidates: [mk("a", "WRITING ", "work", "10:00", "11:00")],
    });
    expect(r).toEqual({ startHour: 9, endHour: 11, absorbedIds: ["a"] });
  });

  it("merges a whole chain of matching hours, both directions", () => {
    const r = findMerge({
      title: "reading",
      category: "work",
      startHour: 10,
      endHour: 11,
      candidates: [
        mk("a", "Reading", "work", "08:00", "09:00"),
        mk("b", "reading", "work", "09:00", "10:00"),
        mk("c", "READING", "work", "11:00", "13:00"),
      ],
    });
    expect(r).toEqual({ startHour: 8, endHour: 13, absorbedIds: ["b", "c", "a"] });
  });

  it("does not merge a different title", () => {
    const r = findMerge({
      title: "Writing",
      category: "work",
      startHour: 9,
      endHour: 10,
      candidates: [mk("a", "Emails", "work", "10:00", "11:00")],
    });
    expect(r).toBeNull();
  });

  it("does not merge a different category, even with the same title", () => {
    const r = findMerge({
      title: "Reading",
      category: "work",
      startHour: 9,
      endHour: 10,
      candidates: [mk("a", "reading", "vitality", "10:00", "11:00")],
    });
    expect(r).toBeNull();
  });

  it("merges identical text across category spellings of the same family", () => {
    // `rest` and `sleep` are one category on screen; a raw string compare split
    // a night of sleep into separate hours.
    const r = findMerge({
      title: "Sleep",
      category: "sleep",
      startHour: 1,
      endHour: 2,
      candidates: [mk("a", "sleep", "rest", "02:00", "03:00")],
    });
    expect(r).toEqual({ startHour: 1, endHour: 3, absorbedIds: ["a"] });
  });

  it("does not merge an overlapping but non-adjacent hour", () => {
    const r = findMerge({
      title: "Reading",
      category: "work",
      startHour: 9,
      endHour: 11,
      candidates: [mk("a", "Reading", "work", "10:00", "12:00")],
    });
    expect(r).toBeNull();
  });

  it("merges a neighbour ending at midnight", () => {
    const r = findMerge({
      title: "Sleep",
      category: "sleep",
      startHour: 21,
      endHour: 22,
      candidates: [mk("a", "Sleep", "sleep", "22:00", "24:00")],
    });
    expect(r).toEqual({ startHour: 21, endHour: 24, absorbedIds: ["a"] });
  });

  it("ignores over-midnight neighbours", () => {
    const r = findMerge({
      title: "Sleep",
      category: "sleep",
      startHour: 21,
      endHour: 22,
      candidates: [mk("a", "Sleep", "sleep", "05:00", "07:00"), mk("b", "Sleep", "sleep", "23:00", "06:00")],
    });
    // 05:00-07:00 is not adjacent to 21-22 at all; the 23:00-06:00 wrap is excluded
    expect(r).toBeNull();
  });

  it("does not merge on an empty title", () => {
    const r = findMerge({
      title: "",
      category: "work",
      startHour: 9,
      endHour: 10,
      candidates: [mk("a", "", "work", "10:00", "11:00")],
    });
    expect(r).toBeNull();
  });
});

describe("findOccupantAtHour", () => {
  it("finds the block that covers a middle hour of a multi-hour plan", () => {
    const blocks = [mk("a", "Writing", "work", "09:00", "12:00")];
    expect(findOccupantAtHour(blocks, 10)?.id).toBe("a");
    expect(findOccupantAtHour(blocks, 12)).toBeNull();
  });

  it("finds an over-midnight block covering the other side of midnight", () => {
    const blocks = [mk("s", "Sleep", "sleep", "23:00", "06:00")];
    expect(findOccupantAtHour(blocks, 23)?.id).toBe("s");
    expect(findOccupantAtHour(blocks, 2)?.id).toBe("s");
    expect(findOccupantAtHour(blocks, 22)).toBeNull();
  });

  it("skips excluded ids (the mover itself, floating copies)", () => {
    const blocks = [mk("a", "Writing", "work", "09:00", "10:00")];
    expect(findOccupantAtHour(blocks, 9, new Set(["a"]))).toBeNull();
  });

  it("tolerates rows with unparseable times", () => {
    const blocks = [mk("a", "?", "work", "??", "??")];
    expect(findOccupantAtHour(blocks, 9)).toBeNull();
  });
});

describe("isBlockEntirelyPast", () => {
  const base = {
    selectedDate: "2026-11-04",
    todayDate: "2026-11-04",
    nowMinutes: 11 * 60 + 30,
  };

  it("allows a block only after its end, not merely after its start", () => {
    expect(
      isBlockEntirelyPast({ ...base, startTime: "09:00", endTime: "10:00" })
    ).toBe(true);
    expect(
      isBlockEntirelyPast({ ...base, startTime: "09:00", endTime: "12:00" })
    ).toBe(false);
    expect(
      isBlockEntirelyPast({ ...base, nowMinutes: 10 * 60, startTime: "09:00", endTime: "10:00" })
    ).toBe(true);
  });

  it("allows all blocks on a previous date and none on a future date", () => {
    expect(
      isBlockEntirelyPast({
        ...base,
        selectedDate: "2026-11-03",
        startTime: "23:00",
        endTime: "24:00",
      })
    ).toBe(true);
    expect(
      isBlockEntirelyPast({
        ...base,
        selectedDate: "2026-11-05",
        startTime: "09:00",
        endTime: "10:00",
      })
    ).toBe(false);
  });

  it("keeps an overnight block disabled until the following day", () => {
    expect(
      isBlockEntirelyPast({ ...base, startTime: "23:00", endTime: "06:00" })
    ).toBe(false);
  });
});

describe("calculateBlockHeight (logarithmic saturation)", () => {
  // New formula: h(t) = 9.92326552 × ln(t + 10.5632098) + 17.76153124
  // Input is in minutes. Anchors: t=5→45px, t=60→60px, t=1440→90px

  it("at t=5 min returns 45px (minimum floor)", () => {
    expect(calculateBlockHeight(5)).toBeCloseTo(45.0, 1);
  });

  it("at t=60 min returns 60px (baseline 100%)", () => {
    expect(calculateBlockHeight(60)).toBeCloseTo(60.0, 1);
  });

  it("at t=1440 min (24h) returns 90px (150% cap)", () => {
    expect(calculateBlockHeight(1440)).toBeCloseTo(90.0, 1);
    // Anything beyond 24h stays at cap
    expect(calculateBlockHeight(2880)).toBeCloseTo(90.0, 1);
  });

  it("falls back to 45px for inputs below 5 minutes", () => {
    expect(calculateBlockHeight(0)).toBe(45);
    expect(calculateBlockHeight(-10)).toBe(45);
    expect(calculateBlockHeight(NaN)).toBe(45);
  });

  it("is monotonically increasing in the valid range", () => {
    const vals = [5, 15, 30, 60, 120, 240, 480, 720, 1440].map(calculateBlockHeight);
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThan(vals[i - 1]);
    }
  });

  it("satisfies diminishing returns: (h(60)-h(5)) > (h(120)-h(65))", () => {
    const low  = calculateBlockHeight(60) - calculateBlockHeight(5);
    const high = calculateBlockHeight(120) - calculateBlockHeight(65);
    expect(low).toBeGreaterThan(high);
  });
});

describe("getDurationHours", () => {
  it("returns 1 for a 1-hour block", () => {
    expect(getDurationHours("09:00", "10:00")).toBe(1);
  });

  it("returns the correct duration for a multi-hour block", () => {
    expect(getDurationHours("09:00", "12:00")).toBe(3);
    expect(getDurationHours("09:00", "24:00")).toBe(15);
    expect(getDurationHours("09:30", "11:15")).toBe(1.75);
  });

  it("returns 1 for unparseable times", () => {
    expect(getDurationHours("??", "??")).toBe(1);
  });
});
