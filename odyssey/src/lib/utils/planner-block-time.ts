/**
 * Pure time arithmetic for planner blocks (`C2`).
 *
 * Blocks are stored on whole hours (`HH:00`; `24:00` is a legal end) and the
 * timeline works hour-slot by hour-slot, so everything here reasons in hours
 * only. Minute-level start times exist in old rows; they parse as their hour.
 */

import { canonicalCategoryKey } from "./schedule-category-key";

/** The hour part of an `HH:MM` label, or null when it does not parse. */
export const hourOfLabel = (t: string): number | null => {
  const n = parseInt(t.split(":")[0], 10);
  return Number.isNaN(n) ? null : n;
};

/** Minutes since midnight, with `24:00` kept as the end of the day. */
export const minuteOfLabel = (t: string): number | null => {
  const [hourText, minuteText] = t.split(":");
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (hour === 24 && minute === 0) return 1440;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
};

/**
 * Minutes a block covers, for sizing its planner card.
 * Unparsable labels fall back to the slot's own boundaries; a block that wraps
 * past midnight (22:00 → 06:00) counts as its two segments (480 min), never a
 * negative number — a raw `end − start` would give −960 and floor the longest
 * block to the shortest card.
 */
export const blockDurationMinutes = (
  startLabel: string,
  endLabel: string,
  fallbackStartMin: number,
  fallbackEndMin: number,
): number => {
  const s = minuteOfLabel(startLabel) ?? fallbackStartMin;
  const e = minuteOfLabel(endLabel) ?? fallbackEndMin;
  return e >= s ? e - s : 1440 - s + e;
};

/**
 * A block's end expressed the way ranges are compared: `endTime` may read
 * `24:00`, which is hour 24, and a block that runs over midnight (start after
 * end, as the seed sleep data does) is its end hour plus 24.
 */
export const rangeEndHour = (startTime: string, endTime: string): number | null => {
  const s = hourOfLabel(startTime);
  let e = hourOfLabel(endTime);
  if (s === null || e === null) return null;
  if (e === 0 && s > 0) e = 24; // legacy "00:00" end after a positive start = ends at midnight
  if (e < s) e += 24; // over-midnight block (23:00-06:00 style)
  return e;
};

/** `{{ hour }}` as a start label; hour 24 has no start label, so callers guard. */
export const startHourLabel = (h: number): string => `${String(h % 24).padStart(2, "0")}:00`;

/** An end label where hour 24 keeps its explicit `24:00` form (a start of `00:00` would read as day 2). */
export const endHourLabel = (h: number): string =>
  h >= 24 ? "24:00" : `${String(h).padStart(2, "0")}:00`;

/** End minute for a block, carrying a midnight wrap into the following day. */
export const rangeEndMinutes = (startTime: string, endTime: string): number | null => {
  const start = minuteOfLabel(startTime);
  let end = minuteOfLabel(endTime);
  if (start === null || end === null) return null;
  if (end <= start) end += 1440;
  return end;
};

/** A block is reviewable only after its whole span has elapsed. */
export const isBlockEntirelyPast = (q: {
  selectedDate: string;
  todayDate: string;
  startTime: string;
  endTime: string;
  nowMinutes: number;
}): boolean => {
  if (q.selectedDate < q.todayDate) return true;
  if (q.selectedDate > q.todayDate) return false;
  const end = rangeEndMinutes(q.startTime, q.endTime);
  return end !== null && end <= q.nowMinutes;
};

/** Case- and whitespace-insensitive comparison used for same-title merging. */
export const normalizedTitle = (t: string): string => (t || "").trim().toLowerCase();

interface RangeCandidate {
  id: string;
  title: string;
  category: string;
  startTime: string;
  endTime: string;
}

export interface MergeQuery {
  title: string;
  category: string;
  startHour: number;
  /** Exclusive end, hour 24 meaning "runs to midnight". */
  endHour: number;
  candidates: RangeCandidate[];
}

export interface MergeResult {
  startHour: number;
  endHour: number;
  /** The candidates absorbed into the union; the caller deletes them. */
  absorbedIds: string[];
}

/**
 * The same plan written across adjacent hours is one plan: expand the incoming
 * range over every candidate that matches on title (case-insensitive) and
 * category family and *touches* the range, repeatedly, so a chain of hours
 * becomes one block. Overlapping-but-not-touching ranges and over-midnight
 * candidates are deliberately NOT merged - the first would silently re-write a
 * plan the user never connected, and the second has no reliable adjacency.
 *
 * Category is compared as a FAMILY (see `canonicalCategoryKey`), not as a raw
 * string: legacy rows store `rest`, `habits`, `buffer`, and comparing spellings
 * is what stopped identical-text sleep rows from ever merging.
 */
export const findMerge = (q: MergeQuery): MergeResult | null => {
  if (q.endHour <= q.startHour) return null;
  const title = normalizedTitle(q.title);
  if (!title) return null;

  const absorbedIds: string[] = [];
  let start = q.startHour;
  let end = q.endHour;
  let changed = true;
  const wantedCategory = canonicalCategoryKey(q.category);
  while (changed) {
    changed = false;
    for (const c of q.candidates) {
      if (absorbedIds.includes(c.id)) continue;
      const cs = hourOfLabel(c.startTime);
      const ce = rangeEndHour(c.startTime, c.endTime);
      if (cs === null || ce === null) continue;
      if (ce > 24) continue; // over-midnight neighbour: not merged
      if (normalizedTitle(c.title) !== title) continue;
      if (canonicalCategoryKey(c.category) !== wantedCategory) continue;
      if (cs !== end && ce !== start) continue;
      start = Math.min(start, cs);
      end = Math.max(end, ce);
      absorbedIds.push(c.id);
      changed = true;
    }
  }
  if (absorbedIds.length === 0) return null;
  return { startHour: start, endHour: end, absorbedIds };
};

/**
 * Who occupies a timeline hour, in the way drops need: a block spans every
 * hour between its start and end, so hour 10 of a 09:00-12:00 plan is as
 * occupied as hour 9 - and an over-midnight block covers its second day part
 * too. Only blocks actually on the timeline count: held (floating) copies have
 * already been deleted from the day, so an id in `excludeIds` never displaces.
 */
export const findOccupantAtHour = <T extends { id?: string; startTime: string; endTime: string }>(
  blocks: readonly T[],
  targetHour: number,
  excludeIds: ReadonlySet<string> = new Set()
): T | null => {
  for (const b of blocks) {
    if (b.id && excludeIds.has(b.id)) continue;
    const s = hourOfLabel(b.startTime);
    const e = rangeEndHour(b.startTime, b.endTime);
    if (s === null || e === null) continue;
    // A plain block covers [s, e); an over-midnight one covers [s, 24) and then
    // [0, e-24) on the other side of midnight.
    const covered = e > 24 ? targetHour >= s || targetHour < e - 24 : targetHour >= s && targetHour < e;
    if (covered) return b;
  }
  return null;
};

// ============================================================================
// ============================================================================
// Hour/minute label helpers
// ============================================================================

// ============================================================================
// PROPORTIONAL BLOCK SIZING (C2 enhancement)
// ============================================================================

/**
 * Logarithmic saturation curve for planner card height, minutes in.
 *
 * h(t) = 9.92326552 × ln(t + 10.5632098) + 17.76153124
 *
 * Calibration anchors (owner-chosen, reinstated 2026-11-04 after both a
 * linear clamp and this curve were compared live):
 * - t = 5     min → 45px (75%  of the 60px baseline — minimum floor)
 * - t = 60    min → 60px (100% baseline)
 * - t = 1440  min → 90px (150% baseline — cap; anything ≥ 24h stays there)
 * Growth is deliberately gradual: a 3h block is only ~11px taller than a 1h
 * block. That is the chosen trade-off, not a bug.
 */
const LOG_COEFF = 9.92326552;
const LOG_SUMMAND = 10.5632098;
const LOG_ADDEND = 17.76153124;
const MIN_HEIGHT_PX = 45;
const MAX_HEIGHT_PX = 90;

export const calculateBlockHeight = (minutes: number): number => {
  if (!Number.isFinite(minutes) || minutes < 5) return MIN_HEIGHT_PX;
  if (minutes >= 1440) return MAX_HEIGHT_PX;
  return LOG_COEFF * Math.log(minutes + LOG_SUMMAND) + LOG_ADDEND;
};

/**
 * Get duration in hours from start/end time labels.
 */
export const getDurationHours = (startTime: string, endTime: string): number => {
  const start = minuteOfLabel(startTime);
  const end = rangeEndMinutes(startTime, endTime);
  if (start === null || end === null) return 1;
  return (end - start) / 60;
};
