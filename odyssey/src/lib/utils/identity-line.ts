import type { GoalTagId } from "./goal-tags";
import { readString, writeString } from "./logger";

/**
 * `A5` -- the identity line on the commitment step.
 *
 * The spec (`MASTER_TODO_REVISED.md` L207) asks for *"a motivational
 * line/identity"*. Owner decision 2026-10-17: **derive a line from the goal
 * already chosen, and let it be edited in one tap** — so the moment has
 * something to say by default without adding a question to a flow the owner has
 * twice asked to be cut down.
 *
 * ## Why these lines are first person
 *
 * An identity statement is not a description of the app, so none of them names a
 * feature, a streak or a reward. They are written as something the user would say
 * about themselves, which is the whole mechanism: a sentence you would not say is
 * not a commitment.
 *
 * ## Nothing here is a claim about the user
 *
 * These are **templates the user is offered**, not facts about them, which is why
 * they are editable and why the derived one is never persisted as though the user
 * had written it. `resolveIdentityLine` returns the stored line only when the user
 * actually typed one.
 */

export const IDENTITY_STORAGE_KEY = "odyssey_identity_line";

/** Shown when no goal was chosen. Generic on purpose — it asserts nothing. */
export const DEFAULT_IDENTITY_LINE =
  "I show up for the things I said I would.";

export const GOAL_IDENTITY_LINES: Record<GoalTagId, string> = {
  academic: "I turn up to learn, even on the days I would rather not.",
  health: "I take care of my body, unremarkably and often.",
  focus: "I protect one block of real, uninterrupted work.",
  mindfulness: "I notice the day I am actually having.",
  detox: "I choose the screen less often than it chooses me.",
};

/** The line for a goal, or the generic default when there is no goal. */
export function derivedIdentityLine(goalId: string | null | undefined): string {
  const key = String(goalId ?? "").trim().toLowerCase();
  return (GOAL_IDENTITY_LINES as Record<string, string>)[key] ?? DEFAULT_IDENTITY_LINE;
}

/**
 * The user's own line, or `null` if they never wrote one.
 *
 * An empty or whitespace-only stored value reads as `null`, so clearing the field
 * genuinely returns the step to the derived line rather than showing a blank
 * commitment.
 */
export function readIdentityLine(): string | null {
  const stored = readString(IDENTITY_STORAGE_KEY, "").trim();
  return stored.length > 0 ? stored : null;
}

export function writeIdentityLine(text: string): boolean {
  return writeString(IDENTITY_STORAGE_KEY, text.trim());
}

/**
 * What to actually display: the user's own words if they wrote any, otherwise the
 * line derived from the goal.
 */
export function resolveIdentityLine(goalId: string | null | undefined): string {
  return readIdentityLine() ?? derivedIdentityLine(goalId);
}

/**
 * Whether a line is long enough to break the layout.
 *
 * The field is a single-line `<input>` by design — see `identity-line.tsx` — so an
 * over-long line is **clipped, not wrapped**, and the user cannot see what they
 * wrote. The editor therefore reports this so the input can widen to a textarea,
 * which is the same lesson as the `day-schedule` task field, which was an `<input>`
 * with `truncate` and could not wrap.
 */
export const IDENTITY_LINE_SOFT_MAX = 72;