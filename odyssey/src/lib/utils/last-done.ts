/**
 * M7 -- the "last done" subtitle on habit cards.
 *
 * "Last done: Today at 8:15 AM" / "Yesterday" / "3 days ago". Pure, so the
 * formatting rules are testable without mounting a card -- this project runs
 * vitest in a plain node environment with no jsdom (`vitest.config.ts`), so a
 * component cannot be rendered in a test at all.
 *
 * ## Why the timestamp cannot come from the store
 *
 * `habitLogs.loggedAt` is a real UTC ISO timestamp, but `todayLogs` does not
 * reliably hold it. When the store rebuilds that slice from `historyLogs` after a
 * date rollover it fabricates `loggedAt: new Date().toISOString()` -- "now" --
 * rather than the real completion time. Reading the time from the store would
 * therefore report "Today at 2:04 AM" for a habit completed at 8:15 that
 * morning. `lastCompletedAt` is built from the database rows instead; see
 * `habit-store.ts`.
 *
 * ## Only the "today" variant needs a time
 *
 * The spec asks for a clock time on today and a plain duration afterwards, which
 * matches what the data actually supports: `historyLogs` stores booleans, not
 * timestamps, so for any day other than today only the DATE is known.
 */

const DAY_MS = 86_400_000;

/** Whole calendar days from `from` back to `to`, both `YYYY-MM-DD`. */
function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS);
}

/** Local calendar date for an instant, as `YYYY-MM-DD`. */
function localDateStr(instant: Date): string {
  const y = instant.getFullYear();
  const m = String(instant.getMonth() + 1).padStart(2, "0");
  const d = String(instant.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Local 12-hour clock time, e.g. `8:15 AM`.
 *
 * Formatted from the `Date` object rather than the ISO string on purpose:
 * `loggedAt` is UTC, so slicing the string would print the wrong hour for most
 * of the world. This matches the spec's own "8:15 AM" rather than the 24-hour
 * times used elsewhere in the schedule UI.
 */
function formatClockTime(instant: Date): string {
  const raw = instant.getHours();
  const suffix = raw < 12 ? "AM" : "PM";
  const hour12 = raw % 12 === 0 ? 12 : raw % 12;
  const minutes = String(instant.getMinutes()).padStart(2, "0");
  return `${hour12}:${minutes} ${suffix}`;
}

/**
 * The subtitle text, or `null` when there is nothing true to say.
 *
 * `null` rather than a placeholder because a habit that has never been completed
 * must show **no line at all**. Printing "Last done: never" is worse than
 * absence -- it puts a word on screen where the honest answer is that we do not
 * know, and it costs vertical space on every card for every new habit.
 *
 * `todayStr` is a parameter rather than read from the clock so callers can pass
 * the same day anchor the rest of the screen uses, and so this stays pure.
 */
export function formatLastDone(
  lastDoneIso: string | undefined | null,
  todayStr: string
): string | null {
  if (!lastDoneIso) return null;

  const instant = new Date(lastDoneIso);
  if (Number.isNaN(instant.getTime())) return null;

  // Local date, because "today" is a local-calendar concept and the stored
  // timestamp is UTC. Comparing UTC strings would misclassify every evening
  // completion.
  const doneDate = localDateStr(instant);
  const diff = daysBetween(doneDate, todayStr);

  // Clock skew, a bad timestamp, or a log written "in the future" by a device
  // whose clock moved backwards. Never render "Last done: yesterday" for
  // something that has not happened yet.
  if (diff < 0) return null;

  if (diff === 0) return `Last done: Today at ${formatClockTime(instant)}`;
  if (diff === 1) return "Last done: Yesterday";

  if (diff < 7) return `Last done: ${diff} days ago`;
  if (diff < 14) return "Last done: Last week";

  const weeks = Math.floor(diff / 7);
  return `Last done: ${weeks} weeks ago`;
}