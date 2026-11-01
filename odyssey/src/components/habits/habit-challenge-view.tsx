"use client";

import { useState } from "react";
import { List, Grid3x3 } from "lucide-react";
import type { Habit } from "@/lib/db";
import { challengeDayDates } from "@/lib/utils/challenges";

/**
 * B7 — the challenge progress view that replaces the monthly calendar for a
 * habit that was started as part of a challenge.
 *
 * Two views, toggleable: a heatmap (one cell per day of the challenge) and a
 * list (Day 1 … Day N with its date and completion). Day 1 is the day the
 * habit was added, not the first of a month, so the challenge's progress reads
 * in its own units instead of borrowing the calendar's.
 */

interface HabitChallengeViewProps {
  habit: Habit;
  historyRecord?: Record<string, boolean>;
  todayStr: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onToggle: (habitId: string, date: string) => void;
}

function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${weekdays[dt.getUTCDay()]} ${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]}`;
}

export function HabitChallengeView({
  habit,
  historyRecord,
  todayStr,
  selectedDate,
  onSelectDate,
  onToggle,
}: HabitChallengeViewProps) {
  const [view, setView] = useState<"heatmap" | "list">("heatmap");

  const startedAt = habit.challengeStartedAt ?? todayStr;
  const duration = habit.challengeDurationDays ?? 7;

  const dates = challengeDayDates(startedAt, duration);
  const history = historyRecord ?? {};

  const completedCount = dates.filter((d) => history[d]).length;
  const currentDay = dates.findIndex((d) => d > todayStr) === -1
    ? duration
    : Math.max(1, dates.findIndex((d) => d > todayStr));

  return (
    <div className="space-y-2">
      {/* Header: progress + view toggle */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono font-bold text-on-surface-variant">
          Day {Math.min(currentDay, duration)} of {duration} · {completedCount} done
        </span>
        <div className="flex items-center gap-1 rounded-full bg-surface-container-high border border-outline/15 p-0.5">
          <button
            type="button"
            onClick={() => setView("heatmap")}
            aria-label="Heatmap view"
            aria-pressed={view === "heatmap"}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              view === "heatmap"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Grid3x3 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-label="List view"
            aria-pressed={view === "list"}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              view === "list"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <List className="w-3 h-3" />
          </button>
        </div>
      </div>

      {view === "heatmap" ? (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {dates.map((date, i) => {
            const done = !!history[date];
            const upcoming = date > todayStr;
            const isToday = date === todayStr;
            const isSelected = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                onClick={() => {
                  onSelectDate(date);
                  if (!upcoming) onToggle(habit.id, date);
                }}
                aria-label={`Day ${i + 1}, ${date}${done ? ", done" : upcoming ? ", upcoming" : ", missed"}`}
                className={`w-7 h-7 shrink-0 rounded-md text-[9px] font-mono font-bold flex items-center justify-center transition-colors cursor-pointer border ${
                  done
                    ? "bg-primary text-on-primary border-primary"
                    : upcoming
                      ? "bg-surface-container-high text-on-surface-variant/40 border-outline/10"
                      : "bg-error/10 text-error border-error/20"
                } ${isToday ? "ring-1 ring-primary" : ""} ${isSelected ? "ring-2 ring-on-surface" : ""}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {dates.map((date, i) => {
            const done = !!history[date];
            const upcoming = date > todayStr;
            return (
              <button
                key={date}
                type="button"
                onClick={() => {
                  onSelectDate(date);
                  if (!upcoming) onToggle(habit.id, date);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left border transition-colors cursor-pointer ${
                  done
                    ? "bg-primary/10 border-primary/25"
                    : upcoming
                      ? "bg-surface-container-low border-outline/10"
                      : "bg-error/5 border-error/15"
                }`}
              >
                <span className="text-[11px] font-mono font-bold text-on-surface-variant w-7 shrink-0">
                  D{i + 1}
                </span>
                <span className="text-[11px] text-on-surface flex-1 truncate">
                  {dayLabel(date)}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold shrink-0 ${
                    done
                      ? "text-primary"
                      : upcoming
                        ? "text-on-surface-variant/50"
                        : "text-error"
                  }`}
                >
                  {done ? "Done" : upcoming ? "Upcoming" : "Missed"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}