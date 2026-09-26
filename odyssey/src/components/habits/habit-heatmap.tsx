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

  // Generate days for the current month starting from the 1st of the month (1..daysInMonth)
  const { monthName, days, completedCount, elapsedDaysInMonth } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const currentDayNum = now.getDate();
    const monthLabel = now.toLocaleDateString("en-US", { month: "long" });

    const list: Array<{
      dateStr: string;
      dayNumber: number;
      monthShort: string;
      weekday: string;
      isToday: boolean;
      isFuture: boolean;
      isCompleted: boolean;
    }> = [];

    for (let d = 1; d <= totalDays; d++) {
      const monthPadded = String(month + 1).padStart(2, "0");
      const dayPadded = String(d).padStart(2, "0");
      const dateStr = `${year}-${monthPadded}-${dayPadded}`;
      const isToday = dateStr === today;
      const isFuture = dateStr > today;
      const isCompleted = !!historyLogs[habitId]?.[dateStr];

      const dateObj = new Date(year, month, d);
      list.push({
        dateStr,
        dayNumber: d,
        monthShort: dateObj.toLocaleDateString("en-US", { month: "short" }),
        weekday: dateObj.toLocaleDateString("en-US", { weekday: "short" }),
        isToday,
        isFuture,
        isCompleted,
      });
    }

    const completed = list.filter((d) => d.isCompleted).length;

    return {
      monthName: monthLabel,
      days: list,
      completedCount: completed,
      totalDaysInMonth: totalDays,
      elapsedDaysInMonth: currentDayNum,
    };
  }, [habitId, historyLogs, today]);

  const handleDayClick = async (e: React.MouseEvent, dateStr: string, isFuture: boolean) => {
    e.stopPropagation();
    if (isFuture || !user) return;
    await toggleHabitLog(user.id, habitId, dateStr);
    if (onToggleDate) onToggleDate(dateStr);
  };

  const percentage = Math.round((completedCount / Math.max(1, elapsedDaysInMonth)) * 100);

  return (
    <div className="w-full flex flex-col gap-2 pt-2.5 mt-2.5 border-t border-outline/10">
      {/* Heatmap Month Header */}
      <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
        <span className="tracking-wider uppercase font-semibold text-on-surface-variant/90">
          {monthName}
        </span>
        <span className="font-semibold text-primary">
          {completedCount}/{elapsedDaysInMonth} completed ({percentage}%)
        </span>
      </div>

      {/* 10-Column Heatmap Grid Starting at 1st of Month */}
      <div className="grid grid-cols-10 gap-1 sm:gap-1.5 w-full">
        {days.map((day) => {
          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={(e) => handleDayClick(e, day.dateStr, day.isFuture)}
              disabled={day.isFuture}
              title={`${day.monthShort} ${day.dayNumber} (${day.weekday}): ${
                day.isCompleted
                  ? "Completed ✓"
                  : day.isFuture
                  ? "Upcoming"
                  : "Not completed"
              }${day.isToday ? " • Today" : ""}`}
              className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-mono transition-all select-none ${
                day.isCompleted
                  ? `bg-primary text-on-primary font-bold shadow-xs shadow-primary/30 border border-primary/40 hover:brightness-110 active:scale-90 cursor-pointer ${
                      day.isToday ? "ring-2 ring-primary/80 ring-offset-1 ring-offset-surface-container" : ""
                    }`
                  : day.isToday
                  ? "bg-surface-container-high text-primary border-2 border-primary/80 font-bold hover:bg-surface-bright active:scale-90 cursor-pointer"
                  : day.isFuture
                  ? "bg-surface-container-lowest/40 text-on-surface-variant/20 border border-outline/5 cursor-default"
                  : "bg-surface-container-lowest/80 text-on-surface-variant/40 border border-outline/10 hover:border-outline/30 hover:bg-surface-container-high/60 hover:text-on-surface-variant active:scale-90 cursor-pointer"
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
