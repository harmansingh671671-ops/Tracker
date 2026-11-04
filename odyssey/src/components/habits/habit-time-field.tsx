"use client";

import { FormLabel } from "./form-section";

/**
 * B2 revision (owner instruction 2026-11-04): the four-bucket "When does it
 * happen?" anchor picker is replaced by a plain time entry — the user types
 * the time they want to do the habit, or leaves it empty for anytime. Both
 * forms render this so the field cannot drift. Empty string means "no time".
 */

interface HabitTimeFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function HabitTimeField({ value, onChange }: HabitTimeFieldProps) {
  return (
    <div className="space-y-1.5">
      <FormLabel>What time?</FormLabel>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="What time of day"
        className="w-full bg-surface-container-lowest text-on-surface rounded-2xl py-3.5 px-4 border border-outline/15 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm text-sm font-semibold transition-all"
      />
      <p className="text-[11px] text-on-surface-variant/70 px-1">
        Optional — leave empty if the habit can happen anytime.
      </p>
    </div>
  );
}
