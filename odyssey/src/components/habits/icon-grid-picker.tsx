"use client";

/**
 * The emoji icon grid both habit forms use (B2). Extracted from
 * byte-identical duplicates (the create form's tiles were h-11, the edit
 * form's h-12 — the drift proof); both now render this one grid.
 */

import { EMOJIS } from "./habit-form-options";
import { FormLabel } from "./form-section";

interface IconGridPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function IconGridPicker({ value, onChange }: IconGridPickerProps) {
  return (
    <div className="space-y-1.5">
      <FormLabel>Pick an icon</FormLabel>
      <div className="grid grid-cols-5 gap-2 p-2 bg-surface-container-low rounded-2xl border border-outline/10">
        {EMOJIS.map((item) => (
          <button
            key={item.emoji}
            type="button"
            onClick={() => onChange(item.emoji)}
            className={`h-11 flex items-center justify-center rounded-xl text-xl transition-all active:scale-90 ${
              value === item.emoji
                ? "bg-primary/20 border border-primary/50 shadow-md scale-105"
                : "bg-surface-container hover:bg-surface-bright"
            }`}
            title={item.label}
          >
            <span>{item.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
