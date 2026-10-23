import { type ScheduleBlock } from "@/lib/db";
import { blockHourSpan, FULL_DAY_HOURS, resolveHourOwners } from "./day-status";

/**
 * S18 — the day "plate" warning: say it out loud when a plan exceeds the
 * waking window it has to live in.
 *
 * `plannedHours` shares ONE definition with the stats popup
 * (`resolveHourOwners`, BUG-17's clock-hour grid: overlaps count once,
 * "24:00" covers hour 23, end <= start is one hour), so the warning and the
 * day counter cannot disagree. This file imports `blockHourSpan`; it does not
 * reimplement span parsing.
 */
export interface DayLoadStats {
  plannedHours: number;
  wakingHours: number;
  overloadHours: number;
  isOverloaded: boolean;
}

export function evaluateDayLoad(blocks: ScheduleBlock[]): DayLoadStats {
  // The schedule page may pass an undefined day cache; that is an empty day.
  const day = blocks || [];
  const plannedHours = resolveHourOwners(day).filter((b) => b !== null).length;

  // Sleep carves the waking window: an hour is asleep when ANY sleep-category
  // block covers it, scanned independently of the owner tie-break above
  // (every block on the day counts as planned, sleep included).
  // The match is forgiving on purpose — IndexedDB rows (backup bulkAdd, see
  // db.ts) may hold spellings outside the category union, and every other
  // schedule read path normalizes before matching.
  const sleepBlocks = day.filter((b) =>
    b.category.toLowerCase().trim().includes("sleep")
  );
  let wakingHours: number;
  if (sleepBlocks.length === 0) {
    // The user's sleep defines their waking window; a sleep-less day falls
    // back to the app's standard full-day bar so the warning and the day
    // counter never disagree.
    wakingHours = FULL_DAY_HOURS;
  } else {
    const asleep = new Array<boolean>(24).fill(false);
    for (const sleepBlock of sleepBlocks) {
      const [start, end] = blockHourSpan(sleepBlock);
      for (let h = start; h < end; h++) asleep[h] = true;
    }
    wakingHours = 24 - asleep.filter(Boolean).length;
  }

  const overloadHours = Math.max(0, plannedHours - wakingHours);
  return {
    plannedHours,
    wakingHours,
    overloadHours,
    isOverloaded: plannedHours > wakingHours,
  };
}
