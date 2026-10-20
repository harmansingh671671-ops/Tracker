"use client";

/**
 * PERF-19 — the render half of the 52-week heatmap: the pure, memoized cell
 * grid. It has NO hooks and NO store access: it re-renders only when the
 * actual data payload (`columns` identity, `monthHeaderByCol`, `habitColor`)
 * changes, so unrelated state anywhere else — another habit's logs, profile
 * updates, the shared minute clock — cannot cascade into a re-render of the
 * 365-cell tree. The wrapper (`habit-github-heatmap.tsx`) feeds it data
 * arrays rebuilt from per-habit store slices only.
 *
 * Event handling is parent-delegated: a single `click` handler on the grid
 * body (in the wrapper) resolves the day from `data-*` attributes on cells
 * instead of ~365 individual React `onClick` props.
 *
 * Per the task brief there are deliberately NO hover states and NO `title`
 * tooltips: 365 hover-paint surfaces and 365 title attribute strings were
 * pure cost. The `title` text lives on as a compact `aria-label` so screen
 * readers keep a name per cell (unfinished rule-26 business, noted).
 *
 * Reasoning behind NOT switching to <canvas>: 365 static DOM nodes are well
 * inside compositor budget once they do not re-render, and keeping them buys
 * theme-token styling, focusable, screen-reader-named buttons on every cell.
 * Canvas would lose all of that and force a custom hit-testing + a11y layer
 * this repo has no test harness to verify. The isolation + paint-cost
 * reductions are the credible 60fps path.
 */

import { memo } from "react";
import { partialFillAlpha } from "@/lib/utils/habit-completion";

export interface HeatmapDay {
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
  /** Counted "water in the bucket" fill ratio, precomputed by the wrapper. */
  partialRatio: number;
}

export interface HeatmapGridProps {
  columns: HeatmapDay[][];
  /** colIndex -> month label (built by the wrapper's data memo). */
  monthHeaderByCol: Record<number, string>;
  habitColor: string;
  /**
   * M26: optional pager controls rendered flanking the month-label band.
   * Nodes are built in the wrapper (memoised), so the grid's React.memo
   * stays valid; the grid only positions them.
   */
  headerLeftSlot?: React.ReactNode;
  headerRightSlot?: React.ReactNode;
}

const CELL = "w-[11.5px] h-[11.5px] sm:w-[12.5px] sm:h-[12.5px] rounded-[2.5px]";
const GAP = "gap-[2.5px] sm:gap-[3px]";
const CELL_BASE =
  "relative flex items-center justify-center transition-transform select-none cursor-pointer";

/**
 * Day-of-week labels for the left of the matrix (moved here in M27 so they
 * travel with the centered matrix unit). Row 0 is Monday (top), row 6 Sunday.
 * Only M, W and F plus Sunday are labeled; empty strings are silent spacers.
 */
const ROW_LABELS = ["M", "", "W", "", "F", "", "S"];

/**
 * The one style decision table, pure of `day` + `habitColor`. A plain
 * completed cell gets NO always-on glow (365 painted shadows was live
 * scroll-jank — PERF-7 round 2); emphasis is spent only on the opened day
 * ring and today.
 */
function cellVisual(
  day: HeatmapDay,
  habitColor: string
): {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  borderStyle?: string;
  boxShadow?: string;
} {
  const isNotScheduled = !day.isScheduled;
  let backgroundColor: string | undefined;
  let borderColor: string | undefined;
  let borderWidth: string | undefined;
  let borderStyle: string | undefined;
  let boxShadow: string | undefined;

  if (day.isCompleted) {
    if (day.isScheduled) {
      backgroundColor = habitColor;
      if (day.isOpened) {
        boxShadow = `0 0 0 1.5px rgba(255,255,255,0.9), 0 0 0 2.5px ${habitColor}, 0 0 6px ${habitColor}`;
      } else if (day.isToday) {
        boxShadow = `0 0 0 1px rgba(255,255,255,0.8), 0 0 4px ${habitColor}80`;
      }
      return { backgroundColor, boxShadow };
    }
    // Unscheduled / rest-day completed: tinted fill + hard border.
    backgroundColor = `${habitColor}80`;
    borderColor = habitColor;
    borderWidth = "1px";
    borderStyle = "solid";
    if (day.isOpened) {
      boxShadow = `0 0 0 1.5px rgba(255,255,255,0.85), 0 0 0 2.5px ${habitColor}, 0 0 6px ${habitColor}75`;
    }
    return {
      backgroundColor,
      borderColor,
      borderWidth,
      borderStyle,
      boxShadow,
    };
  }

  if (isNotScheduled) {
    // Rest day: dashed empty square (class); faint tint when it is the open day.
    if (day.isOpened) {
      backgroundColor = `${habitColor}18`;
      borderColor = `${habitColor}80`;
      borderWidth = "1px";
      borderStyle = "solid";
      boxShadow = `0 0 0 1.5px ${habitColor}80, 0 0 6px ${habitColor}60`;
    }
    return { backgroundColor, borderColor, borderWidth, borderStyle, boxShadow };
  }

  if (day.partialRatio > 0) {
    // Scheduled, logged, not yet at target: the water-in-the-bucket fill.
    backgroundColor = `${habitColor}${partialFillAlpha(day.partialRatio)}`;
    borderColor = habitColor;
    borderWidth = "1px";
    borderStyle = "solid";
    if (day.isOpened) {
      boxShadow = `0 0 0 1.5px ${habitColor}, 0 0 6px ${habitColor}80`;
      return { backgroundColor, borderColor, borderWidth, borderStyle, boxShadow };
    }
    return { backgroundColor, borderColor, borderWidth, borderStyle };
  }

  if (day.isOpened) {
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
  return { backgroundColor, borderColor, borderWidth, borderStyle, boxShadow };
}

/** Module-level cell renderer (not an inline `renderItem` on a component). */
function cellFragment(day: HeatmapDay, habitColor: string): React.ReactNode {
  const isNotScheduled = !day.isScheduled;
  // `z-10` raises the OPENED day above its neighbours... only when it is open.
  const raised = day.isOpened ? "scale-110 z-10" : "";
  return (
    <button
      key={day.dateStr}
      type="button"
      data-date={day.dateStr}
      data-future={day.isFuture ? "1" : undefined}
      aria-label={`${day.weekday} ${day.monthShort} ${day.dayNumber}${
        day.isCompleted ? " done" : day.isFuture ? " upcoming" : ""
      }`}
      className={`${CELL} ${CELL_BASE} active:scale-90 ${raised} ${
        day.isCompleted
          ? ""
          : isNotScheduled
          ? "bg-surface-container-high/50 border border-dashed border-outline/40"
          : day.isToday
          ? ""
          : "bg-surface-container-highest/80 border border-outline/30"
      }`}
      style={cellVisual(day, habitColor)}
    >
      {!day.isScheduled && day.isCompleted && (
        <div className="w-1 h-1 rounded-full bg-white shadow-xs" />
      )}
    </button>
  );
}

export const HeatmapGrid = memo(function HeatmapGrid({
  columns,
  monthHeaderByCol,
  habitColor,
  headerLeftSlot,
  headerRightSlot,
}: HeatmapGridProps) {
  return (
    <div className="flex flex-col w-full">
      {/* Pager band (M26): spans the card row so the arrows flank it at the
          card's edges. The label slots + filler live in the middle group,
          which mirrors the day-label column width below so both center
          together (M27: on wide screens the matrix unit is centered, not
          left-glued, and the void it freed goes to BOTH sides evenly). */}
      <div className="flex items-center mb-1 h-6">
        <div className="shrink-0">{headerLeftSlot ?? null}</div>
        <div className={`flex items-center mx-auto ${GAP}`}>
          {/* Mirror of the day-label column (same width) — keeps the slot
              x-positions locked to the columns in every screen size. */}
          <div className="w-3 pr-1 shrink-0" aria-hidden="true" />
          {columns.map((_, colIdx) => {
            const header = monthHeaderByCol[colIdx];
            return (
              <div
                key={colIdx}
                className="w-[11.5px] sm:w-[12.5px] text-[8.5px] sm:text-[9.5px] font-mono font-bold text-on-surface-variant/70 relative shrink-0 leading-none select-none"
              >
                {header ? (
                  <span className="absolute left-0 bottom-0 whitespace-nowrap">
                    {header}
                  </span>
                ) : null}
              </div>
            );
          })}
          {/* M24: matching trailing slot so the header row line-up never
              disagrees with the body's filler column. */}
          <div
            className="w-[11.5px] sm:w-[12.5px] shrink-0 select-none"
            aria-hidden="true"
          />
        </div>
        <div className="shrink-0">{headerRightSlot ?? null}</div>
      </div>

      {/* Body: the day-label column + the window's week columns, centered as
          ONE unit (M27) so a phone keeps last week near the card's middle and
          a wide screen splits the spare room evenly. One delegated click
          handler on the wrapper resolves the day from data-* attrs — no
          per-cell handler props. */}
      <div className="flex self-center">
        {/* Day-of-week labels moved INTO the grid (M27): they must travel
            with the centered matrix, and their column width is what the
            band's mirror spacer reproduces. */}
        <div className="flex flex-col shrink-0 pr-1 select-none">
          <div className="h-6 mb-1 shrink-0" />
          <div className="flex flex-col gap-[2.5px] sm:gap-[3px] shrink-0">
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
        <div className={`flex ${GAP}`}>
          {columns.map((colDays, colIdx) => (
            <div key={colIdx} className={`flex flex-col ${GAP} shrink-0`}>
              {colDays.map((day) => cellFragment(day, habitColor))}
            </div>
          ))}
          {/* M24: one invisible trailing column of exact cell width so the
              current week (the matrix's last) never sits flush against the
              edge or the pager arrow. Not clickable, no data-date, no
              painted style. */}
          <div className={`flex flex-col ${GAP} shrink-0`} aria-hidden="true">
            {Array.from({ length: 7 }, (_, row) => (
              <div key={row} className={CELL} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
