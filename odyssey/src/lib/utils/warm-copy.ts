/**
 * M13 -- warm microcopy.
 *
 * Two rules shaped every string in this file, and both exist because the
 * alternative is the specific failure this repo keeps auditing for: **a
 * confident line of copy that is not true.**
 *
 * 1. **Warmth never outruns the event.** Completing a habit that was *not*
 *    scheduled for today is a nice surprise, not a completed routine, and the
 *    toast says so. Reverting a completion is not an achievement and is not
 *    dressed up as one.
 * 2. **"Pending" survives.** The XP figures are still in flight until the day's
 *    rewards settle (`reward-rules.ts`). An earlier pass at warm copy turned
 *    those into "XP earned", which is a nicer sentence about money the user does
 *    not have yet. The word stays.
 *
 * ## On the empty states
 *
 * M13's brief also names empty states. They were audited and **left alone**:
 * the Habits keystone ("Your journey begins with one keystone habit"), the
 * Planner clean slate, the template library and the vault all already read like
 * a person wrote them. Rewriting copy that is already warm would be churn done
 * to look busy -- the same instinct that produces "generic" copy in the first
 * place. That audit is recorded on the M13 line as a finding, not a gap.
 */

export type CompletionKind = "perfect-day" | "scheduled" | "rest-day" | "reverted";

export interface CompletionCopyOptions {
  xpPerCompletion: number;
  perfectDayBonus: number;
}

function xp(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : "0";
}

/**
 * The toast shown when a completion is toggled.
 *
 * `reverted` carries no XP figures because undoing a completion awards nothing;
 * the old inline copy was "Habit reverted.", which was accurate but flat, and
 * it is kept accurate rather than made to sound like progress.
 */
export function getCompletionToast(
  kind: CompletionKind,
  { xpPerCompletion, perfectDayBonus }: CompletionCopyOptions
): string {
  switch (kind) {
    case "perfect-day":
      return `Perfect day — every scheduled habit done. +${xp(perfectDayBonus)} bonus pending, pays at midnight`;
    case "scheduled":
      return `That's one in the bank. +${xp(xpPerCompletion)} XP pending`;
    case "rest-day":
      // Names what actually happened. The old string, "Rest-day completion
      // registered!", read like a scheduled routine had been ticked off.
      return `Not scheduled today, done anyway. +${xp(xpPerCompletion)} XP pending`;
    case "reverted":
      return "Completion undone.";
  }
}

/**
 * The streak counter's label.
 *
 * **`compact`** is for the habit card rows and grid tiles, where a bare `3d`
 * sits beside the category and a Rest chip. **`long`** is for the profile sheet,
 * where there is room for a phrase.
 *
 * The zero case is the whole point. The habit cards used to render
 * `{h.currentStreak || 1}d`, which printed **1d** for a habit with no streak at
 * all -- a fabricated day, on the app's own habit card, next to a completion
 * count. `edit-habit-modal.tsx` and `wallpaper-preview.tsx` already read the
 * value honestly with `|| 0`, so the two idioms were live in one codebase and
 * the warm one was the liar. A real zero now says **"No streak yet"**, which is
 * both true and the more encouraging thing to read.
 */
export function getStreakLabel(days: number, variant: "compact" | "long" = "compact"): string {
  const safe = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  if (safe === 0) return "No streak yet";
  if (variant === "long") return `${safe}-day streak`;
  return `${safe}d`;
}

/**
 * Whether a streak label should be drawn in the flame colour. A zero streak is
 * not a failure state, so it stays in the ordinary muted colour rather than
 * being dressed in the achievement amber.
 */
export function isStreakActive(days: number): boolean {
  return Number.isFinite(days) && Math.floor(days) > 0;
}