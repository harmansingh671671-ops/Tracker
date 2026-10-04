import { describe, it, expect } from "vitest";
import { evaluateDayCompletion, getHeatmapCellStyles } from "./day-status";
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

  it("is 'fully_completed' when everything is reviewed", () => {
    const s = evalDay(blocks("completed", "completed", "missed"));
    expect(s.isFullyReviewed).toBe(true);
    expect(s.status).toBe("fully_completed");
  });

  it("only sets isCompletelyDone once 18+ hours are planned", () => {
    // 18 is the documented "full day" bar (24h minus sleep/wake blocks).
    const under = evalDay(Array.from({ length: 17 }, () => block("completed", 0)));
    expect(under.isFullyFilled).toBe(false);
    expect(under.isFullyReviewed).toBe(true);
    expect(under.isCompletelyDone).toBe(false);

    const at = evalDay(Array.from({ length: 18 }, () => block("completed", 0)));
    expect(at.isFullyFilled).toBe(true);
    expect(at.isCompletelyDone).toBe(true);
    expect(at.status).toBe("fully_completed");
  });
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
