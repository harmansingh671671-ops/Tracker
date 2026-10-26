"use client";

import { PauseCircle, Play } from "lucide-react";
import { type Habit } from "@/lib/db";
import { HabitIcon } from "./habit-icon";
import { getHabitColor } from "@/lib/utils/habit-colors";
import { pauseDaysLeft } from "@/lib/utils/habit-lifecycle";

/**
 * B13 (owner rule): a paused habit stays VISIBLE, at the bottom of the normal
 * habit list, with a "Paused · N days left" chip and a Resume action.
 * It is deliberately NOT a full habit card: a paused habit carries no
 * expectations, so it shows no rings, no counters — just identity, the time
 * left, and the way back.
 */
interface PausedHabitRowProps {
  habit: Habit;
  todayStr: string;
  onResume: (habitId: string) => void;
  /** Opens the edit sheet (identity changes still make sense while paused). */
  onOpen: (habit: Habit) => void;
}

export function PausedHabitRow({ habit, todayStr, onResume, onOpen }: PausedHabitRowProps) {
  const habitColor = getHabitColor(habit);
  const daysLeft = habit.pausedUntil ? pauseDaysLeft(habit.pausedUntil, todayStr) : 0;

  return (
    <div
      className="p-3 rounded-2xl bg-surface-container/60 border border-dashed border-outline/20 opacity-90 flex items-center gap-2.5 select-none"
      onClick={() => onOpen(habit)}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
        style={{ backgroundColor: `${habitColor}18`, borderColor: `${habitColor}35` }}
      >
        <HabitIcon icon={habit.icon} name={habit.name} className="w-4 h-4 shrink-0" style={{ color: habitColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-xs font-bold text-on-surface truncate block" title={habit.name}>
          {habit.name}
        </span>
        <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md bg-surface-container-highest text-[9px] font-mono font-bold text-on-surface-variant">
          <PauseCircle className="w-2.5 h-2.5" />
          Paused · {daysLeft} {daysLeft === 1 ? "day" : "days"} left
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onResume(habit.id);
        }}
        title="Bring this habit back now"
        className="shrink-0 h-8 px-3 rounded-lg bg-surface-container-high text-primary text-[11px] font-mono font-bold border border-outline/15 hover:bg-primary/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
      >
        <Play className="w-3 h-3" />
        Resume
      </button>
    </div>
  );
}
