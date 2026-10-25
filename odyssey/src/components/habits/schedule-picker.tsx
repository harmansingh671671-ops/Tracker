"use client";

/**
 * The preset + weekday chip picker both habit forms use (B2, 2026-10-25).
 *
 * The create and edit forms carried byte-identical copies of this block except
 * for one tile height, which is exactly how drift happens. Extracted so the
 * two pages pick the same days through the same controls.
 */

import { WEEKDAYS } from "./habit-form-options";
import { FormLabel } from "./form-section";

interface SchedulePickerProps {
  selectedDays: number[];
  /** One toggle per chip; enforced "at least one day" lives in the caller. */
  onToggleDay: (day: number) => void;
  onApplyPreset: (preset: "everyday" | "weekdays" | "3x") => void;
}

const PRESETS = [
  { id: "everyday", label: "Everyday", activeWhen: (n: number) => n === 7 },
  { id: "weekdays", label: "Weekdays", activeWhen: (n: number) => n === 5 },
  { id: "3x", label: "3x Week", activeWhen: (n: number) => n === 3 },
] as const;

export function SchedulePicker({ selectedDays, onToggleDay, onApplyPreset }: SchedulePickerProps) {
  return (
    <div className="space-y-1.5">
      <FormLabel>Which days each week?</FormLabel>
      <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline/10 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-on-surface">Target schedule</span>
          <span className="font-mono text-primary font-bold">{selectedDays.length} days / week</span>
        </div>

        <div className="flex gap-1.5 p-1 bg-surface-container rounded-xl">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onApplyPreset(p.id)}
              className={`flex-1 py-1 text-center rounded-lg text-xs font-medium transition-colors ${
                p.activeWhen(selectedDays.length) ? "bg-surface-container-high text-primary font-bold" : "text-on-surface-variant"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center pt-1">
          {WEEKDAYS.map((dName, idx) => {
            const dayNum = idx + 1;
            const isSelected = selectedDays.includes(dayNum);
            return (
              <button
                key={dName}
                type="button"
                onClick={() => onToggleDay(dayNum)}
                className={`w-9 h-9 rounded-full text-xs font-mono font-bold flex items-center justify-center transition-transform active:scale-90 ${
                  isSelected
                    ? "bg-primary text-on-primary shadow-sm shadow-primary/30"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {dName[0]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
