import { describe, it, expect } from "vitest";
import {
  ALLOCATION_SLOT_COUNT,
  allocationCategory,
  buildAllocationSlices,
  formatAllocationSlotRange,
} from "./allocation-bar";

const pct = (v: string) => Number.parseFloat(v);

/** A planned 00:00–07:00 sleep block and nothing else — the shape in the brief. */
const sevenHoursOfSleep = (filled?: boolean[]) =>
  buildAllocationSlices(filled ?? Array.from({ length: 24 }, (_, h) => h < 7));

describe("buildAllocationSlices", () => {
  it("always returns one slice per hour, whatever the input length", () => {
    expect(buildAllocationSlices([])).toHaveLength(ALLOCATION_SLOT_COUNT);
    expect(buildAllocationSlices([true])).toHaveLength(ALLOCATION_SLOT_COUNT);
    expect(buildAllocationSlices(new Array(40).fill(true))).toHaveLength(
      ALLOCATION_SLOT_COUNT
    );
    expect(buildAllocationSlices([])[0].filled).toBe(false);
  });

  it("keeps slices in hour order, so the first is 00:00 and the last is 23:00", () => {
    const slices = buildAllocationSlices([]);
    expect(slices.map((s) => s.hour)).toEqual(
      Array.from({ length: 24 }, (_, h) => h)
    );
    expect(slices[0].label).toBe("00:00–01:00");
    expect(slices[23].label).toBe("23:00–00:00");
  });

  it("passes planned hours straight through", () => {
    const slices = sevenHoursOfSleep();
    expect(slices.filter((s) => s.filled)).toHaveLength(7);
    expect(slices[0].filled).toBe(true);
    expect(slices[6].filled).toBe(true);
    expect(slices[7].filled).toBe(false);
    expect(slices[23].filled).toBe(false);
  });

  it("gives every slice the same width, so no hour is louder than another", () => {
    const width = pct(buildAllocationSlices([])[0].style.width);
    expect(width).toBeCloseTo(100 / ALLOCATION_SLOT_COUNT, 10);
    for (const s of buildAllocationSlices([])) {
      expect(pct(s.style.width)).toBeCloseTo(width, 10);
    }
  });

  it("tiles the capsule with no seam and no over-constraint", () => {
    const slices = buildAllocationSlices([]);
    // Each slice starts exactly where the previous one ended...
    for (let h = 1; h < ALLOCATION_SLOT_COUNT; h++) {
      expect(pct(slices[h].style.left)).toBeCloseTo(
        pct(slices[h - 1].style.left) + pct(slices[h - 1].style.width),
        10
      );
    }
    // ...and the last one ends exactly at the right-hand edge, so the slices
    // sum to precisely 100% rather than 100% plus 23 gaps.
    const last = slices[ALLOCATION_SLOT_COUNT - 1];
    expect(pct(last.style.left) + pct(last.style.width)).toBeCloseTo(100, 10);
  });

  it("reaches both rounded ends, so the semicircular caps are covered", () => {
    const slices = buildAllocationSlices([]);
    // The track is `rounded-full overflow-hidden`; slice 0 has to start at the
    // very left and slice 23 has to run to the very right, or the caps get a
    // notch cut out of them.
    expect(pct(slices[0].style.left)).toBe(0);
    expect(pct(slices[ALLOCATION_SLOT_COUNT - 1].style.left) +
      pct(slices[ALLOCATION_SLOT_COUNT - 1].style.width)).toBeCloseTo(100, 10);
  });
});

describe("formatAllocationSlotRange", () => {
  it("pads single-digit hours", () => {
    expect(formatAllocationSlotRange(0)).toBe("00:00–01:00");
    expect(formatAllocationSlotRange(9)).toBe("09:00–10:00");
  });

  it("wraps midnight to 00:00 rather than inventing a 24th hour", () => {
    expect(formatAllocationSlotRange(23)).toBe("23:00–00:00");
  });
});

describe("allocationCategory", () => {
  it("gives every category the bar has a slot for a fill and a name", () => {
    for (const key of ["work", "vitality", "sync", "renewal", "sleep"]) {
      const cat = allocationCategory(key);
      expect(cat.fill).toMatch(/^bg-/);
      expect(cat.label.length).toBeGreaterThan(0);
    }
  });

  it("gives each category its own fill", () => {
    const keys = ["work", "vitality", "sync", "renewal", "sleep"];
    const fills = keys.map((k) => allocationCategory(k).fill);
    expect(new Set(fills).size).toBe(keys.length);
  });

  it("falls back to the work category, matching how both pages count an empty category", () => {
    const fallback = allocationCategory("work");
    expect(allocationCategory(undefined)).toEqual(fallback);
    expect(allocationCategory(null)).toEqual(fallback);
    expect(allocationCategory("")).toEqual(fallback);
    expect(allocationCategory("something-new")).toEqual(fallback);
  });
});