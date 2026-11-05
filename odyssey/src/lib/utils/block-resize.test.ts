import { describe, expect, it } from "vitest";
import {
  blockRangeMinutes,
  buildDayRows,
  cardHeightPx,
  computeResize,
  findAdjacentMergeMinutes,
  findWholeDayBlocks,
  labelFromMinutes,
  minutesOfLabel,
  quantizeEndMinutes,
  rowKey,
  splitFreedStretch,
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

  it("stretches an adjacent EMPTY block upward instead of freeing a stretch", () => {
    const mine = b("a", "09:00", "10:00", "Deep work");
    const empty = b("e", "10:00", "10:30", "");
    const out = computeResize([mine, empty], "a", 570); // shrink → 09:30
    // The empty block absorbs the freed stretch in place: same id, new start.
    expect(out.freed).toBeNull();
    expect(out.edited.map((x) => x.id)).toEqual(["e"]);
    const stretched = out.next.find((x) => x.id === "e")!;
    expect(stretched.startTime).toBe("09:30");
    expect(stretched.endTime).toBe("10:30");
    expect(stretched.title).toBe("");
    // The dragged block still shrinks to the raw finger position.
    expect(out.next.find((x) => x.id === "a")!.endTime).toBe("09:30");
  });

  it("does NOT stretch a titled neighbour below — the stretch is freed", () => {
    const mine = b("a", "09:00", "10:00", "Deep work");
    const real = b("n", "10:00", "10:30", "Calls");
    const out = computeResize([mine, real], "a", 570);
    expect(out.freed).toEqual({ start: 570, end: 600 });
    expect(out.edited).toHaveLength(0);
    expect(out.next.find((x) => x.id === "n")!.startTime).toBe("10:00");
  });
});

describe("splitFreedStretch (shrink pieces, owner rule 2026-11-04)", () => {
  it("keeps a sub-hour stretch as ONE block (xx:20 → xx+1:00)", () => {
    expect(splitFreedStretch(560, 600)).toEqual([{ start: 560, end: 600 }]);
  });

  it("splits 70 freed minutes into a proper hour plus the 10-minute rest", () => {
    expect(splitFreedStretch(600, 670)).toEqual([
      { start: 600, end: 660 },
      { start: 660, end: 670 },
    ]);
  });

  it("splits 90 freed minutes into the ragged edge plus the proper hour", () => {
    expect(splitFreedStretch(570, 660)).toEqual([
      { start: 570, end: 600 },
      { start: 600, end: 660 },
    ]);
  });

  it("splits a two-hour stretch at its middle boundary", () => {
    expect(splitFreedStretch(540, 660)).toEqual([
      { start: 540, end: 600 },
      { start: 600, end: 660 },
    ]);
  });

  it("never returns a piece longer than an hour", () => {
    for (let start = 0; start < 1440 - 5; start += 25) {
      for (const len of [5, 35, 65, 95, 130, 200]) {
        const end = Math.min(1440, start + len);
        for (const piece of splitFreedStretch(start, end)) {
          expect(piece.end - piece.start).toBeLessThanOrEqual(60);
          expect(piece.end).toBeGreaterThan(piece.start);
        }
      }
    }
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

  it("never merges two different entries just because they share a category", () => {
    const out = findAdjacentMergeMinutes({
      title: "Emails",
      category: "work",
      startMin: 600,
      endMin: 660,
      candidates: [b("c", "11:00", "12:00", "Writing", "work")],
    });
    expect(out).toBeNull();
  });

  it("merges identical-text sleep rows whose stored spelling differs", () => {
    // `rest` and `sleep` display as one category; comparing raw strings is what
    // kept a night of sleep in pieces.
    const out = findAdjacentMergeMinutes({
      title: "Sleep",
      category: "sleep",
      startMin: 0,
      endMin: 60,
      candidates: [
        b("a", "01:00", "02:00", "sleep", "rest"),
        b("z", "02:00", "03:00", "SLEEP", "Sleep"),
      ],
    });
    expect(out).not.toBeNull();
    expect(out!.startMin).toBe(0);
    expect(out!.endMin).toBe(180);
    expect(out!.absorbedIds).toEqual(["a", "z"]);
  });

  it("does not merge a BLANK category into a work block", () => {
    // `canonicalCategoryKey("")` folds to "work"; that fold is what let an
    // uncategorised block swallow (and take the category of) a work block.
    const out = findAdjacentMergeMinutes({
      title: "Deep work",
      category: "",
      startMin: 600,
      endMin: 660,
      candidates: [b("c", "11:00", "12:00", "deep work", "work")],
    });
    expect(out).toBeNull();
  });

  it("merges two blank-category blocks with the same title", () => {
    const out = findAdjacentMergeMinutes({
      title: "Deep work",
      category: "",
      startMin: 600,
      endMin: 660,
      candidates: [b("c", "11:00", "12:00", "deep work", "")],
    });
    expect(out).not.toBeNull();
    expect(out!.absorbedIds).toEqual(["c"]);
  });

  it("refuses a union that would cover the whole day", () => {
    // A 00:00–24:00 row is trimmed to its first hour on load, so creating one
    // here would lose 23 hours the moment the page reloads.
    const out = findAdjacentMergeMinutes({
      title: "Sleep",
      category: "sleep",
      startMin: 0,
      endMin: 60,
      candidates: [
        b("a", "01:00", "12:00", "sleep", "sleep"),
        b("b", "12:00", "24:00", "sleep", "sleep"),
      ],
    });
    expect(out).toBeNull();
  });
});

describe("findWholeDayBlocks", () => {
  it("finds only the row that covers 00:00 to 24:00", () => {
    const whole = b("whole", "00:00", "24:00");
    const almost = b("almost", "00:00", "23:00");
    const late = b("late", "01:00", "24:00");
    expect(findWholeDayBlocks([whole, almost, late]).map((x) => x.id)).toEqual(["whole"]);
  });

  it("returns nothing for an ordinary day", () => {
    expect(findWholeDayBlocks([b("a", "09:00", "10:00")])).toEqual([]);
  });
});

describe("buildDayRows", () => {
  it("renders empty stretches as one row per hour (24 blocks by default)", () => {
    const rows = buildDayRows([b("a", "11:00", "11:35"), b("n", "11:35", "13:00")]);
    // 11 empty hour rows (00:00→11:00), two block rows, 11 empty hours (13:00→24:00)
    expect(rows).toHaveLength(24);
    expect(rows[0]).toMatchObject({ kind: "empty", startMin: 0, endMin: 60 });
    expect(rowKey(rows[0])).toBe("g0");
    expect(rows[10]).toMatchObject({ kind: "empty", startMin: 600, endMin: 660 });
    expect(rows[11]).toMatchObject({ kind: "block", startMin: 660, endMin: 695 });
    expect(rowKey(rows[11])).toBe("a");
    expect(rows[12]).toMatchObject({ kind: "block", startMin: 695, endMin: 780 });
    expect(rows[13]).toMatchObject({ kind: "empty", startMin: 780, endMin: 840 });
    expect(rows[rows.length - 1]).toMatchObject({ kind: "empty", startMin: 1380, endMin: 1440 });
  });

  it("keeps a ragged empty edge on its own row, then splits by hours", () => {
    const rows = buildDayRows([b("a", "12:40", "14:00")]);
    const empties = rows.filter((r) => r.kind === "empty");
    expect(empties[0]).toMatchObject({ startMin: 0, endMin: 60 }); // hour split
    // The ragg edge hugs its hour boundary: the row before the block is 12:00→12:40,
    // then the block at its real span, then hour rows from 14:00.
    expect(empties.filter((r) => r.startMin === 720)).toHaveLength(1);
    expect(empties.find((r) => r.startMin === 720)).toMatchObject({ endMin: 760 });
    expect(rows.find((r) => r.kind === "block")).toMatchObject({ startMin: 760, endMin: 840 });
    expect(empties).toHaveLength(23); // 0→12:40 in 13 rows + 14:00→24:00 in 10 rows
  });

  it("closes the day at 24:00 and tolerates overlap without hiding a block", () => {
    const rows = buildDayRows([b("a", "10:00", "12:00"), b("z", "11:00", "13:00")]);
    const zRow = rows.find((r) => r.kind === "block" && r.block.id === "z");
    expect(zRow).toBeDefined();
    expect((zRow as { startMin: number }).startMin).toBe(720); // clamped to cursor
    expect(rows[rows.length - 1]).toMatchObject({ kind: "empty", endMin: 1440 });
  });

  it("renders exactly 24 rows on an empty day", () => {
    expect(buildDayRows([])).toHaveLength(24);
  });
});
