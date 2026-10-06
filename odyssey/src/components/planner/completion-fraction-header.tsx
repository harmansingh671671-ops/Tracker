"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";

import {
  getDayHabitProgress,
  getHeaderSlotKeys,
  type DayHabitProgress,
} from "@/lib/utils/habit-progress";
import { type Habit, type HabitLog } from "@/lib/db";

interface CompletionFractionHeaderProps {
  selectedDate: string;
  todayStr: string;
  habits?: Habit[];
  todayLogs?: Record<string, HabitLog>;
  historyLogs?: Record<string, Record<string, boolean>>;
  /** Mirrors the date strip: render a placeholder rather than a false "0/0". */
  loading?: boolean;
}

/**
 * One independently animated readout in the header's top row.
 *
 * The header is assembled from an ARRAY of these rather than written as a
 * single hard-coded row, which is what makes it extensible: showing something
 * else later (a streak, a countdown, a second readout) is one more object
 * appended to that array. AnimatePresence cross-fades it in and out, and
 * `layout` slides the neighbouring readouts aside to make room - no other
 * part of this component has to change.
 *
 * Segments animate on opacity only, never on x/y. `layout` drives reflow
 * through transforms, so animating a transform here would fight it; the
 * motion comes from the slide plus the fade.
 */
interface HeaderSlot {
  /**
   * Stable identity for AnimatePresence, keyed on the VALUE being displayed.
   * That is what makes a segment cross-fade when its content changes (date
   * switched, a habit completed) instead of snapping to the new string.
   *
   * Must be namespaced by slot id - see getHeaderSlotKeys(). Every slot here
   * shares one AnimatePresence, so two slots showing the same value ("rest"
   * on an empty day) would otherwise collide and throw.
   */
  key: string;
  /** Layout classes for this segment. */
  className?: string;
  /** What the segment renders. */
  content: ReactNode;
}

/**
 * M9 - completion fraction header.
 *
 * Sits ABOVE the date strip, so the day's standing is the first thing read
 * before scanning the pills below it. The strip already prints "3/5" in each
 * pill, but that number is small and easy to miss; this states it in words
 * ("3/5 Habits Done - 60%") and reinforces it with a progress bar.
 *
 * Two rows on purpose: readouts on top, bar underneath. Keeping the bar out
 * of the readout row means a longer label ("10/12" vs "3/5") cannot resize or
 * shove the bar, and it means new readouts appended later never disturb it
 * either.
 *
 * It scrolls away with the rest of the page rather than pinning to the top -
 * see the contradictions log (C4) for why pinning was dropped.
 *
 * Renders the SELECTED day's numbers, matching the strip pill that is
 * highlighted - the header answers "how is the day I am looking at going",
 * not "how is today going", so browsing another date stays coherent.
 *
 * All arithmetic lives in getDayHabitProgress() so it stays unit-testable
 * (this repo runs vitest in node, with no jsdom - see vitest.config.ts).
 */
export function CompletionFractionHeader({
  selectedDate,
  todayStr,
  habits = [],
  todayLogs = {},
  historyLogs = {},
  loading = false,
}: CompletionFractionHeaderProps) {
  const progress: DayHabitProgress = getDayHabitProgress(
    habits,
    selectedDate,
    todayStr,
    todayLogs,
    historyLogs
  );

  // While the habit store is still fetching, an empty list would render a
  // confident "0/0 Habits Done" that snaps to the truth a moment later.
  // A same-height placeholder avoids both the lie and the layout jump.
  if (loading) {
    return (
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3">
          <div className="h-4 w-32 rounded-full bg-surface-container-highest animate-pulse" />
        </div>
        <div className="h-1.5 rounded-full bg-surface-container-highest animate-pulse" />
      </motion.div>
    );
  }

  const { fraction, percent, hasHabits, isAllCompleted } = progress;
  const isRestDay = !hasHabits;

  // A thin bar reinforces the fraction visually and fills as habits complete.
  // It is decorative only: the text above it already states the numbers, and
  // it is hidden from assistive tech to avoid announcing the value twice.
  const fillWidth = percent === null ? 0 : percent;

  // Namespaced by slot id. Both slots live in one AnimatePresence, and on a
  // rest day the icon and the label would otherwise both be "rest" - React
  // threw a duplicate-key error on every empty day. Still keyed on the
  // displayed value, so each readout cross-fades exactly when it changes.
  const { icon: iconKey, label: labelKey } = getHeaderSlotKeys(progress);

  const slots: HeaderSlot[] = [
    {
      key: iconKey,
      className: "shrink-0",
      content: isAllCompleted ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      ) : (
        <Sparkles
          className={`w-4 h-4 ${
            isRestDay ? "text-on-surface-variant/40" : "text-primary"
          }`}
        />
      ),
    },
    {
      key: labelKey,
      className: "min-w-0",
      content: isRestDay ? (
        <span className="text-xs font-semibold text-on-surface-variant/60 whitespace-nowrap">
          No habits scheduled
        </span>
      ) : (
        <span
          className={`text-xs font-semibold whitespace-nowrap ${
            isAllCompleted ? "text-emerald-400" : "text-on-surface"
          }`}
        >
          <span className="font-mono font-bold">{fraction}</span> Habits Done
          {percent !== null && (
            <span className="text-on-surface-variant font-mono">
              {" "}
              · {percent}%
            </span>
          )}
        </span>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-2"
    >
      {/* Row 1 - the readouts. Append another slot to show something more.

          popLayout rather than "wait": with more than one readout present,
          wait mode makes framer hold back the untouched siblings too, so the
          icon used to blink out of the row on every value change (and log a
          warning about it). popLayout lifts only the *exiting* readout out of
          flow, so the crossfade happens in place, the row never grows to
          contain two labels at once, and the icon stays put throughout. */}
      <div className="relative flex items-center gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {slots.map(({ key, className, content }) => (
            <motion.div
              key={key}
              layout="position"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={className}
            >
              {content}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Row 2 - the bar, deliberately independent of the row above. */}
      <div
        aria-hidden="true"
        className="h-1.5 rounded-full bg-surface-container-highest overflow-hidden"
      >
        <motion.div
          initial={false}
          animate={{ width: `${fillWidth}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full rounded-full ${
            isAllCompleted ? "bg-emerald-400" : "bg-primary"
          }`}
        />
      </div>
    </motion.div>
  );
}