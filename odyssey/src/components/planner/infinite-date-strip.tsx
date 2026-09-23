"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";

interface InfiniteDateStripProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  todayStr: string;
}

export function InfiniteDateStrip({
  selectedDate,
  onSelectDate,
  todayStr,
}: InfiniteDateStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const todayPillRef = useRef<HTMLButtonElement>(null);

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
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const isToday = dateStr === todayStr;
      items.push({ dateStr, dayName, dayNum: dNum, isToday });
    }
    return items;
  }, [pastDaysOffset, futureDaysOffset, formatOffsetDate, todayStr]);

  // Scroll to a given date pill
  const scrollToDate = useCallback(
    (targetDateStr: string, smooth: boolean = true) => {
      const container = containerRef.current;
      if (!container) return;

      const targetEl = container.querySelector<HTMLElement>(
        `[data-date-pill="${targetDateStr}"]`
      );
      if (targetEl) {
        const targetScrollLeft =
          targetEl.offsetLeft - container.clientWidth / 2 + targetEl.clientWidth / 2;
        container.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: smooth ? "smooth" : "auto",
        });
      }
    },
    []
  );

  // Initial scroll to center selectedDate or Today
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToDate(selectedDate || todayStr, false);
    }, 120);
    return () => clearTimeout(timer);
  }, [scrollToDate, selectedDate, todayStr]);

  // Prepend earlier past days seamlessly without scroll jump
  const prependDays = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const prevScrollWidth = container.scrollWidth;
    const prevScrollLeft = container.scrollLeft;

    setPastDaysOffset((prev) => {
      const next = prev + 25;
      requestAnimationFrame(() => {
        if (container) {
          const diff = container.scrollWidth - prevScrollWidth;
          container.scrollLeft = prevScrollLeft + diff;
        }
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
    const container = containerRef.current;
    const todayEl = todayPillRef.current;
    if (!container) return;

    // Check sticky status for Today
    if (todayEl) {
      const cRect = container.getBoundingClientRect();
      const tRect = todayEl.getBoundingClientRect();

      // If Today is to the left of the visible container area
      if (tRect.right < cRect.left + 54) {
        setStickyState("left");
      }
      // If Today is to the right of the visible container area
      else if (tRect.left > cRect.right - 54) {
        setStickyState("right");
      } else {
        setStickyState("none");
      }
    }

    // Infinite loading checks
    if (container.scrollLeft < 150) {
      prependDays();
    } else if (
      container.scrollWidth - container.scrollLeft - container.clientWidth <
      150
    ) {
      appendDays();
    }
  }, [prependDays, appendDays]);

  useEffect(() => {
    handleScroll();
  }, [handleScroll]);

  return (
    <div className="relative w-full rounded-2xl bg-surface-container-low border border-outline/10 overflow-hidden select-none">
      {/* Scrollable Date Track */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex items-center gap-1.5 overflow-x-auto py-1.5 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
      >
        {dateItems.map((item) => {
          const isSelected = selectedDate === item.dateStr;
          const isToday = item.isToday;

          return (
            <button
              key={item.dateStr}
              ref={isToday ? todayPillRef : undefined}
              data-date-pill={item.dateStr}
              type="button"
              onClick={() => onSelectDate(item.dateStr)}
              className={`min-w-[48px] sm:min-w-[52px] py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? "bg-primary text-on-primary font-bold shadow-md shadow-primary/20 scale-105 z-10"
                  : isToday
                  ? "bg-surface-container-high text-primary border border-primary/35 hover:border-primary/60 font-semibold"
                  : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="text-[10px] font-mono uppercase tracking-wider">
                {item.dayName}
              </span>
              <span
                className={`text-sm font-bold font-mono ${
                  isSelected
                    ? "text-on-primary"
                    : isToday
                    ? "text-primary"
                    : "text-on-surface"
                }`}
              >
                {item.dayNum}
              </span>
              {isToday && (
                <span
                  className={`w-1 h-1 rounded-full ${
                    isSelected ? "bg-on-primary" : "bg-primary"
                  }`}
                />
              )}
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
              scrollToDate(todayStr, true);
            }}
            className={`min-w-[48px] py-1.5 px-2 rounded-xl flex flex-col items-center gap-0.5 shadow-lg border transition-all active:scale-95 cursor-pointer ${
              selectedDate === todayStr
                ? "bg-primary text-on-primary font-bold shadow-primary/30 border-primary"
                : "bg-surface-container-high border-primary/50 text-primary hover:bg-surface-container-highest"
            }`}
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
              scrollToDate(todayStr, true);
            }}
            className={`min-w-[48px] py-1.5 px-2 rounded-xl flex flex-col items-center gap-0.5 shadow-lg border transition-all active:scale-95 cursor-pointer ${
              selectedDate === todayStr
                ? "bg-primary text-on-primary font-bold shadow-primary/30 border-primary"
                : "bg-surface-container-high border-primary/50 text-primary hover:bg-surface-container-highest"
            }`}
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
