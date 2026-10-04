import { describe, it, expect } from "vitest";
import { build24HourlyBlocks } from "./wallpaper-generator";
import type { ScheduleBlock } from "@/lib/db";

const block = (
  startTime: string,
  endTime: string,
  overrides: Partial<ScheduleBlock> = {}
): ScheduleBlock => ({
  id: `${startTime}-${endTime}`,
  userId: "u1",
  date: "2026-10-04",
  startTime,
  endTime,
  title: "Block",
  category: "work",
  status: "pending",
  isCommitted: false,
  createdAt: "2026-10-04T00:00:00.000Z",
  ...overrides,
});

describe("build24HourlyBlocks", () => {
  it("always returns exactly 24 slots", () => {
    expect(build24HourlyBlocks([])).toHaveLength(24);
    expect(build24HourlyBlocks()).toHaveLength(24);
  });

  it("numbers hours 0 through 23 in order", () => {
    expect(build24HourlyBlocks([]).map((b) => b.hour)).toEqual(
      Array.from({ length: 24 }, (_, i) => i)
    );
  });

  it("formats start times as HH:00", () => {
    const blocks = build24HourlyBlocks([]);
    expect(blocks[0].startTime).toBe("00:00");
    expect(blocks[9].startTime).toBe("09:00");
    expect(blocks[23].startTime).toBe("23:00");
  });

  it("renders midnight as 24:00 on the final slot", () => {
    // "24:00" rather than "00:00" -- otherwise the last hour reads as midnight
    // on the following day.
    const blocks = build24HourlyBlocks([]);
    expect(blocks[23].endTime).toBe("24:00");
    expect(blocks[0].endTime).toBe("01:00");
  });

  it("marks empty slots as not user-defined", () => {
    expect(build24HourlyBlocks([]).every((b) => b.isUserDefined === false)).toBe(true);
  });

  it("assigns a user block to the hours it covers", () => {
    const blocks = build24HourlyBlocks([block("09:00", "11:00", { title: "Deep work" })]);
    expect(blocks[8].isUserDefined).toBe(false);
    expect(blocks[9].isUserDefined).toBe(true);
    expect(blocks[9].title).toBe("Deep work");
    expect(blocks[10].isUserDefined).toBe(true);
    // End time is exclusive: 11:00 belongs to the next slot.
    expect(blocks[11].isUserDefined).toBe(false);
  });

  it("covers a full 24:00-to-24:00 block across every hour", () => {
    const blocks = build24HourlyBlocks([block("00:00", "24:00", { title: "All day" })]);
    expect(blocks.every((b) => b.isUserDefined)).toBe(true);
  });

  it("treats an end time of 00:00 as 24:00, not zero-length", () => {
    const blocks = build24HourlyBlocks([block("22:00", "00:00", { title: "Night" })]);
    expect(blocks[22].isUserDefined).toBe(true);
    expect(blocks[23].isUserDefined).toBe(true);
    expect(blocks[21].isUserDefined).toBe(false);
  });

  it("takes the first matching block when two overlap", () => {
    // find() is first-wins, so a later duplicate must not shadow the earlier one.
    const blocks = build24HourlyBlocks([
      block("09:00", "12:00", { title: "First" }),
      block("09:00", "12:00", { title: "Second" }),
    ]);
    expect(blocks[9].title).toBe("First");
    expect(blocks[10].title).toBe("First");
  });

  it("derives the tag from the category rather than copying block.tag", () => {
    // `tag: matching.category || "Focus"` -- an explicit block.tag is ignored
    // here, so pinning this stops a future "fix" from quietly changing what
    // the wallpaper legend renders.
    const blocks = build24HourlyBlocks([
      block("08:00", "09:00", { category: "Health", tag: "morning" }),
    ]);
    expect(blocks[8].category).toBe("Health");
    expect(blocks[8].tag).toBe("Health");
  });

  it("falls back to 'work' for category but 'Focus' for tag when category is empty", () => {
    // The two fallbacks differ: category defaults to "work", tag to "Focus".
    // Pinned because the mismatch looks like a typo but changes the legend.
    const bare = block("08:00", "09:00");
    (bare as Partial<ScheduleBlock>).category = "" as ScheduleBlock["category"];
    const blocks = build24HourlyBlocks([bare]);
    expect(blocks[8].category).toBe("work");
    expect(blocks[8].tag).toBe("Focus");
  });

  it("leaves unscheduled slots fully empty", () => {
    const blocks = build24HourlyBlocks([block("09:00", "10:00")]);
    const free = blocks.find((b) => b.hour === 3)!;
    expect(free).toMatchObject({
      hour: 3,
      title: "",
      category: "",
      tag: "",
      isUserDefined: false,
    });
  });
});
