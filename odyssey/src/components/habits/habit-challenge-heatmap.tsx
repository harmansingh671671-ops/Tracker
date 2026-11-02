"use client";

/**
 * B7 — the heatmap half of the challenge progress view.
 *
 * Challenge habits never show the monthly calendar, but they were rendering a
 * strip of numbered boxes, which said "day pager", not "heatmap". This is the
 * app's contribution-heatmap language (weekday label column, one column per
 * week, month band, colour-filled squares) restricted to the challenge's own
 * days: Day 1 sits in its real weekday row and the grid holds nothing outside
 * Day 1..N.
 */

const ROW_LABELS = ["M", "", "W", "", "F", "", "S"];
const GAP = "gap-1 sm:gap-[5px]";
const CELL =
  "w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-[3px] shrink-0 flex items-center justify-center transition-transform";

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

/** 1 = Monday … 7 = Sunday, matching the heatmap's row order. */
function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return js === 0 ? 7 : js;
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

  // Pad the first and last weeks so Day 1 lands in its real weekday row.
  const cells: (string | null)[] = [
    ...Array.from({ length: dayOfWeek(dates[0]) - 1 }, () => null),
    ...dates,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const columns: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));

  // Month band: a label where the month changes, with at least two columns of
  // room so the text never overlaps itself.
  const headerByCol: Record<number, string> = {};
  let lastMonth = -1;
  let lastLabelCol = -4;
  columns.forEach((col, colIndex) => {
    const first = col.find((d) => d !== null);
    if (!first) return;
    const month = Number(first.slice(5, 7));
    if (month === lastMonth) return;
    if (colIndex - lastLabelCol < 2) return;
    headerByCol[colIndex] = monthShort(first);
    lastMonth = month;
    lastLabelCol = colIndex;
  });

  return (
    <div className="flex flex-col w-full">
      {/* Month band, mirroring the main heatmap (label column spacer + labels). */}
      <div className={`flex items-end self-center mb-1 ${GAP}`}>
        <div className="w-3 shrink-0" aria-hidden="true" />
        {columns.map((_, colIndex) => (
          <div
            key={colIndex}
            className="w-4 sm:w-[18px] text-[8.5px] font-mono font-bold text-on-surface-variant/70 relative shrink-0 leading-none"
          >
            {headerByCol[colIndex] ? (
              <span className="absolute left-0 bottom-0 whitespace-nowrap">
                {headerByCol[colIndex]}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex self-center">
        {/* Weekday labels — same M/W/F/S scheme as the contribution heatmap. */}
        <div className={`flex flex-col shrink-0 pr-1 ${GAP}`}>
          {ROW_LABELS.map((label, row) => (
            <div key={row} className="w-3 h-4 sm:h-[18px] flex items-center">
              <span className="text-[8px] font-mono font-bold text-on-surface-variant/60 leading-none">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className={`flex ${GAP}`}>
          {columns.map((col, colIndex) => (
            <div key={colIndex} className={`flex flex-col ${GAP} shrink-0`}>
              {col.map((date, row) => {
                if (!date) {
                  return <div key={`pad-${colIndex}-${row}`} className={CELL} aria-hidden="true" />;
                }
                const done = Boolean(history[date]);
                const upcoming = date > todayStr;
                const isToday = date === todayStr;
                const isSelected = date === selectedDate;
                const dayIndex = dates.indexOf(date) + 1;

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
                    aria-label={`Day ${dayIndex}, ${formatDay(date)}${done ? ", done" : upcoming ? ", upcoming" : ", missed"}`}
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
          ))}
        </div>
      </div>
    </div>
  );
}
