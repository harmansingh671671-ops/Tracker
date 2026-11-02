"use client";

/**
 * B7 — the heatmap half of the challenge progress view.
 *
 * Challenge habits never show the monthly calendar. Days are laid out as a
 * horizontal heatmap strip — Day 1, Day 2, …, Day N flowing left-to-right and
 * wrapping — so progress reads in the challenge's own units instead of borrowing
 * the calendar's weekday rows (which stacked the days vertically).
 */

const CELL =
  "w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-[3px] shrink-0 flex items-center justify-center transition-transform";
const GAP = "gap-1 sm:gap-[5px]";

export interface HabitChallengeHeatmapProps {
  habitId: string;
  /** Day 1 … Day N, oldest first (`challengeDayDates`). */
  dates: string[];
  history: Record<string, boolean>;
  todayStr: string;
  selectedDate: string;
  /** The habit's accent colour — completed cells paint with it, as in the main heatmap. */
  color: string;
  onSelectDate: (date: string) => void;
  onToggle: (habitId: string, date: string) => void;
}

function monthShort(dateStr: string): string {
  const [, m] = dateStr.split("-").map(Number);
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
}

function formatDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${weekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${monthShort(dateStr)}`;
}

export function HabitChallengeHeatmap({
  habitId,
  dates,
  history,
  todayStr,
  selectedDate,
  color,
  onSelectDate,
  onToggle,
}: HabitChallengeHeatmapProps) {
  if (dates.length === 0) return null;

  return (
    <div className={`flex flex-wrap ${GAP} w-full`}>
      {dates.map((date, i) => {
        const done = Boolean(history[date]);
        const upcoming = date > todayStr;
        const isToday = date === todayStr;
        const isSelected = date === selectedDate;

        const tint = done
          ? "cursor-pointer active:scale-90"
          : upcoming
            ? "bg-surface-container-high/40 border border-dashed border-outline/25 cursor-default"
            : "bg-error/15 border border-error/30 cursor-pointer active:scale-90";

        return (
          <button
            key={date}
            type="button"
            onClick={() => {
              onSelectDate(date);
              if (!upcoming) onToggle(habitId, date);
            }}
            aria-label={`Day ${i + 1}, ${formatDay(date)}${done ? ", done" : upcoming ? ", upcoming" : ", missed"}`}
            aria-pressed={done}
            className={`${CELL} ${tint} ${
              isToday ? "ring-1 ring-primary" : ""
            } ${isSelected ? "ring-2 ring-on-surface" : ""}`}
            style={done ? { backgroundColor: color } : undefined}
          >
            {done && <div className="w-1 h-1 rounded-full bg-white/90" />}
          </button>
        );
      })}
    </div>
  );
}
