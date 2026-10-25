"use client";

/**
 * The morning/afternoon/evening/anytime picker both habit forms use (B2).
 *
 * Extracted from byte-identical duplicates, like the schedule picker. Same
 * four anchors, same tokens — only the label is now readable text rather
 * than the old ALL-CAPS "TIME ANCHOR".
 */

import { TIME_ANCHORS } from "./habit-form-options";
import { FormLabel } from "./form-section";

interface TimeAnchorPickerProps {
  value: "morning" | "afternoon" | "evening" | "anytime";
  onChange: (v: "morning" | "afternoon" | "evening" | "anytime") => void;
}

export function TimeAnchorPicker({ value, onChange }: TimeAnchorPickerProps) {
  return (
    <div className="space-y-1.5">
      <FormLabel>When does it happen?</FormLabel>
      <div className="grid grid-cols-2 gap-2">
        {TIME_ANCHORS.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => onChange(slot.id)}
            className={`p-3 rounded-xl text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
              value === slot.id
                ? "bg-primary/15 border border-primary/40 shadow-sm"
                : "bg-surface-container text-on-surface-variant border border-outline/10 opacity-70"
            }`}
          >
            <span className={`text-xs font-semibold ${value === slot.id ? "text-primary" : "text-on-surface"}`}>
              {slot.label}
            </span>
            <span className="text-[10px] font-mono">{slot.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
