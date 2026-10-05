"use client";

import { CheckCircle2, Sparkles } from "lucide-react";

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
  /** Mirrors the date strip: render a placeholder rather than a false "0/0". */
  loading?: boolean;
}

/**
 * M9 - sticky completion fraction header.
 *
 * The date strip already prints "3/5" in each day pill, but that scrolls away
 * with the strip. This bar sits directly beneath the strip and stays pinned
 * while the 24-hour timeline scrolls, so the day's standing is always one
 * glance away.
 *
 * Renders the SELECTED day's numbers, matching the strip pill that is
 * highlighted - the header answers "how is the day I am looking at going",
 * not "how is today going", so browsing another date stays coherent.
 *
 * All arithmetic lives in getDayHabitProgress() so it stays unit-testable
 * (this repo runs vitest in node, with no jsdom - see vitest.config.ts).
 */
export function CompletionFractionHeader({
  selectedDate,
  todayStr,
  habits = [],
  todayLogs = {},
  historyLogs = {},
  loading = false,
}: CompletionFractionHeaderProps) {
  const progress: DayHabitProgress = getDayHabitProgress(
    habits,
    selectedDate,
    todayStr,
    todayLogs,
    historyLogs
  );

  // While the habit store is still fetching, an empty list would render a
  // confident "0/0 Habits Done" that snaps to the truth a moment later.
  // A same-height placeholder avoids both the lie and the layout jump.
  if (loading) {
    return (
      <div
        aria-hidden="true"
        className="sticky top-14 sm:top-16 z-30 -mx-4 px-4 py-2 bg-surface/85 backdrop-blur-xl border-y border-outline/10"
      >
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="h-4 w-32 rounded-full bg-surface-container-highest animate-pulse" />
          <div className="flex-1 h-1.5 rounded-full bg-surface-container-highest animate-pulse" />
        </div>
      </div>
    );
  }

  const { fraction, percent, hasHabits, isAllCompleted } = progress;
  const isRestDay = !hasHabits;

  // A thin bar reinforces the fraction visually and fills as habits complete.
  // It is decorative only: the text above it already states the numbers, and
  // it is hidden from assistive tech to avoid announcing the value twice.
  const fillWidth = percent === null ? 0 : percent;

  return (
    <div
      className="sticky top-14 sm:top-16 z-30 -mx-4 px-4 py-2 bg-surface/85 backdrop-blur-xl border-y border-outline/10"
    >
      <div className="max-w-xl mx-auto flex items-center gap-3">
        {isAllCompleted ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <Sparkles
            className={`w-4 h-4 shrink-0 ${
              isRestDay ? "text-on-surface-variant/40" : "text-primary"
            }`}
          />
        )}

        <span
          className={`text-xs font-semibold whitespace-nowrap ${
            isAllCompleted
              ? "text-emerald-400"
              : isRestDay
              ? "text-on-surface-variant/60"
              : "text-on-surface"
          }`}
        >
          {isRestDay ? (
            "No habits scheduled"
          ) : (
            <>
              <span className="font-mono font-bold">{fraction}</span> Habits
              Done
              {percent !== null && (
                <span className="text-on-surface-variant font-mono">
                  {" "}
                  · {percent}%
                </span>
              )}
            </>
          )}
        </span>

        <div
          aria-hidden="true"
          className="flex-1 h-1.5 rounded-full bg-surface-container-highest overflow-hidden"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isAllCompleted ? "bg-emerald-400" : "bg-primary"
            }`}
            style={{ width: `${fillWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
}