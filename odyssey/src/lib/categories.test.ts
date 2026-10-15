import { describe, it, expect } from "vitest";
import {
  normalizeCategory,
  normalizeHabitCategory,
  SCHEDULE_CATEGORIES,
  HABIT_CATEGORIES,
  LEGACY_HABIT_CATEGORY_MAP,
} from "./db";

/**
 * P0-T3 split these in two. They used to be one function that consulted the
 * schedule list before the habit list, which was silently wrong once habits
 * moved to the four domains: 'sleep' and 'health' exist in BOTH vocabularies,
 * so a *habit* saved as "sleep" resolved to the schedule's "Sleep" and never
 * reached a domain at all.
 */
describe("category normalisation", () => {
  it("maps every lowercase schedule spelling onto Title Case", () => {
    expect(normalizeCategory("work")).toBe("Work");
    expect(normalizeCategory("sleep")).toBe("Sleep");
    expect(normalizeCategory("habits")).toBe("Habits");
    expect(normalizeCategory("buffer")).toBe("Buffer");
  });

  it("is case-insensitive in both directions", () => {
    expect(normalizeCategory("WORK")).toBe("Work");
    expect(normalizeCategory("Work")).toBe("Work");
    expect(normalizeCategory("wOrK")).toBe("Work");
  });

  it("tolerates surrounding whitespace", () => {
    expect(normalizeCategory("  study  ")).toBe("Study");
  });

  it("leaves already-canonical values untouched", () => {
    for (const c of SCHEDULE_CATEGORIES) {
      expect(normalizeCategory(c)).toBe(c);
    }
    for (const c of HABIT_CATEGORIES) {
      expect(normalizeCategory(c)).toBe(c);
    }
  });

  it("preserves an unknown category rather than dropping user data", () => {
    expect(normalizeCategory("Gardening")).toBe("Gardening");
    expect(normalizeCategory("something-new")).toBe("something-new");
  });

  it("handles empty and null-ish input without throwing", () => {
    expect(normalizeCategory("")).toBe("");
    expect(normalizeCategory(undefined as unknown as string)).toBeUndefined();
  });

  it("has no category spelled two ways within either list", () => {
    // Health is intentionally in BOTH lists -- a schedule block and a habit can
    // both be "Health". What must never happen is the same idea appearing twice
    // in one list under different casing, which is the bug this replaced.
    for (const list of [SCHEDULE_CATEGORIES, HABIT_CATEGORIES]) {
      const lowered = list.map((c) => c.toLowerCase());
      expect(new Set(lowered).size).toBe(lowered.length);
    }
  });

  it("resolves an ambiguous word to the same value from either list", () => {
    // 'health' must not depend on which list is consulted first.
    expect(normalizeCategory("health")).toBe("Health");
    expect(normalizeCategory("HEALTH")).toBe("Health");
  });
});

describe("habit category normalisation (P0-T3)", () => {
  it("leaves each canonical domain untouched", () => {
    for (const c of HABIT_CATEGORIES) {
      expect(normalizeHabitCategory(c)).toBe(c);
    }
  });

  it("maps the six retired categories onto a domain", () => {
    // The old schema list. None of these has a live write path, so this is a
    // safety net for rows written by an older build.
    expect(normalizeHabitCategory("Health")).toBe("Vitality & Fitness");
    expect(normalizeHabitCategory("Mindfulness")).toBe("Mindful Focus");
    expect(normalizeHabitCategory("Learning")).toBe("Craft & Skill");
  });

  it("maps case-insensitively and tolerates whitespace", () => {
    expect(normalizeHabitCategory("HEALTH")).toBe("Vitality & Fitness");
    expect(normalizeHabitCategory("  health  ")).toBe("Vitality & Fitness");
    expect(normalizeHabitCategory("mindful focus")).toBe("Mindful Focus");
  });

  it("resolves 'sleep' and 'health' to a HABIT domain, not the schedule value", () => {
    // This is the collision that made the split necessary. The schedule list
    // also contains Sleep and Health, and it used to be consulted first.
    expect(normalizeHabitCategory("sleep")).toBe("Renewal & Health");
    expect(normalizeHabitCategory("health")).toBe("Vitality & Fitness");
    expect(normalizeHabitCategory("Sleep")).toBe("Renewal & Health");
    expect(normalizeHabitCategory("Health")).toBe("Vitality & Fitness");
  });

  it("every legacy alias maps to a canonical domain", () => {
    for (const [alias, target] of Object.entries(LEGACY_HABIT_CATEGORY_MAP)) {
      expect(HABIT_CATEGORIES).toContain(target);
      expect(normalizeHabitCategory(alias)).toBe(target);
      expect(normalizeHabitCategory(alias.toUpperCase())).toBe(target);
    }
  });

  it("preserves a genuinely unknown label rather than dropping it", () => {
    // A user's own category text is their data.
    expect(normalizeHabitCategory("Gardening")).toBe("Gardening");
    expect(normalizeHabitCategory("")).toBe("");
    expect(normalizeHabitCategory(undefined as unknown as string)).toBeUndefined();
  });

  it("is idempotent, so the Dexie upgrade can be re-run safely", () => {
    for (const alias of Object.keys(LEGACY_HABIT_CATEGORY_MAP)) {
      const once = normalizeHabitCategory(alias);
      expect(normalizeHabitCategory(once)).toBe(once);
    }
  });
});
