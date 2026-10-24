/**
 * S22 — which unfinished habit deserves to be named first.
 *
 * The planner strip already says "Next: <habit>"; before this file it picked the
 * first scheduled habit that was not done, which means the answer was whatever
 * order IndexedDB returned. Priority is the only ordering signal the app has for
 * "matters more", so it decides.
 *
 * Pure on purpose: the caller owns the two things this must not re-derive —
 * whether the habit is scheduled today, and whether it is already done.
 */
export function habitPriorityRank(habit: { priority?: unknown }): number {
  switch (habit.priority) {
    case "critical":
      return 0;
    case "focus":
      return 1;
    case "optional":
      return 2;
    default:
      // Unknown stored values are treated as "no priority" rather than being
      // guessed at — the same honesty rule the badge renderer uses.
      return 3;
  }
}

/**
 * The unlogged habit with the highest priority; ties keep the incoming order.
 * Returns null when everything is done (or the list is empty).
 */
export function selectNextUnloggedHabit<T extends { priority?: unknown }>(
  habits: readonly T[],
  isUnlogged: (habit: T) => boolean
): T | null {
  let best: T | null = null;
  let bestRank = Infinity;

  for (const habit of habits) {
    if (!isUnlogged(habit)) continue;
    const rank = habitPriorityRank(habit);
    if (rank < bestRank) {
      best = habit;
      bestRank = rank;
    }
  }

  return best;
}
