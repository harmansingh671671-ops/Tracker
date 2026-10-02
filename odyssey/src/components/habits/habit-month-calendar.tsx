"use client";

import { useState, useEffect, useMemo } from "react";
import { useHabitStore } from "@/lib/stores/habit-store";
import { useUserStore } from "@/lib/stores/user-store";
import { getHabitColor, getLocalTodayStr } from "@/lib/utils/habit-colors";
import { triggerStreaksConfetti } from "@/lib/utils/confetti";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface HabitMonthCalendarProps {
  habitId: string;
  name?: string;
  targetDays?: number[]; // [1..7] where 1=Mon, ..., 7=Sun
  targetDaysPerWeek?: number;
  category?: string;
  selectedDate?: string;
  todayStr?: string;
  onSelectDate?: (dateStr: string) => void;
  onToggleDate?: (dateStr: string, e: React.MouseEvent) => void;
  className?: string;
}

export function HabitMonthCalendar({
  habitId,
  name,
  targetDays,
  targetDaysPerWeek,
  category,
  selectedDate,
  todayStr: propTodayStr,
  onSelectDate,
  onToggleDate,
  className = "",
}: HabitMonthCalendarProps) {
  const { user } = useUserStore();
  const { historyLogs, toggleHabitLog } = useHabitStore();

  const habitColor = useMemo(
    () => getHabitColor({ category, name, id: habitId }),
    [category, name, habitId]
  );

  const today = propTodayStr || getLocalTodayStr();
  const activeSelectedDate = selectedDate || today;

  // Track navigated month and year with functional arrows
  const [viewYear, setViewYear] = useState(() => {
    const [y] = (selectedDate || today).split("-").map(Number);
    return y || new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const [_, m] = (selectedDate || today).split("-").map(Number);
    return m !== undefined ? m - 1 : new Date().getMonth();
  });

  // Keep view aligned if selectedDate jumps to a different month
  useEffect(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split("-").map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [selectedDate]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    if (
      viewYear > now.getFullYear() + 1 ||
      (viewYear === now.getFullYear() + 1 && viewMonth >= 11)
    ) {
      return;
    }
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Effective scheduled days of week (1=Mon..7=Sun)
  const effectiveScheduledDays = useMemo<number[]>(() => {
    if (targetDays && targetDays.length > 0) return targetDays;
    if (targetDaysPerWeek === 5) return [1, 2, 3, 4, 5];
    if (targetDaysPerWeek === 3) return [1, 3, 5];
    if (targetDaysPerWeek && targetDaysPerWeek < 7) {
      return Array.from({ length: targetDaysPerWeek }, (_, i) => i + 1);
    }
    return [1, 2, 3, 4, 5, 6, 7];
  }, [targetDays, targetDaysPerWeek]);

  // Generate days for the selected month starting from the 1st of the month (1..totalDays)
  const { monthName, days, completedCount, elapsedDaysInMonth, percentage } =
    useMemo(() => {
      const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
      const dateForLabel = new Date(viewYear, viewMonth, 1);
      const monthLabel = dateForLabel.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      const [ty, tm, td] = today.split("-").map(Number);
      const isCurrentMonth = viewYear === ty && viewMonth === tm - 1;
      const isPastMonth =
        viewYear < ty || (viewYear === ty && viewMonth < tm - 1);
      const elapsedDays = isCurrentMonth ? td : isPastMonth ? totalDays : 0;

      const habitLogsMap = historyLogs[habitId] || {};
      const list = [];

      let completedInMonth = 0;
      let scheduledElapsed = 0;

      for (let d = 1; d <= totalDays; d++) {
        const monthPadded = String(viewMonth + 1).padStart(2, "0");
        const dayPadded = String(d).padStart(2, "0");
        const dateStr = `${viewYear}-${monthPadded}-${dayPadded}`;
        const isToday = dateStr === today;
        const isOpened = dateStr === activeSelectedDate;
        const isFuture = dateStr > today;
        const isCompleted = Boolean(habitLogsMap[dateStr]);

        const dateObj = new Date(viewYear, viewMonth, d);
        const jsDay = dateObj.getDay();
        const dayOfWeek = jsDay === 0 ? 7 : jsDay;
        const isScheduled = effectiveScheduledDays.includes(dayOfWeek);

        if (isCompleted) completedInMonth++;
        if (isScheduled && !isFuture) scheduledElapsed++;

        list.push({
          dateStr,
          dayNumber: d,
          monthShort: dateObj.toLocaleDateString("en-US", { month: "short" }),
          weekday: dateObj.toLocaleDateString("en-US", { weekday: "short" }),
          dayOfWeek,
          isScheduled,
          isToday,
          isOpened,
          isFuture,
          isCompleted,
        });
      }

      const denominator = scheduledElapsed > 0 ? scheduledElapsed : Math.max(1, elapsedDays);
      const pct = Math.min(100, Math.round((completedInMonth / denominator) * 100));

      return {
        monthName: monthLabel,
        days: list,
        completedCount: completedInMonth,
        totalDaysInMonth: totalDays,
        elapsedDaysInMonth: elapsedDays,
        percentage: pct,
      };
    }, [
      viewYear,
      viewMonth,
      today,
      historyLogs,
      habitId,
      activeSelectedDate,
      effectiveScheduledDays,
    ]);

  const handleDayClick = async (
    e: React.MouseEvent,
    dateStr: string,
    isFuture: boolean,
    _isScheduled: boolean
  ) => {
    e.stopPropagation();

    // 1. If clicking a date different from active selected date: select/open that day
    if (dateStr !== activeSelectedDate) {
      if (onSelectDate) {
        onSelectDate(dateStr);
      }
      return;
    }

    // 2. If clicking on already selected day: toggle completion
    if (isFuture) return;

    if (onToggleDate) {
      onToggleDate(dateStr, e);
    } else if (user) {
      const isNowCompleted = await toggleHabitLog(user.id, habitId, dateStr);
      if (isNowCompleted) {
        triggerStreaksConfetti(e.clientX, e.clientY, habitColor);
      }
    }
  };

  return (
    <div
      className={`w-full flex flex-col gap-2 pt-2 mt-2 border-t border-outline/10 select-none ${className}`}
    >
      {/* Month Header with Functional Changing Arrows & Meta Info */}
      <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant px-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="tracking-wider uppercase font-semibold text-on-surface text-[9.5px] sm:text-[10px] truncate">
            {monthName}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={handlePrevMonth}
              className="w-5 h-5 rounded-md bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors active:scale-90 cursor-pointer border border-outline/10"
              title="Previous month"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={handleNextMonth}
              className="w-5 h-5 rounded-md bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors active:scale-90 cursor-pointer border border-outline/10"
              title="Next month"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <span
          className="font-semibold shrink-0 text-[10px]"
          style={{ color: habitColor }}
        >
          {completedCount}/{elapsedDaysInMonth || 1} ({percentage}%)
        </span>
      </div>

      {/* 10-Column Calendar Matrix (1..31 going left-to-right) */}
      <div className="grid grid-cols-10 gap-1 sm:gap-1.5 w-full min-w-0">
        {days.map((day) => {
          const isNotScheduled = !day.isScheduled;

          let backgroundColor: string | undefined = undefined;
          let borderColor: string | undefined = undefined;
          let color: string | undefined = undefined;
          let borderWidth: string | undefined = undefined;
          let borderStyle: string | undefined = undefined;
          let boxShadow: string | undefined = undefined;

          if (day.isCompleted) {
            if (day.isScheduled) {
              backgroundColor = habitColor;
              color = "#FFFFFF";
              if (day.isOpened) {
                boxShadow = `0 0 0 1.5px rgba(255,255,255,0.9), 0 0 0 2.5px ${habitColor}, 0 0 8px ${habitColor}`;
              } else if (day.isToday) {
                boxShadow = `0 0 0 1px rgba(255,255,255,0.8), 0 0 6px ${habitColor}80`;
              } else {
                boxShadow = `0 0 4px ${habitColor}60`;
              }
            } else {
              // Unscheduled / rest day completed
              backgroundColor = `${habitColor}75`;
              borderColor = habitColor;
              borderWidth = "1px";
              borderStyle = "solid";
              color = "#FFFFFF";
              if (day.isOpened) {
                boxShadow = `0 0 0 1.5px rgba(255,255,255,0.85), 0 0 0 2.5px ${habitColor}, 0 0 8px ${habitColor}75`;
              } else {
                boxShadow = `0 0 4px ${habitColor}45`;
              }
            }
          } else if (isNotScheduled) {
            if (day.isOpened) {
              backgroundColor = `${habitColor}18`;
              borderColor = `${habitColor}80`;
              borderWidth = "1px";
              borderStyle = "solid";
              color = habitColor;
              boxShadow = `0 0 0 1.5px ${habitColor}80, 0 0 8px ${habitColor}60`;
            } else {
              backgroundColor = undefined;
              borderColor = undefined;
              color = undefined;
            }
          } else if (day.isOpened) {
            backgroundColor = `${habitColor}22`;
            borderColor = habitColor;
            borderWidth = "1.5px";
            borderStyle = "solid";
            color = habitColor;
            boxShadow = `0 0 0 1.5px ${habitColor}, 0 0 8px ${habitColor}90`;
          } else if (day.isToday) {
            backgroundColor = "transparent";
            borderColor = habitColor;
            borderWidth = "1px";
            borderStyle = "solid";
            color = habitColor;
            boxShadow = `0 0 0 1px ${habitColor}60`;
          }

          return (
            <button
              key={day.dateStr}
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) =>
                handleDayClick(
                  e,
                  day.dateStr,
                  day.isFuture,
                  day.isScheduled
                )
              }
              title={`${day.monthShort} ${day.dayNumber} (${day.weekday}): ${
                day.isCompleted
                  ? day.isScheduled
                    ? "Completed ✓"
                    : "Unscheduled Completed (!)"
                  : isNotScheduled
                  ? "Rest Day (Click to open / register)"
                  : day.isFuture
                  ? "Upcoming"
                  : "Not completed"
              }${
                day.isOpened
                  ? " • Opened Day (Click to toggle)"
                  : day.isToday
                  ? " • Today"
                  : " • Click to open day"
              }`}
              className={`aspect-square rounded-[4px] sm:rounded-md flex items-center justify-center font-mono transition-all select-none cursor-pointer ${
                day.isCompleted
                  ? `font-bold hover:brightness-110 active:scale-90 ${
                      day.isOpened ? "scale-105 z-10 font-black" : "shadow-xs"
                    }`
                  : isNotScheduled
                  ? day.isOpened
                    ? "font-black scale-105 hover:brightness-110 active:scale-90 z-10 text-[8.5px] sm:text-[9.5px]"
                    : "bg-surface-container-high/50 text-on-surface-variant/60 border border-dashed border-outline/40 hover:border-outline/55 hover:bg-surface-container-high/70 hover:text-on-surface text-[8.5px] sm:text-[9px]"
                  : day.isOpened
                  ? "font-black scale-105 hover:brightness-110 active:scale-90 z-10 text-[8.5px] sm:text-[9.5px]"
                  : day.isToday
                  ? "font-bold hover:bg-surface-bright active:scale-90 text-[8.5px] sm:text-[9.5px]"
                  : "bg-surface-container-highest/80 text-on-surface font-semibold border border-outline/30 hover:border-outline/50 hover:bg-surface-bright active:scale-90 text-[8.5px] sm:text-[9px]"
              }`}
              style={{
                backgroundColor,
                borderColor,
                color,
                borderWidth,
                borderStyle,
                boxShadow,
              }}
            >
              <span
                className={`leading-none ${
                  !day.isScheduled && day.isCompleted
                    ? "font-black text-[9px] sm:text-[9.5px]"
                    : "text-[8.5px] sm:text-[9px]"
                }`}
              >
                {!day.isScheduled && day.isCompleted ? "!" : day.dayNumber}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
