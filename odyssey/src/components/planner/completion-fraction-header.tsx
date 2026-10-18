"use client";

import { useEffect, useRef, useState } from "react";

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
 * A full-width two-slide carousel that auto-advances in a loop and can also
 * be scrolled manually (snap per slide).
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

  // Auto-advance, looping back to the first slide.
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % 2;
        const el = scrollerRef.current;
        if (el) {
          el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Keep the dot indicator in sync with manual scrolling.
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
        className="h-16 rounded-2xl bg-surface-container-highest animate-pulse"
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
        <div className="w-full shrink-0 snap-start px-3 py-2 space-y-0.5">
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

        <div className="w-full shrink-0 snap-start px-3 py-2 space-y-0.5">
          <div className="text-[10px] uppercase tracking-wide text-on-surface-variant/60">
            Now
          </div>
          <div className="text-xs font-semibold truncate">
            {currentBlockTitle || "Nothing scheduled"}
          </div>
        </div>
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