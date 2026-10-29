import { type ScheduleBlock } from "@/lib/db";

/**
 * The "full day" bar, in planned hours — the single number that decides whether
 * a schedule day can ever count anywhere: `isCompletelyDone` here, and the
 * app-wide days-done counter in `compliance.ts`, which derives from this file.
 * One definition only, so the counter and the heatmap cannot disagree.
 */
export const FULL_DAY_HOURS = 18;

export type DayReviewStatus =
  | "empty" // No schedule planned (0 hours)
  | "planned_unreviewed" // Schedule planned, but 0 hours reviewed (Orange)
  | "partially_reviewed" // 1+ hours reviewed, <50% reviewed (Dim Green)
  | "mostly_reviewed" // 50%+ reviewed, <100% or <18h (Medium Green)
  | "fully_completed"; // Completely filled (>=18h) & 100% reviewed (Brightest Green)

export interface DayCompletionStats {
  date: string;
  dayNumber: number;
  plannedHours: number;
  reviewedHours: number;
  completedHours: number;
  missedHours: number;
  pendingHours: number;
  reviewRatio: number;
  isFullyFilled: boolean;
  isFullyReviewed: boolean;
  isCompletelyDone: boolean;
  hasSchedule: boolean;
  status: DayReviewStatus;
}

/**
 * The clock-hour span [start, end) one block covers, in 0..24 semantics.
 * One definition — the stats popup grid and the day-review counters must
 * parse spans identically or the pixels and the numbers disagree.
 *
 * End parsing matches every writer in this app:
 * - "24:00" means the block covers hour 23 too;
 * - an end equal to or before the start ("00:00" written by the day-schedule
 *   editor for an hour-23 block) is treated as one hour;
 * - an unparseable start is anchored at hour 0 rather than left invisible —
 *   a mis-parsed block a user typed must stay reviewable, not vanish.
 * The end is clamped to 24 so a stray "25:00" cannot exceed the day.
 */
export function blockHourSpan(b: ScheduleBlock): [number, number] {
  const startHour = parseInt(b.startTime.split(":")[0] ?? "", 10);
  const start = Number.isNaN(startHour) ? 0 : startHour;
  let endHour = parseInt(b.endTime.split(":")[0] ?? "", 10);
  if (b.endTime === "24:00") endHour = 24;
  if (Number.isNaN(endHour) || endHour <= start) endHour = start + 1;
  return [start, Math.min(24, endHour)];
}

/**
 * Which block "shows" in each of the 24 clock hours, honouring overlaps:
 * a reviewed block (completed/missed) beats a pending one for the same hour,
 * ties order by list position. BUG-17: a heatmap that renders only this
 * winner must count the winner too — that is the "24/33h" bug's other half.
 */
export function resolveHourOwners(blocks: ScheduleBlock[]): (ScheduleBlock | null)[] {
  const owners: (ScheduleBlock | null)[] = Array(24).fill(null);
  for (const b of blocks) {
    const [start, end] = blockHourSpan(b);
    const reviewed = b.status === "completed" || b.status === "missed";
    for (let h = start; h < end; h++) {
      const current = owners[h];
      const currentReviewed =
        current !== null && (current.status === "completed" || current.status === "missed");
      if (!current || (reviewed && !currentReviewed)) owners[h] = b;
    }
  }
  return owners;
}

/**
 * Evaluates the schedule planning & review status for a given calendar day.
 * - If 0 blocks planned -> 'empty'
 * - If blocks planned but 0 reviewed (all pending) -> 'planned_unreviewed' (Orange)
 * - If at least 1 hour reviewed -> Green, where brightness scales:
 *    * 'fully_completed' (>=18h planned and 100% reviewed) -> Brightest Emerald
 *    * 'mostly_reviewed' (>=50% reviewed) -> Medium Green
 *    * 'partially_reviewed' (1h to <50% reviewed) -> Dim Green
 *
 * BUG-17 (2026-10-19): hours are counted on the clock, not per record. An
 * overlapping duplicate block (e.g. a sleep slot autofilled under a
 * multi-hour user block) used to inflate plannedHours past 24 — the stats
 * popup then said "24/33h" on a 24-hour day, with unreviewed hours that the
 * heatmap could not show because a rendering block already covered them.
 */
export function evaluateDayCompletion(
  blocksForDay: ScheduleBlock[] | undefined | null,
  dateStr: string,
  dayNumber: number
): DayCompletionStats {
  const blocks = blocksForDay || [];
  const owners = resolveHourOwners(blocks);
  const owned = owners.filter((b): b is ScheduleBlock => b !== null);
  const plannedHours = owned.length;
  const completedHours = owned.filter((b) => b.status === "completed").length;
  const missedHours = owned.filter((b) => b.status === "missed").length;
  // A winner with no status field is pending, same as before.
  const pendingHours = plannedHours - completedHours - missedHours;
  const reviewedHours = completedHours + missedHours;

  const hasSchedule = plannedHours > 0;
  const reviewRatio = hasSchedule ? reviewedHours / plannedHours : 0;
  // A day is considered fully filled if there are at least 18 planned hours (standard 24h schedule with sleep & wake blocks)
  const isFullyFilled = plannedHours >= FULL_DAY_HOURS;
  const isFullyReviewed = hasSchedule && reviewedHours === plannedHours;
  const isCompletelyDone = isFullyFilled && isFullyReviewed;

  let status: DayReviewStatus = "empty";
  if (!hasSchedule) {
    status = "empty";
  } else if (reviewedHours === 0) {
    status = "planned_unreviewed";
  } else if (isCompletelyDone) {
    status = "fully_completed";
  } else if (reviewRatio >= 0.5) {
    status = "mostly_reviewed";
  } else {
    status = "partially_reviewed";
  }

  return {
    date: dateStr,
    dayNumber,
    plannedHours,
    reviewedHours,
    completedHours,
    missedHours,
    pendingHours,
    reviewRatio,
    isFullyFilled,
    isFullyReviewed,
    isCompletelyDone,
    hasSchedule,
    status,
  };
}

/**
 * What the stats screen's Adherence tile reports (BUG-20).
 */
export interface AdherenceSummary {
  /** Clock-hours completed across the days counted. */
  completedHours: number;
  /** Clock-hours planned across the days counted. */
  plannedHours: number;
  /** Whole-number percentage, or null when nothing has been measured yet. */
  percent: number | null;
  /** How many finished days the figure is based on. */
  daysCounted: number;
}

/**
 * Adherence across finished days: of the clock-hours planned on days that are
 * over, how many were actually completed.
 *
 * Only days strictly before `todayStr` count. A day still in progress has
 * pending hours that are not misses yet, so including it would report a low
 * number every morning that rises as the day is reviewed — a figure the user
 * cannot trust. Future-dated plans are excluded for the same reason.
 *
 * `percent` is null when no finished day had planned hours, so the caller can
 * show a dash. This replaces a hardcoded "93%" that no data ever produced.
 */
export function computeAdherence(
  statsByDate: Record<string, DayCompletionStats>,
  todayStr: string
): AdherenceSummary {
  let completedHours = 0;
  let plannedHours = 0;
  let daysCounted = 0;

  for (const [dateStr, stats] of Object.entries(statsByDate)) {
    // yyyy-MM-dd sorts lexicographically, so this is a real date comparison.
    if (dateStr >= todayStr) continue;
    if (stats.plannedHours <= 0) continue;
    plannedHours += stats.plannedHours;
    completedHours += stats.completedHours;
    daysCounted += 1;
  }

  return {
    completedHours,
    plannedHours,
    percent:
      plannedHours > 0 ? Math.round((completedHours / plannedHours) * 100) : null,
    daysCounted,
  };
}

/**
 * Returns the CSS styling classes for the heatmap grid cell based on day status.
 */
export function getHeatmapCellStyles(stats: DayCompletionStats, isSelected: boolean = false, isToday: boolean = false): {
  bgClass: string;
  textClass: string;
  borderClass: string;
  glowClass: string;
  label: string;
} {
  let bgClass = "bg-surface-container-highest/20";
  let textClass = "text-on-surface-variant/40";
  let borderClass = "border-outline/10";
  let glowClass = "";
  let label = "No Schedule Planned";

  if (stats.status === "planned_unreviewed") {
    bgClass = "bg-amber-500/90 hover:bg-amber-500";
    textClass = "text-white font-bold";
    borderClass = "border-amber-400";
    glowClass = "shadow-[0_0_8px_rgba(245,158,11,0.45)]";
    label = `${stats.plannedHours}h Planned • Needs Review`;
  } else if (stats.status === "fully_completed") {
    bgClass = "bg-[#00E676] hover:bg-[#39ef7d]";
    textClass = "text-[#003319] font-black";
    borderClass = "border-[#69f0ae] ring-1 ring-[#69f0ae]";
    glowClass = "shadow-[0_0_14px_rgba(0,230,118,0.85)]";
    label = `100% Reviewed (${stats.plannedHours}h/${stats.plannedHours}h)`;
  } else if (stats.status === "mostly_reviewed") {
    bgClass = "bg-emerald-500 hover:bg-emerald-400";
    textClass = "text-[#002a14] font-bold";
    borderClass = "border-emerald-400";
    glowClass = "shadow-[0_0_8px_rgba(16,185,129,0.5)]";
    label = `${Math.round(stats.reviewRatio * 100)}% Reviewed (${stats.reviewedHours}h/${stats.plannedHours}h)`;
  } else if (stats.status === "partially_reviewed") {
    bgClass = "bg-emerald-700 hover:bg-emerald-600";
    textClass = "text-emerald-100 font-bold";
    borderClass = "border-emerald-500/60";
    glowClass = "shadow-[0_0_6px_rgba(5,150,105,0.35)]";
    label = `${Math.round(stats.reviewRatio * 100)}% Reviewed (${stats.reviewedHours}h/${stats.plannedHours}h)`;
  }

  if (isToday) {
    borderClass += " ring-1.5 ring-primary/80 ring-offset-1 ring-offset-surface-container-low";
  }

  if (isSelected) {
    borderClass += " ring-2 ring-primary ring-offset-2 ring-offset-surface-container-low scale-110 z-10";
    glowClass = "shadow-[0_0_14px_rgba(108,0,255,0.75)]";
  }

  return {
    bgClass,
    textClass,
    borderClass,
    glowClass,
    label,
  };
}
