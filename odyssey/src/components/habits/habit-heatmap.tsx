"use client";

import { useMemo } from "react";
import { useHabitStore } from "@/lib/stores/habit-store";
import { useUserStore } from "@/lib/stores/user-store";

interface HabitHeatmapProps {
  habitId: string;
  targetDays?: number[]; // [1..7] where 1=Mon, ..., 7=Sun
  targetDaysPerWeek?: number;
  category?: string;
  onToggleDate?: (dateStr: string) => void;
}

export function HabitHeatmap({
  habitId,
  targetDays,
  targetDaysPerWeek,
  onToggleDate,
}: HabitHeatmapProps) {
  const { user } = useUserStore();
  const { historyLogs, toggleHabitLog } = useHabitStore();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Compute effective scheduled days of week (1=Mon..7=Sun)
  const effectiveScheduledDays = useMemo<number[]>(() => {
    if (targetDays && targetDays.length > 0) return targetDays;
    if (targetDaysPerWeek === 5) return [1, 2, 3, 4, 5];
    if (targetDaysPerWeek === 3) return [1, 3, 5];
    if (targetDaysPerWeek && targetDaysPerWeek < 7) {
      return Array.from({ length: targetDaysPerWeek }, (_, i) => i + 1);
    }
    return [1, 2, 3, 4, 5, 6, 7];
  }, [targetDays, targetDaysPerWeek]);

  // Generate days for current month starting from 1st of month (1..totalDays)
  const { monthName, days, completedCount, scheduledElapsedCount, percentage } = useMemo(() => {
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
      dayOfWeek: number;
      isScheduled: boolean;
      isToday: boolean;
      isFuture: boolean;
      isCompleted: boolean;
    }> = [];

    let scheduledElapsed = 0;

    for (let d = 1; d <= totalDays; d++) {
      const monthPadded = String(month + 1).padStart(2, "0");
      const dayPadded = String(d).padStart(2, "0");
      const dateStr = `${year}-${monthPadded}-${dayPadded}`;
      const isToday = dateStr === today;
      const isFuture = dateStr > today;
      const isCompleted = !!historyLogs[habitId]?.[dateStr];

      const dateObj = new Date(year, month, d);
      const jsDay = dateObj.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const dayOfWeek = jsDay === 0 ? 7 : jsDay; // 1=Mon, ..., 7=Sun
      const isScheduled = effectiveScheduledDays.includes(dayOfWeek);

      if (isScheduled && d <= currentDayNum) {
        scheduledElapsed++;
      }

      list.push({
        dateStr,
        dayNumber: d,
        monthShort: dateObj.toLocaleDateString("en-US", { month: "short" }),
        weekday: dateObj.toLocaleDateString("en-US", { weekday: "short" }),
        dayOfWeek,
        isScheduled,
        isToday,
        isFuture,
        isCompleted,
      });
    }

    const completed = list.filter((d) => d.isCompleted).length;
    const denominator = scheduledElapsed > 0 ? scheduledElapsed : currentDayNum;
    const pct = Math.round((completed / Math.max(1, denominator)) * 100);

    return {
      monthName: monthLabel,
      days: list,
      completedCount: completed,
      scheduledElapsedCount: scheduledElapsed,
      percentage: pct,
    };
  }, [habitId, effectiveScheduledDays, historyLogs, today]);

  const handleDayClick = async (
    e: React.MouseEvent,
    dateStr: string,
    isFuture: boolean,
    isScheduled: boolean
  ) => {
    e.stopPropagation();
    if (isFuture || !isScheduled || !user) return;
    await toggleHabitLog(user.id, habitId, dateStr);
    if (onToggleDate) onToggleDate(dateStr);
  };

  return (
    <div className="w-full flex flex-col gap-2 pt-2.5 mt-2.5 border-t border-outline/10">
      {/* Heatmap Month Header */}
      <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
        <span className="tracking-wider uppercase font-semibold text-on-surface-variant/90">
          {monthName}
        </span>
        <span className="font-semibold text-primary">
          {completedCount}/{scheduledElapsedCount || 1} completed ({percentage}%)
        </span>
      </div>

      {/* 10-Column Heatmap Grid Starting at 1st of Month */}
      <div className="grid grid-cols-10 gap-1 sm:gap-1.5 w-full">
        {days.map((day) => {
          const isNotScheduled = !day.isScheduled;

          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={(e) => handleDayClick(e, day.dateStr, day.isFuture, day.isScheduled)}
              disabled={day.isFuture || (isNotScheduled && !day.isCompleted)}
              title={`${day.monthShort} ${day.dayNumber} (${day.weekday}): ${
                day.isCompleted
                  ? "Completed ✓"
                  : isNotScheduled
                  ? "Rest Day (Not scheduled)"
                  : day.isFuture
                  ? "Upcoming"
                  : "Not completed"
              }${day.isToday ? " • Today" : ""}`}
              className={`aspect-[1.35/1] rounded-[5px] flex items-center justify-center text-[9px] font-mono transition-all select-none ${
                day.isCompleted
                  ? `bg-primary text-on-primary font-bold shadow-xs shadow-primary/30 border border-primary/40 hover:brightness-110 active:scale-90 cursor-pointer ${
                      day.isToday ? "ring-2 ring-primary/80 ring-offset-1 ring-offset-surface-container" : ""
                    }`
                  : isNotScheduled
                  ? "bg-surface-container-lowest/30 text-on-surface-variant/20 border border-outline/5 opacity-35 cursor-not-allowed pointer-events-none"
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
