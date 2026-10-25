"use client";

/**
 * A collapsible group of optional habit-form fields (B2, 2026-10-25).
 *
 * B2's shape: essentials visible, everything optional folded. The old single
 * "Advanced settings" drawer held motivation, priority and colour under one
 * generic name; named groups tell the user what is behind the fold before
 * they open it.
 *
 * Shared by the create and edit forms so the two pages cannot drift.
 */

import { ChevronDown } from "lucide-react";
import { type ReactNode } from "react";

interface FormSectionProps {
  title: string;
  /** Shown next to the title, ideally what is inside ("Cue, reward"). */
  hint?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function FormSection({ title, hint, open, onToggle, children }: FormSectionProps) {
  return (
    <div className="rounded-2xl border border-outline/10 bg-surface-container-low overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-on-surface cursor-pointer hover:bg-surface-container-high/40 transition-colors"
      >
        <ChevronDown
          className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
        <span className="shrink-0">{title}</span>
        {hint && (
          <span className="text-[11px] font-normal text-on-surface-variant/70 truncate">{hint}</span>
        )}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

/** The readable field label both forms print above every input. */
export function FormLabel({ children }: { children: ReactNode }) {
  return (
    <label className="text-xs font-medium text-on-surface-variant font-medium block">
      {children}
    </label>
  );
}
