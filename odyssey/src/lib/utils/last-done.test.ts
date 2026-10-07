import { describe, it, expect } from "vitest";
import { formatLastDone } from "./last-done";

// Anchor is a fixed local date so every case is deterministic regardless of when
// the suite runs. 2026-10-08 is a Thursday.
const TODAY = "2026-10-08";

/**
 * Builds a UTC ISO instant that lands on the given LOCAL date and local clock
 * time. Constructing it this way -- rather than writing an ISO string by hand --
 * means these tests exercise the same local-time conversion the app does, and
 * still assert the right thing on a machine in any timezone.
 */
function localInstant(dateStr: string, hours: number, minutes = 0): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const local = new Date(y, m - 1, d, hours, minutes, 0, 0);
  return local.toISOString();
}

describe("formatLastDone", () => {
  // A habit never completed must show NO line. Printing anything here is the
  // confident-nothing class of lie this codebase keeps fixing.
  it("returns null when there is no completion", () => {
    expect(formatLastDone(undefined, TODAY)).toBeNull();
    expect(formatLastDone(null, TODAY)).toBeNull();
    expect(formatLastDone("", TODAY)).toBeNull();
  });

  it("returns null for an unparseable timestamp", () => {
    expect(formatLastDone("not-a-date", TODAY)).toBeNull();
    expect(formatLastDone("2026-13-45T99:99:99Z", TODAY)).toBeNull();
  });

  it("shows the clock time for a completion today", () => {
    expect(formatLastDone(localInstant(TODAY, 8, 15), TODAY)).toBe("Last done: Today at 8:15 AM");
  });

  it("formats midnight and noon as 12 AM and 12 PM", () => {
    expect(formatLastDone(localInstant(TODAY, 0, 5), TODAY)).toBe("Last done: Today at 12:05 AM");
    expect(formatLastDone(localInstant(TODAY, 12, 0), TODAY)).toBe("Last done: Today at 12:00 PM");
  });

  it("formats the afternoon on a 12-hour clock", () => {
    expect(formatLastDone(localInstant(TODAY, 20, 30), TODAY)).toBe("Last done: Today at 8:30 PM");
    expect(formatLastDone(localInstant(TODAY, 11, 59), TODAY)).toBe("Last done: Today at 11:59 AM");
    expect(formatLastDone(localInstant(TODAY, 13, 5), TODAY)).toBe("Last done: Today at 1:05 PM");
  });

  it("says yesterday without a clock time", () => {
    // historyLogs holds booleans, not timestamps, so no time is available here
    // and inventing one would be a guess.
    expect(formatLastDone(localInstant("2026-10-07", 8, 15), TODAY)).toBe("Last done: Yesterday");
  });

  it("counts days ago", () => {
    expect(formatLastDone(localInstant("2026-10-05", 8, 15), TODAY)).toBe("Last done: 3 days ago");
    expect(formatLastDone(localInstant("2026-10-02", 8, 15), TODAY)).toBe("Last done: 6 days ago");
  });

  it("collapses a week to Last week rather than '7 days ago'", () => {
    expect(formatLastDone(localInstant("2026-10-01", 8, 15), TODAY)).toBe("Last done: Last week");
    expect(formatLastDone(localInstant("2026-09-25", 8, 15), TODAY)).toBe("Last done: Last week");
  });

  it("switches to weeks past a fortnight", () => {
    expect(formatLastDone(localInstant("2026-09-24", 8, 15), TODAY)).toBe("Last done: 2 weeks ago");
    expect(formatLastDone(localInstant("2026-08-10", 8, 15), TODAY)).toBe("Last done: 8 weeks ago");
  });

  // A device whose clock moved backwards, or a bad future write. Rendering
  // "yesterday" for something that has not happened is a lie in the other
  // direction, and is just as wrong as a false zero.
  it("returns null for a future timestamp", () => {
    expect(formatLastDone(localInstant("2026-10-09", 8, 15), TODAY)).toBeNull();
    expect(formatLastDone(localInstant("2026-12-25", 8, 15), TODAY)).toBeNull();
  });

  // The stored timestamp is UTC while "today" is a local-calendar concept.
  // Comparing the UTC date instead would misclassify every evening completion
  // as tomorrow's. This is asserted by behaviour, not by asserting a UTC day
  // number: the machine's timezone decides what the UTC date of a given local
  // evening actually is, so pinning it here would make this test pass on one
  // machine and fail on another.
  it("classifies an evening completion as today, not tomorrow", () => {
    expect(formatLastDone(localInstant(TODAY, 23, 30), TODAY)).toBe("Last done: Today at 11:30 PM");
  });

  it("handles a month boundary", () => {
    // 2026-09-30 -> 2026-10-08 is 8 days, so it lands in the 7-13 day bucket.
    expect(formatLastDone(localInstant("2026-09-30", 9, 0), TODAY)).toBe("Last done: Last week");
    // 30 days -> four whole weeks.
    expect(formatLastDone(localInstant("2026-09-08", 9, 0), TODAY)).toBe(
      "Last done: 4 weeks ago"
    );
  });

  it("handles a leap day", () => {
    // 2028 is a leap year, so 2028-02-28 -> 2028-03-01 spans TWO days (Feb 29
    // exists), which is exactly the case a naive "one month boundary = one day"
    // assumption gets wrong.
    expect(formatLastDone(localInstant("2028-02-28", 9, 0), "2028-03-01")).toBe(
      "Last done: 2 days ago"
    );
    expect(formatLastDone(localInstant("2028-02-29", 9, 0), "2028-03-01")).toBe(
      "Last done: Yesterday"
    );
  });
});