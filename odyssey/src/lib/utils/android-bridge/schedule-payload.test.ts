import { describe, it, expect } from "vitest";
import { buildNativeSchedulePayload } from "./schedule";
import type { WallpaperData } from "../wallpaper-generator";
import type { ScheduleBlock } from "@/lib/db";

/**
 * The XX:57 reminder (native) reads this payload. Owner 2026-10-29: one
 * notification per upcoming hour — a task longer than one hour must NOT ping
 * again on its continuation hour. The native worker can only know that if the
 * payload carries the ORIGINAL block's span (`blockStartHour`/`blockEndHour`)
 * next to the hourly slice it already gets from `startTime`/`endTime`.
 *
 * These assertions are the JS half of that contract; the native half is
 * `OdysseyCadenceNotificationWorker.kt` (skips a continuation hour).
 */

const block = (
  startTime: string,
  endTime: string,
  overrides: Partial<ScheduleBlock> = {}
): ScheduleBlock => ({
  id: `${startTime}-${endTime}`,
  userId: "u1",
  date: "2026-10-29",
  startTime,
  endTime,
  title: "Block",
  category: "work",
  status: "pending",
  isCommitted: false,
  createdAt: "2026-10-29T00:00:00.000Z",
  ...overrides,
});

const data = (blocks: ScheduleBlock[]): WallpaperData => ({
  chapter: 1,
  activeDay: 1,
  rankBadge: "",
  rankName: "",
  userLevel: 1,
  userStreak: 0,
  plannedHours: blocks.length,
  dateStr: "2026-10-29",
  formattedDate: "Thu, Oct 29",
  blocks,
  habits: [],
  showClockGuide: false,
  includeHobbies: false,
});

const parsedBlocks = (blocks: ScheduleBlock[]) =>
  JSON.parse(buildNativeSchedulePayload(data(blocks))).blocks as Array<{
    startTime: string;
    blockStartHour: number;
    blockEndHour: number;
  }>;

describe("buildNativeSchedulePayload — the XX:57 reminder's block spans", () => {
  it("gives both hours of a 2-hour task the same original span", () => {
    const blocks = parsedBlocks([block("14:00", "16:00", { title: "Deep Work" })]);
    const at14 = blocks.find((b) => b.startTime === "14:00")!;
    const at15 = blocks.find((b) => b.startTime === "15:00")!;
    expect(at14).toMatchObject({ blockStartHour: 14, blockEndHour: 16 });
    expect(at15).toMatchObject({ blockStartHour: 14, blockEndHour: 16 });
  });

  it("sends -1 for an unscheduled hour so the worker keeps its old behaviour", () => {
    const blocks = parsedBlocks([block("09:00", "10:00")]);
    const at8 = blocks.find((b) => b.startTime === "08:00")!;
    expect(at8).toMatchObject({ blockStartHour: -1, blockEndHour: -1 });
  });
});
