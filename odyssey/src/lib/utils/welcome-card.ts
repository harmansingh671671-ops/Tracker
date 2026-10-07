/**
 * Whether the Habits screen should show the welcome card (M6).
 *
 * The same shape as `planner-empty-state.ts`, and for the same reason.
 *
 * The habit store starts with `loading: true` on purpose: before the first read
 * resolves there are no habits and no logs, so `habits` is `[]` for every user
 * including one with twenty habits. Testing `habits.length === 0` on its own
 * would therefore show the welcome card to a returning user on every visit,
 * flashing it and then yanking it away a moment later. That is a confident claim
 * made during the window where the truth is "we have not looked yet" -- the same
 * class of bug as the `0/0 (0%)` readout with no habits, `percent: null` in
 * `habit-progress.ts`, and the M3 clean-slate card.
 *
 * So loading is checked FIRST and short-circuits.
 *
 * Pure and separate from the component so the invariant is unit-testable: this
 * project runs vitest in a plain node environment with no jsdom
 * (`vitest.config.ts`), so a component cannot be mounted in a test at all.
 */
export interface WelcomeCardState {
  /** True while the habit list has not been read yet. */
  habitsLoading: boolean;
  /** How many habits the user has. */
  habitCount: number;
  /** True once the user has explicitly dismissed the card. */
  dismissed: boolean;
}

export function shouldShowWelcomeCard({
  habitsLoading,
  habitCount,
  dismissed,
}: WelcomeCardState): boolean {
  // Order is the behaviour. A populated store that is still loading must stay
  // hidden, not fall through to the habit-count check.
  if (habitsLoading) return false;
  if (dismissed) return false;
  // Once there is a habit the welcome has done its job. It must not come back on
  // a later visit, and it must not compete with the real list for the space.
  return (habitCount ?? 0) === 0;
}