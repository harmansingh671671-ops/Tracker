"use client";

import { useState } from "react";
import { PAUSE_PRESETS, normalizePauseDays } from "@/lib/utils/habit-lifecycle";

/**
 * B13 (owner option C): the pause length chooser — preset chips 3/7/30 plus a
 * custom 1–30 stepper. Validation lives in `normalizePauseDays`; an out-of-range
 * or non-integer custom value is shown honestly (confirm disabled) instead of
 * being silently clamped.
 */
interface PauseLengthPickerProps {
  onConfirm: (days: number) => void;
  /** Cancels back out of the picker (the row returns to Pause / Let go / Keep). */
  onCancel?: () => void;
  /** Small vertical form for the review card's row; the edit sheet uses it inline. */
  className?: string;
}

export function PauseLengthPicker({
  onConfirm,
  onCancel,
  className = "",
}: PauseLengthPickerProps) {
  const [custom, setCustom] = useState<string>("");
  const parsed = custom.trim() === "" ? null : normalizePauseDays(parseInt(custom, 10));
  const outOfRange = custom.trim() !== "" && parsed === null;

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl bg-surface-container-low border border-outline/15 p-2.5 ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {PAUSE_PRESETS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => onConfirm(days)}
            title={`Pause ${days} day${days > 1 ? "s" : ""}`}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-mono font-bold bg-surface-container text-primary border border-outline/15 hover:bg-primary/10 active:scale-95 transition-all cursor-pointer"
          >
            {days}d
          </button>
        ))}
        <div className="flex-1 flex items-center gap-1 rounded-lg border border-outline/15 bg-surface-container px-1.5 py-0.5">
          <span className="text-[9px] font-mono text-on-surface-variant shrink-0">1–30</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="—"
            aria-label="Custom pause days"
            className={`w-9 bg-transparent text-center text-[11px] font-mono font-bold text-on-surface outline-none ${
              outOfRange ? "text-error" : ""
            }`}
          />
          <button
            type="button"
            onClick={() => parsed !== null && onConfirm(parsed)}
            disabled={parsed === null}
            title={`Pause ${parsed ?? ""} day${parsed && parsed > 1 ? "s" : ""} (custom)`}
            className="shrink-0 px-1.5 py-1 rounded-md text-[10px] font-bold bg-primary text-on-primary disabled:opacity-40 enabled:hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            ✓
          </button>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel pause"
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>
      {outOfRange && (
        <p className="text-[10px] font-mono text-error">
          Whole days between 1 and 30.
        </p>
      )}
    </div>
  );
}
