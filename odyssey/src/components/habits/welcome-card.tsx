"use client";

/**
 * M6 -- the first-open welcome card.
 *
 * Orientation and one action, in one card. It deliberately does NOT stack above
 * the M2 empty state: both would be full-size, both would carry a "do this"
 * button, and two of them compete. This card occupies the same slot while it is
 * visible, and M2's empty state takes over once it is dismissed or once a habit
 * exists -- so dismissing never leaves a blank screen. The rule that decides
 * which one wins lives in `lib/utils/welcome-card.ts` and is unit-tested there.
 *
 * The three pillars match the M6 spec (Habits / Schedule / Wallpaper). All three
 * describe shipped behaviour, with no claim of routine templates, AI, or anything
 * from a later phase.
 *
 * On the wallpaper pillar specifically: it is **off by default** (P8-E1, rule
 * 6.6 step 2). Copy that said "your plan on your lock screen" would be promising
 * a background service the user has not turned on, so the line says it is
 * something they switch on.
 *
 * Colour is CSS-var tokens throughout -- no raw hex -- so it re-themes with light
 * and dark like everything else. No animation: nothing here needs to move, and
 * an unmoving card costs no reduced-motion handling.
 */

import { CalendarClock, CheckCircle2, ListChecks, Plus, Smartphone, X } from "lucide-react";
import { LocalDataTrustBadge } from "@/components/common/local-data-trust-badge";

interface WelcomeCardProps {
  /** Opens the existing create-habit modal -- the same target as M2's button. */
  onAddFirstHabit: () => void;
  /** Persists the dismissal. No "are you sure"; the card is not important. */
  onDismiss: () => void;
}

const PILLARS = [
  {
    Icon: ListChecks,
    title: "Habits",
    body: "Tick off what you meant to do. Streaks build themselves.",
  },
  {
    Icon: CalendarClock,
    title: "Schedule",
    body: "Shape the day on a 24-hour rail. Tap any hour to plan it.",
  },
  {
    Icon: Smartphone,
    title: "Wallpaper",
    body: "Put today's plan on your lock screen, if you want it there.",
  },
] as const;

export function WelcomeCard({ onAddFirstHabit, onDismiss }: WelcomeCardProps) {
  return (
    <section
      aria-labelledby="welcome-card-heading"
      className="relative overflow-hidden rounded-2xl border border-outline/10 bg-surface-container-low p-4 shadow-sm space-y-4"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="welcome-card-heading" className="text-base font-bold tracking-tight text-on-surface">
            Welcome to Odyssey
          </h2>
          <p className="text-xs leading-relaxed text-on-surface-variant">
            Three things worth knowing before you start.
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss welcome"
          className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="relative space-y-2.5">
        {PILLARS.map(({ Icon, title, body }) => (
          <li key={title} className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary"
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-on-surface">{title}</h3>
              <p className="text-xs leading-snug text-on-surface-variant">{body}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Fills the onboarding surface the M1 badge's own comment recorded as
          deliberately absent, now that a welcome surface exists to host it. */}
      <div className="relative">
        <LocalDataTrustBadge variant="inline" />
      </div>

      <div className="relative flex items-center gap-2 text-[11px] font-medium text-on-surface-variant">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span>This card disappears once you add a habit.</span>
      </div>

      <button
        type="button"
        onClick={onAddFirstHabit}
        className="relative flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-on-primary transition-opacity hover:opacity-90 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        <span>Add your first habit</span>
      </button>
    </section>
  );
}