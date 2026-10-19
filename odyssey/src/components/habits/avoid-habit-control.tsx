"use client";

import { Check, X } from "lucide-react";

interface AvoidHabitControlProps {
  /** The day is already marked clean. */
  isClean: boolean;
  /** The day is already marked as a slip. */
  isSlipped: boolean;
  disabled?: boolean;
  /** Make the day clean, or clear it if it already is. */
  onClean: (isClean: boolean) => void;
  /** Record a slip, or clear it back to clean if it already is. */
  onSlip: (isSlipped: boolean) => void;
}

/**
 * The two ways a quit habit's day can go: stayed clean, or slipped.
 *
 * Two explicit buttons rather than one ring plus a hidden gesture, because recording a
 * slip is a deliberate act and a control nobody can find is a feature nobody has. This is
 * also the only place the `avoid` type reaches the violation state the model documents.
 */
export function AvoidHabitControl({
  isClean,
  isSlipped,
  disabled = false,
  onClean,
  onSlip,
}: AvoidHabitControlProps) {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const base =
    "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-200";
  const state = disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-105";

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-pressed={isClean}
        aria-label={isClean ? "Stayed clean today" : "Mark today as clean"}
        title={isClean ? "Stayed clean (tap to clear)" : "Mark today clean"}
        onMouseDown={stop}
        onTouchStart={stop}
        onClick={(e) => {
          e.stopPropagation();
          onClean(isClean);
        }}
        className={`${base} ${state} ${
          isClean
            ? "border-transparent bg-emerald-500 text-white shadow-sm"
            : "border-outline/40 text-on-surface-variant"
        }`}
      >
        <Check className="w-3.5 h-3.5 stroke-[3]" />
      </button>

      <button
        type="button"
        disabled={disabled}
        aria-pressed={isSlipped}
        aria-label={isSlipped ? "Slipped today" : "Record a slip today"}
        title={isSlipped ? "Slipped (tap to undo)" : "Record a slip"}
        onMouseDown={stop}
        onTouchStart={stop}
        onClick={(e) => {
          e.stopPropagation();
          onSlip(isSlipped);
        }}
        className={`${base} ${state} ${
          isSlipped
            ? "border-transparent bg-error text-on-error shadow-sm"
            : "border-error/40 text-error"
        }`}
      >
        <X className="w-3.5 h-3.5 stroke-[3]" />
      </button>
    </div>
  );
}
