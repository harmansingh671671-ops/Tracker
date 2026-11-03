/**
 * Minute-level resizing for the quick schedule page (`C2` follow-up).
 *
 * On `/day-schedule` the owner's rule is: press the bottom border of a block
 * card and drag — the block's end moves in 5-minute steps, live. Pulling DOWN
 * extends the block and eats the minutes out of whatever starts next (that
 * neighbour shrinks in real time; anything covered whole is absorbed until the
 * drag is committed). Pulling UP shortens it, and the freed stretch becomes a
 * new empty block the user can edit afterwards.
 *
 * Started from `planner-block-time.ts` (its hour-level merge and occupancy
 * logic) but that file reasons in whole hours on purpose — the planner rail,
 * the drop hit-testing and the review counters are all hour-scaled. This page
 * now writes `HH:MM` times with minute parts, so the arithmetic is re-derived
 * here in minutes rather than stretched. Cross-reference both files when
 * touching shared semantics.
 */

import { canonicalCategoryKey } from "./schedule-category-key";

/** Minutes in a day: an end of `24:00` parses to this. */
export const DAY_END_MINUTES = 1440;

/** Drag resolution: every committed end-time lands on a multiple of this. */
export const RESIZE_STEP_MINUTES = 5;

/** px-per-minute mapping for drag deltas; a full hour card is this tall. */
export const HOUR_ROW_HEIGHT_PX = 64;
export const PX_PER_MINUTE = HOUR_ROW_HEIGHT_PX / 60;

/** Pointer pixels times the px→minutes factor, as a plain signed delta. */
export const pxPerMinuteToDelta = (dyPx: number, pxPerMinute: number): number =>
  dyPx * pxPerMinute;

/** Card height clamps so a 3-hour block never dwarfs the page and a 5-minute sliver stays tappable. */
export const CARD_HEIGHT_MIN_PX = 42;
export const CARD_HEIGHT_MAX_PX = 120;

/** `HH:MM` (or the special end form `24:00`) to minutes since midnight, or null. */
export const minutesOfLabel = (t: string): number | null => {
  const parts = t.split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h === 24 && m === 0) return DAY_END_MINUTES;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

/** Minutes since midnight back to a label; 1440 keeps its explicit `24:00` form. */
export const labelFromMinutes = (m: number): string => {
  const clamped = Math.max(0, Math.min(DAY_END_MINUTES, m));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
};

/** Round to the drag step and clamp into (0, 24:00]. */
export const quantizeEndMinutes = (raw: number): number =>
  Math.max(
    RESIZE_STEP_MINUTES,
    Math.min(DAY_END_MINUTES, Math.round(raw / RESIZE_STEP_MINUTES) * RESIZE_STEP_MINUTES)
  );

/**
 * A row covering the whole day (00:00 → 24:00).
 *
 * One of these in a day means the day has no editable grid left: it renders as
 * a single card and every hour outside it is walled off. It is also what the
 * old "one empty row per day" render wrote when a title was typed into the
 * day-long empty card. The page repairs such a row to its first hour on load
 * (owner instruction: "allocate it to 1st block and leave other empty").
 */
export const isWholeDayRange = (startMin: number, endMin: number): boolean =>
  startMin === 0 && endMin === DAY_END_MINUTES;

/** Rows of a day that cover it whole — the repair candidates. */
export const findWholeDayBlocks = <T extends MinBlockLike>(
  blocks: readonly T[]
): T[] =>
  blocks.filter((b) => {
    const range = blockRangeMinutes(b);
    return range !== null && isWholeDayRange(range[0], range[1]);
  });

/** Rendered card height for a stretch of minutes, clamped to stay honest. */
export const cardHeightPx = (durationMinutes: number): number =>
  Math.max(
    CARD_HEIGHT_MIN_PX,
    Math.min(CARD_HEIGHT_MAX_PX, (durationMinutes / 60) * HOUR_ROW_HEIGHT_PX)
  );

/** The smallest block any resize can leave behind: 5 minutes (a 0-minute block would vanish). */
export const MIN_BLOCK_MINUTES = RESIZE_STEP_MINUTES;

export interface MinBlockLike {
  id: string;
  title: string;
  category: string;
  startTime: string;
  endTime: string;
}

/** A block's [start, end) in minutes, or null when either label does not parse. */
export const blockRangeMinutes = (b: {
  startTime: string;
  endTime: string;
}): [number, number] | null => {
  const s = minutesOfLabel(b.startTime);
  const e = minutesOfLabel(b.endTime);
  if (s === null || e === null) return null;
  if (e <= s) return null; // zero-length or over-midnight rows are not resizable here
  return [s, e];
};

export interface ResizeOutcome<T> {
  /** The day with the drag applied; persistence is the caller's job. */
  next: T[];
  /** Blocks fully covered by the new range — the caller deletes these on commit. */
  absorbed: T[];
  /** Blocks trimmed to keep the day non-overlapping (start or end moved). */
  edited: T[];
  /** When the drag shortened the block: the interval it gave up. */
  freed: { start: number; end: number } | null;
  /** The dragged block with its new end, or null when nothing applied. */
  dragged: T | null;
}

/**
 * One drag step applied to the day. The dragged block keeps its start and takes
 * `newEndRaw` (quantised); every block it now covers is absorbed; every block
 * it now partially covers is trimmed back to the boundary —
 * a neighbour whose top the block reached gets its start moved to the new end,
 * a straddler (imported data can overlap) gets its end pulled back to the
 * dragged start. Deliberately NOT over-midnight-aware: this page does not
 * create wrap-around blocks, so none are resized.
 */
export const computeResize = <T extends MinBlockLike>(
  blocks: readonly T[],
  draggedId: string,
  newEndRaw: number
): ResizeOutcome<T> => {
  const dragged = blocks.find((b) => b.id === draggedId);
  const range = dragged ? blockRangeMinutes(dragged) : null;
  if (!dragged || !range) {
    return { next: [...blocks], absorbed: [], edited: [], freed: null, dragged: null };
  }
  const [start, oldEnd] = range;
  // A 0-end block would vanish; the shortest legal resize keeps at least one step.
  const newEnd = Math.max(start + MIN_BLOCK_MINUTES, quantizeEndMinutes(newEndRaw));

  const absorbed: T[] = [];
  const edited: T[] = [];
  const next = blocks.map((b) => {
    if (b.id === draggedId) {
      return { ...b, endTime: labelFromMinutes(newEnd) };
    }
    const other = blockRangeMinutes(b);
    if (!other) return b;
    const [os, oe] = other;
    if (os >= newEnd || oe <= start) return b; // no overlap with the dragged span
    if (os >= start && oe <= newEnd) {
      absorbed.push(b);
      return b; // removed from `next` below
    }
    if (os >= start && os < newEnd) {
      edited.push({ ...b, startTime: labelFromMinutes(newEnd) });
      return edited[edited.length - 1];
    }
    // straddler: starts before the dragged block, ends inside it
    edited.push({ ...b, endTime: labelFromMinutes(start) });
    return edited[edited.length - 1];
  });
  const survivors = next.filter((b) => !absorbed.some((a) => a.id === b.id));
  return {
    next: survivors,
    absorbed,
    edited,
    freed: newEnd < oldEnd ? { start: newEnd, end: oldEnd } : null,
    dragged: (survivors.find((b) => b.id === draggedId) ?? null) as T | null,
  };
};

export interface MergeMinutesResult {
  startMin: number;
  endMin: number;
  /** Candidates swallowed into the union; the caller deletes them. */
  absorbedIds: string[];
}

/**
 * The quick schedule's save-time merge, in minutes: the same rule as the
 * planner's `findMerge` (same title case-insensitively, same category family,
 * touching — never overlapping) but over minute ranges so a 10:35–11:00 half
 * block can join its `11:00` neighbour. Over-midnight candidates are skipped
 * for the same reason as there: no reliable adjacency.
 */
export const findAdjacentMergeMinutes = <T extends MinBlockLike & { category: string }>(q: {
  title: string;
  category: string;
  startMin: number;
  endMin: number;
  candidates: readonly T[];
}): MergeMinutesResult | null => {
  if (q.endMin <= q.startMin) return null;
  const title = (q.title || "").trim().toLowerCase();
  if (!title) return null;

  let start = q.startMin;
  let end = q.endMin;
  const absorbedIds: string[] = [];
  let changed = true;
  let guard = 0;
  while (changed && guard < 64) {
    guard += 1; // chain expansion must terminate even on corrupt overlapping data
    changed = false;
    for (const c of q.candidates) {
      if (absorbedIds.includes(c.id)) continue;
      const range = blockRangeMinutes(c);
      if (!range) continue;
      const [cs, ce] = range;
      if ((c.title || "").trim().toLowerCase() !== title) continue;
      // The entry text alone is not enough (owner rule: same text AND same
      // category), but the category has to be compared as a FAMILY, not as a
      // spelling: identical-text sleep rows stored `sleep` and `rest` displayed
      // as one category and never merged while raw strings were compared.
      if (canonicalCategoryKey(c.category) !== canonicalCategoryKey(q.category)) {
        continue;
      }
      if (cs !== end && ce !== start) continue;
      start = Math.min(start, cs);
      end = Math.max(end, ce);
      absorbedIds.push(c.id);
      changed = true;
    }
  }
  if (absorbedIds.length === 0) return null;
  return { startMin: start, endMin: end, absorbedIds };
};

export type DayRow<T> =
  | { kind: "block"; block: T; startMin: number; endMin: number }
  | { kind: "empty"; startMin: number; endMin: number };

/** Stable per-row key: a block row keys on its id; an empty stretch on its start. */
export const rowKey = <T extends { id: string }>(row: DayRow<T>): string =>
  row.kind === "block" ? row.block.id : `g${row.startMin}`;

/**
 * The day as renderable rows: blocks in time order, empty stretches between
 * them. Rows tile 0 → 24:00 exactly when the data does; overlapping or
 * corrupted rows (backup imports) still render — every block keeps its own
 * card, clamped to where the cursor reached — because silently hiding a block
 * is how a save path starts losing user data.
 */
export const buildDayRows = <T extends MinBlockLike>(
  blocks: readonly T[]
): DayRow<T>[] => {
  const timed = blocks
    .map((b) => ({ b, range: blockRangeMinutes(b) }))
    .filter((x): x is { b: T; range: [number, number] } => x.range !== null)
    .sort((a, z) => a.range[0] - z.range[0]);

  // Empty stretches render as ONE ROW PER HOUR, not one merged card (owner
  // instruction after the row rework: "by default keep 24 blocks of each hour
  // as it was before, and then it is up to user to change it"). An hour-boundary
  // aligned stretch splits into full hours; a ragged stretch keeps its ragged
  // edge as the first row (12:40–13:00) and splits from there.
  const pushEmptyRows = (from: number, to: number) => {
    let cursor = from;
    while (cursor < to) {
      const nextBoundary = (Math.floor(cursor / 60) + 1) * 60;
      const end = Math.min(nextBoundary, to);
      rows.push({ kind: "empty", startMin: cursor, endMin: end });
      cursor = end;
    }
  };

  const rows: DayRow<T>[] = [];
  let cursor = 0;
  for (const { b, range } of timed) {
    const [s, e] = range;
    const start = Math.max(s, cursor);
    if (start > cursor) {
      pushEmptyRows(cursor, start);
    }
    rows.push({ kind: "block", block: b, startMin: start, endMin: e });
    cursor = Math.max(cursor, e);
  }
  if (cursor < DAY_END_MINUTES) {
    pushEmptyRows(cursor, DAY_END_MINUTES);
  }
  return rows;
};
