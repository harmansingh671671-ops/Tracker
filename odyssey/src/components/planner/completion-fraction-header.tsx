"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";

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
  onNowClick?: () => void;
}

/**
 * Compact animated planner header.
 *
 * A full-width two-slide carousel (auto-loops, manually scrollable):
 *   - Habits: "Habits  X/Y done  ·  Next: name" (single line)
 *   - Now:    "Now: block title" (single line)
 */
export function CompletionFractionHeader({
  selectedDate,
  todayStr,
  habits = [],
  todayLogs = {},
  historyLogs = {},
  loading = false,
  currentBlockTitle,
  onNowClick,
}: CompletionFractionHeaderProps) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

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

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      setIndex(i === 1 ? 1 : 0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) {
    return (
      <div
        aria-hidden="true"
        className="h-10 rounded-2xl bg-surface-container-highest animate-pulse"
      />
    );
  }

  const { completedCount, denominator, hasHabits } = progress;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-outline/10 bg-surface-container-low">
      <div
        ref={scrollerRef}
        className="flex w-full overflow-x-auto snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          onClick={() => router.push("/habits")}
          className="w-full shrink-0 snap-start flex items-center gap-2.5 px-3 py-2 text-left"
        >
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold truncate">
            Habits{" "}
            <span className="font-mono font-bold text-primary">
              {hasHabits ? `${completedCount}/${denominator} done` : "none"}
            </span>
            {nextHabit ? (
              <>
                <span className="text-on-surface-variant"> · Next: </span>
                <span className="text-on-surface-variant">{nextHabit.name}</span>
              </>
            ) : hasHabits && completedCount >= denominator ? (
              <span className="text-emerald-400"> · All done ✓</span>
            ) : (
              <span className="text-on-surface-variant"> · Next: —</span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={onNowClick}
          className="w-full shrink-0 snap-start flex items-center gap-2.5 px-3 py-2 text-left"
        >
          <div className="w-7 h-7 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 text-secondary" />
          </div>
          <span className="text-sm font-semibold truncate">
            Now:{" "}
            <span className="text-on-surface-variant">
              {currentBlockTitle || "Nothing scheduled"}
            </span>
          </span>
        </button>
      </div>

      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none">
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