"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { type Habit, type HabitLog } from "@/lib/db";
import { useHabitStore } from "@/lib/stores/habit-store";
import { getHabitColor, isHabitScheduledOnDate, getLocalTodayStr } from "@/lib/utils/habit-colors";

interface HabitDateStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  habits: Habit[];
  logsByDate?: Record<string, Record<string, HabitLog>>; // date -> { habitId: HabitLog }
  todayLogs?: Record<string, HabitLog>;
  todayStr?: string;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function HabitDateStrip({
  selectedDate,
  onSelectDate,
  habits,
  logsByDate = {},
  todayLogs = {},
  todayStr: propTodayStr,
}: HabitDateStripProps) {
  const { historyLogs = {} } = useHabitStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const todayPillRef = useRef<HTMLButtonElement>(null);

  const [internalTodayStr, setInternalTodayStr] = useState<string>(getLocalTodayStr);
  const todayStr = propTodayStr || internalTodayStr;

  useEffect(() => {
    const timer = setInterval(() => {
      setInternalTodayStr(getLocalTodayStr());
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Flags to prevent spurious cascading loads during initial layout and centering
  const isInitializedRef = useRef<boolean>(false);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const isPrependingRef = useRef<boolean>(false);

  // Range offsets from today: pastDays (negative) and futureDays (positive)
  const [pastDaysOffset, setPastDaysOffset] = useState<number>(30);
  const [futureDaysOffset, setFutureDaysOffset] = useState<number>(60);

  // "none" | "left" | "right" sticky position for Today
  const [stickySide, setStickyState] = useState<"none" | "left" | "right">("none");

  // Helper to format date YYYY-MM-DD
  const formatOffsetDate = useCallback(
    (offset: number) => {
      const [ty, tm, td] = todayStr.split("-").map(Number);
      const d = new Date(ty, tm - 1, td);
      d.setDate(d.getDate() + offset);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    [todayStr]
  );

  // Today's day number for sticky badge
  const todayDayNum = useMemo(() => {
    if (!todayStr) return new Date().getDate();
    return parseInt(todayStr.split("-")[2], 10);
  }, [todayStr]);

  // Expand range dynamically if selectedDate lies beyond the current window
  useEffect(() => {
    if (!selectedDate || !todayStr) return;
    const [sy, sm, sd] = selectedDate.split("-").map(Number);
    const [ty, tm, td] = todayStr.split("-").map(Number);
    const sTime = new Date(sy, sm - 1, sd).getTime();
    const tTime = new Date(ty, tm - 1, td).getTime();
    const diffDays = Math.round((sTime - tTime) / (1000 * 60 * 60 * 24));

    if (diffDays < -pastDaysOffset) {
      setPastDaysOffset(Math.abs(diffDays) + 15);
    } else if (diffDays > futureDaysOffset) {
      setFutureDaysOffset(diffDays + 20);
    }
  }, [selectedDate, todayStr, pastDaysOffset, futureDaysOffset]);

  // Generate date items array
  const dateItems = useMemo(() => {
    const items = [];
    for (let offset = -pastDaysOffset; offset <= futureDaysOffset; offset++) {
      const dateStr = formatOffsetDate(offset);
      const [y, m, dNum] = dateStr.split("-").map(Number);
      const d = new Date(y, m - 1, dNum);
      const dayName = d.toLocaleDateString("en-US", { weekday: "narrow" }); // M, T, W, T, F, S, S
      const isToday = dateStr === todayStr;
      items.push({ dateStr, dayName, dayNum: dNum, isToday });
    }
    return items;
  }, [pastDaysOffset, futureDaysOffset, formatOffsetDate, todayStr]);

  // Check sticky position for Today relative to visible track
  const checkStickyPosition = useCallback(() => {
    const container = containerRef.current;
    const todayEl = todayPillRef.current;
    if (!container || !todayEl) return;

    const cRect = container.getBoundingClientRect();
    const tRect = todayEl.getBoundingClientRect();

    if (tRect.right < cRect.left + 45) {
      setStickyState("left");
    } else if (tRect.left > cRect.right - 45) {
      setStickyState("right");
    } else {
      setStickyState("none");
    }
  }, []);

  // Center a target date in the visible track
  const centerDate = useCallback(
    (targetDateStr: string, smooth: boolean = false): boolean => {
      const container = containerRef.current;
      if (!container || container.clientWidth === 0) return false;

      const targetEl = container.querySelector<HTMLElement>(
        `[data-date-pill="${targetDateStr}"]`
      );
      if (!targetEl) return false;

      isProgrammaticScrollRef.current = true;
      const targetLeft =
        targetEl.offsetLeft - (container.clientWidth - targetEl.clientWidth) / 2;

      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: smooth ? "smooth" : "auto",
      });

      checkStickyPosition();

      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
        isInitializedRef.current = true;
        checkStickyPosition();
      }, smooth ? 250 : 30);

      return true;
    },
    [checkStickyPosition]
  );

  // Synchronous pre-paint alignment: ensures target is centered before paint
  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const target = selectedDate || todayStr;
    const targetEl = container.querySelector<HTMLElement>(
      `[data-date-pill="${target}"]`
    );

    if (targetEl && container.clientWidth > 0) {
      const targetLeft =
        targetEl.offsetLeft - (container.clientWidth - targetEl.clientWidth) / 2;
      container.scrollLeft = Math.max(0, targetLeft);
      isInitializedRef.current = true;
      checkStickyPosition();
    } else {
      const [ty, tm, td] = todayStr.split("-").map(Number);
      const [sy, sm, sd] = (selectedDate || todayStr).split("-").map(Number);
      const diff = Math.round(
        (new Date(sy, sm - 1, sd).getTime() - new Date(ty, tm - 1, td).getTime()) /
          86400000
      );
      const targetIdx = Math.max(0, pastDaysOffset + diff);
      const approxOffset = targetIdx * 54;
      const clientW =
        container.clientWidth ||
        (typeof window !== "undefined" ? window.innerWidth : 360);
      container.scrollLeft = Math.max(0, approxOffset - clientW / 2 + 26);
    }
  }, [selectedDate, todayStr, pastDaysOffset, checkStickyPosition]);

  // Centering fallback
  useEffect(() => {
    const target = selectedDate || todayStr;
    if (!target) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const success = centerDate(target, false);
      if (success || attempts >= 15) {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [centerDate, selectedDate, todayStr]);

  // Prepend earlier past days seamlessly
  const prependDays = useCallback(() => {
    if (isPrependingRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    isPrependingRef.current = true;
    const prevScrollWidth = container.scrollWidth;
    const prevScrollLeft = container.scrollLeft;

    setPastDaysOffset((prev) => {
      const next = prev + 25;
      requestAnimationFrame(() => {
        if (container) {
          const diff = container.scrollWidth - prevScrollWidth;
          container.scrollLeft = prevScrollLeft + diff;
        }
        setTimeout(() => {
          isPrependingRef.current = false;
        }, 60);
      });
      return next;
    });
  }, []);

  // Append future days
  const appendDays = useCallback(() => {
    setFutureDaysOffset((prev) => prev + 25);
  }, []);

  // Monitor scroll for infinite loading & sticky Today positioning
  const handleScroll = useCallback(() => {
    checkStickyPosition();

    if (
      !isInitializedRef.current ||
      isProgrammaticScrollRef.current ||
      isPrependingRef.current
    ) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    if (container.scrollLeft < 80) {
      prependDays();
    } else if (
      container.scrollWidth - container.scrollLeft - container.clientWidth < 80
    ) {
      appendDays();
    }
  }, [checkStickyPosition, prependDays, appendDays]);

  // Dynamic Month & Year formatted header from selectedDate
  const formattedMonthYear = useMemo(() => {
    const [y, m, d] = (selectedDate || todayStr).split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }, [selectedDate, todayStr]);

  return (
    <div className="relative w-full rounded-2xl bg-surface-container-low/90 backdrop-blur-md border border-outline/10 p-3 sm:p-3.5 shadow-sm space-y-2 select-none overflow-hidden">
      {/* Month Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">
          {formattedMonthYear}
        </span>
      </div>

      {/* Horizontal Scrollable Date Track */}
      <div className="relative w-full">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {dateItems.map((item) => {
            const isSelected = selectedDate === item.dateStr;
            const isToday = item.isToday;

            // Calculate habit completions and scheduled habits for this date
            const dateLogs = item.dateStr === todayStr ? todayLogs : logsByDate[item.dateStr] || {};
            
            // Filter habits relevant to this date: scheduled or already completed
            const eligibleHabits = habits.filter((h) => {
              const isScheduled = isHabitScheduledOnDate(h, item.dateStr);
              const isDone = Boolean(dateLogs[h.id]?.completed || historyLogs[h.id]?.[item.dateStr]);
              return isScheduled || isDone;
            });

            const scheduledHabits = habits.filter((h) => isHabitScheduledOnDate(h, item.dateStr));
            const completedCount = habits.filter((h) => {
              return Boolean(dateLogs[h.id]?.completed || historyLogs[h.id]?.[item.dateStr]);
            }).length;
            const isAllCompleted = scheduledHabits.length > 0 && completedCount >= scheduledHabits.length;

            return (
              <button
                key={item.dateStr}
                ref={isToday ? todayPillRef : undefined}
                data-date-pill={item.dateStr}
                type="button"
                onClick={() => {
                  onSelectDate(item.dateStr);
                  centerDate(item.dateStr, true);
                }}
                className={`min-w-[48px] sm:min-w-[52px] py-2 px-1 rounded-xl flex flex-col items-center justify-between transition-all shrink-0 cursor-pointer select-none ${
                  isToday
                    ? "today-glow-ring today-glow-ring-after font-bold"
                    : ""
                } ${
                  isSelected
                    ? isToday
                      ? // Today keeps its own surface so the ring stays legible,
                        // but lifts slightly so the glow reads clearly.
                        "bg-surface-container-high text-primary scale-[1.03] z-10"
                      : "bg-primary text-on-primary font-black shadow-md shadow-primary/25 scale-105 z-10"
                    : isToday
                    ? // Differentiated from ordinary unselected days by a faint
                      // primary tint, so today is findable when another date
                      // is selected.
                      "bg-primary/10 text-primary hover:bg-primary/15"
                    : "bg-surface-container/60 hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline/10"
                }`}
              >
                {/* Day name (M, T, W...) */}
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider ${
                    isToday
                      ? "text-primary font-bold"
                      : isSelected
                      ? "text-on-primary font-bold"
                      : "text-on-surface-variant/70"
                  }`}
                >
                  {item.dayName}
                </span>

                {/* Date Number */}
                <span
                  className={`text-sm sm:text-base font-mono my-0.5 leading-tight ${
                    isToday
                      ? "text-primary font-bold"
                      : isSelected
                      ? "text-on-primary font-black"
                      : "text-on-surface font-semibold"
                  }`}
                >
                  {item.dayNum}
                </span>

                {/* HabitDriven Segmented Rings & Solid Circles (only for eligible/completed habits) */}
                <div className="flex items-center justify-center gap-1 mt-1 min-h-[10px] flex-wrap max-w-full">
                  {eligibleHabits.length === 0 ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-outline/20" title="Rest Day (No habits scheduled)" />
                  ) : eligibleHabits.length <= 5 ? (
                    eligibleHabits.map((h) => {
                      const isDone = Boolean(dateLogs[h.id]?.completed || historyLogs[h.id]?.[item.dateStr]);
                      const isScheduled = isHabitScheduledOnDate(h, item.dateStr);
                      const color = getHabitColor(h);

                      return (
                        <span
                          key={h.id}
                          title={`${h.name}: ${
                            isDone
                              ? isScheduled
                                ? "Completed âœ“"
                                : "Unscheduled Completed (!)"
                              : "Pending"
                          }`}
                          className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-200 shrink-0 ${
                            isDone
                              ? "scale-105"
                              : "bg-transparent"
                          }`}
                          style={{
                            backgroundColor: isDone ? (isScheduled ? color : `${color}85`) : "transparent",
                            borderColor: color,
                            borderWidth: isDone ? "0px" : "2px",
                            borderStyle: "solid",
                            boxShadow: isDone ? `0 0 6px ${color}80` : undefined,
                          }}
                        />
                      );
                    })
                  ) : (
                    // Compact progress pill when > 5 habits
                    <div
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8.5px] font-mono font-bold ${
                        isSelected
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : isAllCompleted
                          ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                          : "bg-surface-container-highest text-on-surface-variant"
                      }`}
                    >
                      <span>{completedCount}/{scheduledHabits.length || eligibleHabits.length}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Sticky Today Pill - Stuck on Left Side when user scrolls into future */}
        {stickySide === "left" && (
          <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pl-1 pr-6 bg-gradient-to-r from-surface-container-low via-surface-container-low/95 to-transparent pointer-events-auto animate-in fade-in duration-150">
            <button
              type="button"
              onClick={() => {
                onSelectDate(todayStr);
                centerDate(todayStr, true);
              }}
              className={`min-w-[48px] py-1.5 px-2 rounded-xl flex flex-col items-center gap-0.5 transition-all active:scale-95 cursor-pointer today-glow-ring today-glow-ring-after ${
                selectedDate === todayStr
                  ? "bg-surface-container-high text-primary font-black"
                  : "bg-surface-container-high/80 text-primary hover:bg-surface-container-highest"
              }`}
              title="Today (click to return)"
            >
              <span className="text-[8px] font-mono uppercase tracking-wider font-extrabold flex items-center gap-0.5">
                TODAY
              </span>
              <span className="text-sm font-bold font-mono leading-none">
                {todayDayNum}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </button>
          </div>
        )}

        {/* Sticky Today Pill - Stuck on Right Side when user scrolls into past */}
        {stickySide === "right" && (
          <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center pr-1 pl-6 bg-gradient-to-l from-surface-container-low via-surface-container-low/95 to-transparent pointer-events-auto animate-in fade-in duration-150">
            <button
              type="button"
              onClick={() => {
                onSelectDate(todayStr);
                centerDate(todayStr, true);
              }}
              className={`min-w-[48px] py-1.5 px-2 rounded-xl flex flex-col items-center gap-0.5 transition-all active:scale-95 cursor-pointer today-glow-ring today-glow-ring-after ${
                selectedDate === todayStr
                  ? "bg-surface-container-high text-primary font-black"
                  : "bg-surface-container-high/80 text-primary hover:bg-surface-container-highest"
              }`}
              title="Today (click to return)"
            >
              <span className="text-[8px] font-mono uppercase tracking-wider font-extrabold flex items-center gap-0.5">
                TODAY
              </span>
              <span className="text-sm font-bold font-mono leading-none">
                {todayDayNum}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
