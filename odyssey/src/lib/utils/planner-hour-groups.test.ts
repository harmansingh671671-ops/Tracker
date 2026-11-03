import { describe, expect, it } from "vitest";
import type { ScheduleBlock, StoredScheduleCategory } from "@/lib/db";
import {
  groupPlannerHours,
  type PlannerHourSlotLike,
} from "./planner-hour-groups";

const label = (h: number) => `${String(h).padStart(2, "0")}:00`;

const slot = (
  hour: number,
  title: string,
  category: string,
  isCustom = true
): PlannerHourSlotLike => ({
  hour,
  startTime: label(hour),
  endTime: label(hour + 1),
  block: isCustom
    ? ({
        id: `b${hour}`,
        title,
        category,
        startTime: label(hour),
        endTime: label(hour + 1),
        date: "2026-11-03",
      } as ScheduleBlock)
    : null,
  title,
  category: category as StoredScheduleCategory,
  isCustom,
  status: "pending",
});

describe("groupPlannerHours", () => {
  it("keeps different entries in the same category apart", () => {
    // The reported bug: category alone was enough to merge, so unrelated tasks
    // (and a fully planned day) became one card.
    const groups = groupPlannerHours([
      slot(9, "Emails", "work"),
      slot(10, "Writing", "work"),
      slot(11, "Reading", "work"),
    ]);
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.hours)).toEqual([[9], [10], [11]]);
  });

  it("merges adjacent hours of the same entry in the same category", () => {
    const groups = groupPlannerHours([
      slot(9, "Deep work", "work"),
      slot(10, "deep WORK ", "work"),
      slot(11, "Deep work", "work"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      type: "work",
      startHour: 9,
      endHour: 12,
      hours: [9, 10, 11],
    });
  });

  it("does not merge the same entry across different categories", () => {
    const groups = groupPlannerHours([
      slot(9, "Sleep", "sleep"),
      slot(10, "Sleep", "work"),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.type)).toEqual(["sleep", "work"]);
  });

  it("treats category spellings of one family as the same category", () => {
    const groups = groupPlannerHours([
      slot(1, "Sleep", "rest"),
      slot(2, "Sleep", "sleep"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].hours).toEqual([1, 2]);
  });

  it("never merges unwritten hours into anything", () => {
    const groups = groupPlannerHours([
      slot(9, "", "", false),
      slot(10, "", "", false),
      slot(11, "Deep work", "work"),
      slot(12, "", "", false),
    ]);
    expect(groups).toHaveLength(4);
    expect(groups.map((g) => g.isCustom)).toEqual([false, false, true, false]);
  });

  it("does not merge written hours that have no entry text", () => {
    const groups = groupPlannerHours([
      slot(9, "", "work"),
      slot(10, "", "work"),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("breaks a run at a different entry and starts a new group", () => {
    const groups = groupPlannerHours([
      slot(9, "Reading", "work"),
      slot(10, "Reading", "work"),
      slot(11, "Gym", "vitality"),
      slot(12, "Reading", "work"),
    ]);
    expect(groups.map((g) => [g.title, g.hours])).toEqual([
      ["Reading", [9, 10]],
      ["Gym", [11]],
      ["Reading", [12]],
    ]);
  });
});
