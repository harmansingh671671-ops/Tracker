import { describe, it, expect } from "vitest";
import {
  HEATMAP_VISIBLE_WEEKS,
  HEATMAP_WINDOW_STEP,
  clampWindowStart,
  maxWindowStart,
  sliceHeatmapWindow,
} from "./heatmap-window";

const fakeCol = (len = 7) => ({ length: len, id: Math.random() });

describe("heatmap window helpers (M25)", () => {
  it("the default window is 16 weeks and one arrow tap pages 4 weeks", () => {
    expect(HEATMAP_VISIBLE_WEEKS).toBe(16);
    expect(HEATMAP_WINDOW_STEP).toBe(4);
  });

  describe("maxWindowStart", () => {
    it("for the full year, the newest window starts at week 36", () => {
      expect(maxWindowStart(52, 16)).toBe(36);
    });

    it("clamps to 0 when the data already fits the window", () => {
      expect(maxWindowStart(16, 16)).toBe(0);
      expect(maxWindowStart(10, 16)).toBe(0);
    });
  });

  describe("clampWindowStart", () => {
    it("keeps proposals inside [0, maxStart]", () => {
      expect(clampWindowStart(20, 36)).toBe(20);
      expect(clampWindowStart(-5, 36)).toBe(0);
      expect(clampWindowStart(50, 36)).toBe(36);
    });

    it("a non-finite proposal falls back to the newest window", () => {
      expect(clampWindowStart(NaN, 36)).toBe(36);
      expect(clampWindowStart(Infinity, 36)).toBe(36);
    });
  });

  describe("sliceHeatmapWindow", () => {
    const columns = Array.from({ length: 52 }, () => fakeCol());
    const headers = { 3: "Jan", 7: "Feb", 40: "Nov", 45: "Dec" };

    it("slices the newest 16 columns by default start", () => {
      const { columns: sliced } = sliceHeatmapWindow(
        columns,
        {},
        maxWindowStart(52, 16),
        HEATMAP_VISIBLE_WEEKS
      );
      expect(sliced).toHaveLength(16);
      expect(sliced[0]).toBe(columns[36]);
      expect(sliced[15]).toBe(columns[51]);
    });

    it("remaps absolute header keys onto the sliced indexes", () => {
      const start = 36;
      const { headerByCol } = sliceHeatmapWindow(
        columns,
        headers,
        start,
        HEATMAP_VISIBLE_WEEKS
      );
      expect(headerByCol).toEqual({ 4: "Nov", 9: "Dec" });
    });

    it("drops headers that slid out of the window", () => {
      const { headerByCol } = sliceHeatmapWindow(columns, headers, 20, 10);
      expect(headerByCol).toEqual({});
    });

    it("never reads past the data when start+visible overshoots", () => {
      const { columns: sliced } = sliceHeatmapWindow(
        columns.slice(0, 40),
        {},
        36,
        HEATMAP_VISIBLE_WEEKS
      );
      expect(sliced).toHaveLength(4);
    });
  });
});
