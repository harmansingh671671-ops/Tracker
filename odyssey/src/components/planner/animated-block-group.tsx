"use client";

import React, { useCallback, useMemo } from "react";
import { type ScheduleBlock } from "@/lib/db";
import { getPlannerCatStyle } from "@/lib/utils/planner-category-style";
import { calculateBlockHeight } from "@/lib/utils/planner-block-time";
import { CheckCircle2, XCircle, Circle } from "lucide-react";

interface MergedBlockSlot {
  hour: number;
  startTime: string;
  endTime: string;
  category: string;
  title: string;
  isCustom: boolean;
  status: string;
  block: ScheduleBlock | null;
}

export interface AnimatedBlockGroupProps {
  group: {
    id: string;
    type: string;
    isCustom: boolean;
    startHour: number;
    endHour: number;
    startMin: number;
    endMin: number;
    hours: number[];
    slots: MergedBlockSlot[];
    title: string;
    category: string;
    primaryBlock?: ScheduleBlock | null;
    status: string;
  };
  isRecentlySaved: boolean;
  onOpenHour: (hour: number, block: ScheduleBlock | null, endHour: number) => void;
  onToggleStatus: (
    e: React.MouseEvent,
    hour: number,
    block: ScheduleBlock | null,
    status?: string
  ) => void;
  selectedDate: string;
  todayStr: string;
  currentHour: number;
  canReview: boolean;
}

/**
 * C2 merged-block card -- a multi-hour plan rendered as ONE proportionally
 * sized card instead of one stacked card per hour.
 *
 * Sizing (`calculateBlockHeight`): height uses a logarithmic saturation curve
 * (h(t) = 9.923... × ln(t + 10.563...) + 17.761...) with a 150% cap at 24h
 * (90px). Minimum 45px at 5 min, baseline 60px at 1h. Diminishing returns:
 * a 4-hour block is only 24% taller than a 1-hour block.
 *
 * Height is memoized per group span and only recalculates when hours change.
 *
 * Animation, all CSS, no state machinery:
 * - A change while the element persists (absorbing the next hour on save)
 *   animates the height through the inline `transition`.
 * - `mergeIn` plays on mount (a merge that absorbed the PREVIOUS hour builds a
 *   new group id, so the element remounts instead of transitioning), and
 *   `mergeFlash` sweeps while the save/move highlight is up. Both keyframes are
 *   declared under `prefers-reduced-motion: no-preference`, so under reduced
 *   motion they resolve to nothing.
 */
export function AnimatedBlockGroup({
  group,
  isRecentlySaved,
  onOpenHour,
  onToggleStatus,
  selectedDate,
  todayStr,
  currentHour,
  canReview,
}: AnimatedBlockGroupProps) {
  // Memoize: only recompute height when minute-level span changes, not on every render
  const durationMinutes = group.endMin - group.startMin;
  const proportionalHeight = useMemo(
    () => calculateBlockHeight(durationMinutes),
    [group.startMin, group.endMin],
  );

  // Format minutes-since-midnight as HH:MM string
  const formatMin = (min: number) => {
    const h = Math.floor((min % 1440) / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const cat = getPlannerCatStyle(group.category, group.isCustom);
  const CatIcon = cat.Icon;

  const isCurrent =
    selectedDate === todayStr &&
    currentHour >= group.startHour &&
    currentHour < group.endHour;

  // Overall status across the covered hours, for the 3-state toggle icon.
  const completedCount = group.slots.filter((s) => s.status === "completed").length;
  const missedCount = group.slots.filter((s) => s.status === "missed").length;
  const totalSlots = group.slots.length;
  const overallStatus =
    completedCount === totalSlots
      ? "completed"
      : missedCount === totalSlots
      ? "missed"
      : completedCount > 0
      ? "partial"
      : "pending";

  const primaryBlock = group.primaryBlock || group.slots[0]?.block || null;

  const handleClick = useCallback(() => {
    onOpenHour(group.startHour, primaryBlock, group.endHour);
  }, [onOpenHour, group.startHour, group.endHour, primaryBlock]);

  const handleStatusClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const firstSlot = group.slots[0];
      if (firstSlot) {
        onToggleStatus(e, firstSlot.hour, firstSlot.block, firstSlot.status);
      }
    },
    [onToggleStatus, group.slots]
  );

  return (
    <div
      data-hour={group.startHour}
      onClick={handleClick}
      className={`merge-in relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer select-none touch-pan-y [-webkit-touch-callout:none] border border-l-4 ${cat.leftBorder} ${cat.cardBorder} ${cat.cardBg} my-1 shadow-sm ${
        isRecentlySaved
          ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.35)]"
          : isCurrent
          ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.22)] bg-surface-container-low relative z-20"
          : ""
      }`}
      style={{
        height: `${proportionalHeight}px`,
        transition:
          "height 400ms cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 300ms ease",
        overflow: "hidden",
      }}
    >
      {/* Light sweep while the save/move highlight is up (also covers a save
          that merged neighbours: that path always sets recentlySaved). */}
      {isRecentlySaved && (
        <div className="merge-flash absolute inset-0 rounded-2xl pointer-events-none z-10" />
      )}

      {/* Time range badge: start → end of the merged span */}
      <div className="flex flex-col items-center justify-center shrink-0 w-14 text-center">
        <span
          className={`text-xs font-mono font-bold leading-tight ${
            isCurrent ? "text-primary font-extrabold" : "text-on-surface"
          }`}
        >
          {String(group.startHour).padStart(2, "0")}:00
        </span>
        <span className="text-[10px] font-mono text-on-surface-variant/60 leading-tight">
          {String(group.endHour % 24 === 0 ? 24 : group.endHour % 24).padStart(2, "0")}:00
        </span>
      </div>

      {/* Category icon */}
      <div className="relative shrink-0">
        {isCurrent && (
          <span className="absolute -inset-1 rounded-2xl bg-primary/20 animate-pulse pointer-events-none" />
        )}
        <div
          className={`relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cat.badgeBg} shadow-inner`}
        >
          <CatIcon className="w-4 h-4" />
        </div>
      </div>

      {/* Title, category and live duration */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2">
          <h4
            className={`text-sm font-semibold truncate ${
              isCurrent ? "text-on-surface font-bold" : "text-on-surface"
            }`}
          >
            {group.title || cat.label}
          </h4>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono whitespace-nowrap">
          <span className={`font-semibold shrink-0 ${cat.color}`}>{cat.label}</span>
          {totalSlots > 0 && completedCount > 0 && completedCount < totalSlots && (
            <>
              <span className="text-on-surface-variant/30 shrink-0">&bull;</span>
              <span className="text-emerald-500 dark:text-emerald-400 shrink-0">
                {completedCount}/{totalSlots}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status toggle */}
      <div className="flex items-center gap-1 shrink-0">
        {overallStatus === "completed" ? (
          <button
            type="button"
            disabled={!canReview}
            onClick={handleStatusClick}
            title="Completed (tap to mark missed)"
            className={`w-8 h-8 rounded-full flex items-center justify-center text-emerald-500 transition-all dark:text-emerald-400 ${canReview ? "hover:bg-emerald-500/15 active:scale-95 cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
          >
            <CheckCircle2 className="w-5 h-5 shadow-[0_0_12px_rgba(52,211,153,0.4)]" />
          </button>
          ) : overallStatus === "missed" ? (
            <button
              type="button"
              disabled={!canReview}
              onClick={handleStatusClick}
              title="Missed (tap to reset)"
              className={`w-8 h-8 rounded-full flex items-center justify-center text-rose-500 transition-all dark:text-rose-400 ${canReview ? "hover:bg-rose-500/15 active:scale-95 cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
          >
            <XCircle className="w-5 h-5 shadow-[0_0_12px_rgba(244,63,94,0.4)]" />
          </button>
          ) : !canReview ? (
            <button
              type="button"
              disabled
              onClick={handleStatusClick}
              title="Block cannot be reviewed until its end time"
            className="w-7 h-7 rounded-full border border-outline/[0.08] text-on-surface-variant/20 flex items-center justify-center opacity-30 cursor-not-allowed"
          >
            <Circle className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStatusClick}
            title="Unreviewed (tap to mark completed)"
            className="w-7 h-7 rounded-full border border-outline/25 hover:border-emerald-500 hover:text-emerald-600 text-on-surface-variant/50 flex items-center justify-center transition-colors cursor-pointer dark:border-outline/20 dark:hover:border-emerald-400 dark:hover:text-emerald-400 dark:text-on-surface-variant/40"
          >
            <Circle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
