"use client";

/**
 * PERF-19 — the wrapper of `HeatmapGrid` (which holds the render half). This
 * file is where the re-render isolation happens:
 *
 * - State is read through **per-habit zustand slices** —
 *   `s.historyLogs[habitId]` / `s.historyValues[habitId]` — not the whole
 *   store. The store replaces a habit's map object only when THAT habit is
 *   written, so a log on one habit no longer re-renders every matrix on the
 *   page, and profile/wallet/clock updates do not either.
 * - All 365-day data building happens in ONE `useMemo` keyed on those
 *   slices; the per-day objects carry every flag and the counted
 *   partial-fill ratio, so the memoized grid render is a pure function of a
 *   stable payload.
 * - One delegated `click` handler resolves the tapped day from `data-*`
 *   attributes (no per-cell handler props), and `mousedown`/`touchstart` are
 *   stopped once at the container so the enclosing card's hold/swipe
 *   gestures never arm from a touch inside the matrix.
 *
 * There are no hover states and no tooltips by brief (see the grid comment);
 * the old per-cell `title` strings survive as short `aria-label`s.
 */

import { useCallback, useMemo, useState } from "react";
import { useHabitStore } from "@/lib/stores/habit-store";
import { useUserStore } from "@/lib/stores/user-store";
import { getHabitColor, getLocalTodayStr } from "@/lib/utils/habit-colors";
import { triggerStreaksConfetti } from "@/lib/utils/confetti";
import { completionRatio } from "@/lib/utils/habit-completion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Habit } from "@/lib/db";
import {
  HeatmapGrid,
  type HeatmapDay,
} from "@/components/habits/habit-heatmap-grid";
import {
  HEATMAP_VISIBLE_WEEKS,
  HEATMAP_WINDOW_STEP,
  clampWindowStart,
  maxWindowStart,
  sliceHeatmapWindow,
} from "@/components/habits/heatmap-window";

const EMPTY_LOGS: Record<string, boolean> = {};
const EMPTY_VALUES: Record<string, number> = {};
export interface HabitGitHubHeatmapProps {
  habitId: string;
  name?: string;
  targetDays?: number[]; // [1..7] where 1=Mon, ..., 7=Sun
  targetDaysPerWeek?: number;
  category?: string;
  /**
   * Habit type + target, so a counted day partway to its target can fill in
   * proportion to progress instead of reading as an empty day (`B17`).
   */
  type?: Habit["type"];
  targetValue?: number;
  selectedDate?: string;
  weeksCount?: number; // data horizon, default 52 (full year); render is windowed
  todayStr?: string;
  onSelectDate?: (dateStr: string) => void;
  /** Delegated tap-to-toggle; `habitId` lets ONE stable page callback serve every card. */
  onToggleDate?: (habitId: string, dateStr: string, e: React.MouseEvent) => void;
  showStats?: boolean;
  className?: string;
}

interface MonthHeader {
  label: string;
  colIndex: number;
}

export function HabitGitHubHeatmap({
  habitId,
  name,
  targetDays,
  targetDaysPerWeek,
  category,
  type,
  targetValue,
  selectedDate,
  weeksCount = 52,
  todayStr: propTodayStr,
  onSelectDate,
  onToggleDate,
  showStats = true,
  className = "",
}: HabitGitHubHeatmapProps) {
  // PERF-19: per-habit slices only — the matrix re-renders when THIS habit's
  // logs/values change or the payload shifts; nothing else re-renders it.
  const ownLogs = useHabitStore((s) => s.historyLogs[habitId]);
  const ownValues = useHabitStore((s) => s.historyValues?.[habitId]);
  const logsMap = ownLogs ?? EMPTY_LOGS;
  const valuesMap = ownValues ?? EMPTY_VALUES;

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

  // ONE pass builds every day object (all flags + the counted partial-fill
  // ratio) and the month-header lookup — the grid just renders its output.
  const { columns, headerByCol, totalCompletions, percentage } = useMemo(() => {
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

    const subject = { type, targetValue };
    const headerByCol: Record<number, string> = {};
    const cols: HeatmapDay[][] = [];
    const headers: MonthHeader[] = [];

    let completions = 0;
    let scheduledElapsed = 0;
    let lastMonthIndex = -1;
    let lastHeaderCol = -4;

    for (let c = 0; c < numWeeks; c++) {
      const colDays: HeatmapDay[] = [];
      let colHasMonthStart = false;
      let colNewMonthName = "";

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
        const isCompleted = Boolean(logsMap[dateStr]);
        const dayOfWeek = r + 1; // 1=Mon..7=Sun
        const isScheduled = effectiveScheduledDays.includes(dayOfWeek);

        if (isCompleted) completions++;
        if (isScheduled && !isFuture && dateStr <= today) scheduledElapsed++;

        // Counted partial fill (`B17`): only counted, scheduled, logged,
        // incomplete days fill in proportion; zeros stay empty so the
        // rest-day / dashed styling still reads.
        const partialRatio =
          type === "counted" && !isCompleted && isScheduled && !isFuture
            ? completionRatio(subject, { value: valuesMap[dateStr] })
            : 0;

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
          partialRatio,
        });
      }

      // Add month header with spacing
      if (colHasMonthStart && c - lastHeaderCol >= 3) {
        headers.push({ label: colNewMonthName, colIndex: c });
        headerByCol[c] = colNewMonthName;
        lastHeaderCol = c;
      }

      cols.push(colDays);
    }

    return { columns: cols, headerByCol, totalCompletions: completions,
      percentage:
        scheduledElapsed > 0
          ? Math.round((completions / scheduledElapsed) * 100)
          : 0,
    };
  }, [
    logsMap,
    valuesMap,
    today,
    weeksCount,
    activeSelectedDate,
    effectiveScheduledDays,
    type,
    targetValue,
  ]);

  // M25: the matrix renders a WINDOW (newest 16 weeks by default) out of the
  // full-year data above — that is what keeps N cards at ~112 cells instead of
  // ~365, and what lets the inner scroller disappear (a nested scroll
  // container captured vertical pans). `windowStart` slides in 4-week pages.
  const windowMaxStart = maxWindowStart(weeksCount, HEATMAP_VISIBLE_WEEKS);
  const [windowStart, setWindowStart] = useState(() =>
    maxWindowStart(weeksCount, HEATMAP_VISIBLE_WEEKS)
  );
  const { columns: windowedColumns, headerByCol: windowedHeaderByCol } =
    useMemo(
      () =>
        sliceHeatmapWindow(
          columns,
          headerByCol,
          windowStart,
          HEATMAP_VISIBLE_WEEKS
        ),
      [columns, headerByCol, windowStart]
    );
  const pageWindow = useCallback(
    (dir: -1 | 1) =>
      setWindowStart((s) =>
        clampWindowStart(s + dir * HEATMAP_WINDOW_STEP, windowMaxStart)
      ),
    [windowMaxStart]
  );
  const atOldest = windowStart === 0;
  const atNewest = windowStart === windowMaxStart;

  // M26: the pager buttons flank the month-label band inside the grid.
  // Memoised so the grid's React.memo never sees a fresh node identity.
  const pagerLeft = useMemo(() => {
    if (windowMaxStart === 0) return null;
    return (
      <button
        type="button"
        onClick={() => pageWindow(-1)}
        disabled={atOldest}
        aria-label="4 weeks earlier"
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          atOldest
            ? "text-on-surface-variant/25"
            : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface cursor-pointer"
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    );
  }, [windowMaxStart, atOldest, pageWindow]);
  const pagerRight = useMemo(() => {
    if (windowMaxStart === 0) return null;
    return (
      <button
        type="button"
        onClick={() => pageWindow(1)}
        disabled={atNewest}
        aria-label="4 weeks later"
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          atNewest
            ? "text-on-surface-variant/25"
            : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface cursor-pointer"
        }`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    );
  }, [windowMaxStart, atNewest, pageWindow]);

  // The delegated handlers: one `mousedown`/`touchstart` stop so the card's
  // gesture shell never arms from a touch inside the matrix (its spacer in
  // the habits page does this too — belt and braces for the other callers),
  // and ONE click resolution through `data-*` attributes.
  const onMatrixMouse = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => e.stopPropagation(),
    []
  );

  const onMatrixClick = useCallback(
    (e: React.MouseEvent) => {
      const cell = (e.target as HTMLElement).closest(
        "[data-date]"
      ) as HTMLElement | null;
      if (!cell) return;
      // Only a real cell click must not fall through to the enclosing card.
      e.stopPropagation();
      const dateStr = cell.dataset.date as string;
      if (dateStr !== activeSelectedDate) {
        // A different day is being opened, not toggled (future included —
        // selecting a future day was always allowed; completing it is not).
        onSelectDate?.(dateStr);
        return;
      }
      // Clicking the already-selected day toggles the completion.
      const isFuture = cell.dataset.future === "1";
      if (isFuture) return;
      if (onToggleDate) {
        onToggleDate(habitId, dateStr, e);
        return;
      }
      // Fallback (no parent handler): the store path directly, so callers
      // like the edit modal still get confetti-streak parity.
      void (async () => {
        const user = useUserStore.getState().user;
        if (!user) return;
        const isNowCompleted = await useHabitStore
          .getState()
          .toggleHabitLog(user.id, habitId, dateStr);
        if (isNowCompleted) {
          triggerStreaksConfetti(e.clientX, e.clientY, habitColor);
        }
      })();
    },
    [activeSelectedDate, onSelectDate, onToggleDate, habitId, habitColor]
  );

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

      {/* Main Heatmap Container: the grid owns the day-labels column and the
          month band with the flanking pager (M26/M27). NO inner scroller
          (M25): the 16-week window fits the card, so a vertical touch anywhere
          here is page scroll. */}
      <div
        className="flex-1 min-w-0 select-none pb-1"
        style={{ touchAction: "pan-y" }}
        onMouseDown={onMatrixMouse}
        onTouchStart={onMatrixMouse}
        onClick={onMatrixClick}
      >
        <HeatmapGrid
          columns={windowedColumns}
          monthHeaderByCol={windowedHeaderByCol}
          habitColor={habitColor}
          headerLeftSlot={pagerLeft}
          headerRightSlot={pagerRight}
        />
      </div>
    </div>
  );
}
