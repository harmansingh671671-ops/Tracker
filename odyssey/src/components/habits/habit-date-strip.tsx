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

  // Center a target date in the visible track.
  //
  // Uses a hand-rolled tween rather than `behavior: "smooth"`. Native smooth
  // scrolling is ignored outright in some environments (verified here: an
  // "auto" scroll moved the container, a "smooth" one produced zero scroll
  // events and no movement at all), and it also cannot be cancelled or eased
  // to taste. The tween below works everywhere and is interruptible.
  const scrollAnimRef = useRef<number | null>(null);

  const animateScrollLeft = useCallback((container: HTMLElement, to: number, duration = 420) => {
    if (scrollAnimRef.current !== null) {
      cancelAnimationFrame(scrollAnimRef.current);
      scrollAnimRef.current = null;
    }

    const from = container.scrollLeft;
    const delta = to - from;
    if (Math.abs(delta) < 1) return;

    // Honour reduced-motion: jump straight to the destination.
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
      // easeOutCubic: quick to start, gentle settle -- reads as weight rather
      // than a linear slide.
      const eased = 1 - Math.pow(1 - t, 3);
      container.scrollLeft = from + delta * eased;
      if (t < 1) {
        scrollAnimRef.current = requestAnimationFrame(step);
      } else {
        scrollAnimRef.current = null;
      }
    };
    scrollAnimRef.current = requestAnimationFrame(step);
  }, []);

  // Cancel any in-flight scroll tween (e.g. the user grabs the strip).
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

      // Release the programmatic-scroll guard only once the movement has
      // settled. A fixed timeout released it early, so the sticky badge was
      // recomputed mid-animation and the strip appeared to jump back.
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

  // Synchronous pre-paint alignment: ensures target is centered before paint.
  //
  // Runs ONLY on first mount. On later date changes it used to assign
  // scrollLeft directly, which overrode the smooth scroll started by
  // centerDate() in the same tick -- so the strip snapped instead of moving.
  const didInitialAlignRef = useRef(false);
  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const target = selectedDate || todayStr;
    const targetEl = container.querySelector<HTMLElement>(
      `[data-date-pill="${target}"]`
    );

    if (didInitialAlignRef.current) {
      // Date changed after mount: let centerDate own the position, and just
      // keep the sticky badge in sync with the new selection.
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

  // Centering fallback: retries while the target pill is not yet mounted.
  //
  // This must NOT run on every date change. It calls centerDate(target, false),
  // and an "auto" scrollTo to the same offset issued right after the smooth
  // scroll began cancels that animation outright -- the strip snapped because
  // this second call landed in the same tick. Verified by tracing scrollTo:
  //   [{left: 2612, behavior: "smooth"}]
  //   [{left: 2613, behavior: "auto"}]   <- killed it
  //
  // So it runs once on mount only, to catch late-arriving pills, and stops as
  // soon as one is found.
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
    // Mount-only by design; see the comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        {/* NOTE: vertical padding is load-bearing, not cosmetic.
            `overflow-x-auto` forces overflow-y to `auto` as well, so this
            element clips vertically. With py-1 (4px) a 14px glow was cut
            flat at the top and bottom edges, which rendered as a hard line
            across the pill. The padding is sized to contain the glow. */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex items-center gap-1.5 overflow-x-auto py-5 px-0.5 my-[-16px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
                  // Nothing is filled solid. The ring carries the state, and today
                  // additionally gets a faint wash of the theme colour.
                  //   unselected, not today -> no ring
                  //   today, unselected     -> ring + faint wash
                  //   opened (any day)      -> ring + glow (+ stronger wash if today)
                  //
                  // An opened day must have NO background of its own. A body colour
                  // reads as a hard-edged rectangle against the strip behind it
                  // (measured contrast 1.45:1), which looked like a stray border
                  // sitting inside the glow. The ring and glow are unaffected.
                  isSelected
                    ? `date-ring date-ring-fade-in date-ring-glow date-ring-pulse text-primary font-bold bg-transparent ${
                        isToday ? "date-ring-today-wash-strong" : ""
                      } ${isToday ? "scale-[1.03]" : "scale-105"} z-10`
                    : isToday
                    ? "date-ring date-ring-fade-in date-ring-today-wash font-bold text-primary"
                    : "bg-surface-container/60 hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline/10"
                }`}
              >
                {/* Day name (M, T, W...) */}
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider ${
                    // Ringed days are never filled, so their text stays primary
                    // coloured rather than flipping to on-primary.
                    isToday || isSelected
                      ? "text-primary font-bold"
                      : "text-on-surface-variant/70"
                  }`}
                >
                  {item.dayName}
                </span>

                {/* Date Number */}
                <span
                  className={`text-sm sm:text-base font-mono my-0.5 leading-tight ${
                    isToday || isSelected
                      ? "text-primary font-bold"
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
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
