"use client";

import { useMemo, useRef, useEffect } from "react";
import { useHabitStore } from "@/lib/stores/habit-store";
import { useUserStore } from "@/lib/stores/user-store";
import { getHabitColor, getLocalTodayStr } from "@/lib/utils/habit-colors";
import { triggerStreaksConfetti } from "@/lib/utils/confetti";

export interface HabitGitHubHeatmapProps {
  habitId: string;
  name?: string;
  targetDays?: number[]; // [1..7] where 1=Mon, ..., 7=Sun
  targetDaysPerWeek?: number;
  category?: string;
  selectedDate?: string;
  weeksCount?: number; // default 52 (full year)
  todayStr?: string;
  onSelectDate?: (dateStr: string) => void;
  onToggleDate?: (dateStr: string, e: React.MouseEvent) => void;
  showLegend?: boolean;
  showStats?: boolean;
  className?: string;
}

interface HeatmapDay {
  dateStr: string;
  dayNumber: number;
  monthShort: string;
  monthIndex: number;
  year: number;
  weekday: string;
  dayOfWeek: number; // 1=Mon..7=Sun
  rowIndex: number; // 0=Mon..6=Sun
  colIndex: number;
  isScheduled: boolean;
  isToday: boolean;
  isOpened: boolean;
  isFuture: boolean;
  isCompleted: boolean;
}

interface MonthHeader {
  label: string;
  colIndex: number;
}

// 7 rows: Row 0 is Monday (on top), Row 6 is Sunday (on bottom).
// Labeled: M (Mon), W (Wed), F (Fri), S (Sun)
const ROW_LABELS = ["M", "", "W", "", "F", "", "S"];

export function HabitGitHubHeatmap({
  habitId,
  name,
  targetDays,
  targetDaysPerWeek,
  category,
  selectedDate,
  weeksCount = 52,
  todayStr: propTodayStr,
  onSelectDate,
  onToggleDate,
  showLegend = true,
  showStats = true,
  className = "",
}: HabitGitHubHeatmapProps) {
  const { user } = useUserStore();
  const { historyLogs, toggleHabitLog } = useHabitStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const habitColor = useMemo(
    () => getHabitColor({ category, name, id: habitId }),
    [category, name, habitId]
  );

  const today = propTodayStr || getLocalTodayStr();
  const activeSelectedDate = selectedDate || today;

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

  // Compute 52-week continuous GitHub-style matrix ending on current week's Sunday
  const {
    columns,
    monthHeaders,
    totalCompletions,
    scheduledElapsedCount,
    percentage,
  } = useMemo(() => {
    const [ty, tm, td] = today.split("-").map(Number);
    const todayDate = new Date(ty, tm - 1, td);

    // Current week's Sunday (end of week)
    const currentJsDay = todayDate.getDay(); // 0=Sun, 1=Mon..6=Sat
    const currentDayOfWeek = currentJsDay === 0 ? 7 : currentJsDay; // 1=Mon..7=Sun
    const daysUntilSunday = 7 - currentDayOfWeek;

    const endSunday = new Date(ty, tm - 1, td + daysUntilSunday);
    const numWeeks = weeksCount;

    // Start Monday is (numWeeks * 7 - 1) days before endSunday
    const startMonday = new Date(
      endSunday.getFullYear(),
      endSunday.getMonth(),
      endSunday.getDate() - (numWeeks * 7 - 1)
    );

    const habitLogsMap = historyLogs[habitId] || {};
    const cols: HeatmapDay[][] = [];
    const headers: MonthHeader[] = [];

    let completions = 0;
    let scheduledElapsed = 0;
    let lastMonthIndex = -1;
    let lastHeaderCol = -4;

    for (let c = 0; c < numWeeks; c++) {
      const colDays: HeatmapDay[] = [];
      let colNewMonthName = "";
      let colHasMonthStart = false;

      for (let r = 0; r < 7; r++) {
        const dayOffset = c * 7 + r;
        const d = new Date(
          startMonday.getFullYear(),
          startMonday.getMonth(),
          startMonday.getDate() + dayOffset
        );

        const year = d.getFullYear();
        const monthIndex = d.getMonth();
        const dayNumber = d.getDate();

        const monthPadded = String(monthIndex + 1).padStart(2, "0");
        const dayPadded = String(dayNumber).padStart(2, "0");
        const dateStr = `${year}-${monthPadded}-${dayPadded}`;

        const isToday = dateStr === today;
        const isOpened = dateStr === activeSelectedDate;
        const isFuture = dateStr > today;
        const isCompleted = Boolean(habitLogsMap[dateStr]);
        const dayOfWeek = r + 1; // 1=Mon..7=Sun
        const isScheduled = effectiveScheduledDays.includes(dayOfWeek);

        if (isCompleted) completions++;
        if (isScheduled && !isFuture) scheduledElapsed++;

        // Detect if this column contains the start of a new month
        if (monthIndex !== lastMonthIndex && dayNumber <= 7) {
          colHasMonthStart = true;
          colNewMonthName = d.toLocaleDateString("en-US", { month: "short" });
          lastMonthIndex = monthIndex;
        }

        colDays.push({
          dateStr,
          dayNumber,
          monthShort: d.toLocaleDateString("en-US", { month: "short" }),
          monthIndex,
          year,
          weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
          dayOfWeek,
          rowIndex: r,
          colIndex: c,
          isScheduled,
          isToday,
          isOpened,
          isFuture,
          isCompleted,
        });
      }

      // Add month header with spacing
      if (colHasMonthStart && c - lastHeaderCol >= 3) {
        headers.push({
          label: colNewMonthName,
          colIndex: c,
        });
        lastHeaderCol = c;
      }

      cols.push(colDays);
    }

    const pct =
      scheduledElapsed > 0
        ? Math.round((completions / scheduledElapsed) * 100)
        : 0;

    return {
      columns: cols,
      monthHeaders: headers,
      totalCompletions: completions,
      scheduledElapsedCount: scheduledElapsed,
      percentage: pct,
    };
  }, [
    today,
    weeksCount,
    historyLogs,
    habitId,
    activeSelectedDate,
    effectiveScheduledDays,
  ]);

  // Automatically scroll to the right (Today) on mount / date update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [today, weeksCount]);

  const handleDayClick = async (
    e: React.MouseEvent,
    dateStr: string,
    isFuture: boolean,
    _isScheduled: boolean
  ) => {
    e.stopPropagation();

    // 1. If clicking a date different from active selected day: select/open that day
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

  const cellClass = "w-[11.5px] h-[11.5px] sm:w-[12.5px] sm:h-[12.5px] rounded-[2.5px]";
  const gapClass = "gap-[2.5px] sm:gap-[3px]";

  return (
    <div className={`w-full flex flex-col gap-2 pt-1 select-none ${className}`}>
      {/* Top Stats Header */}
      {showStats && (
        <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant px-0.5">
          <span className="font-semibold tracking-wider text-on-surface uppercase text-[9.5px]">
            Contribution Heatmap
          </span>
          <span className="font-semibold shrink-0" style={{ color: habitColor }}>
            {totalCompletions} completed ({percentage}%)
          </span>
        </div>
      )}

      {/* Main Heatmap Container with Fixed Left Day Labels & Scrollable Dots */}
      <div className="flex items-start w-full relative">
        {/* FIXED LEFT DAY-OF-WEEK LABELS (M, W, F, S) */}
        <div className="flex flex-col shrink-0 pr-1.5 select-none z-10">
          {/* Header Spacer matching Month Headers row height */}
          <div className="h-[12px] sm:h-[13px] mb-1 shrink-0" />

          {/* Fixed 7-Row Day-of-Week Labels */}
          <div className={`flex flex-col ${gapClass} shrink-0`}>
            {ROW_LABELS.map((label, rIdx) => (
              <div
                key={rIdx}
                className="h-[11.5px] sm:h-[12.5px] w-3 flex items-center justify-start shrink-0"
              >
                <span className="text-[8px] sm:text-[9px] font-mono font-bold text-on-surface-variant/60 leading-none">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* HORIZONTALLY SCROLLABLE GRID (Month Headers + 52 Week Columns of Dots) */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto scrollbar-none select-none pb-1"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="inline-flex flex-col min-w-max">
            {/* Top Month Labels aligned with week columns */}
            <div className={`flex items-end mb-1 ${gapClass} h-[12px] sm:h-[13px]`}>
              {columns.map((_, colIdx) => {
                const header = monthHeaders.find((h) => h.colIndex === colIdx);
                return (
                  <div
                    key={colIdx}
                    className="w-[11.5px] sm:w-[12.5px] text-[8.5px] sm:text-[9.5px] font-mono font-bold text-on-surface-variant/70 relative shrink-0 leading-none select-none"
                  >
                    {header ? (
                      <span className="absolute left-0 bottom-0 whitespace-nowrap">
                        {header.label}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* 52 Columns of 7 Square Dots (Mon at top, Sun at bottom) */}
            <div className={`flex ${gapClass}`}>
              {columns.map((colDays, colIdx) => (
                <div key={colIdx} className={`flex flex-col ${gapClass} shrink-0`}>
                  {colDays.map((day) => {
                    const isNotScheduled = !day.isScheduled;

                    let backgroundColor: string | undefined = undefined;
                    let borderColor: string | undefined = undefined;
                    let borderWidth: string | undefined = undefined;
                    let borderStyle: string | undefined = undefined;
                    let boxShadow: string | undefined = undefined;

                    if (day.isCompleted) {
                      if (day.isScheduled) {
                        backgroundColor = habitColor;
                        if (day.isOpened) {
                          boxShadow = `0 0 0 1.5px rgba(255,255,255,0.9), 0 0 0 2.5px ${habitColor}, 0 0 6px ${habitColor}`;
                        } else if (day.isToday) {
                          boxShadow = `0 0 0 1px rgba(255,255,255,0.8), 0 0 4px ${habitColor}80`;
                        } else {
                          boxShadow = `0 0 3px ${habitColor}50`;
                        }
                      } else {
                        // Unscheduled / rest-day completed
                        backgroundColor = `${habitColor}80`;
                        borderColor = habitColor;
                        borderWidth = "1px";
                        borderStyle = "solid";
                        if (day.isOpened) {
                          boxShadow = `0 0 0 1.5px rgba(255,255,255,0.85), 0 0 0 2.5px ${habitColor}, 0 0 6px ${habitColor}75`;
                        } else {
                          boxShadow = `0 0 3px ${habitColor}45`;
                        }
                      }
                    } else if (isNotScheduled) {
                      if (day.isOpened) {
                        backgroundColor = `${habitColor}18`;
                        borderColor = `${habitColor}80`;
                        borderWidth = "1px";
                        borderStyle = "solid";
                        boxShadow = `0 0 0 1.5px ${habitColor}80, 0 0 6px ${habitColor}60`;
                      } else {
                        backgroundColor = undefined;
                        borderColor = undefined;
                      }
                    } else if (day.isOpened) {
                      backgroundColor = `${habitColor}22`;
                      borderColor = habitColor;
                      borderWidth = "1.5px";
                      borderStyle = "solid";
                      boxShadow = `0 0 0 1.5px ${habitColor}, 0 0 6px ${habitColor}80`;
                    } else if (day.isToday) {
                      backgroundColor = "transparent";
                      borderColor = habitColor;
                      borderWidth = "1px";
                      borderStyle = "solid";
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
                        title={`${day.weekday}, ${day.monthShort} ${day.dayNumber}, ${day.year}: ${
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
                        className={`${cellClass} flex items-center justify-center transition-all select-none cursor-pointer ${
                          day.isCompleted
                            ? `hover:brightness-110 active:scale-90 ${
                                day.isOpened ? "scale-110 z-10" : "shadow-2xs"
                              }`
                            : isNotScheduled
                            ? day.isOpened
                              ? "scale-110 z-10"
                              : "bg-surface-container-high/50 border border-dashed border-outline/40 hover:border-outline/55 hover:bg-surface-container-high/70"
                            : day.isOpened
                            ? "scale-110 z-10"
                            : day.isToday
                            ? "hover:bg-surface-bright active:scale-90"
                            : "bg-surface-container-highest/80 border border-outline/30 hover:border-outline/50 hover:bg-surface-bright active:scale-90"
                        }`}
                        style={{
                          backgroundColor,
                          borderColor,
                          borderWidth,
                          borderStyle,
                          boxShadow,
                        }}
                      >
                        {!day.isScheduled && day.isCompleted && (
                          <div className="w-1 h-1 rounded-full bg-white shadow-xs" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
