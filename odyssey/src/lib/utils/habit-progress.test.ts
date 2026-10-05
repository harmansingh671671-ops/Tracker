import { describe, it, expect } from "vitest";
import {
  getDayHabitProgress,
  isHabitCompletedOnDate,
} from "./habit-progress";
import type { Habit } from "@/lib/db";

/** Minimal valid habit; the calculation only reads id + schedule fields. */
const habit = (id: string, targetDays?: number[]): Habit =>
  ({
    id,
    targetDays,
  }) as unknown as Habit;

const TODAY = "2026-10-05"; // a Monday
const PAST = "2026-10-04"; // a Sunday
const history = (...ids: string[]) =>
  Object.fromEntries(ids.map((id) => [id, { [PAST]: true }]));

/** Builds a today-log map with the given habits marked complete. */
const doneToday = (...ids: string[]) =>
  Object.fromEntries(
    ids.map((id) => [id, { id: `l${id}`, completed: true } as never])
  );

describe("getDayHabitProgress - fraction and percentage", () => {
  it("reports the fraction against the scheduled count", () => {
    const habits = [
      habit("a", [1, 2, 3, 4, 5]),
      habit("b", [1, 2, 3, 4, 5]),
      habit("c", [1, 2, 3, 4, 5]),
      habit("d", [1, 2, 3, 4, 5]),
      habit("e", [1, 2, 3, 4, 5]),
    ];
    const p = getDayHabitProgress(habits, TODAY, TODAY, doneToday("a", "b", "c"), {});

    expect(p.scheduledCount).toBe(5);
    expect(p.completedCount).toBe(3);
    expect(p.fraction).toBe("3/5");
    expect(p.percent).toBe(60);
    expect(p.isAllCompleted).toBe(false);
  });

  it("never produces NaN on a day with nothing scheduled", () => {
    // Habits scheduled only on Friday; TODAY is a Monday.
    const habits = [habit("a", [5]), habit("b", [5])];
    const p = getDayHabitProgress(habits, TODAY, TODAY, {}, {});

    expect(p.scheduledCount).toBe(0);
    expect(p.denominator).toBe(0);
    expect(p.hasHabits).toBe(false);
    expect(p.percent).toBeNull();
    expect(Number.isNaN(p.percent as unknown as number)).toBe(false);
    expect(p.fraction).toBe("0/0");
    expect(p.isAllCompleted).toBe(false);
  });

  it("handles an empty habit list without dividing by zero", () => {
    for (const input of [[], null, undefined]) {
      const p = getDayHabitProgress(input, TODAY, TODAY);
      expect(p.percent).toBeNull();
      expect(p.hasHabits).toBe(false);
      expect(p.fraction).toBe("0/0");
    }
  });

  it("counts an unscheduled completion on a rest day rather than hiding it", () => {
    // Nothing scheduled today, but the habit was completed anyway.
    const habits = [habit("a", [5])];
    const p = getDayHabitProgress(
      habits,
      TODAY,
      TODAY,
      doneToday("a"),
      {}
    );

    expect(p.scheduledCount).toBe(0);
    expect(p.completedCount).toBe(1);
    // Denominator falls back to the eligible count so the credit is visible.
    expect(p.denominator).toBe(1);
    expect(p.fraction).toBe("1/1");
    expect(p.percent).toBe(100);
  });

  it("caps at 100% when unscheduled completions push the raw ratio past 1", () => {
    const habits = [habit("a", [5]), habit("b", [5]), habit("c", [1])];
    const p = getDayHabitProgress(
      habits,
      TODAY,
      TODAY,
      doneToday("a", "b"),
      { c: { [TODAY]: true } }
    );

    expect(p.scheduledCount).toBe(1);
    expect(p.completedCount).toBe(3);
    expect(p.percent).toBe(100);
  });

  it("flags a day complete only when every scheduled habit is done", () => {
    const habits = [habit("a", [1]), habit("b", [1])];

    const partial = getDayHabitProgress(habits, TODAY, TODAY, doneToday("a"));
    expect(partial.isAllCompleted).toBe(false);

    const full = getDayHabitProgress(habits, TODAY, TODAY, doneToday("a", "b"));
    expect(full.isAllCompleted).toBe(true);
    expect(full.percent).toBe(100);
  });
});

describe("isHabitCompletedOnDate - store selection", () => {
  const h = habit("a");

  it("reads today from the today log", () => {
    expect(
      isHabitCompletedOnDate(h, TODAY, TODAY, doneToday("a"), {})
    ).toBe(true);
  });

  it("reads a past day from history", () => {
    expect(
      isHabitCompletedOnDate(h, PAST, TODAY, {}, { a: { [PAST]: true } })
    ).toBe(true);
  });

  it("falls back to history when today's log is absent", () => {
    expect(
      isHabitCompletedOnDate(h, TODAY, TODAY, {}, { a: { [TODAY]: true } })
    ).toBe(true);
  });

  it("treats a missing entry as not completed", () => {
    expect(isHabitCompletedOnDate(h, PAST, TODAY, {}, history())).toBe(false);
  });
});