"use client";

/**
 * The counted-habit session page (2026-10-25).
 *
 * Opens from a press-and-hold on a counted habit card. A time unit renders the
 * countdown timer (start/stop/restart; the day completes automatically at the
 * target through the store's normal write path, and the count-up keeps
 * running past it); any other unit renders the minus/plus counter with
 * tap-to-type.
 *
 * The timer snapshot lives HERE, not in the timer view: "Edit habit" stacks
 * the edit sheet on top without unmounting this page, so a running session
 * survives the detour and banking elapsed minutes on close needs no ref.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Pencil } from "lucide-react";
import { type Habit } from "@/lib/db";
import {
  freshTimer,
  isTimerRunning,
  pauseTimer,
  startTimer,
  timerElapsedMs,
} from "@/lib/utils/session-timer";
import { timeUnitMinuteFactor } from "@/lib/utils/habit-units";
import { getHabitColor } from "@/lib/utils/habit-colors";
import { HabitSessionTimer } from "./habit-session-timer";
import { HabitSessionCounter } from "./habit-session-counter";

interface HabitSessionModalProps {
  habit: Habit;
  currentValue: number;
  isFutureSelectedDate: boolean;
  onSetValue: (value: number) => void;
  showToast: (msg: string) => void;
  /** Opens the edit sheet ABOVE this page without unmounting it. */
  onRequestEdit: () => void;
  onClose: () => void;
}

const TICK_MS = 500;

export function HabitSessionModal({
  habit,
  currentValue,
  isFutureSelectedDate,
  onSetValue,
  showToast,
  onRequestEdit,
  onClose,
}: HabitSessionModalProps) {
  const habitColor = getHabitColor(habit);
  const factor = timeUnitMinuteFactor(habit.unit);
  const target = habit.targetValue ?? 0;

  const [timer, setTimer] = useState(freshTimer);
  const [nowMs, setNowMs] = useState(0);
  // Latches the target-reached milestone once per run (cleared by Restart).
  const celebratedRef = useRef(false);
  const running = isTimerRunning(timer);

  const elapsed = timerElapsedMs(timer, nowMs);
  const targetMs = factor !== null && target > 0 ? target * factor * 60000 : 0;

  // Display tick — deliberately a local 500ms interval and NOT the shared
  // minute clock: the session needs second resolution, and the elapsed VALUE
  // is computed from Date.now() at render, so backgrounding the tab costs
  // nothing but display updates. The milestone write happens inside this
  // callback (not the effect body), re-created on every value change so the
  // completion write always sees the log as it is NOW, not as it was on mount.
  useEffect(() => {
    if (!running || targetMs <= 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      if (celebratedRef.current || isFutureSelectedDate) return;
      if (timerElapsedMs(timer, now) < targetMs) return;
      celebratedRef.current = true;
      const writeValue = Math.max(currentValue, target);
      if (writeValue > currentValue) {
        onSetValue(writeValue);
        showToast(`Target reached — ${target} ${habit.unit ?? "units"} logged`);
      } else {
        showToast("Target reached — earlier logged time already covers today");
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, targetMs, timer, currentValue, target, isFutureSelectedDate, habit.unit, onSetValue, showToast]);

  /**
   * Bank the elapsed focused minutes over whatever was already logged.
   *
   * shortcut: the MAX model — timer banking is `max(already-logged, elapsed)`,
   * never additive with other logged values, so minutes below an existing
   * banked total are not recorded. Chosen because the additive model would let
   * any over-write path *regress or inflate* a day the value input already
   * filled (the silent-data-alteration failure this repo has hit most). Upgrade
   * trigger: an owner request for cross-run additive focus minutes, which needs
   * a per-day "banked this day" ledger on the log before it is safe.
   */
  const bankElapsed = useCallback(
    (value: number) => {
      if (factor === null || target <= 0) return; // counter writes land directly
      const minutes = Math.floor(value / 60000);
      if (minutes > 0 && minutes > currentValue && !isFutureSelectedDate) {
        onSetValue(Math.max(currentValue, minutes));
      }
      return minutes;
    },
    [factor, target, currentValue, isFutureSelectedDate, onSetValue]
  );

  const handleToggle = () => {
    if (isFutureSelectedDate) {
      showToast("Cannot complete habits for future dates.");
      return;
    }
    if (running) {
      bankElapsed(elapsed);
      setTimer(pauseTimer(timer, Date.now()));
    } else {
      const next = startTimer(timer, Date.now());
      setTimer(next);
      // Start the display clock from the truth of the snapshot, not an
      // effect: the first seconds must not read as paused-then-corrected.
      setNowMs(next.startedAt ?? Date.now());
    }
  };

  const handleRestart = () => {
    // Restart resets the CLOCK, never the day: a target already banked stays
    // banked (un-completing a logged day would destroy data, not reset a run).
    setTimer(freshTimer());
    celebratedRef.current = false;
    setNowMs(Date.now());
  };

  const handleClose = () => {
    // Closing mid-run is not a discard: what ran this session gets logged.
    bankElapsed(elapsed);
    onClose();
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-container-lowest/85 animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-surface-container rounded-t-[32px] sm:rounded-[32px] border border-outline/15 shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-6 duration-300 cursor-default"
      >
        <div className="flex flex-col items-center -mb-1">
          <div className="w-12 h-1.5 rounded-full bg-outline/20 mb-3" />
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl shrink-0">{habit.icon}</span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight text-on-surface truncate">
                  {habit.name}
                </h2>
                <p className="text-[11px] font-mono" style={{ color: habitColor }}>
                  {target > 0 ? `${target} ${habit.unit ?? "units"} / day` : "No daily target yet"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onRequestEdit}
                className="h-9 px-3 rounded-full bg-surface-container-high flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                title="Edit this habit"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit habit
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {factor === null ? (
          <HabitSessionCounter
            habit={habit}
            target={target}
            value={currentValue}
            disabled={isFutureSelectedDate}
            blockedMessage="Cannot log habits for future dates"
            onSetValue={onSetValue}
          />
        ) : target > 0 ? (
          <HabitSessionTimer
            habit={habit}
            targetMs={targetMs}
            elapsedMs={elapsed}
            running={running}
            loggedValue={currentValue}
            onToggle={handleToggle}
            onRestart={handleRestart}
          />
        ) : (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-on-surface font-semibold">
              This habit has no daily target yet.
            </p>
            <button
              type="button"
              onClick={onRequestEdit}
              className="px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-bold cursor-pointer active:scale-95 transition-transform"
            >
              Set a target
            </button>
          </div>
        )}

        <p className="text-center text-[10px] font-mono text-on-surface-variant/70">
          Press and hold the habit card anytime to come back here
        </p>
      </div>
    </div>
  );
}
