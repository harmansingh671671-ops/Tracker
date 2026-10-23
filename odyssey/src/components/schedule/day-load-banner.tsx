import type { DayLoadStats } from "@/lib/utils/day-load";

/**
 * S18 — the schedule "plate" warning, one sentence in the day's own card
 * language. Silence is the ok-state: a day that fits is not a warning, and a
 * rest day is not a warning, so the component renders nothing unless the
 * saved plan is longer than the waking day it has to live in.
 *
 * Pure display: it takes `evaluateDayLoad`'s result and owns no store access,
 * so the verdict it speaks is the verdict the gate computed, verbatim.
 */
export function DayLoadBanner({ load }: { load: DayLoadStats }) {
  if (!load.isOverloaded) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="px-3.5 py-2.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-500/35 dark:border-amber-500/25 font-mono text-[11px] text-amber-700 dark:text-amber-400"
    >
      You&apos;ve planned {load.plannedHours}h of a {load.wakingHours}h waking
      day — {load.overloadHours}h over.
    </div>
  );
}
