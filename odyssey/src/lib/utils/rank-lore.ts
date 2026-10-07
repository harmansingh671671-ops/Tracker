/**
 * M14 -- unique rank level-up dialogs.
 *
 * `MASTER_TODO_REVISED.md` L986 asks for custom lore for each of the 9 ranks,
 * Beginner through Legend. The ranks, badges and divisions already exist in
 * `gamification.ts`; what was missing was a second, more human line of words
 * for each, and any way to show one at the moment a rank is actually earned.
 *
 * ## The one rule that matters here
 *
 * **A level-up dialog must never claim a level-up that did not happen.** Three
 * ways that happens in practice, all of which this module refuses:
 *
 * 1. **First launch.** A brand-new user opens the app holding the rank they
 *    were always going to have. Nothing was earned. `rankAdvanced` returns
 *    false for an unknown previous rank, so no dialog appears.
 * 2. **A broken streak.** Losing days moves a user *down* the ladder. That is a
 *    demotion, and dressing one up as "you reached Master!" would be the worst
 *    possible lie in the app. Only a move to a **higher** index counts.
 * 3. **The same rank twice.** A re-render, a refresh, a second device. Strict
 *    inequality, so the dialog cannot be shown twice for one promotion.
 *
 * ## Lore vs. description
 *
 * `RankInfo.description` already says what the rank *is* ("1 week completed").
 * The lore says what it *means*, so the dialog can show both without repeating
 * itself. The Legend entry deliberately honours the missed days rather than
 * claiming a flawless year, because the app counts real adherence and a
 * perfectionist claim there would be false for most real users.
 */
import { RANKS, type RankInfo } from "./gamification";

/**
 * One line of lore per rank, keyed by rank name. Keyed by name rather than
 * index so reordering `RANKS` cannot silently attach the wrong story to a rank.
 */
export const RANK_LORE: Record<string, string> = {
  Beginner:
    "Every legend was once the person who showed up on day one. Nothing is expected of you yet except that you came.",
  Novice:
    "You found the rhythm. Seven days running is no longer an accident — it is starting to hold its own shape.",
  Builder:
    "Two weeks of foundations. You are not chasing intensity any more; you are laying stone.",
  Consistent:
    "Thirty days. The hardest part of any discipline is the part nobody sees, and you have done it thirty times.",
  Specialist:
    "Two months of aim. You have stopped asking whether you can do this and started getting specific about how.",
  Expert:
    "A full quarter. What began as effort has become competence — and competence is far harder to lose than motivation.",
  Pro: "Half a year. Six months of showing up is no longer something you decide to do; it is something you are.",
  Master: "Nine months of self-command. The discipline now runs deeper than the days that test it.",
  Legend:
    "A full year. Not one perfect year — a real one, with the missed days included and the showing up anyway. That is the whole legend.",
};

/** The lore for a rank, or `null` for an unknown/absent rank. */
export function getRankLore(rankName: string | null | undefined): string | null {
  if (!rankName) return null;
  // Resolved here rather than via `getRankInfo`, which silently falls back to
  // Beginner for anything it does not recognise. Routing through that fallback
  // would answer "Warlord" and " legend " with the Beginner's story -- a
  // confident, wrong line of copy, which is the exact failure this file exists
  // to prevent.
  const match = RANKS.find(
    (r) => r.name.toLowerCase() === rankName.trim().toLowerCase()
  );
  if (!match) return null;
  return RANK_LORE[match.name] ?? null;
}

/** Position of a rank on the ladder, or -1 when it is not on the ladder. */
function rankIndex(rankName: string | null | undefined): number {
  if (!rankName) return -1;
  return RANKS.findIndex((r) => r.name.toLowerCase() === rankName.trim().toLowerCase());
}

/**
 * True only when `nextRank` is a genuine promotion over `previousRank`.
 *
 * `false` for a first run (no previous rank), the same rank, a demotion, and
 * either side being off the ladder.
 */
export function rankAdvanced(previousRank: string | null | undefined, nextRank: string | null | undefined): boolean {
  const from = rankIndex(previousRank);
  const to = rankIndex(nextRank);
  if (from < 0 || to < 0) return false;
  return to > from;
}

export interface RankUpCelebration {
  /** The rank just earned. */
  rank: RankInfo;
  /** The rank it came from, when one is known. */
  previousRank: RankInfo | null;
  /** The lore line. Never empty -- see `getRankLore`. */
  lore: string;
  /** How many ladder steps were climbed (always 1 in practice, 2 if data skipped). */
  stepsClimbed: number;
}

/**
 * Everything the dialog needs, or `null` when this is not a promotion.
 *
 * Returning `null` rather than a degraded object is deliberate: the component
 * has no "maybe" branch to get wrong, and there is no way to render a dialog
 * that congratulates someone for standing still.
 */
export function getRankUpCelebration(
  previousRank: string | null | undefined,
  nextRank: string | null | undefined
): RankUpCelebration | null {
  if (!rankAdvanced(previousRank, nextRank)) return null;
  const lore = getRankLore(nextRank);
  if (!lore) return null;
  const from = rankIndex(previousRank);
  const to = rankIndex(nextRank);
  return {
    rank: RANKS[to],
    previousRank: from >= 0 ? RANKS[from] : null,
    lore,
    stepsClimbed: to - from,
  };
}

/** Every rank has lore -- if this ever fails, a promotion would render empty. */
export function hasLoreForEveryRank(): boolean {
  return RANKS.every((r) => Boolean(RANK_LORE[r.name]));
}