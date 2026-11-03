/**
 * B14 — quick-capture inbox helpers.
 *
 * The `inboxItems` table has existed in the schema since the start; B14 is the
 * first code that reads or writes it. These helpers are the pure half: title
 * normalisation, the three time buckets, and the day/hour suggestions the
 * "Add to plan" flow pre-fills. The write paths live in the inbox components.
 */

export const INBOX_HORIZONS = ["today", "this_week", "someday"] as const;

export type InboxHorizon = (typeof INBOX_HORIZONS)[number];

export const INBOX_HORIZON_LABELS: Record<InboxHorizon, string> = {
  today: "Today",
  this_week: "This week",
  someday: "Someday",
};

/** Capture is one-line by spec; 200 chars keeps a runaway paste from breaking a row. */
export const INBOX_TITLE_MAX = 200;

/** Trim, collapse internal whitespace, cap length. Empty means "don't save". */
export function normalizeInboxTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, INBOX_TITLE_MAX);
}

export interface UpcomingDay {
  /** Local `YYYY-MM-DD`. */
  date: string;
  /** Short weekday, e.g. "Mon". */
  weekday: string;
  /** Day-of-month, e.g. "4". */
  dayOfMonth: string;
  isToday: boolean;
}

/**
 * The next `count` local days starting at `todayStr`, for the plan modal's day
 * strip. Parsed as a plain date (no `new Date(todayStr)` — that reads UTC).
 */
export function upcomingDays(count: number, todayStr: string): UpcomingDay[] {
  const [y, m, d] = todayStr.split("-").map(Number);
  if (!y || !m || !d) return [];
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days: UpcomingDay[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(y, m - 1, d + i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
    days.push({
      date: dateStr,
      weekday: weekdays[date.getDay()],
      dayOfMonth: String(date.getDate()),
      isToday: i === 0,
    });
  }
  return days;
}

/**
 * The hour the plan modal pre-selects: the next full hour for today, 09:00 for
 * any later day. Deliberately NOT a free-hour scan — the user picks the final
 * hour either way; the suggestion only saves a tap.
 */
export function suggestStartHour(todayStr: string, dateStr: string, now: Date): number {
  if (dateStr !== todayStr) return 9;
  return Math.min(now.getHours() + 1, 23);
}
