import { describe, it, expect } from "vitest";
import { evaluateDayCompletion, getHeatmapCellStyles, blockHourSpan, resolveHourOwners } from "./day-status";
import type { ScheduleBlock } from "@/lib/db";

type Status = ScheduleBlock["status"];

/** Minimal valid block; evaluateDayCompletion only reads `status`. */
const block = (status: Status, i = 0): ScheduleBlock => ({
  id: `b${i}`,
  userId: "u1",
  date: "2026-10-04",
  startTime: `${String(i % 24).padStart(2, "0")}:00`,
  endTime: `${String((i % 24) + 1).padStart(2, "0")}:00`,
  title: "t",
  category: "work",
  status,
  isCommitted: false,
  createdAt: "2026-10-04T00:00:00.000Z",
});

const blocks = (...statuses: Status[]): ScheduleBlock[] =>
  statuses.map((s, i) => block(s, i));

const evalDay = (b: ScheduleBlock[] | null | undefined) =>
  evaluateDayCompletion(b, "2026-10-04", 7);

describe("evaluateDayCompletion - hour accounting", () => {
  it("treats null and undefined as an empty day", () => {
    for (const input of [null, undefined]) {
      const s = evalDay(input);
      expect(s.hasSchedule).toBe(false);
      expect(s.plannedHours).toBe(0);
      expect(s.status).toBe("empty");
    }
  });

  it("counts each status into the right bucket", () => {
    const s = evalDay(blocks("completed", "completed", "missed", "pending"));
    expect(s.plannedHours).toBe(4);
    expect(s.completedHours).toBe(2);
    expect(s.missedHours).toBe(1);
    // A missed hour still counts as reviewed -- that is the whole point of
    // the three-state review model.
    expect(s.reviewedHours).toBe(3);
    expect(s.pendingHours).toBe(1);
  });

  it("treats a block with no status as pending", () => {
    const b = block("pending");
    delete (b as Partial<ScheduleBlock>).status;
    const s = evaluateDayCompletion([b], "2026-10-04", 7);
    expect(s.pendingHours).toBe(1);
    expect(s.reviewedHours).toBe(0);
  });

  it("computes reviewRatio as reviewed over planned", () => {
    expect(evalDay(blocks("completed", "pending")).reviewRatio).toBeCloseTo(0.5);
    expect(evalDay(blocks("completed", "completed", "completed", "pending")).reviewRatio).toBeCloseTo(0.75);
  });

  it("reports reviewRatio 0 (not NaN) for an empty day", () => {
    expect(evalDay([]).reviewRatio).toBe(0);
  });

  it("echoes the date and day number back", () => {
    const s = evalDay(blocks("completed"));
    expect(s.date).toBe("2026-10-04");
    expect(s.dayNumber).toBe(7);
  });
});

describe("evaluateDayCompletion - status transitions", () => {
  it("is 'empty' with no blocks", () => {
    expect(evalDay([]).status).toBe("empty");
  });

  it("is 'planned_unreviewed' when nothing has been reviewed", () => {
    expect(evalDay(blocks("pending", "pending", "pending")).status).toBe("planned_unreviewed");
  });

  it("is 'partially_reviewed' below the 50% mark", () => {
    expect(evalDay(blocks("completed", "pending", "pending", "pending")).status).toBe("partially_reviewed");
    // 1/3 reviewed is still "partial", not "mostly".
    expect(evalDay(blocks("missed", "pending", "pending")).status).toBe("partially_reviewed");
  });

  it("is 'mostly_reviewed' at exactly 50%", () => {
    const s = evalDay(blocks("completed", "completed", "pending", "pending"));
    expect(s.reviewRatio).toBeCloseTo(0.5);
    expect(s.status).toBe("mostly_reviewed");
  });

  it("is 'fully_completed' only for a full day reviewed end to end", () => {
    // The type doc has always said `fully_completed` = ">=18h AND 100%
    // reviewed"; the code used to accept `isFullyReviewed` alone, so a 3-hour
    // day reviewed end to end claimed the brightest cell. It no longer does
    // (ADR 0005) -- that is what makes the day count as a "day done".
    const full = evalDay(Array.from({ length: 18 }, (_, i) => block("completed", i)));
    expect(full.isFullyReviewed).toBe(true);
    expect(full.status).toBe("fully_completed");

    const short = evalDay(blocks("completed", "completed", "missed"));
    expect(short.isFullyReviewed).toBe(true);
    expect(short.isCompletelyDone).toBe(false);
    expect(short.status).toBe("mostly_reviewed");
  });

  it("only sets isCompletelyDone once 18+ hours are planned", () => {
    // 18 is the documented "full day" bar (24h minus sleep/wake blocks).
    const under = evalDay(Array.from({ length: 17 }, (_, i) => block("completed", i)));
    expect(under.isFullyFilled).toBe(false);
    expect(under.isFullyReviewed).toBe(true);
    expect(under.isCompletelyDone).toBe(false);

    const at = evalDay(Array.from({ length: 18 }, (_, i) => block("completed", i)));
    expect(at.isFullyFilled).toBe(true);
    expect(at.isCompletelyDone).toBe(true);
    expect(at.status).toBe("fully_completed");
  });
});

  it("BUG-17: a hidden pending duplicate does not inflate planned hours", () => {
    // 24 reviewed hours plus 9 pending blocks hiding under them -- the old
    // code reported 33 planned and 9 unreviewed, freezing progress below
    // 100% with every grid cell already colored.
    const reviewed = Array.from({ length: 24 }, (_, i) => block("completed", i));
    const hidden = Array.from({ length: 9 }, (_, i) => block("pending", i));
    const s = evalDay([...reviewed, ...hidden]);
    expect(s.plannedHours).toBe(24);
    expect(s.reviewedHours).toBe(24);
    expect(s.pendingHours).toBe(0);
    expect(s.isFullyReviewed).toBe(true);
    expect(s.isCompletelyDone).toBe(true);
  });

  it("BUG-17: a reviewed block wins an hour over a hidden pending duplicate", () => {
    const s = evalDay([block("pending", 0), block("completed", 0)]);
    expect(s.plannedHours).toBe(1);
    expect(s.completedHours).toBe(1);
    expect(s.pendingHours).toBe(0);
  });

  it("BUG-17: blockHourSpan parses end and clamps to 24", () => {
    const b = block("pending", 23);
    expect(blockHourSpan(b)).toEqual([23, 24]);
    const wrap = { ...b, endTime: "00:00" };
    expect(blockHourSpan(wrap)).toEqual([23, 24]);
    const wide = { ...b, endTime: "25:00" };
    expect(blockHourSpan(wide)).toEqual([23, 24]);
  });

  it("BUG-17: resolveHourOwners returns one winner per hour", () => {
    const owners = resolveHourOwners([block("completed", 0), block("pending", 0)]);
    expect(owners).toHaveLength(24);
    expect(owners[0]?.status).toBe("completed");
    expect(owners[1]).toBeNull();
  });

describe("getHeatmapCellStyles", () => {
  it("gives an unscheduled day a neutral label", () => {
    const styles = getHeatmapCellStyles(evalDay([]));
    expect(styles.label).toBe("No Schedule Planned");
    expect(styles.glowClass).toBe("");
  });

  it("labels a planned-but-unreviewed day as needing review", () => {
    const styles = getHeatmapCellStyles(evalDay(blocks("pending", "pending")));
    expect(styles.label).toContain("Needs Review");
  });

  it("reports the percentage for a mostly-reviewed day", () => {
    const styles = getHeatmapCellStyles(
      evalDay(blocks("completed", "completed", "pending", "pending"))
    );
    expect(styles.label).toContain("50% Reviewed");
    expect(styles.label).toContain("2h/4h");
  });

  it("shows hour totals when fully reviewed", () => {
    const styles = getHeatmapCellStyles(
      evalDay(Array.from({ length: 18 }, (_, i) => block("completed", i)))
    );
    expect(styles.label).toBe("100% Reviewed (18h/18h)");
  });

  it("still reports the real percentage for a short day that is fully reviewed", () => {
    // Under the full-day bar the cell is not the brightest green, but it must
    // not lie about the review percentage either.
    const styles = getHeatmapCellStyles(evalDay(blocks("completed", "completed", "missed")));
    expect(styles.label).toBe("100% Reviewed (3h/3h)");
  });

  it("returns style objects with all five keys", () => {
    const styles = getHeatmapCellStyles(evalDay(blocks("pending")));
    expect(Object.keys(styles).sort()).toEqual(
      ["bgClass", "borderClass", "glowClass", "label", "textClass"].sort()
    );
  });
});
