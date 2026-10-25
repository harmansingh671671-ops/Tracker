import { describe, it, expect } from "vitest";
import {
  scheduleSummary,
  periodSummary,
  goalSummary,
  prioritySummary,
} from "./habit-form-summary";

describe("scheduleSummary (the live preview's schedule line)", () => {
  it("reads as everyday/weekdays/weekends for the three presets", () => {
    expect(scheduleSummary([1, 2, 3, 4, 5, 6, 7])).toBe("Every day");
    expect(scheduleSummary([1, 2, 3, 4, 5])).toBe("Weekdays");
    expect(scheduleSummary([6, 7])).toBe("Weekends");
  });

  it("names the actual days for a custom pattern", () => {
    expect(scheduleSummary([1, 3, 5])).toBe("Mon, Wed, Fri");
    expect(scheduleSummary([2, 4])).toBe("Tue, Thu");
    expect(scheduleSummary([1, 2, 4, 6])).toBe("Mon, Tue, Thu, Sat");
  });

  it("never invents a schedule the user did not pick", () => {
    expect(scheduleSummary([])).toBe("No days picked yet");
    expect(scheduleSummary(undefined)).toBe("No days picked yet");
  });

  it("keeps the input order sorted by weekday, whatever the array order", () => {
    expect(scheduleSummary([5, 1, 3])).toBe("Mon, Wed, Fri");
  });
});

describe("periodSummary (the preview's when line)", () => {
  it("names the four anchors the form offers", () => {
    expect(periodSummary("morning")).toBe("Mornings");
    expect(periodSummary("afternoon")).toBe("Afternoons");
    expect(periodSummary("evening")).toBe("Evenings");
    expect(periodSummary("anytime")).toBe("Anytime");
  });

  it("unknown or absent falls back to Anytime, never a crash", () => {
    expect(periodSummary(undefined)).toBe("Anytime");
    expect(periodSummary("weird")).toBe("Anytime");
    expect(periodSummary("")).toBe("Anytime");
  });
});

describe("goalSummary (the preview's what-success-looks-like line)", () => {
  it("a quit habit describes a clean run", () => {
    expect(goalSummary({ type: "avoid" })).toBe("Quit habit — a clean day is the win");
  });

  it("counted habits show the number the day completes at", () => {
    expect(goalSummary({ type: "counted", unit: "pages", targetValue: "20" })).toBe("20 pages a day");
    expect(goalSummary({ type: "counted", unit: "minutes", targetValue: 25 })).toBe("25 minutes a day");
    // Zero-pad and number-through-string both read the same.
    expect(goalSummary({ type: "counted", unit: "reps", targetValue: "12" })).toBe("12 reps a day");
  });

  it("a counted habit with no parsable number shows no invented target", () => {
    expect(goalSummary({ type: "counted", unit: "pages", targetValue: "" })).toBe("Counted — no daily target set");
    expect(goalSummary({ type: "counted", unit: "pages", targetValue: "abc" })).toBe("Counted — no daily target set");
    expect(goalSummary({ type: "counted", unit: "pages", targetValue: "-3" })).toBe("Counted — no daily target set");
    expect(goalSummary({ type: "counted" })).toBe("Counted — no daily target set");
  });

  it("sans unit the sentence stays readable", () => {
    expect(goalSummary({ type: "counted", targetValue: "8" })).toBe("8 units a day");
  });

  it("simple habits describe the tap", () => {
    expect(goalSummary({})).toBe("Simple — tap or hold to complete");
    expect(goalSummary({ type: "simple" })).toBe("Simple — tap or hold to complete");
  });
});

describe("prioritySummary (the preview's priority chip)", () => {
  it("names all three levels", () => {
    expect(prioritySummary("critical")).toBe("Critical");
    expect(prioritySummary("focus")).toBe("Focus");
    expect(prioritySummary("optional")).toBe("Optional");
  });

  it("absent is Focus, matching the form default", () => {
    expect(prioritySummary(undefined)).toBe("Focus");
  });
});
