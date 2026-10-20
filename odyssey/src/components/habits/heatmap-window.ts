/**
 * M25 — the heatmap's visible window, as pure helpers. The wrapper keeps the
 * full-year data memo (the edit sheet's year totals depend on it) and slices
 * a 16-week window out of it for rendering; the numbers live here because
 * they are the only unit-testable surface.
 *
 * Similar-apps pattern (Loop/Streaks): a compact recent window plus paging
 * controls instead of a giant inner scroller — 16 weeks fit the card without
 * any horizontal scroll container, which is also what returns vertical page
 * swipes to the page (a nested scroller captures the pan).
 */

/** Visible week columns per render (owner instruction: "just show the last 16 columns"). */
export const HEATMAP_VISIBLE_WEEKS = 16;

/** One arrow tap pages this many weeks back/forward. */
export const HEATMAP_WINDOW_STEP = 4;

/**
 * The greatest window start the data can support: sliding any further right
 * would leave fewer than `visible` columns.
 */
export function maxWindowStart(totalWeeks: number, visibleWeeks: number): number {
  return Math.max(0, totalWeeks - visibleWeeks);
}

/** Clamp a proposed window start into [0, maxStart]. */
export function clampWindowStart(start: number, maxStart: number): number {
  if (!Number.isFinite(start)) return maxStart;
  return Math.max(0, Math.min(maxStart, start));
}

/** Minimal structural subset of a heatmap column this module needs. */
export interface HeatmapColumnLike {
  readonly length: number;
}

/**
 * Slice `columns[start .. start+visible)` and remap the month-header lookup,
 * whose keys are ABSOLUTE column indexes: the grid looks headers up by the
 * sliced array's index, so every label shifts by `-start` here.
 */
export function sliceHeatmapWindow<L extends HeatmapColumnLike>(
  columns: L[],
  headerByCol: Record<number, string>,
  start: number,
  visible: number
): { columns: L[]; headerByCol: Record<number, string> } {
  const end = Math.min(columns.length, start + visible);
  const sliced = columns.slice(start, end);

  const remapped: Record<number, string> = {};
  for (const key of Object.keys(headerByCol)) {
    const absCol = Number(key);
    if (absCol >= start && absCol < end) {
      remapped[absCol - start] = headerByCol[absCol];
    }
  }
  return { columns: sliced, headerByCol: remapped };
}
