"use client";

import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Flame, X } from "lucide-react";
import { type Habit, type HabitLog } from "@/lib/db";
import { HabitIcon } from "@/components/habits/habit-icon";
import { AvoidHabitControl } from "@/components/habits/avoid-habit-control";
import { getHabitColor, isHabitScheduledOnDate, habitCategoryLabel } from "@/lib/utils/habit-colors";
import { getCompletionRecord, isHabitComplete, isHabitSlipped } from "@/lib/utils/habit-completion";
import { getDaysDoneLabel, isDaysDoneActive } from "@/lib/utils/warm-copy";
import { useHabitStore } from "@/lib/stores/habit-store";

interface GridHabitCardProps {
  habit: Habit;
  selectedDate: string;
  todayStr: string;
  isFutureSelectedDate: boolean;
  todayLogs: Record<string, HabitLog>;
  historyLogs: Record<string, Record<string, boolean>>;
  historyValues: Record<string, Record<string, number>>;
  userId: string | null;
  setHabitLogValue: (userId: string, habitId: string, date: string, value: number) => Promise<void>;
  showToast: (msg: string) => void;
  handleCardClick: (habit: Habit, e?: React.MouseEvent | React.TouchEvent) => Promise<void>;
  handleToggle: (habitId: string, targetDate: string, e?: React.MouseEvent | React.TouchEvent) => Promise<void>;
  /** Quit-habit day actions. Only rendered when the habit's type is `avoid`. */
  onAvoidClean: (isClean: boolean) => void;
  onAvoidSlip: (isSlipped: boolean) => void;
  handleDragStart: (habit: Habit, e: React.MouseEvent | React.TouchEvent, currentValue: number) => void;
  startPress: (habit: Habit, e: React.TouchEvent | React.MouseEvent) => void;
  movePress: (e: React.TouchEvent | React.MouseEvent) => void;
  endPress: () => void;
  setEditingHabit: (habit: Habit) => void;
}

export function GridHabitCard({
  habit,
  selectedDate,
  todayStr,
  isFutureSelectedDate,
  todayLogs,
  historyLogs,
  historyValues,
  userId,
  setHabitLogValue,
  showToast,
  handleCardClick,
  handleToggle,
  onAvoidClean,
  onAvoidSlip,
  handleDragStart,
  startPress,
  movePress,
  endPress,
  setEditingHabit,
}: GridHabitCardProps) {
  const isScheduled = isHabitScheduledOnDate(habit, selectedDate);
  const log = getCompletionRecord(habit, selectedDate, todayStr, { todayLogs, historyLogs, historyValues });
  const isCompleted = isHabitComplete(habit, log);
  const habitColor = getHabitColor(habit);
  const isCounted = (habit.type ?? "simple") === "counted";
  const isAvoid = habit.type === "avoid";
  const isSlipped = isHabitSlipped(habit, log);
  const currentValue = typeof log?.value === "number" ? log.value : 0;
  const targetValue = habit.targetValue ?? 1;
  // Days done is derived in the store (ADR 0005) and read here rather than
  // threaded through the page's already-long prop list.
  const daysDone = useHabitStore((s) => s.daysDoneByHabit[habit.id] ?? 0);

  // Long press refs for + button on counted habits
  const plusPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPlusLongPressRef = useRef(false);

  const handlePlusClick = useCallback(() => {
    if (isFutureSelectedDate) {
      showToast("Cannot complete habits for future dates.");
      return;
    }
    if (userId) {
      setHabitLogValue(userId, habit.id, selectedDate, currentValue + 1);
    }
  }, [isFutureSelectedDate, showToast, userId, setHabitLogValue, habit.id, selectedDate, currentValue]);

  const handlePlusLongPress = useCallback(() => {
    if (isFutureSelectedDate) return;
    if (userId && habit.targetValue) {
      setHabitLogValue(userId, habit.id, selectedDate, habit.targetValue);
      showToast(`Filled to ${habit.targetValue} ${habit.unit ?? "units"}`);
    }
  }, [isFutureSelectedDate, userId, setHabitLogValue, habit.id, selectedDate, habit.targetValue, habit.unit, showToast]);

  const startPlusPress = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    isPlusLongPressRef.current = false;
    if (plusPressTimerRef.current) clearTimeout(plusPressTimerRef.current);
    plusPressTimerRef.current = setTimeout(() => {
      isPlusLongPressRef.current = true;
      handlePlusLongPress();
    }, 400);
  }, [handlePlusLongPress]);

  const endPlusPress = useCallback(() => {
    if (plusPressTimerRef.current) {
      clearTimeout(plusPressTimerRef.current);
      plusPressTimerRef.current = null;
    }
  }, []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0.85, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 28 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
      }}
      key={habit.id}
      onTouchStart={(e) => startPress(habit, e)}
      onTouchMove={movePress}
      onTouchEnd={endPress}
      onTouchCancel={endPress}
      onMouseDown={(e) => startPress(habit, e)}
      onMouseMove={movePress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onContextMenu={(e) => {
        e.preventDefault();
        setEditingHabit(habit);
      }}
      onClick={(e) => handleCardClick(habit, e)}
      className={`p-3 rounded-2xl flex flex-col justify-between gap-2.5 border transition-colors duration-200 cursor-pointer active:scale-95 select-none ${
        isSlipped
          ? "bg-error/5 border-error/40"
          : isCompleted
          ? "bg-surface-container-low shadow-sm"
          : isFutureSelectedDate
          ? "bg-surface-container opacity-85 border-outline/15"
          : !isScheduled
          ? "bg-surface-container/60 hover:bg-surface-container opacity-80 border-dashed border-outline/20"
          : "bg-surface-container hover:bg-surface-container-high border-outline/15"
      }`}
      style={{
        // A slipped day overrides the habit colour with the error border from the class.
        borderColor: isSlipped
          ? undefined
          : isCompleted
          ? isScheduled
            ? `${habitColor}50`
            : `${habitColor}35`
          : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isCompleted ? "border" : "bg-surface-container-high"
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
            <HabitIcon icon={habit.icon} name={habit.name} className="w-4 h-4" style={{ color: habitColor }} />
          </div>
          <h4
            className={`text-xs font-semibold truncate ${
              isCompleted ? "line-through text-on-surface-variant" : "text-on-surface"
            }`}
          >
            {habit.name}
          </h4>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isScheduled && (
            <span className="px-1 py-0.2 rounded bg-surface-container-highest text-on-surface-variant text-[8.5px] font-mono font-bold shrink-0">
              Rest
            </span>
          )}
          {isCounted ? (
            <button
              type="button"
              onMouseDown={startPlusPress}
              onTouchStart={startPlusPress}
              onMouseUp={endPlusPress}
              onTouchEnd={endPlusPress}
              onMouseLeave={endPlusPress}
              onTouchCancel={endPlusPress}
              onClick={(e) => {
                e.stopPropagation();
                if (isPlusLongPressRef.current) {
                  isPlusLongPressRef.current = false;
                  return;
                }
                handlePlusClick();
              }}
              disabled={isFutureSelectedDate}
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                isFutureSelectedDate
                  ? "opacity-40 cursor-not-allowed text-on-surface-variant"
                  : "text-on-surface hover:bg-surface-container cursor-pointer"
              }`}
              title={isFutureSelectedDate ? "Cannot log for future dates" : "Tap: +1 • Hold: fill target"}
              style={{ borderColor: habitColor }}
            >
              <span className="font-mono text-[12px] font-bold">+</span>
            </button>
          ) : isAvoid ? (
            <AvoidHabitControl
              isClean={isCompleted}
              isSlipped={isSlipped}
              disabled={isFutureSelectedDate}
              onClean={onAvoidClean}
              onSlip={onAvoidSlip}
            />
          ) : (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (isFutureSelectedDate) {
                  showToast("Cannot complete habits for future dates.");
                  return;
                }
                handleToggle(habit.id, selectedDate, e);
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
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                isFutureSelectedDate ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              } ${
                isCompleted
                  ? "text-white shadow-xs scale-105"
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
                borderWidth: isCompleted ? "0px" : !isScheduled ? "1.5px" : "2px",
                borderStyle: !isScheduled && !isCompleted ? "dashed" : "solid",
                boxShadow: isCompleted
                  ? `0 0 8px ${habitColor}${isScheduled ? "66" : "35"}`
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
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <span className="font-black text-[11px] leading-none">!</span>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] font-mono mt-1 text-on-surface-variant">
          <span className="truncate font-semibold" style={{ color: habitColor }}>{habitCategoryLabel(habit)}</span>
          {/* Same honest-zero rule: no icon with an empty count. */}
          {(habit.type === "avoid" || getDaysDoneLabel(daysDone) !== "") && (
            <span className={`font-bold shrink-0 flex items-center gap-0.5 ${habit.type === "avoid" ? "text-error" : isDaysDoneActive(daysDone) ? "text-amber-400" : "text-on-surface-variant/60"}`}>
              {habit.type === "avoid" ? <X className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
              {habit.type === "avoid" ? `${getDaysDoneLabel(daysDone) || "0d"} clean` : getDaysDoneLabel(daysDone)}
            </span>
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

        {/* Counted habit progress bar */}
        {isCounted && (
          <div className="mt-1 w-full">
            <div
              className="relative w-full h-2 rounded-full bg-surface-container-high overflow-hidden cursor-pointer select-none" style={{ borderColor: habitColor }}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (isFutureSelectedDate) return;
                handleDragStart(habit, e, currentValue);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (isFutureSelectedDate) return;
                handleDragStart(habit, e, currentValue);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isFutureSelectedDate) {
                  showToast("Cannot complete habits for future dates.");
                  return;
                }
                if (userId) {
                  setHabitLogValue(userId, habit.id, selectedDate, currentValue + 1);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isFutureSelectedDate) return;
                if (userId && habit.targetValue) {
                  setHabitLogValue(userId, habit.id, selectedDate, habit.targetValue);
                  showToast(`Filled to ${habit.targetValue} ${habit.unit ?? "units"}`);
                }
              }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-150 ease-out"
                style={{
                  width: `${Math.min(100, Math.max(0, currentValue / targetValue * 100))}%`,
                  backgroundColor: habitColor,
                  boxShadow: `0 0 6px ${habitColor}80`,
                }}
              />
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
              <span>{currentValue}</span>
              <span>/ {habit.targetValue ?? "-"}</span>
              <span>{habit.unit ?? "units"}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
