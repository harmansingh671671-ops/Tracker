"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ChevronDown } from "lucide-react";

import {
  getDayHabitProgress,
  type DayHabitProgress,
} from "@/lib/utils/habit-progress";
import { type Habit, type HabitLog } from "@/lib/db";

interface CompletionFractionHeaderProps {
  selectedDate: string;
  todayStr: string;
  habits?: Habit[];
  todayLogs?: Record<string, HabitLog>;
  historyLogs?: Record<string, Record<string, boolean>>;
  loading?: boolean;
  /** Scrolls the planner to the next upcoming block. */
  onStart?: () => void;
}

/**
 * Compact animated planner header.
 *
 * A single clickable bar: shows how many blocks are done, and tapping it
 * scrolls the planner to the next upcoming block. Deliberately compact.
 */
export function CompletionFractionHeader({
  selectedDate,
  todayStr,
  habits = [],
  todayLogs = {},
  historyLogs = {},
  loading = false,
  onStart,
}: CompletionFractionHeaderProps) {
  const progress: DayHabitProgress = getDayHabitProgress(
    habits,
    selectedDate,
    todayStr,
    todayLogs,
    historyLogs
  );

  if (loading) {
    return (
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="h-9 rounded-2xl bg-surface-container-highest animate-pulse"
      />
    );
  }

  const { fraction, hasHabits, isAllCompleted } = progress;
  const isRestDay = !hasHabits;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onStart}
      className="w-full flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs font-semibold bg-surface-container-low border border-outline/10 hover:border-primary/40 transition-colors"
    >
      <span className="inline-flex items-center gap-1.5">
        {isAllCompleted ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <span className="font-mono font-bold">{fraction}</span>
        )}
        <span className="text-on-surface-variant">
          {isRestDay ? "No habits scheduled" : "done"}
        </span>
      </span>
      <span className="inline-flex items-center gap-1 text-primary font-bold">
        Start
        <ChevronDown className="w-3.5 h-3.5" />
      </span>
    </motion.button>
  );
}