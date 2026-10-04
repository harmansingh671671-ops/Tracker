import { describe, it, expect } from "vitest";
import { normalizeCategory, SCHEDULE_CATEGORIES, HABIT_CATEGORIES } from "./db";

/**
 * These two unions used to declare the same category twice in two spellings
 * ('work' AND 'Work'), so `category === 'work'` silently failed for half the
 * data. The normalizer is what makes both spellings usable again without
 * discarding anything a user saved.
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
