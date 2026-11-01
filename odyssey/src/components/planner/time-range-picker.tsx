"use client";

import { Minus, Plus } from "lucide-react";

interface TimeRangePickerProps {
  /** Start hour 0-23. */
  startHour: number;
  /** Exclusive end hour, 24 meaning "runs to midnight". */
  endHour: number;
  onChange: (startHour: number, endHour: number) => void;
}

function StepperButton({
  dir,
  onClick,
  disabled,
}: {
  dir: "plus" | "minus";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={dir === "plus" ? "Increase" : "Decrease"}
      className="w-9 h-9 shrink-0 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface transition-all active:scale-90 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
    >
      {dir === "plus" ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
    </button>
  );
}

/**
 * The readable duration picker `C2` asks for: pick the start hour and how many
 * hours the plan runs, in one place. Everything is whole hours because the
 * schedule grid, the drag hit-testing and the review counters are all they are
 * scaled to - minute-level planning would need a different data model.
 */
export function TimeRangePicker({ startHour, endHour, onChange }: TimeRangePickerProps) {
  const length = Math.max(1, endHour - startHour);
  const maxEnd = 24;
  const maxStart = 23;
  const maxLen = maxEnd - startHour;

  const clamp = (start: number, end: number) => {
    const s = Math.min(maxStart, Math.max(0, start));
    const e = Math.min(maxEnd, Math.max(s + 1, end));
    return { s, e };
  };

  const stepStart = (delta: number) => {
    const next = clamp(startHour + delta, endHour + delta);
    // Keep the chosen length when it still fits; otherwise the picker runs the
    // plan to midnight rather than silently shortening into the next day.
    const len = Math.min(length, maxEnd - next.s);
    onChange(next.s, Math.min(maxEnd, next.s + len));
  };

  const stepLength = (delta: number) => {
    const len = Math.min(maxLen, Math.max(1, length + delta));
    onChange(startHour, startHour + len);
  };

  const label = (h: number) => (h >= 24 ? "24" : String(h).padStart(2, "0"));

  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-mono text-on-surface-variant font-medium tracking-wide">WHEN & HOW LONG</span>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between gap-1 rounded-xl bg-surface-container-lowest border border-outline/15 px-2 py-1.5">
          <StepperButton dir="minus" onClick={() => stepStart(-1)} disabled={startHour <= 0} />
          <div className="text-center min-w-9">
            <div className="text-sm font-bold text-on-surface font-mono">{label(startHour)}:00</div>
            <div className="text-[9px] font-mono text-on-surface-variant/60 tracking-wide uppercase">starts</div>
          </div>
          <StepperButton dir="plus" onClick={() => stepStart(1)} disabled={startHour >= maxStart} />
        </div>
        <div className="flex items-center justify-between gap-1 rounded-xl bg-surface-container-lowest border border-outline/15 px-2 py-1.5">
          <StepperButton dir="minus" onClick={() => stepLength(-1)} disabled={length <= 1} />
          <div className="text-center min-w-9">
            <div className="text-sm font-bold text-on-surface font-mono">
              {length} h{length > 1 ? "s" : ""}
            </div>
            <div className="text-[9px] font-mono text-on-surface-variant/60 tracking-wide uppercase">length</div>
          </div>
          <StepperButton dir="plus" onClick={() => stepLength(1)} disabled={endHour >= maxEnd} />
        </div>
      </div>
      <p className="text-[11px] font-mono text-on-surface-variant/70 text-center">
        runs {label(startHour)}:00 → {label(endHour)}:00
      </p>
    </div>
  );
}
