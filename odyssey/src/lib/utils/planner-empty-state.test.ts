import { describe, it, expect } from "vitest";
import { shouldShowPlannerEmptyState } from "./planner-empty-state";

describe("shouldShowPlannerEmptyState", () => {
  it("shows the clean slate once a read resolves to zero blocks", () => {
    expect(shouldShowPlannerEmptyState(false, [])).toBe(true);
  });

  it("does not show it while blocks are still loading, even at zero blocks", () => {
    // The regression that matters: the planner seeds `blocks` as `[]` on first
    // paint for EVERY day, so without the loading guard a full day flashes
    // "Your day is a clean slate" before the read lands.
    expect(shouldShowPlannerEmptyState(true, [])).toBe(false);
  });

  it("does not show it when the day has blocks", () => {
    expect(shouldShowPlannerEmptyState(false, [{ id: "a" }, { id: "b" }])).toBe(false);
  });

  it("shows nothing for a day that has blocks while still loading", () => {
    expect(shouldShowPlannerEmptyState(true, [{ id: "a" }])).toBe(false);
  });

  it("treats a null or undefined list as empty once loaded", () => {
    // Defensive: the store types say `ScheduleBlock[]`, but a future caller
    // passing a nullable list must not crash the planner's render.
    expect(shouldShowPlannerEmptyState(false, null)).toBe(true);
    expect(shouldShowPlannerEmptyState(false, undefined)).toBe(true);
  });

  it("never claims a clean slate from a null or undefined list mid-load", () => {
    expect(shouldShowPlannerEmptyState(true, null)).toBe(false);
    expect(shouldShowPlannerEmptyState(true, undefined)).toBe(false);
  });
});
