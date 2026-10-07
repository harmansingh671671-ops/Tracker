/**
 * Whether the Planner should show its clean-slate state (M3).
 *
 * The planner reads `db` directly rather than through the schedule store
 * (debt D5), so `blocks` is `[]` on first paint for every day — including days
 * that have blocks. Testing `blocks.length === 0` on its own therefore asserts
 * "this day is blank" during the window where the truth is "we have not looked
 * yet", which is a confident false zero: the same class of bug as the habit
 * readout printing `0/0 (0%)` with no habits, and the reason `percent` is
 * `null` rather than `0` in `habit-progress.ts`.
 *
 * So loading is checked FIRST and short-circuits. An empty list is only called
 * a clean slate once the read has resolved, and a failed read resolves to
 * "not loading" — meaning a day we could not read shows its timeline rather
 * than a claim that nothing is on it.
 */
export function shouldShowPlannerEmptyState(
  blocksLoading: boolean,
  blocks: readonly unknown[] | null | undefined
): boolean {
  if (blocksLoading) return false;
  return (blocks?.length ?? 0) === 0;
}
