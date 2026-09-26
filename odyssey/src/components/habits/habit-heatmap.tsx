"use client";

import { useMemo } from "react";
import { useHabitStore } from "@/lib/stores/habit-store";
import { useUserStore } from "@/lib/stores/user-store";

interface HabitHeatmapProps {
  habitId: string;
  category?: string;
  onToggleDate?: (dateStr: string) => void;
}

export function HabitHeatmap({ habitId, onToggleDate }: HabitHeatmapProps) {
  const { user } = useUserStore();
  const { historyLogs, toggleHabitLog } = useHabitStore();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Generate 30 days array (10 columns x 3 rows) leading up to today
  const days = useMemo(() => {
    const list: Array<{
      dateStr: string;
      dayNumber: number;
      monthName: string;
      weekday: string;
      isToday: boolean;
      isCompleted: boolean;
    }> = [];

    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const isCompleted = !!historyLogs[habitId]?.[dateStr];

      list.push({
        dateStr,
        dayNumber: d.getDate(),
        monthName: d.toLocaleDateString("en-US", { month: "short" }),
        weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
        isToday: dateStr === today,
        isCompleted,
      });
    }

    return list;
  }, [habitId, historyLogs, today]);

  const completedCount = useMemo(() => {
    return days.filter((d) => d.isCompleted).length;
  }, [days]);

  const handleDayClick = async (e: React.MouseEvent, dateStr: string) => {
    e.stopPropagation();
    if (!user) return;
    await toggleHabitLog(user.id, habitId, dateStr);
    if (onToggleDate) onToggleDate(dateStr);
  };

  return (
    <div className="w-full flex flex-col gap-2 pt-2.5 mt-2.5 border-t border-outline/10">
      {/* Heatmap Meta Info */}
      <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
        <span className="tracking-wider uppercase font-semibold text-on-surface-variant/80">
          30-Day Flow
        </span>
        <span className="font-semibold text-primary">
          {completedCount}/30 ({Math.round((completedCount / 30) * 100)}%)
        </span>
      </div>

      {/* 10-Column Heatmap Grid */}
      <div className="grid grid-cols-10 gap-1 sm:gap-1.5 w-full">
        {days.map((day) => {
          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={(e) => handleDayClick(e, day.dateStr)}
              title={`${day.monthName} ${day.dayNumber} (${day.weekday}): ${
                day.isCompleted ? "Completed ✓" : "Not completed"
              }${day.isToday ? " • Today" : ""}`}
              className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-mono transition-all active:scale-90 select-none ${
                day.isCompleted
                  ? "bg-primary text-on-primary font-bold shadow-xs shadow-primary/30 border border-primary/40 hover:brightness-110"
                  : day.isToday
                  ? "bg-surface-container-high text-primary border-2 border-primary/70 font-bold hover:bg-surface-bright"
                  : "bg-surface-container-lowest/80 text-on-surface-variant/40 border border-outline/10 hover:border-outline/30 hover:bg-surface-container-high/60 hover:text-on-surface-variant"
              }`}
            >
              <span className="leading-none">{day.dayNumber}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
