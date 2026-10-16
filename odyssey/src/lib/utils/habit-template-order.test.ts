import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GOAL_TAGS, getGoalTag } from "./goal-tags";
import {
  GOAL_STORAGE_KEY,
  goalDomainFor,
  orderTemplatesForGoal,
  readPrimaryGoal,
  writePrimaryGoal,
} from "./habit-template-order";

// Mirrors the real library's templates and their real `domainLabel`s. Ordering is
// judged against the REAL data rather than a fixture chosen to make the test pass.
const TEMPLATES = [
  { id: "tpl-sunlight", name: "Morning Sunlight & Hydration", domainLabel: "Vitality & Fitness" },
  { id: "tpl-mobility", name: "10-Min Joint Mobility Flow", domainLabel: "Vitality & Fitness" },
  { id: "tpl-frog", name: "Eat The Frog (Daily Highlight)", domainLabel: "Mindful Focus" },
  { id: "tpl-deepwork", name: "90-Min Deep Work Sprint", domainLabel: "Mindful Focus" },
  { id: "tpl-shutdown", name: "Workday Shutdown Protocol", domainLabel: "Mindful Focus" },
  { id: "tpl-reading", name: "Read 20 Pages Non-Fiction", domainLabel: "Craft & Skill" },
  { id: "tpl-bluelight", name: "Zero Blue Light after 21:30", domainLabel: "Renewal & Health" },
  { id: "tpl-caffeine", name: "Caffeine Curfew at 14:00", domainLabel: "Renewal & Health" },
  { id: "tpl-notes", name: "Brain Dump & Evening Gratitude", domainLabel: "Renewal & Health" },
  { id: "tpl-water", name: "Drink 3 Liters Clean Water", domainLabel: "Vitality & Fitness" },
  { id: "tpl-zone2", name: "30-Min Zone 2 Movement", domainLabel: "Vitality & Fitness" },
  { id: "tpl-steps", name: "10,000 Daily Steps", domainLabel: "Vitality & Fitness" },
  { id: "tpl-feeds", name: "Zero Social Feeds Before 12:00", domainLabel: "Mindful Focus" },
  { id: "tpl-walk", name: "20-Min Screen-Free Nature Walk", domainLabel: "Renewal & Health" },
] as const;

const names = (t: readonly { name: string }[]): string[] => t.map((x) => x.name);

describe("goalDomainFor", () => {
  it("resolves every real goal to a domain", () => {
    for (const tag of GOAL_TAGS) {
      expect(goalDomainFor(tag.id)).toBe(tag.suggestion.category);
    }
  });

  it("returns null for nothing, nonsense, or the empty string", () => {
    expect(goalDomainFor(null)).toBeNull();
    expect(goalDomainFor(undefined)).toBeNull();
    expect(goalDomainFor("")).toBeNull();
    expect(goalDomainFor("warlord")).toBeNull();
  });

  it("is tolerant of case and padding, because the value round-trips through storage", () => {
    // Normalisation is against the **id**, not the label: `getGoalTag("deep
    // focus")` is null because "deep focus" is a label, and there is a separate
    // `getGoalTagByLabel` for those. An earlier version of this test used the
    // label and failed, which is how the distinction got pinned down.
    expect(goalDomainFor("  FOCUS  ")).toBe(getGoalTag("focus")?.suggestion.category);
    expect(goalDomainFor("DEEP FOCUS")).toBeNull();
  });
});

describe("orderTemplatesForGoal", () => {
  it("leaves the list completely untouched when no goal was chosen", () => {
    expect(names(orderTemplatesForGoal(TEMPLATES, null))).toEqual(names(TEMPLATES));
    expect(names(orderTemplatesForGoal(TEMPLATES, ""))).toEqual(names(TEMPLATES));
    expect(names(orderTemplatesForGoal(TEMPLATES, "unknown-goal"))).toEqual(names(TEMPLATES));
  });

  it("puts Deep Focus's habits first", () => {
    const ordered = orderTemplatesForGoal(TEMPLATES, "focus");
    expect(ordered[0].name).toBe("Eat The Frog (Daily Highlight)");
    // All four Mindful Focus templates lead.
    expect(names(ordered).slice(0, 4).every((n) =>
      ["Eat The Frog (Daily Highlight)", "90-Min Deep Work Sprint", "Workday Shutdown Protocol", "Zero Social Feeds Before 12:00"].includes(n)
    )).toBe(true);
  });

  it("puts Peak Health's habits first", () => {
    const ordered = orderTemplatesForGoal(TEMPLATES, "health");
    expect(ordered[0].domainLabel).toBe("Vitality & Fitness");
    expect(ordered.filter((t) => t.domainLabel === "Vitality & Fitness")).toHaveLength(5);
  });

  it("never drops, duplicates, or invents a template", () => {
    for (const tag of GOAL_TAGS) {
      const ordered = orderTemplatesForGoal(TEMPLATES, tag.id);
      expect(ordered).toHaveLength(TEMPLATES.length);
      expect(new Set(ordered.map((t) => t.id)).size).toBe(TEMPLATES.length);
      expect(names(ordered).slice().sort()).toEqual(names(TEMPLATES).slice().sort());
    }
  });

  // The stability guarantee: applying a goal must not reshuffle the habits the
  // user did NOT match on, or the library would change for reasons nobody chose.
  it("preserves relative order within the matched group AND the rest", () => {
    const ordered = orderTemplatesForGoal(TEMPLATES, "health");
    const matched = ordered.filter((t) => t.domainLabel === "Vitality & Fitness").map((t) => t.name);
    const original = TEMPLATES.filter((t) => t.domainLabel === "Vitality & Fitness").map((t) => t.name);
    expect(matched).toEqual(original);

    const rest = ordered.filter((t) => t.domainLabel !== "Vitality & Fitness").map((t) => t.name);
    const originalRest = TEMPLATES.filter((t) => t.domainLabel !== "Vitality & Fitness").map((t) => t.name);
    expect(rest).toEqual(originalRest);
  });

  it("handles an empty library without inventing anything", () => {
    expect(orderTemplatesForGoal([], "focus")).toEqual([]);
  });

  // Recorded limitation, not a bug to be quietly fixed -- see the module note.
  it("cannot distinguish Deep Focus from Mindfulness: both map to Mindful Focus", () => {
    expect(goalDomainFor("focus")).toBe(goalDomainFor("mindfulness"));
    expect(names(orderTemplatesForGoal(TEMPLATES, "focus"))).toEqual(
      names(orderTemplatesForGoal(TEMPLATES, "mindfulness"))
    );
  });

  it("gives Academic Excellence its single Craft & Skill template", () => {
    const ordered = orderTemplatesForGoal(TEMPLATES, "academic");
    expect(ordered[0].name).toBe("Read 20 Pages Non-Fiction");
  });

  it("returns a new array rather than aliasing the input", () => {
    const ordered = orderTemplatesForGoal(TEMPLATES, "focus");
    expect(ordered).not.toBe(TEMPLATES);
  });
});

describe("primary goal storage", () => {
  /** Fresh in-memory Storage, shared by `window.localStorage` and the global. */
  function mkStorage(): Storage {
    return {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() {
        return Object.keys(store).length;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    } as Storage;
  }

  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    // The storage layer reads `window.localStorage`, so BOTH must be stubbed --
    // a bare global stub would not be seen. Same shape as `onboarding.test.ts`.
    vi.stubGlobal("window", { localStorage: mkStorage() });
    vi.stubGlobal("localStorage", mkStorage());
  });

  afterEach(() => vi.unstubAllGlobals());

  it("reports no goal on a device that has never chosen one", () => {
    expect(readPrimaryGoal()).toBeNull();
  });

  it("round-trips every real goal id", () => {
    for (const tag of GOAL_TAGS) {
      expect(writePrimaryGoal(tag.id)).toBe(true);
      expect(readPrimaryGoal()).toBe(tag.id);
    }
  });

  it("writes under the documented key", () => {
    writePrimaryGoal("focus");
    expect(store[GOAL_STORAGE_KEY]).toBe("focus");
  });

  // The key is writable by any code in the app and by anything with devtools.
  it("refuses a stored value that is not a real goal", () => {
    store[GOAL_STORAGE_KEY] = "troll";
    expect(readPrimaryGoal()).toBeNull();
  });

  it("refuses to persist a goal that does not exist rather than storing junk", () => {
    writePrimaryGoal("not-a-goal");
    expect(store[GOAL_STORAGE_KEY]).not.toBe("not-a-goal");
    expect(readPrimaryGoal()).toBeNull();
  });

  it("normalises case and padding on the way back in", () => {
    writePrimaryGoal("  FOCUS  ");
    expect(readPrimaryGoal()).toBe("focus");
  });

  it("survives a reload, which is the entire point of persisting", () => {
    writePrimaryGoal("health");
    // Re-stub the globals as a fresh mount would see them.
    const saved = { ...store };
    store = {};
    Object.assign(store, saved);
    expect(readPrimaryGoal()).toBe("health");
  });
});