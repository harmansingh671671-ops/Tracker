"use client";

import { useEffect, useState } from "react";
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
  currentBlockTitle?: string;
}

/**
 * Compact animated planner header.
 *
 * A full-width two-slide carousel that auto-advances in a loop:
 *   - Slide 1 (Habits): "X/Y done" + name of the next habit.
 *   - Slide 2 (Now): the block currently in progress.
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
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % 2);
    }, 4000);
    return () => clearInterval(id);
  }, []);

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
      <div
        aria-hidden="true"
        className="h-16 rounded-2xl bg-surface-container-highest animate-pulse"
      />
    );
  }

  const { completedCount, denominator, hasHabits } = progress;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-outline/10 bg-surface-container-low">
      <motion.div
        animate={{ x: `-${index * 100}%` }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="flex w-full"
      >
        <div className="w-full shrink-0 px-3 py-2 space-y-0.5">
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

        <div className="w-full shrink-0 px-3 py-2 space-y-0.5">
          <div className="text-[10px] uppercase tracking-wide text-on-surface-variant/60">
            Now
          </div>
          <div className="text-xs font-semibold truncate">
            {currentBlockTitle || "Nothing scheduled"}
          </div>
        </div>
      </motion.div>

      {/* Dots */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
        {[0, 1].map((i) => (
          <span
            key={i}
            className={`h-1 w-1 rounded-full transition-colors ${
              i === index ? "bg-primary" : "bg-on-surface-variant/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}