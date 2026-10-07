import { describe, it, expect } from "vitest";
import { GOAL_TAGS, getGoalTag, getGoalTagByLabel } from "./goal-tags";

const SPEC_LABELS = [
  "Academic Excellence",
  "Peak Health",
  "Deep Focus",
  "Mindfulness",
  "Digital Detox",
];

describe("GOAL_TAGS", () => {
  it("uses the spec's five labels, verbatim", () => {
    // MASTER_TODO_REVISED L988 / L902.
    expect(GOAL_TAGS.map((t) => t.label)).toEqual(SPEC_LABELS);
  });

  it("has a unique id per tag", () => {
    expect(new Set(GOAL_TAGS.map((t) => t.id)).size).toBe(GOAL_TAGS.length);
  });

  it("gives every tag a suggestion that can actually be saved", () => {
    // A tag with an empty name or category would open a pre-filled form the user
    // has to clear, which is worse than not pre-filling at all.
    for (const tag of GOAL_TAGS) {
      expect(tag.suggestion.name.trim().length).toBeGreaterThan(0);
      expect(tag.suggestion.icon.trim().length).toBeGreaterThan(0);
      expect(tag.suggestion.category.trim().length).toBeGreaterThan(0);
    }
  });

  it("gives every tag a distinct suggestion", () => {
    const names = GOAL_TAGS.map((t) => t.suggestion.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("uses only categories the add-habit form actually offers", () => {
    // CreateHabitModal's DOMAINS. Pre-filling a string the picker has no option
    // for would give a chip that silently does nothing when tapped -- which is
    // exactly the "generic label" this feature exists to avoid. Kept as a literal
    // so a rename in the modal breaks this test rather than the feature.
    const DOMAINS = ["Mindful Focus", "Vitality & Fitness", "Renewal & Health", "Craft & Skill"];
    for (const tag of GOAL_TAGS) {
      expect(DOMAINS).toContain(tag.suggestion.category);
    }
  });

  it("does not silently union in A1's different list", () => {
    // A1 (L199) lists Focus/Health/Sleep/Balance/Digital Detox/Custom. That list
    // disagrees with M16's, and blending them would stop the spec meaning
    // anything. M16's five stand alone.
    expect(GOAL_TAGS.map((t) => t.label)).not.toContain("Sleep");
    expect(GOAL_TAGS.map((t) => t.label)).not.toContain("Balance");
    expect(GOAL_TAGS.map((t) => t.label)).not.toContain("Custom");
  });
});

describe("getGoalTag", () => {
  it("resolves every tag by id", () => {
    for (const tag of GOAL_TAGS) {
      expect(getGoalTag(tag.id)?.label).toBe(tag.label);
    }
  });

  it("is tolerant of case and padding", () => {
    expect(getGoalTag(" ACADEMIC ")?.label).toBe("Academic Excellence");
  });

  it("returns null for an unknown id rather than a wrong tag", () => {
    // Returning the first tag here would pre-fill the wrong habit behind a
    // click the user believes was something else.
    expect(getGoalTag("warlord")).toBeNull();
    expect(getGoalTag("")).toBeNull();
    expect(getGoalTag(null)).toBeNull();
    expect(getGoalTag(undefined)).toBeNull();
  });
});

describe("getGoalTagByLabel", () => {
  it("resolves each spec label back to its tag", () => {
    for (const label of SPEC_LABELS) {
      expect(getGoalTagByLabel(label)).not.toBeNull();
    }
  });

  it("is case-insensitive and tolerant of padding", () => {
    expect(getGoalTagByLabel("peak health")?.id).toBe("health");
    expect(getGoalTagByLabel("  Digital Detox ")?.id).toBe("detox");
  });

  it("returns null for text that is not one of the five", () => {
    expect(getGoalTagByLabel("Productivity")).toBeNull();
    expect(getGoalTagByLabel("")).toBeNull();
    expect(getGoalTagByLabel(null)).toBeNull();
  });
});