"use client";

/**
 * PERF-8b — the list-view habit card, extracted from `habits/page.tsx` and
 * wrapped in `React.memo`.
 *
 * The page used to render this row as inline JSX, so every state change on the
 * page (a toast, a modal, a keystroke) re-rendered every habit row, and every
 * row re-derived its month calendar. With the habit's log slices passed as
 * habit-scoped props only the row whose data actually changed re-renders; the
 * page keeps the `motion.div` wrapper because AnimatePresence needs it for the
 * enter/exit animations.
 *
 * The habit-scoped prop contract is deliberate: the store keeps the merged
 * per-habit record identities (`{...prev}` top-level spread), so an
 * unaffected habit's slices are the same objects between renders and memo
 * holds. Passing page-wide merged records here would re-render every row on
 * any single habit's write — the exact measured cost this extraction removes.
 */

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Flame, X } from "lucide-react";
import { type Habit, type HabitLog } from "@/lib/db";
import { HabitIcon } from "@/components/habits/habit-icon";
import { HabitMonthCalendar } from "@/components/habits/habit-month-calendar";
import { AvoidHabitControl } from "@/components/habits/avoid-habit-control";
import { KeystoneBadge } from "@/components/habits/keystone-badge";
import { getHabitColor, isHabitScheduledOnDate, habitCategoryLabel } from "@/lib/utils/habit-colors";
import { getCompletionRecord, isHabitComplete, isHabitSlipped } from "@/lib/utils/habit-completion";
import { formatLastDone } from "@/lib/utils/last-done";
import { getTimePeriodAccent } from "@/lib/utils/time-period";
import { getDaysDoneLabel, isDaysDoneActive } from "@/lib/utils/warm-copy";
import { useCallback } from "react";

interface HabitListCardProps {
  habit: Habit;
  selectedDate: string;
  todayStr: string;
  isFutureSelectedDate: boolean;
  /** Habit-scoped log slices — not the page-wide merged records. */
  todayRecord?: HabitLog;
  historyRecord?: Record<string, boolean>;
  valueRecord?: Record<string, number>;
  /** `daysDoneByHabit[habit.id] ?? 0`, kept as a scalar so memo holds. */
  daysDone: number;
  /** `lastCompletedAt[habit.id]` — formatted inside, see the M7 note below. */
  lastDoneAt?: string;
  userId: string | null;
  /** S19 — the user's one keystone habit; stable boolean, so memo still holds. */
  isKeystone?: boolean;
  onSelectDate: (date: string) => void;
  onToggle: (
    habitId: string,
    targetDate?: string,
    e?: React.MouseEvent | React.TouchEvent
  ) => Promise<void>;
  onAvoidClean: (habit: Habit, date: string, isClean: boolean) => Promise<void>;
  onAvoidSlip: (habit: Habit, date: string, isSlipped: boolean) => Promise<void>;
  onDragStart: (habit: Habit, e: React.MouseEvent | React.TouchEvent, currentValue: number) => void;
  showToast: (msg: string) => void;
  setHabitLogValue: (userId: string, habitId: string, date: string, value: number) => Promise<void>;
}

export const HabitListCard = memo(function HabitListCard({
  habit,
  selectedDate,
  todayStr,
  isFutureSelectedDate,
  todayRecord,
  historyRecord,
  valueRecord,
  daysDone,
  lastDoneAt,
  userId,
  isKeystone = false,
  onSelectDate,
  onToggle,
  onAvoidClean,
  onAvoidSlip,
  onDragStart,
  showToast,
  setHabitLogValue,
}: HabitListCardProps) {
  // getCompletionRecord reads a page-shaped stores bundle; the card rebuilds
  // the single-habit version from its scoped props, inside memo so the bundle
  // identity tracks only this habit's slices.
  const logStores = useMemo(
    () => ({
      todayLogs: todayRecord ? { [habit.id]: todayRecord } : {},
      historyLogs: historyRecord ? { [habit.id]: historyRecord } : {},
      historyValues: valueRecord ? { [habit.id]: valueRecord } : {},
    }),
    [habit.id, todayRecord, historyRecord, valueRecord]
  );

  const habitColor = getHabitColor(habit);
  const log = useMemo(
    () => getCompletionRecord(habit, selectedDate, todayStr, logStores),
    [habit, selectedDate, todayStr, logStores]
  );
  const isCompleted = useMemo(() => isHabitComplete(habit, log), [habit, log]);
  const isScheduled = useMemo(
    () => isHabitScheduledOnDate(habit, selectedDate),
    [habit, selectedDate]
  );
  // M7 — "Last done: Today at 8:15 AM", anchored to `todayStr`, not the
  // selected date; null rather than "never" for a habit uncompleted so far.
  const lastDone = formatLastDone(lastDoneAt, todayStr);
  // M11 — null for a habit with no period ("anytime") or an unknown stored
  // period; both render nothing rather than an undefined class.
  const period = getTimePeriodAccent(habit);

  const handleCalendarToggle = useCallback(
    (dateStr: string, e?: React.MouseEvent | React.TouchEvent) => {
      if ((habit.type ?? "simple") === "counted") {
        const dayLog = getCompletionRecord(habit, dateStr, todayStr, logStores);
        const current = typeof dayLog?.value === "number" ? dayLog.value : 0;
        if (userId) {
          setHabitLogValue(userId, habit.id, dateStr, current + 1);
        }
      } else {
        onToggle(habit.id, dateStr, e);
      }
    },
    [habit, todayStr, logStores, userId, setHabitLogValue, onToggle]
  );

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
              isCompleted
                ? "border group-hover:scale-105"
                : "bg-surface-container-high group-hover:scale-105"
            }`}
            style={{
              backgroundColor: isCompleted
                ? isScheduled
                  ? `${habitColor}20`
                  : `${habitColor}14`
                : undefined,
              borderColor: isCompleted
                ? `${habitColor}${isScheduled ? "40" : "25"}`
                : undefined,
            }}
          >
            <HabitIcon icon={habit.icon} name={habit.name} className="w-5 h-5" style={{ color: habitColor }} />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h4
                className={`text-sm font-semibold truncate ${
                  isCompleted ? "text-on-surface line-through opacity-80" : "text-on-surface"
                }`}
              >
                {habit.name}
              </h4>
              {!isScheduled && (
                <span className="px-1.5 py-0.2 rounded-md bg-surface-container-highest text-on-surface-variant text-[9.5px] font-mono font-bold shrink-0">
                  Rest Day
                </span>
              )}
              {/* M11 -- ambient time-period accent. The WORD is rendered, not
                  just the colour: accessibility rule 5.3 #3, so a user who
                  cannot tell amber from purple still reads which part of the
                  day this belongs to. */}
              {period && (
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[9.5px] font-mono font-bold shrink-0 ${period.containerClass} ${period.accentClass}`}
                >
                  {period.label}
                </span>
              )}
            </div>
            {(habit.type ?? "simple") === "counted" && (
              <div className="mt-1.5 w-1/2 max-w-[180px]">
                {/* Water-fill progress bar */}
                <div
                  className="relative w-full h-3 rounded-full bg-surface-container-high overflow-hidden cursor-pointer select-none"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (isFutureSelectedDate) return;
                    const currentValue = typeof log?.value === "number" ? log.value : 0;
                    onDragStart(habit, e, currentValue);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (isFutureSelectedDate) return;
                    const currentValue = typeof log?.value === "number" ? log.value : 0;
                    onDragStart(habit, e, currentValue);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isFutureSelectedDate) {
                      showToast("Cannot complete habits for future dates.");
                      return;
                    }
                    // Single click: increment by 1
                    const currentValue = typeof log?.value === "number" ? log.value : 0;
                    if (userId) {
                      setHabitLogValue(userId, habit.id, selectedDate, currentValue + 1);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isFutureSelectedDate) return;
                    // Long press / right click: fill to target
                    if (userId && habit.targetValue) {
                      setHabitLogValue(userId, habit.id, selectedDate, habit.targetValue);
                      showToast(`Filled to ${habit.targetValue} ${habit.unit ?? "units"}`);
                    }
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-150 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, (typeof log?.value === "number" ? log.value : 0) / (habit.targetValue ?? 1) * 100))}%`,
                      backgroundColor: habitColor,
                      boxShadow: `0 0 8px ${habitColor}80`,
                    }}
                  />
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
                  <span>{typeof log?.value === "number" ? log.value : 0}</span>
                  <span>/ {habit.targetValue ?? "-"}</span>
                  <span>{habit.unit ?? "units"}</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mt-0.5 text-xs text-on-surface-variant font-mono">
              <span className="font-semibold" style={{ color: habitColor }}>{habitCategoryLabel(habit)}</span>
              {/* Counted/simple at 0 days renders nothing at all (M13's
                  honest-zero rule): a bare flame with no number behind it
                  reads as broken. The separator goes with it. */}
              {(habit.type === "avoid" || getDaysDoneLabel(daysDone) !== "") && (
                <>
                  <span>•</span>
                  <span className={`flex items-center gap-0.5 ${habit.type === "avoid" ? "text-error" : isDaysDoneActive(daysDone) ? "text-amber-400" : "text-on-surface-variant/60"}`}>
                    {habit.type === "avoid" ? <X className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
                    {habit.type === "avoid" ? `${getDaysDoneLabel(daysDone) || "0d"} clean` : getDaysDoneLabel(daysDone)}
                  </span>
                </>
              )}
              {habit.type === "avoid" && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border border-error/40 text-error">
                  Quit
                </span>
              )}
              {habit.priority && (
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                  habit.priority === "critical" ? "border-red-500/40 text-red-500" :
                  habit.priority === "focus" ? "border-amber-500/40 text-amber-500" :
                  "border-emerald-500/40 text-emerald-500"
                }`}>
                  {habit.priority === "critical" ? "🔴 Critical" : habit.priority === "focus" ? "🟡 Focus" : "🟢 Optional"}
                </span>
              )}
            </div>

            {/* M7 -- see the header comment. Anchored to `todayStr`, not the
                selected date: browsing to a past date still answers "when did
                I last do this" truthfully. S19's marker shares this line for the
                same reason: outside the name row, it cannot take width from the
                name, the status pills or the completion ring. */}
            {(isKeystone || lastDone) && (
              <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
                {isKeystone && <KeystoneBadge />}
                {lastDone && (
                  <span className="text-[11px] font-mono text-on-surface-variant/80 truncate">
                    {lastDone}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Completion Action: clean/slip pair for quit habits, ring for
            simple habits, inline stepper above for counted. */}
        <div className="flex items-center gap-2 shrink-0">
          {habit.type === "avoid" ? (
            <AvoidHabitControl
              isClean={isCompleted}
              isSlipped={isHabitSlipped(habit, log)}
              disabled={isFutureSelectedDate}
              onClean={(isClean) => onAvoidClean(habit, selectedDate, isClean)}
              onSlip={(isSlipped) => onAvoidSlip(habit, selectedDate, isSlipped)}
            />
          ) : (habit.type ?? "simple") === "simple" ? (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (isFutureSelectedDate) {
                  showToast("Cannot complete habits for future dates.");
                  return;
                }
                onToggle(habit.id, selectedDate, e);
              }}
              title={
                isFutureSelectedDate
                  ? "Cannot complete habits for future dates"
                  : isCompleted
                  ? isScheduled
                    ? "Completed (tap to undo)"
                    : "Unscheduled Completed (!) • Tap to undo"
                  : !isScheduled
                  ? "Rest Day (tap to register)"
                  : "Tap to complete"
              }
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                isFutureSelectedDate ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              } ${
                isCompleted
                  ? "text-white shadow-sm scale-105"
                  : isFutureSelectedDate
                  ? "bg-transparent"
                  : !isScheduled
                  ? "bg-transparent hover:scale-105 opacity-75"
                  : "bg-transparent hover:scale-105"
              }`}
              style={{
                backgroundColor: isCompleted
                  ? isScheduled
                    ? habitColor
                    : `${habitColor}70`
                  : "transparent",
                borderColor: isFutureSelectedDate && !isCompleted
                  ? `${habitColor}60`
                  : !isScheduled && !isCompleted
                  ? `${habitColor}70`
                  : habitColor,
                borderWidth: isCompleted ? "0px" : !isScheduled ? "1.5px" : "2.5px",
                borderStyle: !isScheduled && !isCompleted ? "dashed" : "solid",
                boxShadow: isCompleted
                  ? `0 0 10px ${habitColor}${isScheduled ? "66" : "35"}`
                  : undefined,
              }}
            >
              <AnimatePresence mode="wait">
                {isCompleted ? (
                  <motion.div
                    key={isScheduled ? "check" : "excl"}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-center"
                  >
                    {isScheduled ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <span className="font-black text-xs leading-none">!</span>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      </div>

      {/* Inline Monthly Calendar preview */}
      <HabitMonthCalendar
        habitId={habit.id}
        name={habit.name}
        targetDays={habit.targetDays}
        targetDaysPerWeek={habit.targetDaysPerWeek}
        category={habit.category}
        selectedDate={selectedDate}
        todayStr={todayStr}
        onSelectDate={onSelectDate}
        onToggleDate={handleCalendarToggle}
      />
    </div>
  );
});
