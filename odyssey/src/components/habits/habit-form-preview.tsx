"use client";

/**
 * The live preview card on the habit forms (B2, 2026-10-25, approved with
 * preview). A faithful miniature of the habit-list card — same tokens, same
 * icon chip, same colour rule (`getHabitColor`) — so "Save & Start" shows the
 * row you are about to get exactly as you typed it.
 *
 * Presentational: the caller owns the form state and feeds in the four ready
 * sentences from `habit-form-summary.ts`, so the wording cannot drift between
 * the create and edit forms.
 */

import { Flame } from "lucide-react";
import { getHabitColor } from "@/lib/utils/habit-colors";

interface HabitFormPreviewProps {
  icon: string;
  name: string;
  domain: string;
  /** Optional explicit colour choice from the swatches. */
  color: string;
  scheduleLine: string;
  periodLine: string;
  goalLine: string;
  priority: string;
  type?: string;
}

/** Mirrors the warm-copy precedence: critical is red, optional is muted. */
const PRIORITY_STYLE: Record<string, string> = {
  Critical: "text-error bg-error/10 border-error/30",
  Optional: "text-on-surface-variant bg-surface-container-high border-outline/15",
  Focus: "text-primary bg-primary/10 border-primary/30",
};

export function HabitFormPreview({
  icon,
  name,
  domain,
  color,
  scheduleLine,
  periodLine,
  goalLine,
  priority,
  type,
}: HabitFormPreviewProps) {
  // The same colour decision the list card makes: explicit pick wins, then the
  // domain, then the name hash. An unnamed draft still colours deterministically.
  const accent = getHabitColor({ category: domain, name, color: color || undefined });
  const quit = type === "avoid";
  const displayName = (name.trim() || "Your new habit").slice(0, 40);

  return (
    <div>
      <p className="text-xs font-medium text-on-surface-variant mb-1.5">How it will look</p>
      <div
        className={`rounded-2xl border bg-surface-container px-3.5 py-3 flex items-start gap-2.5 select-none ${
          quit ? "border-error/30" : ""
        }`}
        style={!quit ? { borderColor: `${accent}50` } : undefined}
      >
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-base"
          style={{ backgroundColor: `${accent}18`, borderColor: `${accent}35` }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-on-surface truncate leading-tight">{displayName}</p>
            <span
              className={`shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold border ${PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.Focus}`}
            >
              {priority}
            </span>
          </div>
          <p className="text-[10px] text-on-surface-variant font-mono truncate">
            {domain}
          </p>
          <div className="mt-1 space-y-0.5">
            <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
              <Flame className="w-3 h-3 shrink-0" style={{ color: accent }} />
              <span className="truncate">{scheduleLine} · {periodLine}</span>
            </p>
            <p className="text-[10px] text-on-surface-variant/80 truncate">{goalLine}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
