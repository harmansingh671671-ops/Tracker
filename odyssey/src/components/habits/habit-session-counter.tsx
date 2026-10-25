"use client";

/**
 * The counter half of the counted-habit session page (2026-10-25).
 *
 * Big number, minus/plus steppers (press-and-hold repeats), tap the number to
 * type a value by hand, and a fill-to-target shortcut. Every change is written
 * through the same store path the card's water bar uses, so the heatmap fill,
 * streaks, days-done and the completion confetti all behave exactly as they
 * do for a tap.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, Target } from "lucide-react";
import { type Habit } from "@/lib/db";
import { getHabitColor } from "@/lib/utils/habit-colors";
import { clampCountedValue } from "@/lib/utils/habit-units";

interface HabitSessionCounterProps {
  habit: Habit;
  target: number;
  value: number;
  disabled: boolean;
  blockedMessage: string;
  onSetValue: (value: number) => void;
}

const REPEAT_AFTER_MS = 350;
const REPEAT_EVERY_MS = 90;

export function HabitSessionCounter({
  habit,
  target,
  value,
  disabled,
  blockedMessage,
  onSetValue,
}: HabitSessionCounterProps) {
  const habitColor = getHabitColor(habit);
  const unit = habit.unit ?? "units";
  const complete = target > 0 && value >= target;

  // Tap-to-type: the big number is a button that opens an inline editor so a
  // big jump (10,000 steps) never needs ten thousand presses.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const draftRef = useRef<HTMLInputElement | null>(null);

  // Press-and-hold repeat for the steppers, so reps/glasses tallies without
  // fifty taps. Disabled targets never start a repeat.
  const repeatRef = useRef<{ hold: ReturnType<typeof setTimeout> | null; tick: ReturnType<typeof setInterval> | null }>({
    hold: null,
    tick: null,
  });
  // The accumulator the hold-repeat walks forward: re-reading `value` inside
  // the interval would write the same number every tick, so the press state
  // carries the count instead.
  const repeatValueRef = useRef(0);

  const stopRepeat = () => {
    if (repeatRef.current.hold) clearTimeout(repeatRef.current.hold);
    if (repeatRef.current.tick) clearInterval(repeatRef.current.tick);
    repeatRef.current = { hold: null, tick: null };
  };

  useEffect(() => stopRepeat, []);

  const startRepeat = (step: 1 | -1) => {
    if (disabled) return;
    const next = clampCountedValue(value + step);
    if (next === value) return;
    repeatValueRef.current = next;
    onSetValue(repeatValueRef.current);
    const hold = setTimeout(() => {
      const tick = setInterval(() => {
        const repeated = clampCountedValue(repeatValueRef.current + step);
        if (repeated === repeatValueRef.current) return; // floor of 0 reached
        repeatValueRef.current = repeated;
        onSetValue(repeatValueRef.current);
      }, REPEAT_EVERY_MS);
      repeatRef.current.tick = tick;
    }, REPEAT_AFTER_MS);
    repeatRef.current.hold = hold;
  };


  const openEditor = () => {
    if (disabled) return;
    setDraft(String(value));
    setEditing(true);
  };

  const commitDraft = () => {
    setEditing(false);
    if (draft.trim() === "") return;
    const parsed = clampCountedValue(draft);
    if (parsed !== value) onSetValue(parsed);
  };

  useEffect(() => {
    if (editing) draftRef.current?.focus();
  }, [editing]);

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {complete && (
        <div
          role="status"
          className="w-full rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-300"
        >
          <Check className="w-5 h-5 text-primary shrink-0" />
          <p className="text-xs text-on-surface">
            <span className="font-bold">Target reached.</span> You can keep counting past it — today is already done.
          </p>
        </div>
      )}

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            ref={draftRef}
            type="number"
            inputMode="numeric"
            min="0"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitDraft();
              if (e.key === "Escape") {
                setEditing(false);
                setDraft("");
              }
            }}
            className="w-40 text-4xl font-black font-mono text-on-surface text-center bg-surface-container-low border border-primary/40 rounded-2xl py-2 tabular-nums focus:ring-2 focus:ring-primary/40 outline-none"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={openEditor}
          disabled={disabled}
          title={disabled ? blockedMessage : "Tap to type an exact amount"}
          className="text-6xl font-black font-mono text-on-surface tabular-nums tracking-tight cursor-pointer focus:outline-none active:scale-95 transition-transform disabled:cursor-not-allowed disabled:opacity-50"
        >
          {value}
        </button>
      )}

      <p className="text-xs font-mono text-on-surface-variant flex items-center gap-1.5">
        <Target className="w-3.5 h-3.5" style={{ color: habitColor }} />
        {target > 0 ? `of ${target} ${unit}` : `no daily target set`}
      </p>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label={`Remove 1 ${unit}`}
          disabled={disabled || value <= 0}
          onPointerDown={(e) => { e.preventDefault(); startRepeat(-1); }}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          onPointerCancel={stopRepeat}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black border border-outline/15 bg-surface-container-high text-on-surface cursor-pointer active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-40 select-none`}
        >
          <Minus className="w-6 h-6" />
        </button>
        <button
          type="button"
          aria-label={`Add 1 ${unit}`}
          disabled={disabled}
          onPointerDown={(e) => { e.preventDefault(); startRepeat(1); }}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          onPointerCancel={stopRepeat}
          className="w-20 h-20 rounded-full flex items-center justify-center text-on-primary shadow-lg shadow-primary/30 cursor-pointer active:scale-95 transition-transform select-none"
          style={{ backgroundColor: habitColor }}
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {target > 0 && !complete && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSetValue(target)}
          className="px-4 py-2 rounded-full bg-surface-container-high border border-outline/15 text-on-surface text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Target className="w-3.5 h-3.5" />
          Set to target ({target} {unit})
        </button>
      )}
    </div>
  );
}
