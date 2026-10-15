import { describe, it, expect } from "vitest";
import {
  getHabitScheduledDays,
  isHabitScheduledOnDate,
  getHabitColor,
  BOLD_CATEGORY_COLORS,
  BOLD_HABIT_PALETTE,
  habitCategoryLabel,
} from "./habit-colors";
import { HABIT_CATEGORIES, LEGACY_HABIT_CATEGORY_MAP } from "@/lib/db";

describe("getHabitScheduledDays", () => {
  it("prefers explicit targetDays over targetDaysPerWeek", () => {
    // An explicit day list must win, otherwise a habit set to Tue/Thu would
    // silently drift to a weekly-count schedule.
    const days = getHabitScheduledDays({ targetDays: [2, 4], targetDaysPerWeek: 5 });
    expect(days).toEqual([2, 4]);
  });

  it("falls back to every day for 7-per-week", () => {
    expect(getHabitScheduledDays({ targetDaysPerWeek: 7 })).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("maps 5-per-week to the working week", () => {
    expect(getHabitScheduledDays({ targetDaysPerWeek: 5 })).toEqual([1, 2, 3, 4, 5]);
  });

  it("spaces a 3-per-week habit out", () => {
    expect(getHabitScheduledDays({ targetDaysPerWeek: 3 })).toEqual([1, 3, 5]);
  });

  it("returns contiguous early days for other counts in 1..6", () => {
    expect(getHabitScheduledDays({ targetDaysPerWeek: 1 })).toEqual([1]);
    expect(getHabitScheduledDays({ targetDaysPerWeek: 2 })).toEqual([1, 2]);
    expect(getHabitScheduledDays({ targetDaysPerWeek: 6 })).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("defaults to every day when nothing is configured", () => {
    expect(getHabitScheduledDays({})).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("defaults to every day for out-of-range counts", () => {
    expect(getHabitScheduledDays({ targetDaysPerWeek: 0 })).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(getHabitScheduledDays({ targetDaysPerWeek: 10 })).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("ignores an empty targetDays array rather than scheduling nothing", () => {
    // An empty array is "unset", not "never" -- scheduling a daily habit to
    // zero days would silently make it untrackable.
    expect(getHabitScheduledDays({ targetDays: [], targetDaysPerWeek: 3 })).toEqual([1, 3, 5]);
  });
});

describe("isHabitScheduledOnDate", () => {
  const weekdays = { targetDaysPerWeek: 7 };

  it("accepts any valid date for an all-week habit", () => {
    expect(isHabitScheduledOnDate(weekdays, "2026-10-04")).toBe(true); // Sunday
    expect(isHabitScheduledOnDate(weekdays, "2026-10-05")).toBe(true); // Monday
  });

  it("maps Sunday to 7, not 0", () => {
    // JS getDay() is 0=Sunday; the schedule uses 1=Mon..7=Sun. Getting this
    // wrong silently shifts every weekly habit by one day.
    const sundayOnly = { targetDays: [7] };
    expect(isHabitScheduledOnDate(sundayOnly, "2026-10-04")).toBe(true); // Sunday
    expect(isHabitScheduledOnDate(sundayOnly, "2026-10-05")).toBe(false); // Monday
  });

  it("maps Monday to 1", () => {
    const mondayOnly = { targetDays: [1] };
    expect(isHabitScheduledOnDate(mondayOnly, "2026-10-05")).toBe(true);
    expect(isHabitScheduledOnDate(mondayOnly, "2026-10-06")).toBe(false);
  });

  it("checks a mid-week date against a 5-day week", () => {
    const workweek = { targetDaysPerWeek: 5 };
    expect(isHabitScheduledOnDate(workweek, "2026-10-05")).toBe(true); // Monday
    expect(isHabitScheduledOnDate(workweek, "2026-10-09")).toBe(true); // Friday
    expect(isHabitScheduledOnDate(workweek, "2026-10-10")).toBe(false); // Saturday
    expect(isHabitScheduledOnDate(workweek, "2026-10-11")).toBe(false); // Sunday
  });

  it("returns true for a missing date rather than blocking the habit", () => {
    // A bad/missing date must not read as "not scheduled", or the habit would
    // disappear from the UI instead of erroring visibly.
    expect(isHabitScheduledOnDate(weekdays, "")).toBe(true);
  });

  it("covers every day of a known week exactly once", () => {
    const week = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];
    const workweek = { targetDaysPerWeek: 5 };
    expect(week.filter((d) => isHabitScheduledOnDate(workweek, d))).toHaveLength(5);
  });
});


describe("getHabitColor (P0-T3)", () => {
  // The guarantee that matters: moving a habit onto the canonical vocabulary
  // must not repaint it. These are the exact hexes the pre-P0-T3 map assigned
  // to each domain, so a change here is a visible regression for every user.
  const CANONICAL_COLOURS: Record<string, string> = {
    "Vitality & Fitness": "#10B981",
    "Craft & Skill": "#2563EB",
    "Mindful Focus": "#8B5CF6",
    "Renewal & Health": "#F59E0B",
  };

  it("gives each canonical domain its established colour", () => {
    for (const [domain, hex] of Object.entries(CANONICAL_COLOURS)) {
      expect(getHabitColor({ category: domain, name: "Anything" })).toBe(hex);
    }
  });

  it("exposes exactly the four domains, and no more", () => {
    expect(Object.keys(BOLD_CATEGORY_COLORS).sort()).toEqual([...HABIT_CATEGORIES].sort());
  });

  it("keeps a retired category on the colour its domain will become", () => {
    // A habit saved before the migration is repainted only if the old lookup
    // and the new one disagree. They must not.
    for (const [alias, domain] of Object.entries(LEGACY_HABIT_CATEGORY_MAP)) {
      expect(getHabitColor({ category: alias, name: "x" })).toBe(
        BOLD_CATEGORY_COLORS[domain]
      );
    }
  });

  it("ignores casing and padding on a category", () => {
    const expected = BOLD_CATEGORY_COLORS["Mindful Focus"];
    for (const spelling of ["mindful focus", "MINDFUL FOCUS", "  Mindful Focus  "]) {
      expect(getHabitColor({ category: spelling, name: "x" })).toBe(expected);
    }
  });

  it("returns a stable colour for a habit with no recognisable category", () => {
    const a = getHabitColor({ name: "Read" });
    const b = getHabitColor({ name: "Read" });
    expect(a).toBe(b);
    expect(BOLD_HABIT_PALETTE).toContain(a);
  });

  it("falls back rather than throwing on empty or absent input", () => {
    expect(BOLD_HABIT_PALETTE).toContain(getHabitColor({}));
    expect(BOLD_HABIT_PALETTE).toContain(getHabitColor({ category: "", name: "" }));
    expect(BOLD_HABIT_PALETTE).toContain(getHabitColor({ category: "Gardening" }));
  });

  it("does not depend on the discarded legacy index argument", () => {
    const withIndex = getHabitColor({ category: "Craft & Skill", name: "x" }, 7);
    const without = getHabitColor({ category: "Craft & Skill", name: "x" });
    expect(withIndex).toBe(without);
  });
});


describe("habitCategoryLabel (CONS-1)", () => {
  it("shows the category when there is one", () => {
    expect(habitCategoryLabel({ category: "Mindful Focus" })).toBe("Mindful Focus");
  });

  it("says so plainly when there is not", () => {
    // The three surfaces previously each invented a fallback -- "Routine" twice
    // and "General" once -- and neither is a canonical domain. One shared
    // answer removes the third opinion.
    expect(habitCategoryLabel({})).toBe("Uncategorised");
    expect(habitCategoryLabel({ category: "" })).toBe("Uncategorised");
    expect(habitCategoryLabel({ category: "   " })).toBe("Uncategorised");
  });

  it("never returns a label from the retired vocabulary", () => {
    // Health / Mindfulness / Learning / Productivity / Social / Growth were the
    // old schema list. A fallback must not reintroduce one of them.
    const retired = ["Health", "Mindfulness", "Learning", "Productivity", "Social", "Growth", "Routine", "General"];
    for (const category of ["", "  ", "Mindful Focus", ...HABIT_CATEGORIES]) {
      expect(retired).not.toContain(habitCategoryLabel({ category }));
    }
  });

  it("agrees with getHabitColor for every legacy alias", () => {
    // The defect this closes: "General" is in the legacy map (so it painted
    // Craft & Skill blue) while "Routine" was not (so it fell to the name
    // hash). The same missing category therefore produced two different
    // colours on two screens.
    for (const alias of Object.keys(LEGACY_HABIT_CATEGORY_MAP)) {
      const label = habitCategoryLabel({ category: alias });
      expect(HABIT_CATEGORIES).toContain(label);
      expect(getHabitColor({ category: label, name: "x" })).toBe(getHabitColor({ category: alias, name: "x" }));
    }
  });
});
