"use client";

import { motion } from "framer-motion";

import {
  getDayHabitProgress,
  isHabitCompletedOnDate,
  type DayHabitProgress,
} from "@/lib/utils/habit-progress";
import { isHabitScheduledOnDate } from "@/lib/utils/habit-colors";
import { type Habit, type HabitLog } from "@/lib/db";

interface CompletionFractionHeaderProps {
  selectedDate: string;
  todayStr: string;
  habits?: Habit[];
  todayLogs?: Record<string, HabitLog>;
  historyLogs?: Record<string, Record<string, boolean>>;
  loading?: boolean;
  /** Title of the block currently in progress, if any. */
  currentBlockTitle?: string;
}

/**
 * Compact animated planner header.
 *
 * A horizontal, snap-scrolling row of small blocks:
 *   - Habits: "X/Y done" plus the name of the next habit to do.
 *   - Now: the block currently in progress.
 */
export function CompletionFractionHeader({
  selectedDate,
  todayStr,
  habits = [],
  todayLogs = {},
  historyLogs = {},
  loading = false,
  currentBlockTitle,
}: CompletionFractionHeaderProps) {
  const progress: DayHabitProgress = getDayHabitProgress(
    habits,
    selectedDate,
    todayStr,
    todayLogs,
    historyLogs
  );

  const nextHabit =
    habits.find((h) => {
      const scheduled = isHabitScheduledOnDate(h, selectedDate);
      const done = isHabitCompletedOnDate(
        h,
        selectedDate,
        todayStr,
        todayLogs,
        historyLogs
      );
      return scheduled && !done;
    }) ?? null;

  if (loading) {
    return (
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1"
      >
        <div className="h-14 w-40 shrink-0 rounded-2xl bg-surface-container-highest animate-pulse snap-start" />
        <div className="h-14 w-40 shrink-0 rounded-2xl bg-surface-container-highest animate-pulse snap-start" />
      </motion.div>
    );
  }

  const { completedCount, denominator, hasHabits } = progress;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="snap-start shrink-0 min-w-[150px] rounded-2xl px-3 py-2 bg-surface-container-low border border-outline/10 space-y-0.5">
        <div className="text-[10px] uppercase tracking-wide text-on-surface-variant/60">
          Habits
        </div>
        <div className="font-mono font-bold text-sm">
          {hasHabits ? `${completedCount}/${denominator} done` : "No habits"}
        </div>
        <div className="text-xs text-on-surface-variant truncate">
          Next: {nextHabit ? nextHabit.name : "—"}
        </div>
      </div>

      <div className="snap-start shrink-0 min-w-[150px] rounded-2xl px-3 py-2 bg-surface-container-low border border-outline/10 space-y-0.5">
        <div className="text-[10px] uppercase tracking-wide text-on-surface-variant/60">
          Now
        </div>
        <div className="text-xs font-semibold truncate">
          {currentBlockTitle || "Nothing scheduled"}
        </div>
      </div>
    </motion.div>
  );
}