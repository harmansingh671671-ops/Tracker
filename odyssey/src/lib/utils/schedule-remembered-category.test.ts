import { describe, expect, it } from "vitest";
import { rememberedCategoryForRange } from "./schedule-remembered-category";
import type { MinBlockLike } from "./block-resize";

const b = (id: string, start: string, end: string, category = "work"): MinBlockLike => ({
  id,
  title: id,
  category,
  startTime: start,
  endTime: end,
});

describe("rememberedCategoryForRange (owner rule 2026-11-04: don't assume — remember yesterday)", () => {
  it("returns yesterday's category for the block covering the slot", () => {
    const prev = [b("y", "09:00", "10:00", "vitality")];
    expect(rememberedCategoryForRange(prev, 540, 600)).toBe("vitality");
  });

  it("returns the biggest overlap when several yesterday blocks touch the slot", () => {
    const prev = [b("a", "08:00", "09:30", "work"), b("c", "09:30", "11:00", "sleep")];
    // Slot 09:00–10:30: 30 min inside `a`, a full hour inside `c`.
    expect(rememberedCategoryForRange(prev, 540, 630)).toBe("sleep");
  });

  it("prefers the earlier block on an exact overlap tie", () => {
    const prev = [b("a", "09:00", "09:30", "work"), b("c", "09:00", "09:30", "renewal")];
    expect(rememberedCategoryForRange(prev, 540, 570)).toBe("work");
  });

  it("returns null when yesterday has nothing there", () => {
    const prev = [b("y", "14:00", "15:00", "work")];
    expect(rememberedCategoryForRange(prev, 540, 600)).toBeNull();
  });

  it("skips over-midnight rows (no parseable range) instead of crashing", () => {
    const prev = [b("y", "23:00", "06:00", "sleep")];
    expect(rememberedCategoryForRange(prev, 540, 600)).toBeNull();
  });

  it("treats a touching-but-not-overlapping block as absent", () => {
    const prev = [b("y", "10:00", "11:00", "work")];
    expect(rememberedCategoryForRange(prev, 540, 600)).toBeNull();
  });
});
