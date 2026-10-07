"use client";

/**
 * M4 -- the perfect-day celebration.
 *
 * Shown when every habit due on the selected day is complete. It is a
 * celebration of the day's work, and it says plainly that the bonus is *pending*
 * rather than claimed: rewards settle at rollover (ADR 0002), so claiming them
 * here would be a lie. The old research copy read "+50 Bonus XP Claimed".
 *
 * The vault banner already carries the figure, so this card deliberately does not
 * repeat a number that could disagree with it. It states the day is complete and
 * where the reward goes.
 *
 * Colour comes from CSS-var tokens throughout (no raw hex), so it re-themes with
 * light and dark. The animation is a CSS keyframe whose body sits inside a
 * `prefers-reduced-motion: no-preference` query in globals.css, the same pattern
 * `keystonePulse` (M2) and `slateSweep` (M3) use -- honouring reduced motion
 * then costs no JS and produces no hydration-time flash.
 */

import { PartyPopper } from "lucide-react";

interface PerfectDayCardProps {
  /** True when the perfect-day bonus is still unearned-and-unpaid for this day. */
  show: boolean;
  /** The calendar day, for the heading ("Perfect day" vs a dated past day). */
  isToday: boolean;
}

export function PerfectDayCard({ show, isToday }: PerfectDayCardProps) {
  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-2xl bg-primary-container/60 border border-primary/25 p-4 shadow-sm perfect-day-glow"
    >
      <div
        aria-hidden="true"
        className="absolute -right-6 -top-6 w-24 h-24 bg-primary/15 rounded-full blur-2xl pointer-events-none"
      />

      <div className="relative flex items-start gap-3">
        <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-on-primary">
          <PartyPopper className="w-5 h-5" />
        </span>

        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-bold tracking-tight text-on-surface">
            {isToday ? "Perfect day achieved!" : "Perfect day"}
          </h3>

          <p className="text-xs leading-relaxed text-on-surface-variant">
            Everything scheduled for {isToday ? "today" : "this day"} is done, and the perfect-day
            bonus has been added to your vault.
          </p>

          {/* The pending framing is load-bearing: the bonus is not in the profile
              until the day ends, and saying otherwise would overstate the balance
              the user can actually spend. */}
          <p className="text-[11px] font-medium text-primary">
            Pays into your balance at midnight
          </p>
        </div>
      </div>
    </div>
  );
}