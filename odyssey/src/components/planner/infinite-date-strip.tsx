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

interface InfiniteDateStripProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  todayStr: string;
  habits?: Habit[];
  historyLogs?: Record<string, Record<string, boolean>>;
  todayLogs?: Record<string, HabitLog>;
  /**
   * True until the habit store has completed its first fetch. While it is set
   * the strip renders placeholders instead of counters: an empty store would
   * otherwise print a real-looking "0/0" that snaps to the truth a moment
   * later, which reads as broken data rather than as loading.
   */
  loading?: boolean;
}

import { getHabitColor, isHabitScheduledOnDate } from "@/lib/utils/habit-colors";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function InfiniteDateStrip({
  selectedDate,
  onSelectDate,
  todayStr,
  habits = [],
  historyLogs = {},
  todayLogs = {},
  loading = false,
}: InfiniteDateStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const todayPillRef = useRef<HTMLButtonElement>(null);

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
  const [prevRangeKey, setPrevRangeKey] = useState<string | null>(null);
  const rangeKey = `${selectedDate ?? ""}|${todayStr ?? ""}`;
  if (prevRangeKey !== rangeKey) {
    setPrevRangeKey(rangeKey);
    if (selectedDate && todayStr) {
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
    }
  }

  // Generate date items array
  const dateItems = useMemo(() => {
    const items = [];
    for (let offset = -pastDaysOffset; offset <= futureDaysOffset; offset++) {
      const dateStr = formatOffsetDate(offset);
      const [y, m, dNum] = dateStr.split("-").map(Number);
      const d = new Date(y, m - 1, dNum);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
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

  // Tween helper: a hand-rolled rAF animation rather than behavior:'smooth'.
  // Native smooth scrolling is ignored outright in some environments, and it
  // cannot be eased or cancelled. Kept identical to the habits date strip.
  const scrollAnimRef = useRef<number | null>(null);

  const animateScrollLeft = useCallback(
    (container: HTMLElement, to: number, duration = 420) => {
      if (scrollAnimRef.current !== null) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }

      const from = container.scrollLeft;
      const delta = to - from;
      if (Math.abs(delta) < 1) return;

      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        container.scrollLeft = to;
        return;
      }

      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / duration);
        // easeOutCubic: quick to start, gentle settle.
        const eased = 1 - Math.pow(1 - t, 3);
        container.scrollLeft = from + delta * eased;
        if (t < 1) {
          scrollAnimRef.current = requestAnimationFrame(step);
        } else {
          scrollAnimRef.current = null;
        }
      };
      scrollAnimRef.current = requestAnimationFrame(step);
    },
    []
  );

  useEffect(
    () => () => {
      if (scrollAnimRef.current !== null) cancelAnimationFrame(scrollAnimRef.current);
    },
    []
  );

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
      const left = Math.max(0, targetLeft);

      if (smooth) {
        animateScrollLeft(container, left);
      } else {
        if (scrollAnimRef.current !== null) {
          cancelAnimationFrame(scrollAnimRef.current);
          scrollAnimRef.current = null;
        }
        container.scrollLeft = left;
      }

      checkStickyPosition();

      // Release the programmatic-scroll guard only once the movement settles,
      // otherwise the sticky badge is recomputed mid-animation and the strip
      // appears to jump back.
      const release = () => {
        isProgrammaticScrollRef.current = false;
        isInitializedRef.current = true;
        checkStickyPosition();
      };

      if (smooth) {
        let settleTimer: ReturnType<typeof setTimeout>;
        const onScrollEnd = () => {
          clearTimeout(settleTimer);
          settleTimer = setTimeout(release, 90);
        };
        container.addEventListener("scroll", onScrollEnd, { passive: true });
        settleTimer = setTimeout(() => {
          container.removeEventListener("scroll", onScrollEnd);
          release();
        }, 900);
        return true;
      }

      setTimeout(release, 30);
      return true;
    },
    [checkStickyPosition, animateScrollLeft]
  );

  // Synchronous pre-paint alignment: ensures Today is ALREADY in center before
  // frame 0 paints.
  //
  // Mount-only. Assigning scrollLeft on every date change overrode the
  // animation started by centerDate() in the same tick, which made the strip
  // snap instead of moving.
  const didInitialAlignRef = useRef(false);
  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const target = selectedDate || todayStr;
    const targetEl = container.querySelector<HTMLElement>(
      `[data-date-pill="${target}"]`
    );

    if (didInitialAlignRef.current) {
      checkStickyPosition();
      return;
    }
    didInitialAlignRef.current = true;

    if (targetEl && container.clientWidth > 0) {
      const targetLeft =
        targetEl.offsetLeft - (container.clientWidth - targetEl.clientWidth) / 2;
      container.scrollLeft = Math.max(0, targetLeft);
      isInitializedRef.current = true;
      checkStickyPosition();
    } else {
      // Instant accurate estimate so the track never paints at past days (scrollLeft = 0)
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

  // Pixel-perfect centering fallback.
  //
  // Mount-only by design. Polling with smooth=false on every date change issued
  // an instant scrollTo in the same tick as the animation and cancelled it.
  const didFallbackRef = useRef(false);
  useEffect(() => {
    if (didFallbackRef.current) return;
    didFallbackRef.current = true;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center when app resumes from minimized/background state
  useEffect(() => {
    const handleResume = () => {
      if (document.visibilityState === "visible") {
        const target = selectedDate || todayStr;
        setTimeout(() => {
          centerDate(target, false);
        }, 50);
      }
    };

    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("focus", handleResume);
    return () => {
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("focus", handleResume);
    };
  }, [centerDate, selectedDate, todayStr]);

  // Prepend earlier past days seamlessly without scroll jumping
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
    // A user drag/touch takes over from any in-flight tween, otherwise the
    // animation keeps pulling the strip back toward the selected date.
    if (
      scrollAnimRef.current !== null &&
      !isProgrammaticScrollRef.current &&
      !isPrependingRef.current
    ) {
      cancelAnimationFrame(scrollAnimRef.current);
      scrollAnimRef.current = null;
      isProgrammaticScrollRef.current = false;
    }

    checkStickyPosition();


    // NEVER trigger infinite loads until initial centering is complete or during programmatic scroll
    if (
      !isInitializedRef.current ||
      isProgrammaticScrollRef.current ||
      isPrependingRef.current
    ) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Infinite loading checks
    if (container.scrollLeft < 80) {
      prependDays();
    } else if (
      container.scrollWidth - container.scrollLeft - container.clientWidth < 80
    ) {
      appendDays();
    }
  }, [checkStickyPosition, prependDays, appendDays]);

  return (
    <div className="relative w-full rounded-2xl bg-surface-container-low/90 backdrop-blur-xl border border-outline/[0.08] overflow-visible select-none shadow-sm">
      {/* Scrollable Date Track
          NOTE: vertical padding is load-bearing, not cosmetic.
          `overflow-x-auto` forces overflow-y to `auto` as well, so this element
          clips vertically. With py-1.5 a 14px glow was cut flat at the top and
          bottom edges, rendering as a hard line across the pill. The padding
          contains the glow; the negative margin keeps the layout height the
          same. The outer wrapper also needs overflow-visible for the same
          reason. */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex items-center gap-1.5 overflow-x-auto py-5 px-2 my-[-14px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {dateItems.map((item) => {
          const isSelected = selectedDate === item.dateStr;
          const isToday = item.isToday;
          
          const eligibleHabits = habits.filter((h) => {
            const isScheduled = isHabitScheduledOnDate(h, item.dateStr);
            const isDone = item.dateStr === todayStr
              ? Boolean(todayLogs[h.id]?.completed || historyLogs[h.id]?.[item.dateStr])
              : Boolean(historyLogs[h.id]?.[item.dateStr]);
            return isScheduled || isDone;
          });

          const scheduledHabits = habits.filter((h) => isHabitScheduledOnDate(h, item.dateStr));
          const completedCount = habits.filter((h) => {
            if (item.dateStr === todayStr) {
              return Boolean(todayLogs[h.id]?.completed || historyLogs[h.id]?.[item.dateStr]);
            }
            return Boolean(historyLogs[h.id]?.[item.dateStr]);
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
              className={`min-w-[48px] sm:min-w-[52px] py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 transition-all shrink-0 cursor-pointer ${
                // Identical to the habits date strip. The ring carries the state;
                // an opened day has no body background of its own, because a
                // surface colour reads as a hard rectangle inside the glow.
                //   unselected, not today -> no ring
                //   today, unselected     -> ring + faint wash
                //   opened (any day)      -> ring + glow (+ stronger wash if today)
                isSelected
                  ? `date-ring date-ring-fade-in date-ring-glow date-ring-pulse text-primary font-bold bg-transparent ${
                      isToday ? "date-ring-today-wash-strong" : ""
                    } ${isToday ? "scale-[1.03]" : "scale-105"} z-10`
                  : isToday
                  ? "date-ring date-ring-fade-in date-ring-today-wash font-bold text-primary"
                  : "bg-surface-container/60 hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline/10"
              }`}
            >
              <span
                className={`text-[10px] font-mono uppercase tracking-wider ${
                  isToday || isSelected
                    ? "text-primary font-bold"
                    : "text-on-surface-variant/70"
                }`}
              >
                {item.dayName}
              </span>
              <span
                className={`text-sm font-bold font-mono ${
                  isToday || isSelected ? "text-primary font-bold" : "text-on-surface"
                }`}
              >
                {item.dayNum}
              </span>
              {/* HabitDriven Segmented Rings & Solid Circles (only for eligible/completed habits) */}
              <div className="flex items-center justify-center gap-1 mt-1 min-h-[10px] flex-wrap max-w-full">
                {loading ? (
                  // Unknown yet. A neutral bar of the same height as the
                  // counter pill keeps the row from collapsing and shifting
                  // the strip when the real numbers arrive.
                  <span className="w-8 h-[14px] rounded-full bg-surface-container-highest animate-pulse" />
                ) : eligibleHabits.length === 0 ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-outline/20" title="Rest Day (No habits scheduled)" />
                ) : eligibleHabits.length <= 5 ? (
                  eligibleHabits.map((h) => {
                    const isDone = item.dateStr === todayStr
                      ? Boolean(todayLogs[h.id]?.completed || historyLogs[h.id]?.[item.dateStr])
                      : Boolean(historyLogs[h.id]?.[item.dateStr]);
                    const isScheduled = isHabitScheduledOnDate(h, item.dateStr);
                    const color = getHabitColor(h);

                    return (
                      <span
                        key={h.id}
                        title={`${h.name}: ${
                          isDone
                            ? isScheduled
                              ? "Completed ✓"
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
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold ${
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
            className={`min-w-[48px] py-1.5 px-2 rounded-xl flex flex-col items-center gap-0.5 transition-all active:scale-95 cursor-pointer date-ring date-ring-fade-in text-primary font-bold date-ring-today-wash
              ${selectedDate === todayStr ? "date-ring-glow date-ring-pulse date-ring-today-wash-strong" : ""}`}
            title="Today (click to return)"
          >
            <span className="text-[8px] font-mono uppercase tracking-wider font-extrabold flex items-center gap-0.5">
              TODAY
            </span>
            <span className="text-sm font-bold font-mono leading-none">
              {todayDayNum}
            </span>
            <span className="w-1 h-1 rounded-full bg-primary" />
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
            className={`min-w-[48px] py-1.5 px-2 rounded-xl flex flex-col items-center gap-0.5 transition-all active:scale-95 cursor-pointer date-ring date-ring-fade-in text-primary font-bold date-ring-today-wash
              ${selectedDate === todayStr ? "date-ring-glow date-ring-pulse date-ring-today-wash-strong" : ""}`}
            title="Today (click to return)"
          >
            <span className="text-[8px] font-mono uppercase tracking-wider font-extrabold flex items-center gap-0.5">
              TODAY
            </span>
            <span className="text-sm font-bold font-mono leading-none">
              {todayDayNum}
            </span>
            <span className="w-1 h-1 rounded-full bg-primary" />
          </button>
        </div>
      )}
    </div>
  );
}
