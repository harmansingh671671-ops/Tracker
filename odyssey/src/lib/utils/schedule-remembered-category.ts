/**
 * The category a NEW block "remembers" from the same time slot yesterday.
 *
 * Owner rule (2026-11-04): the app must not assume a category for a block the
 * user has not named yet — a block created by a shrink saves with an empty
 * category, and while the user types into an empty block the app shows the
 * category of **yesterday's block covering that same stretch**, so what they
 * see is where the category will come from, not a guess. The stored value is
 * returned VERBATIM (never folded through a display vocabulary — that fold is
 * the entire mechanism of `BUG-12`).
 */

import { blockRangeMinutes, type MinBlockLike } from "./block-resize";

/**
 * The stored category of yesterday's block that overlaps `[startMin, endMin)`
 * the most, or null when yesterday has no block there. Over-midnight rows
 * never parse a range (`blockRangeMinutes`), so they are skipped — the same
 * rule every other minute-level matcher on these screens uses. Ties go to the
 * earliest-starting block.
 */
export function rememberedCategoryForRange<T extends MinBlockLike>(
  prevDayBlocks: readonly T[],
  startMin: number,
  endMin: number,
): string | null {
  let best: { category: string; overlap: number; start: number } | null = null;
  for (const b of prevDayBlocks) {
    const range = blockRangeMinutes(b);
    if (!range) continue;
    const [bs, be] = range;
    const overlap = Math.min(be, endMin) - Math.max(bs, startMin);
    if (overlap <= 0) continue;
    if (!best || overlap > best.overlap || (overlap === best.overlap && bs < best.start)) {
      best = { category: b.category ?? "", overlap, start: bs };
    }
  }
  return best && best.category ? best.category : null;
}
