/**
 * Pure time arithmetic for planner blocks (`C2`).
 *
 * Blocks are stored on whole hours (`HH:00`; `24:00` is a legal end) and the
 * timeline works hour-slot by hour-slot, so everything here reasons in hours
 * only. Minute-level start times exist in old rows; they parse as their hour.
 */

/** The hour part of an `HH:MM` label, or null when it does not parse. */
export const hourOfLabel = (t: string): number | null => {
  const n = parseInt(t.split(":")[0], 10);
  return Number.isNaN(n) ? null : n;
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
 * stored category and *touches* the range, repeatedly, so a chain of hours
 * becomes one block. Overlapping-but-not-touching ranges and over-midnight
 * candidates are deliberately NOT merged - the first would silently re-write a
 * plan the user never connected, and the second has no reliable adjacency.
 */
export const findMerge = (q: MergeQuery): MergeResult | null => {
  if (q.endHour <= q.startHour) return null;
  const title = normalizedTitle(q.title);
  if (!title) return null;

  const absorbedIds: string[] = [];
  let start = q.startHour;
  let end = q.endHour;
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of q.candidates) {
      if (absorbedIds.includes(c.id)) continue;
      const cs = hourOfLabel(c.startTime);
      const ce = rangeEndHour(c.startTime, c.endTime);
      if (cs === null || ce === null) continue;
      if (ce > 24) continue; // over-midnight neighbour: not merged
      if (normalizedTitle(c.title) !== title) continue;
      if (c.category !== q.category) continue;
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
