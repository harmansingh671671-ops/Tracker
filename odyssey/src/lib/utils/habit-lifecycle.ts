import type { Habit } from "@/lib/db";

/**
 * B13 — pause / retire thresholds, in ONE pure module so the store, the cards
 * and the 14-day review card cannot drift (the same reason `compliance.ts`
 * owns the counter definitions).
 *
 * Pause is a DATED WINDOW, not a flag: `pausedFrom`..`pausedUntil` are local
 * `YYYY-MM-DD` strings, and every expectation check derives the state against
 * the date it is asking about (see `isHabitScheduledOnDate`). There is no
 * timer and nothing runs while the app is closed — a pause "ends itself"
 * because `today` simply moves past `pausedUntil`. On resume the window is
 * clamped to the day before today instead of being erased, so past days that
 * were deliberately exempted stay exempt in every historical report (a
 * re-derived counter never has to repair itself — `B25`).
 *
 * Date discipline: every function here is pure string arithmetic over the
 * civil calendar (Hinnant's days-from-civil), never `Date` timezone parsing —
 * the BUG-11 family taught this the hard way.
 */

/** Owner decision 2026-10-26 (option C): 3 / 7 / 30 chips plus a custom 1-30 input. */
export const PAUSE_PRESETS = [3, 7, 30] as const;

/** The review asks about a habit with this many fully quiet days. */
export const RETIREMENT_STALE_DAYS = 14;

/** Whole days between two `YYYY-MM-DD` strings (`later - earlier`, may be negative). */
export function diffDays(earlier: string, later: string): number {
  const a = civilDays(parseYmd(earlier));
  const b = civilDays(parseYmd(later));
  return b - a;
}

/** `today` shifted forward by whole days, returned as a `YYYY-MM-DD` string. */
export function addDays(today: string, days: number): string {
  const { y, m, d } = fromCivil(civilDays(parseYmd(today)) + days);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** The end date of a pause that starts on `today` and lasts `days` whole days. */
export function pauseUntil(today: string, days: number): string {
  return addDays(today, days);
}

/** Whole days a pause still covers, INCLUSIVE of today (so the end day reads 1). */
export function pauseDaysLeft(pausedUntil: string, today: string): number {
  return Math.max(0, diffDays(today, pausedUntil) + 1);
}

interface Ymd {
  y: number;
  m: number;
  d: number;
}

function parseYmd(dateStr: string): Ymd {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

/** Howard Hinnant's `days_from_civil` — pure integer civil-calendar math. */
function civilDays({ y, m, d }: Ymd): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor((yy >= 0 ? yy : yy - 399) / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Inverse of `civilDays` (Hinnant's `civil_from_days`). */
function fromCivil(z: number): Ymd {
  const shifted = z + 719468;
  const era = Math.floor(shifted / 146097);
  const doe = shifted - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  let y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  if (m <= 2) y += 1;
  return { y, m, d };
}

/** Owner decision: presets 3/7/30 plus a custom value clamped to 1..30, integers only. */
export function normalizePauseDays(days: number): number | null {
  if (!Number.isFinite(days) || !Number.isInteger(days)) return null;
  if (days < 1 || days > 30) return null;
  return days;
}

/** A pause is active through its end day, and inactive from the day after. */
export function isPauseActive(pausedUntil: string | undefined, today: string): boolean {
  return typeof pausedUntil === "string" && pausedUntil !== "" && today <= pausedUntil;
}

/**
 * True when `dateStr` sits anywhere inside the habit's pause window — the form
 * the shared scheduling predicate needs, because it answers for a DATE, not
 * for "now" (historical reports must keep the exemption after a resume).
 */
export function isPauseWindowOn(habit: Pick<Habit, "pausedFrom" | "pausedUntil">, dateStr: string): boolean {
  const { pausedFrom, pausedUntil } = habit;
  if (typeof pausedFrom !== "string" || pausedFrom === "") return false;
  if (typeof pausedUntil !== "string" || pausedUntil === "") return false;
  return pausedFrom <= dateStr && dateStr <= pausedUntil;
}

/**
 * Any logged day counts as a touch — a partial counted fill (B16's emergency
 * minimum included) keeps a habit active in the review's eyes. `historyLogs`
 * carries every logged day, completed or not.
 */
export function lastTouchedDate(logs: readonly { date: string }[]): string | null {
  let best: string | null = null;
  for (const log of logs) {
    if (best === null || log.date > best) best = log.date;
  }
  return best;
}

/** Stale = 14+ quiet days; a habit never touched at all ages from its creation. */
export function isHabitStale(lastTouched: string | null, createdAt: string, today: string): boolean {
  const anchor = lastTouched ?? createdAt.slice(0, 10);
  return diffDays(anchor, today) >= RETIREMENT_STALE_DAYS;
}
