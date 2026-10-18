"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

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
 * Two small chips in a horizontal, snap-scrolling row:
 *   1. "X/Y done · Start" — count plus the jump-to-next-block action, one thing.
 *   2. "Habits" — opens the Habits page.
 *
 * Deliberately compact: no streak, no capacity judgement, no progress bar.
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
  const router = useRouter();

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
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1"
      >
        <div className="h-8 w-28 shrink-0 rounded-full bg-surface-container-highest animate-pulse snap-start" />
        <div className="h-8 w-20 shrink-0 rounded-full bg-surface-container-highest animate-pulse snap-start" />
      </motion.div>
    );
  }

  const { fraction, hasHabits, isAllCompleted } = progress;
  const isRestDay = !hasHabits;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-center gap-2 overflow-x-auto snap-x snap-mandatory pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        className="snap-start shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-surface-container-low border border-outline/10 hover:border-primary/40 transition-colors"
      >
        {isAllCompleted ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <span className="font-mono font-bold">{fraction}</span>
        )}
        <span className="text-on-surface-variant">
          {isRestDay ? "No habits" : "done"}
        </span>
        <span className="text-primary font-bold">· Start</span>
      </motion.button>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => router.push("/habits")}
        className="snap-start shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-surface-container-low border border-outline/10 hover:border-primary/40 transition-colors"
      >
        Habits
      </motion.button>
    </motion.div>
  );
}