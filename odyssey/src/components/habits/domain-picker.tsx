"use client";

/** The life-domain grid both habit forms use (B2). Extracted from
 *  byte-identical duplicates so the four domains render from one list. */

import { DOMAINS } from "./habit-form-options";
import { FormLabel } from "./form-section";
import { type HabitCategory } from "@/lib/db";

interface DomainPickerProps {
  value: HabitCategory;
  onChange: (v: HabitCategory) => void;
}

export function DomainPicker({ value, onChange }: DomainPickerProps) {
  return (
    <div className="space-y-1.5">
      <FormLabel>Life domain</FormLabel>
      <div className="grid grid-cols-2 gap-2">
        {DOMAINS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onChange(d.id)}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
              value === d.id
                ? `${d.bg} shadow-md`
                : "bg-surface-container hover:bg-surface-bright text-on-surface border border-outline/10"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current" />
            <span className="truncate">{d.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
