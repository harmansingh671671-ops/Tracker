import { isHabitScheduledOnDate } from "./habit-colors";

/**
 * Reward rates (M4, ADR 0001 section 7).
 *
 * Declared as named constants because the values are NOT a settled product
 * decision. They must live in one place and never be inlined at a call site, so
 * changing them later is a one-line edit with no behavioural drift.
 *
 * These moved here from `habit-store.ts` so that the pure reward arithmetic can
 * be unit-tested. Vitest runs in a plain node environment with no jsdom
 * (vitest.config.ts), and importing a Zustand store from a test would drag in
 * IndexedDB for no benefit -- these functions need nothing but their arguments.
 */
export const XP_PER_COMPLETION = 15;
export const DIAMONDS_PER_COMPLETION = 1;

/**
 * M4 -- the perfect-day bonus.
 *
 * Also an unapproved economy parameter: `MASTER_TODO_REVISED.md` L801 says
 * outright "This is an unapproved economy parameter; verify XP balance before
 * use." It is separated from the per-completion rate so the two can be tuned
 * independently, and so the perfect-day rule reads as one decision rather than
 * a magic number multiplied into a sum.
 *
 * Diamonds are deliberately NOT included. The feature spec for M4 awards XP
 * only; a different research document mentions diamonds as well, and that
 * contradiction is unresolved (see ADR 0002).
 */
export const XP_PERFECT_DAY_BONUS = 50;

/**
 * One-off rewards for creating a habit.
 *
 * Not routed through the vault. The vault settles *completions* against a
 * calendar day, and creating a habit completes nothing -- there is no day for
 * it to accrue against. Keeping it immediate also keeps it out of the settlement
 * ledger entirely, so it can never be paid twice by a rollover.
 */
export const XP_CREATION_XP = 30;
export const XP_CREATION_DIAMONDS = 5;

/**
 * Rewards for completing a schedule block.
 *
 * A separate pool from habit rewards. These settle immediately rather than
 * accruing to the vault, because the vault is derived from `habitLogs` and a
 * schedule block is not a habit completion. Crediting these from the wallet
 * would double-pay them.
 *
 * **Known inconsistency, deliberately not resolved here.** Three screens credit
 * a block completion at different rates -- the planner at 10, the day-schedule
 * at 10, and the journey view at 25. So the same block pays 10 or 25 depending
 * on which screen it was ticked from. That is a reward-correctness bug and it
 * is recorded in `main_plan.md` as ECON-3; unifying it is its own feature
 * because it changes what users have already earned.
 */
export const XP_PER_BLOCK_COMPLETED = 10;

/**
 * The same reward, at the rate the journey screen has always used.
 *
 * Kept as its own constant rather than corrected to match the planner, because
 * "fix" would silently reduce what journey users already earned. See ECON-3.
 */
export const XP_PER_BLOCK_COMPLETED_JOURNEY = 25;

/** The minimum shape needed to decide whether a habit was due on a date. */
export interface SchedulableHabit {
  id: string;
  targetDays?: number[];
  targetDaysPerWeek?: number;
}

/**
 * True when every habit due on `dateStr` was completed on that date.
 *
 * A day with nothing scheduled is NOT perfect. This is the load-bearing part of
 * the rule: without it, a rest day -- or any day before the user had created a
 * habit -- would satisfy "every habit due was completed" vacuously and pay a
 * 50 XP bonus for doing nothing.
 *
 * `completedIds` should contain only completions of habits that were actually
 * due that day (ADR 0001 section 6.2). Callers that pass a raw set of
 * completions will still get the right answer here, because membership is
 * checked per due habit, but they will miscount elsewhere.
 */
export function isPerfectDay(
  habits: SchedulableHabit[] | undefined | null,
  dateStr: string,
  completedIds: ReadonlySet<string>
): boolean {
  const list = habits || [];
  if (list.length === 0) return false;

  let due = 0;
  let done = 0;

  for (const habit of list) {
    if (!isHabitScheduledOnDate(habit, dateStr)) continue;
    due++;
    if (completedIds.has(habit.id)) done++;
  }

  // `due === 0` is the rest-day case, handled explicitly rather than by relying
  // on `done >= due`, which would be true (0 >= 0) and pay the bonus for free.
  return due > 0 && done >= due;
}

export interface DayReward {
  /** Total XP for the day: per-completion XP plus any perfect-day bonus. */
  xp: number;
  diamonds: number;
  /** The perfect-day component alone, so a UI can label it separately. */
  perfectBonusXp: number;
}

/** Whole days between two `YYYY-MM-DD` strings. `b` must not precede `a`. */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000
  );
}

/**
 * How far a streak should advance when a set of days settles.
 *
 * ADR 0001 section 5 requires the delta to be "0, or computed from an explicit
 * consecutive-day rule. Never `unclaimedDays.length`." The old claim did the
 * forbidden thing: claiming a skipped week added 7 in one tap, and
 * `Math.max(1, ...)` advanced the streak even on an empty claim (defects 7.4
 * and 7.5).
 *
 * The rule implemented here is the longest unbroken run of settled dates ending
 * at the most recent one. Three days skipped then one completed day advances the
 * streak by 1, not by 4.
 *
 * **Known limitation, deliberately not solved here.** This counts runs within
 * the settled set only. It cannot know whether a settled day continued a streak
 * that was already on the profile, so the first settled day after a long
 * absence advances the streak by its own run length rather than by 1. Deciding
 * the streak definition properly needs habit edit-history and per-day streak
 * state, which ADR 0001 section 9 lists as future work. The rule is bounded and
 * monotone, which is strictly better than summing skipped days, and it is the
 * option the ADR explicitly permits.
 */
export function advanceStreakForSettlement(
  settledDates: string[],
  currentStreak: number
): number {
  const dates = Array.from(new Set(settledDates)).sort();
  if (dates.length === 0) return Math.max(0, currentStreak);

  let run = 1;
  let best = 1;

  for (let i = 1; i < dates.length; i++) {
    // `=== 1` rather than `<= 1`: an out-of-order or duplicated date must break
    // the run rather than silently extend it.
    if (daysBetween(dates[i - 1], dates[i]) === 1) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }

  return Math.max(0, currentStreak) + best;
}

/**
 * The reward owed for one calendar day.
 *
 * Pure, and the single place the arithmetic lives -- the wallet, the settlement
 * and the celebration card all call this, so they cannot disagree about how much
 * a day is worth.
 */
export function computeDayReward(completedCount: number, perfect: boolean): DayReward {
  const safeCount = Math.max(0, Math.floor(completedCount) || 0);
  const perfectBonusXp = perfect ? XP_PERFECT_DAY_BONUS : 0;

  return {
    xp: safeCount * XP_PER_COMPLETION + perfectBonusXp,
    diamonds: safeCount * DIAMONDS_PER_COMPLETION,
    perfectBonusXp,
  };
}