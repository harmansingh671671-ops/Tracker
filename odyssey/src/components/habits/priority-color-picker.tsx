"use client";

/** The priority chips and colour swatches both habit forms use (B2).
 *  Extracted from byte-identical duplicates; same values, same tokens. */

import { PRIORITIES, HABIT_SWATCH_COLORS } from "./habit-form-options";
import { FormLabel } from "./form-section";

export function PriorityPicker({
  value,
  onChange,
}: {
  value: "critical" | "focus" | "optional";
  onChange: (v: "critical" | "focus" | "optional") => void;
}) {
  return (
    <div className="space-y-1.5">
      <FormLabel>Priority</FormLabel>
      <div className="flex gap-2">
        {PRIORITIES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={`flex-1 p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              value === p.id
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-surface-container border-outline/10 text-on-surface-variant opacity-70"
            }`}
          >
            <span className="mr-1">{p.emoji}</span>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <FormLabel>Color</FormLabel>
      <div className="flex flex-wrap gap-2">
        {HABIT_SWATCH_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(value === c ? "" : c)}
            className={`w-8 h-8 rounded-full border-2 transition-all ${value === c ? "border-on-surface scale-110" : "border-transparent"}`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
        <button
          type="button"
          onClick={() => onChange("")}
          className={`px-3 py-1 rounded-full text-xs border ${value === "" ? "bg-primary/15 border-primary/40 text-primary" : "bg-surface-container border-outline/10 text-on-surface-variant"}`}
        >
          Auto
        </button>
      </div>
    </div>
  );
}
