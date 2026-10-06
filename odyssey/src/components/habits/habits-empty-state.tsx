"use client";

import { Plus } from "lucide-react";

interface HabitsEmptyStateProps {
  onAddFirst: () => void;
}

/**
 * Zero-habit state for the Habits page (M2).
 *
 * A keystone block carries the load for everything else, so one habit is the
 * smallest thing worth starting. The (+) ring pulses to say "the action is
 * here", and the pulse is decorative: `aria-hidden` keeps it out of the
 * accessibility tree, and the button below is the real affordance.
 *
 * The pulse is gated on `prefers-reduced-motion` in `globals.css`, the same way
 * `date-ring-pulse` is, so honouring reduced motion needs no JS and no
 * hydration-time flash.
 */
export function HabitsEmptyState({ onAddFirst }: HabitsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center gap-4 rounded-2xl border border-outline/10 bg-surface-container-low px-6 py-10 sm:py-12">
      <div className="relative flex items-center justify-center" aria-hidden="true">
        {/* Keystone block: the wider base under a narrower cap, drawn with
            tokens so it re-themes with light/dark like everything else. */}
        <svg
          viewBox="0 0 96 96"
          className="w-24 h-24 sm:w-28 sm:h-28"
          role="presentation"
          focusable="false"
        >
          <polygon
            points="32,20 64,20 74,50 22,50"
            fill="var(--primary-container)"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <polygon
            points="22,54 74,54 84,84 12,84"
            fill="var(--primary)"
            fillOpacity="0.85"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>

        {/* Pulsing (+) — sits on the keystone's shoulder. */}
        <span className="keystone-pulse absolute bottom-3 flex items-center justify-center w-9 h-9 rounded-full bg-surface text-primary shadow-sm">
          <Plus className="w-5 h-5" strokeWidth={3} />
        </span>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-on-surface">
          Your journey begins with one keystone habit
        </h3>
        <p className="text-xs text-on-surface-variant max-w-[18rem] mx-auto leading-relaxed">
          Pick the one habit that holds the rest up. Everything else can wait.
        </p>
      </div>

      <button
        type="button"
        onClick={onAddFirst}
        className="py-2.5 px-5 rounded-full bg-primary text-on-primary text-xs font-bold cursor-pointer transition-opacity hover:opacity-90 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Add your keystone habit
      </button>
    </div>
  );
}
