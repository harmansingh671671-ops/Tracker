import { type HabitCategory } from "@/lib/db";
import { getGoalTag, type GoalTagId } from "./goal-tags";
import { readString, writeString } from "./logger";

/**
 * `A3` -- let the goal chosen during onboarding change what the starter library
 * puts first.
 *
 * ## What this is NOT
 *
 * The researched `A3` (L203) is *"Optional interests/profession: use interest or
 * role to tailor examples, starter packs, or benefit ordering"* and ends with
 * *"Do not use profession to obscure or discriminate on price."* Its own
 * cross-reference `HD25` (L1048) asks for profession-driven **paywall copy and
 * discount codes**.
 *
 * **That half is dropped, not deferred.** `HD25` is exactly the
 * profession-based price discrimination the same sentence forbids, and this app
 * cannot build it anyway: it is local-first with no accounts and no payments, so
 * there is nothing to charge, and a paywall would be the first thing to break
 * that promise. The research behind the app records what the competitor this was
 * copied from actually did with it -- a reviewer found *no way to use the app
 * without paying*.
 *
 * What remains is the half that is honest and buildable: **reorder the library
 * by the goal the user already picked.**
 *
 * ## No second source of truth for "what is this habit about"
 *
 * `HABIT_TEMPLATES` carries BOTH a legacy `category` ("Health", "Productivity")
 * and a `domainLabel` ("Vitality & Fitness"). Only `domainLabel` is ever written
 * to `Habit.category`; `category` is dead metadata, already documented as such in
 * `habit-template-library.tsx`.
 *
 * **This module reads `domainLabel` and nothing else.** The obvious alternative
 * was to add a `goalIds: GoalTagId[]` to each of the 14 templates, which would
 * have been more *accurate* -- see the limitation below -- but it would make two
 * things able to disagree about the same habit, which is the exact class of bug
 * `CONS-1` and the P0-T3 normaliser collision were both about.
 *
 * ## Known limitation, recorded rather than hidden
 *
 * `getGoalTag("focus")` and `getGoalTag("mindfulness")` BOTH resolve to the
 * `Mindful Focus` domain, because four domains cannot cover five goals
 * distinctly -- a collision `goal-tags.ts` already documents. So:
 *
 *   - **Deep Focus and Mindfulness produce the SAME order.** Nothing here can
 *     tell them apart without a second field.
 *   - **Mindfulness surfaces the deep-work habits.** The genuinely
 *     mindfulness-flavoured templates (Zero Blue Light, Brain Dump, Nature Walk)
 *     carry `domainLabel: "Renewal & Health"`, which is `detox`'s domain.
 *
 * Fixing this properly is a product decision, not a code one: either a fifth
 * domain, or an explicit goal mapping that accepts the duplication above. Neither
 * is invented here.
 */

export const GOAL_STORAGE_KEY = "odyssey_primary_goal";

/** The domain a goal's suggestion lives in, or `null` for an unknown goal. */
export function goalDomainFor(goalId: string | null | undefined): HabitCategory | null {
  return getGoalTag(goalId)?.suggestion.category ?? null;
}

export interface OrderableTemplate {
  id: string;
  domainLabel: HabitCategory;
}

/**
 * Stable partition: templates matching the goal's domain first, everything else
 * after, **relative order preserved within each group**.
 *
 * Stable is the requirement, not a nicety. An unstable sort would reshuffle the
 * other 13 habits every time a goal is applied, so the library would look
 * different for reasons the user never chose. A partition cannot do that.
 *
 * An unknown or absent goal returns the list untouched -- choosing nothing must
 * leave the library exactly as it was.
 */
export function orderTemplatesForGoal<T extends OrderableTemplate>(
  templates: readonly T[],
  goalId: string | null | undefined
): T[] {
  const domain = goalDomainFor(goalId);
  if (!domain || templates.length === 0) return [...templates];

  const matched: T[] = [];
  const rest: T[] = [];
  for (const tpl of templates) {
    (tpl.domainLabel === domain ? matched : rest).push(tpl);
  }
  return [...matched, ...rest];
}

/**
 * The stored goal, or `null`.
 *
 * **Validated through `getGoalTag`, never trusted.** The key is writable by any
 * code in the app and by anything with devtools, so an unrecognised value would
 * otherwise silently reorder the library for a goal that does not exist.
 */
export function readPrimaryGoal(): GoalTagId | null {
  return getGoalTag(readString(GOAL_STORAGE_KEY, ""))?.id ?? null;
}

export function writePrimaryGoal(goalId: string): boolean {
  return writeString(GOAL_STORAGE_KEY, getGoalTag(goalId)?.id ?? "");
}