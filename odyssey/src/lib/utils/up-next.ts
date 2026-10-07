/**
 * M12 -- "Up next in 35 min" ticker.
 *
 * Answers one question about the planner: *what is happening now, or what is
 * next?* `MASTER_TODO_REVISED.md` L984 asks for the countdown line and C4
 * (L255) adds the other half of the wording -- a block that is already running
 * reads **"Now"**, not a negative countdown.
 *
 * ## Why this is a pure module
 *
 * A countdown is a clock rendered as text, and clocks are where planners lie.
 * The three ways this could have been wrong, and how each is handled:
 *
 * 1. **"Up next in -15 min".** A block that started a quarter hour ago is not
 *    upcoming. Anything already started and not yet ended is `now`, which
 *    renders without a countdown at all.
 * 2. **"Up next in 0 min".** Rounding a block that is 20 seconds away down to
 *    zero minutes prints a line that says nothing while claiming urgency. The
 *    countdown rounds **up**, so the smallest possible value is "1 min", and
 *    `now` already covers the sub-minute case.
 * 3. **A block that ends at 01:00 having started at 22:00.** `endTime <= startTime`
 *    is read as crossing midnight and the end is pushed to the next day, matching
 *    how the rail's own hour matcher (`page.tsx`) treats the same case.
 *
 * ## Only for today
 *
 * The caller hides the line on any date that is not today. A countdown to a
 * block three days out is not a countdown, and "in 35 min" printed over a
 * browsed date would be a lie about the clock.
 */

export interface UpNextBlockInput {
  startTime: string;
  endTime: string;
  title: string;
  category?: string;
  status?: string;
}

export interface UpNextResult {
  kind: "now" | "upcoming";
  title: string;
  category: string;
  /** e.g. "2h", "1h 30m", "45m". Empty when the duration cannot be derived. */
  durationLabel: string;
  /** Whole minutes until the block starts. `0` when `kind` is "now". */
  minutesUntil: number;
}

const MINUTES_PER_DAY = 24 * 60;

/** "HH:mm" -> minutes past midnight. "24:00" -> 1440. NaN when unparseable. */
export function parseClockMinutes(value: string | undefined | null): number {
  if (!value) return NaN;
  const trimmed = String(value).trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59) return NaN;
  const total = hours * 60 + minutes;
  // Guard "24:30" and anything else that overruns the day.
  return total > MINUTES_PER_DAY ? NaN : total;
}

/** A block already decided -- finished or given up on -- is never "up next". */
function isDecided(status: string | undefined): boolean {
  return status === "completed" || status === "missed";
}

/**
 * A duration a human would write: "2h", "1h 30m", "45m", "30m".
 * Returns "" for a zero, negative or unparseable duration -- printing "(0m)"
 * beside a real block would be worse than printing nothing.
 */
export function formatDuration(startTime: string, endTime: string): string {
  const start = parseClockMinutes(startTime);
  let end = parseClockMinutes(endTime);
  if (Number.isNaN(start) || Number.isNaN(end)) return "";
  // Crossing midnight: 22:00 -> 01:00 is a 3h block, not a negative one.
  // Strictly `<`: an end equal to the start is an EMPTY block, which is how the
  // rail's own hour matcher reads it (`h >= sH && h < eH` matches nothing). A `<=`
  // here would turn a zero-length block into a 24-hour one.
  if (end < start) end += MINUTES_PER_DAY;
  const total = end - start;
  if (total <= 0) return "";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * The countdown text for a gap. Rounds UP so the line can never read "0 min",
 * and switches to hours past 60 so a four-hour wait is not announced as
 * "in 240 min".
 */
export function formatCountdown(minutesUntil: number): string {
  const safe = Number.isFinite(minutesUntil) ? Math.max(0, Math.ceil(minutesUntil)) : 0;
  if (safe < 60) return `${safe} min`;
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * The block that is running now, or the earliest one still to come.
 * Returns null when the day is finished, or when nothing scheduled has usable
 * times.
 */
export function getUpNextBlock(
  blocks: UpNextBlockInput[] | null | undefined,
  nowMinutes: number
): UpNextResult | null {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  if (!Number.isFinite(nowMinutes)) return null;

  let upcoming: (UpNextResult & { start: number }) | null = null;

  for (const block of blocks) {
    if (!block || isDecided(block.status)) continue;

    const start = parseClockMinutes(block.startTime);
    let end = parseClockMinutes(block.endTime);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    // Same strict `<` as formatDuration, and for the same reason.
    if (end < start) end += MINUTES_PER_DAY;

    // Finished (or not started yet, if it wrapped to tomorrow).
    if (end <= nowMinutes) continue;

    const result: UpNextResult = {
      kind: start <= nowMinutes ? "now" : "upcoming",
      title: (block.title || "").trim(),
      category: (block.category || "").trim(),
      durationLabel: formatDuration(block.startTime, block.endTime),
      minutesUntil: start <= nowMinutes ? 0 : start - nowMinutes,
    };

    // Something already running wins over anything later today: the user is
    // doing it right now, and telling them what is next is not the question
    // they asked.
    if (result.kind === "now") return result;

    if (!upcoming || start < upcoming.start) {
      upcoming = { ...result, start };
    }
  }

  return upcoming;
}