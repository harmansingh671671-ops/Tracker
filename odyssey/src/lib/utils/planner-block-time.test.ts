import { describe, it, expect } from "vitest";
import {
  findMerge,
  findOccupantAtHour,
  hourOfLabel,
  rangeEndHour,
  endHourLabel,
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
