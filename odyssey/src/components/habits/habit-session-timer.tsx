"use client";

/**
 * The timer half of the counted-habit session page (2026-10-25).
 *
 * Presentational on purpose: the TimerSnapshot lives in the session modal, so
 * leaving to edit the habit (the sheet stacks above) or closing the page can
 * bank the elapsed minutes from the snapshot without an event race through a
 * child ref.
 *
 * Counts DOWN until the target, then flips to counting UP ("keep the timer
 * going" — the overshoot is real focused time and is written on pause/close).
 */

import { type Habit } from "@/lib/db";
import { formatStopwatch } from "@/lib/utils/session-timer";
import { getHabitColor } from "@/lib/utils/habit-colors";
import { Check, Pause, Play, RotateCcw } from "lucide-react";

interface HabitSessionTimerProps {
  habit: Habit;
  /** The target in ms of running time. */
  targetMs: number;
  elapsedMs: number;
  running: boolean;
  /** Running minutes already logged for the day (the overshoot caption). */
  loggedValue: number;
  onToggle: () => void;
  onRestart: () => void;
}

const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function HabitSessionTimer({
  habit,
  targetMs,
  elapsedMs,
  running,
  loggedValue,
  onToggle,
  onRestart,
}: HabitSessionTimerProps) {
  const habitColor = getHabitColor(habit);
  const reached = targetMs > 0 && elapsedMs >= targetMs;
  const progress = targetMs > 0
    ? Math.min(1, Math.max(0, elapsedMs / targetMs))
    : 0;

  // Before the target the big clock is what is LEFT; once the target is
  // reached it becomes the elapsed count-up. The flip is the completion
  // animation working with the ring turning full-circle.
  const clock = reached ? elapsedMs : Math.max(0, targetMs - elapsedMs);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="relative w-[200px] h-[200px] flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
          <circle
            cx="100" cy="100" r={RADIUS}
            className="stroke-outline/15"
            fill="none"
            strokeWidth="10"
          />
          <circle
            cx="100" cy="100" r={RADIUS}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            stroke={habitColor}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
        <div className="flex flex-col items-center gap-1">
          <span className="text-4xl font-black font-mono text-on-surface tabular-nums tracking-tight">
            {formatStopwatch(clock)}
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wide">
            {reached ? "Focused — target reached" : "Remaining"}
          </span>
        </div>
      </div>

      {reached && (
        /* The completion animation beyond the confetti (which the store's
           completion write triggers): a calm banner, because the timer does
           not stop at the target on its own. */
        <div
          role="status"
          className="w-full rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-300"
        >
          <Check className="w-5 h-5 text-primary shrink-0" />
          <p className="text-xs text-on-surface">
            <span className="font-bold">Target reached.</span>{" "}
            {formatStopwatch(Math.max(0, elapsedMs - targetMs))} past it and counting — press stop when you stop.
          </p>
        </div>
      )}

      <p className="text-xs font-mono text-on-surface-variant">
        {loggedValue} of {targetMs / 60000} {habit.unit ?? "units"} logged today
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="px-4 py-3 rounded-2xl bg-surface-container-high text-on-surface text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
          title="Reset the timer to zero (a target already reached stays done)"
        >
          <RotateCcw className="w-4 h-4" />
          Restart
        </button>
        <button
          type="button"
          onClick={onToggle}
          className={`px-8 py-3 rounded-2xl text-sm font-bold shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-all ${
            running
              ? "bg-surface-container-high/80 text-on-surface shadow-none border border-outline/20"
              : "bg-primary text-on-primary shadow-primary/30"
          }`}
        >
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {running ? "Stop" : "Start"}
        </button>
      </div>
    </div>
  );
}
