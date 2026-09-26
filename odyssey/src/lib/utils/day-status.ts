import { type ScheduleBlock } from "@/lib/db";

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
 * Evaluates the schedule planning & review status for a given calendar day.
 * - If 0 blocks planned -> 'empty'
 * - If blocks planned but 0 reviewed (all pending) -> 'planned_unreviewed' (Orange)
 * - If at least 1 hour reviewed -> Green, where brightness scales:
 *    * 'fully_completed' (>=18h planned and 100% reviewed) -> Brightest Emerald
 *    * 'mostly_reviewed' (>=50% reviewed) -> Medium Green
 *    * 'partially_reviewed' (1h to <50% reviewed) -> Dim Green
 */
export function evaluateDayCompletion(
  blocksForDay: ScheduleBlock[] | undefined | null,
  dateStr: string,
  dayNumber: number
): DayCompletionStats {
  const blocks = blocksForDay || [];
  const plannedHours = blocks.length;
  const completedHours = blocks.filter((b) => b.status === "completed").length;
  const missedHours = blocks.filter((b) => b.status === "missed").length;
  const pendingHours = blocks.filter((b) => b.status === "pending" || !b.status).length;
  // All planned hours (whether ticked/completed, crossed/missed, or pending without tick/cross) are counted as reviewed
  const reviewedHours = plannedHours;

  const hasSchedule = plannedHours > 0;
  const reviewRatio = hasSchedule ? 1 : 0;
  // A day is considered fully filled if there are at least 18 planned hours (standard 24h schedule with sleep & wake blocks)
  const isFullyFilled = plannedHours >= 18;
  const isFullyReviewed = hasSchedule;
  const isCompletelyDone = isFullyFilled;

  let status: DayReviewStatus = "empty";
  if (!hasSchedule) {
    status = "empty";
  } else if (isCompletelyDone || (hasSchedule && plannedHours >= 14)) {
    status = "fully_completed";
  } else if (plannedHours >= 8) {
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
    pendingHours: 0,
    reviewRatio,
    isFullyFilled,
    isFullyReviewed,
    isCompletelyDone,
    hasSchedule,
    status,
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
    borderClass += " ring-2 ring-primary ring-offset-1 ring-offset-surface-container-low";
  }

  if (isSelected) {
    borderClass += " ring-2 ring-white";
  }

  return {
    bgClass,
    textClass,
    borderClass,
    glowClass,
    label,
  };
}
