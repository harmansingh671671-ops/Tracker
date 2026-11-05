"use client";

import { LoadingIndicator } from "@/components/common/loading-indicator";
import { labelFromMinutes } from "@/lib/utils/block-resize";
import { calculateBlockHeight } from "@/lib/utils/planner-block-time";

/**
 * The quick schedule's loading frame.
 *
 * ## Why a skeleton and not a spinner
 *
 * The route reads `?date=` through `useSearchParams`, so Next prerenders the
 * `Suspense` fallback as the whole page's HTML. That fallback used to be a
 * centred spinner: the screen painted *empty*, then a header with a short
 * "Loading schedule blocks" block, then the rail — three different heights in
 * a row, and the scroll-to-top that followed each one read as the page
 * "snapping" several times before it settled.
 *
 * So both loading states now paint the SAME frame: the header bar, the
 * allocation card, and the rail **including its vertical line** and one
 * placeholder per hour, each as tall as a one-hour card. Data then fills that
 * frame in place instead of replacing it, and nothing above the fold moves.
 *
 * ## The line is the point
 *
 * The rail line is a `before:` pseudo-element on the list wrapper. Rendering
 * the wrapper here — with the real classes, copied verbatim — is what makes the
 * line appear with the rows rather than a frame later, which is the "days
 * without line, then the line" half of the report.
 *
 * ## Cheap on purpose
 *
 * Static grey shapes, and only the two text bars pulse: 24 cards' worth of
 * animation would be real work on the low-end Android this ships to, and the
 * frame is typically on screen for a few hundred milliseconds.
 */

/** One hour of card, the same curve the real rows use. */
const ROW_HEIGHT = calculateBlockHeight(60);

/** The real list wrapper's classes. Keep in sync with `day-schedule/page.tsx`. */
const RAIL_CLASS =
  "relative flex flex-col space-y-1 pl-2 sm:pl-3 before:content-[''] before:absolute before:left-[35px] sm:before:left-[39px] before:top-4 before:bottom-4 before:w-[2px] before:bg-surface-container-low before:rounded-full";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function DayScheduleRailSkeleton() {
  return (
    <div className={RAIL_CLASS} aria-hidden="true">
      {HOURS.map((hour) => (
        <div
          key={hour}
          style={{ minHeight: ROW_HEIGHT }}
          className="relative flex items-center gap-3 p-3 rounded-2xl border border-l-4 border-outline/10 bg-surface-container-low/60 my-1"
        >
          <div className="flex flex-col items-center justify-center shrink-0 w-14 text-center">
            <span className="text-xs font-mono font-bold leading-tight text-on-surface-variant/40">
              {labelFromMinutes(hour * 60)}
            </span>
            <span className="text-[10px] font-mono leading-tight text-on-surface-variant/25">
              {labelFromMinutes(hour * 60 + 60)}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl shrink-0 bg-surface-container-highest/70" />
          <div className="flex-1 min-w-0 space-y-1.5 animate-pulse">
            <div className="h-3 w-2/3 rounded-full bg-surface-container-highest/80" />
            <div className="h-2.5 w-1/4 rounded-full bg-surface-container-highest/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The whole page's loading frame — the `Suspense` fallback, and therefore the
 * HTML Next prerenders for this route. It carries no date: the header prints
 * placeholder bars where the title and date land, at the same heights.
 */
export function DayScheduleSkeleton() {
  return (
    <div className="min-h-screen bg-background text-on-surface pb-16">
      {/* The skeleton is decorative; this is what a screen reader hears. */}
      <LoadingIndicator label="Loading schedule blocks" className="sr-only" />

      <header className="sticky top-0 z-40 bg-surface-container-lowest/97 px-4 py-2.5 border-b border-outline/10">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-container-low border border-outline/10 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="h-5 w-32 rounded bg-surface-container-highest/70" />
            <div className="h-3 w-20 rounded bg-surface-container-highest/50" />
          </div>
          <div className="w-2 shrink-0" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-3 space-y-4">
        <section className="p-3.5 rounded-2xl bg-surface-container-low border border-outline/10 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-28 rounded bg-surface-container-highest/70" />
            <div className="h-6 w-28 rounded-full bg-surface-container-highest/50" />
          </div>
          <div className="h-2.5 w-full rounded-full bg-surface-container-highest" />
          <div className="h-3 w-40 rounded bg-surface-container-highest/50" />
        </section>

        <DayScheduleRailSkeleton />
      </main>
    </div>
  );
}
