"use client";

import { useState } from "react";
import { List, Grid3x3 } from "lucide-react";
import type { Habit } from "@/lib/db";
import { CHALLENGES, challengeDayDates } from "@/lib/utils/challenges";
import { getHabitColor } from "@/lib/utils/habit-colors";
import { HabitChallengeHeatmap } from "@/components/habits/habit-challenge-heatmap";

/**
 * B7 — the challenge progress view. Two sub-views, toggleable:
 *  - heatmap: a horizontal strip of the challenge's days (Day 1..N).
 *  - calendar: the same days laid out as a calendar grid (7 per row), showing
 *    only the challenge's days — no month padding, no full month.
 */

interface HabitChallengeViewProps {
  habit: Habit;
  historyRecord?: Record<string, boolean>;
  todayStr: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onToggle: (habitId: string, date: string) => void;
  initialView?: "heatmap" | "list";
}

export function HabitChallengeView({
  habit,
  historyRecord,
  todayStr,
  selectedDate,
  onSelectDate,
  onToggle,
  initialView = "heatmap",
}: HabitChallengeViewProps) {
  const [view, setView] = useState<"heatmap" | "list">(initialView);

  const startedAt = habit.challengeStartedAt;
  const duration = habit.challengeDurationDays ?? CHALLENGES.find((c) => c.id === habit.challengeId)?.durationDays ?? 0;
  if (!startedAt || duration < 1) return null;

  const dates = challengeDayDates(startedAt, duration);
  const history = historyRecord ?? {};
  const habitColor = getHabitColor({
    category: habit.category,
    name: habit.name,
    id: habit.id,
  });

  const completedCount = dates.filter((d) => history[d]).length;
  const currentDay = dates.findIndex((d) => d > todayStr) === -1
    ? duration
    : Math.max(1, dates.findIndex((d) => d > todayStr));

  return (
    <div className="space-y-2">
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
            aria-label="Calendar view"
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
        <HabitChallengeHeatmap
          habitId={habit.id}
          dates={dates}
          history={history}
          todayStr={todayStr}
          selectedDate={selectedDate}
          color={habitColor}
          onSelectDate={onSelectDate}
          onToggle={onToggle}
        />
      ) : (
        <div className="grid grid-cols-10 gap-1 sm:gap-1.5 w-full">
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
                className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-mono font-bold transition-colors cursor-pointer border ${
                  done
                    ? "text-on-primary border-primary"
                    : upcoming
                      ? "bg-surface-container-high text-on-surface-variant/40 border-outline/10"
                      : "bg-error/10 text-error border-error/20"
                } ${isToday ? "ring-1 ring-primary" : ""} ${isSelected ? "ring-2 ring-on-surface" : ""}`}
                style={done ? { backgroundColor: habitColor } : undefined}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
