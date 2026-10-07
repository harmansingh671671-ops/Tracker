/**
 * M11 -- time-period accents.
 *
 * A habit may declare when it belongs: morning, afternoon or evening. That
 * field (`Habit.period`) has existed in the schema since the beginning and been
 * written by the create flow ever since, but until now **nothing ever read it**
 * -- dead data on every habit in the app. This gives it a purpose.
 *
 * ## Three periods, not four
 *
 * The spec asks for Morning / Afternoon / Evening / **Night**. The schema's
 * union is `'morning' | 'afternoon' | 'evening'` and the create flow offers no
 * night option, so a night value has nothing to attach to and no way to be set.
 * Rather than ship a token nothing can select, or silently invent a fourth
 * period in the UI without a decision, this covers the three that exist and the
 * gap is recorded on the M11 line.
 *
 * ## Colour is never the only signal
 *
 * Accessibility rule 5.3 #3. Each accent therefore returns a LABEL as well as
 * classes, and the card renders the word too -- the colour reinforces, it does
 * not carry the information alone. A user who cannot distinguish amber from
 * purple still reads "Morning".
 */
import type { Habit } from "@/lib/db";

export type TimePeriod = "morning" | "afternoon" | "evening";

export interface TimePeriodAccent {
  id: TimePeriod;
  /** Human label. Rendered as text so colour is never load-bearing. */
  label: string;
  /** Token-based classes for the accent itself. */
  accentClass: string;
  /** Token-based classes for a soft fill behind the accent. */
  containerClass: string;
}

const ACCENTS: Record<TimePeriod, TimePeriodAccent> = {
  morning: {
    id: "morning",
    label: "Morning",
    accentClass: "text-period-morning",
    containerClass: "bg-period-morning-container",
  },
  afternoon: {
    id: "afternoon",
    label: "Afternoon",
    accentClass: "text-period-afternoon",
    containerClass: "bg-period-afternoon-container",
  },
  evening: {
    id: "evening",
    label: "Evening",
    accentClass: "text-period-evening",
    containerClass: "bg-period-evening-container",
  },
};

/**
 * Normalises whatever is on the habit into a known period, or `null`.
 *
 * Tolerant on purpose: `period` is a free-ish field written by an older build
 * and by the onboarding flow, and a habit saved with an unexpected value must
 * render without an accent rather than throw or paint an undefined class.
 */
export function getTimePeriod(habit: Pick<Habit, "period"> | null | undefined): TimePeriod | null {
  const raw = habit?.period;
  if (!raw) return null;
  const normalized = String(raw).trim().toLowerCase();
  return normalized in ACCENTS ? (normalized as TimePeriod) : null;
}

/** The accent for a habit, or `null` when it has no usable period. */
export function getTimePeriodAccent(
  habit: Pick<Habit, "period"> | null | undefined
): TimePeriodAccent | null {
  const period = getTimePeriod(habit);
  return period ? ACCENTS[period] : null;
}

/** Every accent, for tests and for anything that needs to enumerate them. */
export function allTimePeriods(): TimePeriodAccent[] {
  return [ACCENTS.morning, ACCENTS.afternoon, ACCENTS.evening];
}