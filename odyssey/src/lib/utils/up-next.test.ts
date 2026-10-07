import { describe, it, expect } from "vitest";
import {
  parseClockMinutes,
  formatDuration,
  formatCountdown,
  getUpNextBlock,
} from "./up-next";

const block = (start: string, end: string, extra: Record<string, unknown> = {}) => ({
  startTime: start,
  endTime: end,
  title: "Deep Work Session",
  category: "Deep Focus",
  ...extra,
});

describe("parseClockMinutes", () => {
  it("parses HH:mm", () => {
    expect(parseClockMinutes("00:00")).toBe(0);
    expect(parseClockMinutes("09:30")).toBe(570);
    expect(parseClockMinutes("23:59")).toBe(1439);
  });

  it("accepts the rail's '24:00' end-of-day sentinel", () => {
    // page.tsx writes 24:00 for the last hour; treating it as 00:00 would make
    // every 23:00 block look like it ends before it starts.
    expect(parseClockMinutes("24:00")).toBe(1440);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseClockMinutes(" 08:15 ")).toBe(495);
  });

  it("returns NaN for anything unusable rather than guessing", () => {
    expect(parseClockMinutes("")).toBeNaN();
    expect(parseClockMinutes(undefined)).toBeNaN();
    expect(parseClockMinutes(null)).toBeNaN();
    expect(parseClockMinutes("noon")).toBeNaN();
    expect(parseClockMinutes("8")).toBeNaN();
    expect(parseClockMinutes("25:00")).toBeNaN();
    expect(parseClockMinutes("09:99")).toBeNaN();
    expect(parseClockMinutes("24:30")).toBeNaN();
  });
});

describe("formatDuration", () => {
  it("formats whole hours as the spec shows", () => {
    // The spec's example is "(2h)".
    expect(formatDuration("09:00", "11:00")).toBe("2h");
    expect(formatDuration("09:00", "10:00")).toBe("1h");
    expect(formatDuration("00:00", "24:00")).toBe("24h");
  });

  it("keeps minutes when they are not zero", () => {
    expect(formatDuration("09:00", "09:45")).toBe("45m");
    expect(formatDuration("09:00", "10:30")).toBe("1h 30m");
    expect(formatDuration("09:15", "10:00")).toBe("45m");
  });

  it("reads a midnight-crossing block as a positive duration", () => {
    // 22:00 -> 01:00 is three hours, not minus twenty-one.
    expect(formatDuration("22:00", "01:00")).toBe("3h");
    expect(formatDuration("23:00", "00:30")).toBe("1h 30m");
  });

  it("returns '' for a zero or unparseable duration", () => {
    // "(0m)" beside a real block is worse than no bracket at all.
    expect(formatDuration("09:00", "09:00")).toBe("");
    expect(formatDuration("09:00", "bad")).toBe("");
    expect(formatDuration("bad", "10:00")).toBe("");
  });
});

describe("formatCountdown", () => {
  it("matches the spec's phrasing", () => {
    expect(formatCountdown(35)).toBe("35 min");
    expect(formatCountdown(1)).toBe("1 min");
  });

  it("never says '0 min' for a block that has not started", () => {
    // Rounding 20 seconds down to zero claims urgency the user cannot act on.
    expect(formatCountdown(0.34)).toBe("1 min");
    expect(formatCountdown(0)).toBe("0 min");
  });

  it("switches to hours past 60 rather than counting to 240", () => {
    expect(formatCountdown(60)).toBe("1h");
    expect(formatCountdown(95)).toBe("1h 35m");
    expect(formatCountdown(240)).toBe("4h");
  });

  it("never announces a negative wait", () => {
    expect(formatCountdown(-30)).toBe("0 min");
    expect(formatCountdown(NaN)).toBe("0 min");
  });
});

describe("getUpNextBlock", () => {
  it("returns null for an empty or missing day", () => {
    expect(getUpNextBlock([], 600)).toBeNull();
    expect(getUpNextBlock(null, 600)).toBeNull();
    expect(getUpNextBlock(undefined, 600)).toBeNull();
  });

  it("counts down to the next block with a title and duration", () => {
    const r = getUpNextBlock([block("09:35", "11:35")], 9 * 60);
    expect(r?.kind).toBe("upcoming");
    expect(r?.minutesUntil).toBe(35);
    expect(r?.title).toBe("Deep Work Session");
    expect(r?.durationLabel).toBe("2h");
  });

  it("says 'Now' for a block already running, with no countdown", () => {
    // C4: the line is '"Now" or "Up next in 45 min"'. A running block that
    // printed a negative wait would be nonsense on the face of it.
    const r = getUpNextBlock([block("09:00", "11:00")], 9 * 60 + 15);
    expect(r?.kind).toBe("now");
    expect(r?.minutesUntil).toBe(0);
    expect(r?.title).toBe("Deep Work Session");
  });

  it("prefers the running block over a later one", () => {
    const r = getUpNextBlock(
      [block("14:00", "15:00", { title: "Later" }), block("09:00", "10:00", { title: "Running" })],
      9 * 60 + 30
    );
    expect(r?.kind).toBe("now");
    expect(r?.title).toBe("Running");
  });

  it("skips blocks that have already finished", () => {
    expect(getUpNextBlock([block("06:00", "07:00"), block("09:00", "10:00")], 8 * 60)?.title).toBe(
      "Deep Work Session"
    );
    expect(getUpNextBlock([block("06:00", "07:00")], 8 * 60)).toBeNull();
  });

  it("treats a block ending exactly now as over", () => {
    expect(getUpNextBlock([block("08:00", "09:00")], 9 * 60)).toBeNull();
  });

  it("picks the earliest upcoming block when several remain", () => {
    const r = getUpNextBlock(
      [block("15:00", "16:00", { title: "Evening" }), block("11:00", "12:00", { title: "Lunch" })],
      9 * 60
    );
    expect(r?.title).toBe("Lunch");
    expect(r?.minutesUntil).toBe(120);
  });

  it("returns null once the day is finished", () => {
    expect(getUpNextBlock([block("06:00", "07:00"), block("08:00", "09:00")], 23 * 60 + 30)).toBeNull();
  });

  it("ignores blocks already completed or missed", () => {
    // "Up next" for something you have already given up on is nonsense.
    const r = getUpNextBlock(
      [block("09:00", "10:00", { status: "completed" }), block("09:30", "10:30", { status: "missed" }), block("14:00", "15:00")],
      8 * 60
    );
    expect(r?.minutesUntil).toBe(360);
    expect(getUpNextBlock([block("14:00", "15:00", { status: "missed" })], 8 * 60)).toBeNull();
  });

  it("skips a block with unusable times instead of crashing", () => {
    const r = getUpNextBlock([block("bad", "worse"), block("12:00", "13:00")], 8 * 60);
    expect(r?.title).toBe("Deep Work Session");
  });

  it("handles a block that crosses midnight", () => {
    // A 22:00 block is upcoming at 21:00 and still running just after midnight,
    // which needs the same end-time fix the rail's hour matcher uses.
    expect(getUpNextBlock([block("22:00", "01:00")], 21 * 60)?.kind).toBe("upcoming");
    expect(getUpNextBlock([block("22:00", "01:00")], 21 * 60)?.durationLabel).toBe("3h");
    const after = getUpNextBlock([block("22:00", "01:00")], 23 * 60 + 30);
    expect(after?.kind).toBe("now");
  });

  it("returns null for a nonsense clock reading", () => {
    expect(getUpNextBlock([block("09:00", "10:00")], NaN)).toBeNull();
  });

  it("trims a title and defaults a missing category", () => {
    const r = getUpNextBlock([block("09:00", "10:00", { title: "  Read  ", category: "" })], 8 * 60);
    expect(r?.title).toBe("Read");
    expect(r?.category).toBe("");
  });

  it("does not mutate the blocks it was given", () => {
    const input = [block("22:00", "01:00")];
    const snapshot = JSON.stringify(input);
    getUpNextBlock(input, 21 * 60);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});