import { describe, expect, it } from "vitest";
import {
  blockRangeMinutes,
  buildDayRows,
  cardHeightPx,
  computeResize,
  findAdjacentMergeMinutes,
  labelFromMinutes,
  minutesOfLabel,
  quantizeEndMinutes,
  rowKey,
} from "./block-resize";
import type { MinBlockLike } from "./block-resize";

const b = (id: string, start: string, end: string, title = id, category = "work"): MinBlockLike => ({
  id,
  title,
  category,
  startTime: start,
  endTime: end,
});

describe("minutesOfLabel / labelFromMinutes", () => {
  it("parses whole-hour and minute labels", () => {
    expect(minutesOfLabel("10:00")).toBe(600);
    expect(minutesOfLabel("10:35")).toBe(635);
    expect(minutesOfLabel("24:00")).toBe(1440);
    expect(minutesOfLabel("nope")).toBeNull();
    expect(minutesOfLabel("25:00")).toBeNull();
  });

  it("round-trips and keeps the explicit 24:00 end form", () => {
    expect(labelFromMinutes(635)).toBe("10:35");
    expect(labelFromMinutes(1440)).toBe("24:00");
    expect(labelFromMinutes(0)).toBe("00:00");
  });
});

describe("quantizeEndMinutes", () => {
  it("lands on 5-minute multiples and clamps", () => {
    expect(quantizeEndMinutes(627)).toBe(625);
    expect(quantizeEndMinutes(633)).toBe(635);
    expect(quantizeEndMinutes(-40)).toBe(5);
    expect(quantizeEndMinutes(99999)).toBe(1440);
  });
});

describe("cardHeightPx", () => {
  it("stays proportional inside the clamp", () => {
    expect(cardHeightPx(60)).toBe(64);
    expect(cardHeightPx(10)).toBe(42); // too short never happens
    expect(cardHeightPx(180)).toBe(120); // too tall never happens
    expect(cardHeightPx(30)).toBe(42); // 30min → 32px raw, floored to the clamp
  });
});

describe("blockRangeMinutes", () => {
  it("rejects zero-length and over-midnight rows", () => {
    expect(blockRangeMinutes({ startTime: "10:00", endTime: "11:00" })).toEqual([600, 660]);
    expect(blockRangeMinutes({ startTime: "10:00", endTime: "10:00" })).toBeNull();
    expect(blockRangeMinutes({ startTime: "23:00", endTime: "06:00" })).toBeNull();
  });
});

describe("computeResize", () => {
  it("extends into the next hour, trimming the neighbour's top in 5-min steps", () => {
    const mine = b("a", "11:00", "12:00", "Deep work");
    const neighbour = b("n", "12:00", "13:00", "Calls");
    const out = computeResize([mine, neighbour], "a", 720 + 32); // 12:32 → 12:30
    expect(out.next.find((x) => x.id === "a")!.endTime).toBe("12:30");
    expect(out.next.find((x) => x.id === "n")!.startTime).toBe("12:30");
    expect(out.absorbed).toHaveLength(0);
    expect(out.edited.map((x) => x.id)).toEqual(["n"]);
    expect(out.freed).toBeNull();
  });

  it("absorbs every neighbour fully covered by the drag", () => {
    const mine = b("a", "11:00", "12:00");
    const small = b("n", "12:00", "12:30");
    const after = b("z", "12:30", "13:00");
    const out = computeResize([mine, small, after], "a", 13 * 60); // → 13:00
    // Both lie wholly inside [11:00, 13:00), so absorbing both is honest; the
    // commit step shows the undo banner the page carries for exactly this.
    expect(out.absorbed.map((x) => x.id)).toEqual(["n", "z"]);
    expect(out.next.map((x) => x.id)).toEqual(["a"]);
    expect(out.next[0].endTime).toBe("13:00");
  });

  it("returns the freed interval when dragged up (shrink)", () => {
    const mine = b("a", "11:00", "12:00");
    const out = computeResize([mine], "a", 670); // 11:10
    expect(out.freed).toEqual({ start: 670, end: 720 });
    expect(out.next.find((x) => x.id === "a")!.endTime).toBe("11:10");
    expect(out.absorbed).toHaveLength(0);
  });

  it("will not shrink below a 5-minute block", () => {
    const mine = b("a", "11:00", "12:00");
    const out = computeResize([mine], "a", 0);
    expect(out.next.find((x) => x.id === "a")!.endTime).toBe("11:05");
  });

  it("is a no-op when the dragged id does not exist", () => {
    const day = [b("a", "11:00", "12:00")];
    const out = computeResize(day, "missing", 700);
    expect(out.next).toEqual(day);
    expect(out.dragged).toBeNull();
  });

  it("keeps window end at 24:00", () => {
    const mine = b("a", "23:00", "24:00");
    const out = computeResize([mine], "a", 1500);
    expect(out.next.find((x) => x.id === "a")!.endTime).toBe("24:00");
  });
});

describe("findAdjacentMergeMinutes", () => {
  it("merges touching same-title minute blocks and chains", () => {
    // The row just saved is the query itself; candidates exclude it, exactly
    // like the planner's `findMerge` call site does.
    const lower = b("c", "12:00", "12:35", "deep work", "work");
    const upper = b("d", "12:35", "13:35", "deep work", "work");
    const other = b("x", "11:00", "11:35", "Other thing");
    const out = findAdjacentMergeMinutes({
      title: "deep work",
      category: "work",
      startMin: 660,
      endMin: 720,
      candidates: [lower, upper, other],
    });
    expect(out).not.toBeNull();
    expect(out!.absorbedIds).toEqual(["c", "d"]);
    expect(out!.startMin).toBe(660); // 11:00
    expect(out!.endMin).toBe(815); // 13:35
  });

  it("does not absorb a block merely because it overlaps the saved range", () => {
    const overlapping = findAdjacentMergeMinutes({
      title: "deep work",
      category: "work",
      startMin: 600,
      endMin: 660,
      candidates: [b("c", "10:30", "13:00", "deep work")],
    });
    expect(overlapping).toBeNull();

    const noTitle = findAdjacentMergeMinutes({
      title: "   ",
      category: "work",
      startMin: 600,
      endMin: 660,
      candidates: [b("c", "11:00", "12:00", "deep work")],
    });
    expect(noTitle).toBeNull();

    const otherCat = findAdjacentMergeMinutes({
      title: "deep work",
      category: "work",
      startMin: 600,
      endMin: 660,
      candidates: [b("c", "11:00", "12:00", "deep work", "renewal")],
    });
    expect(otherCat).toBeNull();
  });
});

describe("buildDayRows", () => {
  it("tiles the day with block and empty rows", () => {
    const rows = buildDayRows([b("a", "11:00", "11:35"), b("n", "11:35", "13:00")]);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ kind: "empty", startMin: 0, endMin: 660 });
    expect(rows[1]).toMatchObject({ kind: "block", startMin: 660, endMin: 695 });
    expect(rows[2]).toMatchObject({ kind: "block", startMin: 695, endMin: 780 });
    expect(rowKey(rows[1])).toBe("a");
    expect(rowKey(rows[0])).toBe("g0");
  });

  it("closes the day at 24:00 and tolerates overlap without hiding a block", () => {
    const rows = buildDayRows([b("a", "10:00", "12:00"), b("z", "11:00", "13:00")]);
    const zRow = rows.find((r) => r.kind === "block" && r.block.id === "z");
    expect(zRow).toBeDefined();
    expect((zRow as { startMin: number }).startMin).toBe(720); // clamped to cursor
    expect(rows[rows.length - 1]).toMatchObject({ kind: "empty", endMin: 1440 });
  });
});
