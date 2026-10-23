"use client";

/**
 * S24 -- watches the store's per-habit days-done map and queues day milestones.
 *
 * ## Why the map, not a click handler
 *
 * A day can be completed from many surfaces: the list ring, the heatmap matrix,
 * the inline calendar, a swipe or hold gesture, the counted stepper, the edit
 * modal's heatmap. The old toast block fired from only one of them, so the
 * other paths crossed milestones silently. Every one of those surfaces writes
 * through the habit store, which rebuilds `daysDoneByHabit` on each write --
 * so comparing that map catches all of them without knowing which gesture ran.
 *
 * ## Why the first observation never fires
 *
 * The map is empty until the habits load, then fills with years of history. If a
 * fill counted as an increase, opening the app would replay every milestone the
 * user ever crossed. So each habit's *first* value is a baseline: recorded, never
 * celebrated. `consumeNewAchievements` is the second guard, for a value that
 * dips and climbs back to a rung already celebrated.
 *
 * ## One rung per change, not a queue of stale ones
 *
 * A single write can cross several rungs (`updateHabit` re-pricing 2 -> 9 crosses
 * 3 and 7). Only the highest is queued: "you also passed 3" a popup later is a
 * stale celebration of a real event the user has already moved past.
 *
 * ## No timers
 *
 * This is a pure comparison in an effect (repo rule 16). Achievements show one
 * at a time because they sit in a queue that only advances when the user
 * dismisses, not because something waits between them.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { type Habit } from "@/lib/db";
import { consumeNewAchievements, type Achievement } from "@/lib/utils/achievements";

/** One celebration: the rung, and the habit it belongs to (the popup must name it). */
export interface MilestoneEntry {
  achievement: Achievement;
  habitId: string;
  habitName: string;
}

/** Only when the habit vanished between the write and the popup. */
const UNKNOWN_HABIT = "This habit";

export function useDaysDoneMilestones(
  daysDoneByHabit: Record<string, number>,
  habits: Habit[]
): {
  celebration: MilestoneEntry | null;
  dismiss: () => void;
} {
  // Last value seen per habit. An absent key means "never observed", which is
  // what makes the first reading a baseline rather than a crossing.
  const observedRef = useRef<Record<string, number> | null>(null);
  const [queue, setQueue] = useState<MilestoneEntry[]>([]);
  // The queue push is deferred with `queueMicrotask`; that can outlive an
  // unmount if the user navigates in the same tick.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const previous = observedRef.current;
    const observed: Record<string, number> = {};
    const gained: MilestoneEntry[] = [];
    // Resolved at enqueue time, so a later rename cannot relabel a popup the
    // user was already shown.
    const names = new Map(habits.map((h) => [h.id, h.name]));

    for (const [habitId, value] of Object.entries(daysDoneByHabit)) {
      const next = Number.isFinite(value) ? value : 0;
      observed[habitId] = next;
      const prev = previous?.[habitId];
      if (prev === undefined) continue; // baseline -- never replay history
      if (next <= prev) continue; // downward or equal never celebrates
      const crossed = consumeNewAchievements(habitId, prev, next);
      // `consumeNewAchievements` returns ascending, so the last is the highest
      // rung this write crossed -- the only one worth a popup.
      const highest = crossed[crossed.length - 1];
      if (!highest) continue;
      gained.push({
        achievement: highest,
        habitId,
        habitName: names.get(habitId) ?? UNKNOWN_HABIT,
      });
    }

    observedRef.current = observed;
    if (gained.length === 0) return;

    // Deferred out of the effect body: a synchronous setState here cascades a
    // second render pass, which the react-hooks lint rule refuses (M14 pattern).
    queueMicrotask(() => {
      if (mountedRef.current) setQueue((current) => [...current, ...gained]);
    });
  }, [daysDoneByHabit, habits]);

  const dismiss = useCallback(() => {
    setQueue((current) => current.slice(1));
  }, []);

  return { celebration: queue[0] ?? null, dismiss };
}
