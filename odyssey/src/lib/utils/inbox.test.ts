import { describe, it, expect } from "vitest";
import {
  INBOX_HORIZONS,
  INBOX_TITLE_MAX,
  normalizeInboxTitle,
  upcomingDays,
  suggestStartHour,
} from "./inbox";

describe("normalizeInboxTitle", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeInboxTitle("  Fix   the bike  ")).toBe("Fix the bike");
  });

  it("caps runaway paste at the documented limit", () => {
    expect(normalizeInboxTitle("a".repeat(500)).length).toBe(INBOX_TITLE_MAX);
  });

  it("keeps a plain title untouched", () => {
    expect(normalizeInboxTitle("Read 20 pages")).toBe("Read 20 pages");
  });
});

describe("INBOX_HORIZONS", () => {
  it("is exactly the three buckets the spec names, in triage order", () => {
    expect([...INBOX_HORIZONS]).toEqual(["today", "this_week", "someday"]);
  });
});

describe("upcomingDays", () => {
  it("starts at today and marks it", () => {
    const days = upcomingDays(7, "2026-11-03");
    expect(days[0]).toMatchObject({ date: "2026-11-03", isToday: true });
    expect(days[6].date).toBe("2026-11-09");
  });

  it("rolls across month and year boundaries", () => {
    const days = upcomingDays(3, "2026-12-31");
    expect(days.map((d) => d.date)).toEqual(["2026-12-31", "2027-01-01", "2027-01-02"]);
  });

  it("produces real weekday names", () => {
    // 2026-11-03 is a Tuesday.
    expect(upcomingDays(2, "2026-11-03").map((d) => d.weekday)).toEqual(["Tue", "Wed"]);
  });

  it("returns nothing for a malformed today", () => {
    expect(upcomingDays(7, "not-a-date")).toEqual([]);
  });
});

describe("suggestStartHour", () => {
  it("suggests 09:00 for a later day", () => {
    expect(suggestStartHour("2026-11-03", "2026-11-05", new Date(2026, 10, 3, 15, 30))).toBe(9);
  });

  it("suggests the next full hour for today", () => {
    expect(suggestStartHour("2026-11-03", "2026-11-03", new Date(2026, 10, 3, 15, 30))).toBe(16);
  });

  it("clamps at 23 late at night", () => {
    expect(suggestStartHour("2026-11-03", "2026-11-03", new Date(2026, 10, 3, 23, 10))).toBe(23);
  });
});
