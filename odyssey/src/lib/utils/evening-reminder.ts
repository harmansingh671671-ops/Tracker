/**
 * Evening reminder (20:00 "plan tomorrow") — the decisions, as pure functions.
 *
 * ## Why this exists
 *
 * The check lived inline in the component and ran on a **60-second `setInterval`
 * for the life of the app**. That is a database read a minute, forever, while the
 * app is open — roughly **1,440 reads a day** — and it did the read *before*
 * asking whether it could possibly show anything. Between 00:00 and 19:59 it
 * queried tomorrow's blocks, ran four `setState` calls, re-rendered, and then
 * decided not to open. That is timer sprawl (`AGENTS.md` rule 16) and wasted work
 * on the idle path.
 *
 * ## The UTC bug found while fixing it
 *
 * The dismissal key was `` `${now.toISOString().split("T")[0]}` `` — the **UTC**
 * date — while the trigger condition was `now.getHours()` — the **local** hour.
 * For anyone whose local date differs from UTC, which is most of the world for
 * part of every day, "dismissed" was written under the wrong day and not found on
 * the next evening, so **the modal reappeared after being dismissed.** Same class
 * as the chest key that `A7`-era work already fixed once; it is a recurring shape,
 * not a one-off.
 *
 * `localDateStr` is deliberately a separate function taking a `Date` rather than
 * reusing `getLocalTodayStr()`, which reads the clock itself and so cannot be
 * tested with a fixed instant.
 */

/** Local hour at which the reminder may open. */
export const EVENING_REMINDER_HOUR = 20;

/** Fewer planned hours than this counts as "incomplete". */
export const INCOMPLETE_HOURS_THRESHOLD = 16;

export interface PlannedBlockLike {
  startTime: string;
  endTime: string;
}

/**
 * `YYYY-MM-DD` in **local** time.
 *
 * Deliberately local, never `toISOString()`: the key is compared against local
 * days, and a UTC key disagrees for every timezone that is not UTC.
 */
export function localDateStr(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The session key recording that today's reminder was dismissed. */
export function dismissalKeyFor(now: Date): string {
  return `odyssey_dismiss_2000_${localDateStr(now)}`;
}

/**
 * Whether it is worth looking at all yet.
 *
 * Cheap by design: this is the guard that lets the caller skip the database
 * entirely for the 20 hours a day when the modal cannot appear.
 */
export function isPastReminderHour(now: Date): boolean {
  return now.getHours() >= EVENING_REMINDER_HOUR;
}

/** Local `YYYY-MM-DD` for the day after `now`. */
export function tomorrowDateStr(now: Date): string {
  const t = new Date(now);
  t.setDate(t.getDate() + 1);
  return localDateStr(t);
}

/**
 * Total distinct hours covered by these blocks.
 *
 * Overlapping and adjacent blocks are counted once — a day is "planned" by the
 * hours it contains, not by how many blocks happen to land in them.
 */
export function countPlannedHours(blocks: readonly PlannedBlockLike[]): number {
  const hours = new Set<number>();
  for (const b of blocks) {
    const startH = parseInt(b.startTime.split(":")[0], 10);
    let endH = parseInt(b.endTime.split(":")[0], 10);
    // "24:00" and a midnight end after a late start both mean hour 24.
    if (b.endTime === "24:00" || (endH === 0 && startH > 0)) endH = 24;
    for (let h = startH; h < endH; h++) hours.add(h);
  }
  return hours.size;
}

/** Whether an incomplete tomorrow should open the modal. */
export function shouldOpenReminder(plannedHours: number, now: Date): boolean {
  return isPastReminderHour(now) && plannedHours < INCOMPLETE_HOURS_THRESHOLD;
}

/**
 * Milliseconds until the next moment a re-evaluation could change the answer.
 *
 * Before the hour, that is **20:00 today** — so an idle app schedules **one**
 * timer for the whole afternoon instead of 1,200. After the hour it is the next
 * minute boundary, which preserves the original "did the user finish planning?"
 * behaviour but only inside the four-hour window where it can matter.
 *
 * **No cap, deliberately.** An earlier version capped this at 90s, which would
 * have made the daytime case poll *more* often than the 60s interval it replaced —
 * a "fix" that quietly tripled the work. A suspended tab is handled by the
 * `visibilitychange` handler re-evaluating on wake, which is both cheaper and
 * more correct than a short timer that fires into a hidden document.
 */
export function msUntilNextEvaluation(now: Date): number {
  if (!isPastReminderHour(now)) {
    const target = new Date(now);
    target.setHours(EVENING_REMINDER_HOUR, 0, 0, 0);
    // `max(1000)` guards the exact-20:00:00.000 boundary.
    return Math.max(1_000, target.getTime() - now.getTime());
  }

  const nextMinute = new Date(now);
  nextMinute.setSeconds(0, 0);
  nextMinute.setMinutes(nextMinute.getMinutes() + 1);
  return Math.max(1_000, nextMinute.getTime() - now.getTime());
}