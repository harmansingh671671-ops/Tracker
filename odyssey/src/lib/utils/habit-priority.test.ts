import { describe, expect, it } from "vitest";
import type { Habit } from "@/lib/db";
import { habitPriorityRank, selectNextUnloggedHabit } from "./habit-priority";

/**
 * S22 -- the planner strip's "Next:" must name the most important habit you
 * have not done, not whichever one happens to be stored first.
 *
 * The predicate is injected so this stays pure and knows nothing about logs;
 * the header already owns "scheduled today && not done".
 */
function habit(id: string, name: string, priority?: Habit["priority"]): Habit {
  return {
    id,
    userId: "u1",
    name,
    icon: "✨",
    category: "Vitality & Fitness",
    period: "morning",
    frequency: "daily",
    currentStreak: 0,
    longestStreak: 0,
    totalCompletions: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    priority,
  } as Habit;
}

const always = () => true;

describe("habitPriorityRank", () => {
  it("ranks critical before focus before optional before none", () => {
    expect(habitPriorityRank(habit("a", "A", "critical"))).toBe(0);
    expect(habitPriorityRank(habit("b", "B", "focus"))).toBe(1);
    expect(habitPriorityRank(habit("c", "C", "optional"))).toBe(2);
    expect(habitPriorityRank(habit("d", "D"))).toBe(3);
  });

  it("treats an unknown stored priority as no priority rather than guessing", () => {
    expect(habitPriorityRank({ priority: "urgent" })).toBe(3);
  });
});

describe("selectNextUnloggedHabit", () => {
  it("picks the critical habit even when it is stored last", () => {
    const picked = selectNextUnloggedHabit(
      [
        habit("opt", "Optional", "optional"),
        habit("crit", "Critical", "critical"),
        habit("focus", "Focus", "focus"),
      ],
      always
    );
    expect(picked?.id).toBe("crit");
  });

  it("skips habits the predicate says are done", () => {
    const picked = selectNextUnloggedHabit(
      [habit("crit", "Critical", "critical"), habit("focus", "Focus", "focus")],
      (h) => h.id !== "crit"
    );
    expect(picked?.id).toBe("focus");
  });

  it("keeps the existing order between equal priorities", () => {
    const picked = selectNextUnloggedHabit(
      [habit("b", "B", "focus"), habit("a", "A", "focus")],
      always
    );
    expect(picked?.id).toBe("b");
  });

  it("returns null when nothing is unlogged", () => {
    expect(selectNextUnloggedHabit([habit("a", "A")], () => false)).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(selectNextUnloggedHabit([], always)).toBeNull();
  });

  it("prefers a habit with any priority over one with none", () => {
    expect(selectNextUnloggedHabit([habit("none", "None"), habit("opt", "Opt", "optional")], always)?.id).toBe(
      "opt"
    );
  });

  it("does not mutate the array", () => {
    const input = [habit("a", "A", "optional"), habit("b", "B", "critical")];
    const before = input.map((h) => h.id);
    selectNextUnloggedHabit(input, always);
    expect(input.map((h) => h.id)).toEqual(before);
  });
});
