import { describe, it, expect } from "vitest";
import { RANKS } from "./gamification";
import {
  RANK_LORE,
  getRankLore,
  rankAdvanced,
  getRankUpCelebration,
  hasLoreForEveryRank,
} from "./rank-lore";

const FIRST = RANKS[0].name; // Beginner
const LAST = RANKS[RANKS.length - 1].name; // Legend

describe("lore coverage", () => {
  it("has a unique line for all 9 ranks, Beginner through Legend", () => {
    expect(RANKS).toHaveLength(9);
    expect(hasLoreForEveryRank()).toBe(true);
    expect(Object.keys(RANK_LORE)).toHaveLength(9);
  });

  it("gives every rank different words", () => {
    const all = Object.values(RANK_LORE);
    expect(new Set(all).size).toBe(all.length);
  });

  it("does not simply repeat the rank's functional description", () => {
    // `RankInfo.description` already states the milestone. The lore is a second
    // line, so repeating the description verbatim would be duplicated copy.
    for (const rank of RANKS) {
      expect(RANK_LORE[rank.name]).not.toBe(rank.description);
      expect(RANK_LORE[rank.name]).not.toContain(rank.description);
    }
  });

  it("never promises perfection the app does not track", () => {
    // The app counts real adherence with missed days. A flawless claim would be
    // false for nearly every real user who reaches Legend.
    expect(RANK_LORE[LAST]).toMatch(/not one perfect year|missed days/i);
  });
});

describe("getRankLore", () => {
  it("returns the lore for every rank", () => {
    for (const rank of RANKS) {
      expect(getRankLore(rank.name)).toBe(RANK_LORE[rank.name]);
    }
  });

  it("is tolerant of case and surrounding space", () => {
    expect(getRankLore("  legend ")).toBe(RANK_LORE[LAST]);
    expect(getRankLore("BEGINNER")).toBe(RANK_LORE[FIRST]);
  });

  it("returns null rather than the Beginner's story for an unknown rank", () => {
    // getRankInfo falls back to Beginner for anything unrecognised. Handing out
    // the Beginner's lore here would quietly tell a user they had earned
    // nothing while showing them a confident dialog.
    expect(getRankLore("Warlord")).toBeNull();
    expect(getRankLore("")).toBeNull();
    expect(getRankLore(null)).toBeNull();
    expect(getRankLore(undefined)).toBeNull();
  });
});

describe("rankAdvanced", () => {
  it("is true for a move up the ladder", () => {
    expect(rankAdvanced(FIRST, RANKS[1].name)).toBe(true);
    expect(rankAdvanced(FIRST, LAST)).toBe(true);
  });

  it("is false for the same rank -- a refresh must not re-congratulate", () => {
    expect(rankAdvanced("Builder", "Builder")).toBe(false);
  });

  it("is false on first launch, where nothing was earned", () => {
    expect(rankAdvanced(null, "Builder")).toBe(false);
    expect(rankAdvanced(undefined, LAST)).toBe(false);
    expect(rankAdvanced("", "Expert")).toBe(false);
  });

  it("is false for a demotion -- losing days is not a level-up", () => {
    // The worst lie available: congratulating someone for falling to a rank
    // they had already left.
    expect(rankAdvanced(LAST, FIRST)).toBe(false);
    expect(rankAdvanced("Expert", "Novice")).toBe(false);
  });

  it("is false when either side is off the ladder", () => {
    expect(rankAdvanced("Warlord", "Expert")).toBe(false);
    expect(rankAdvanced("Expert", "Warlord")).toBe(false);
    expect(rankAdvanced(null, null)).toBe(false);
  });
});

describe("getRankUpCelebration", () => {
  it("returns the earned rank, its lore and the rank it came from", () => {
    const c = getRankUpCelebration(FIRST, "Consistent");
    expect(c).not.toBeNull();
    expect(c?.rank.name).toBe("Consistent");
    expect(c?.previousRank?.name).toBe(FIRST);
    expect(c?.lore).toBe(RANK_LORE.Consistent);
    expect(c?.stepsClimbed).toBe(3); // Beginner -> Consistent skips two rungs
  });

  it("returns null for anything that is not a promotion", () => {
    // The component has no "maybe" branch, so there is no way to render a
    // dialog congratulating someone for standing still.
    expect(getRankUpCelebration(FIRST, FIRST)).toBeNull();
    expect(getRankUpCelebration(null, LAST)).toBeNull();
    expect(getRankUpCelebration(LAST, FIRST)).toBeNull();
  });

  it("returns null rather than an empty body if lore is somehow missing", () => {
    const saved = RANK_LORE.Consistent;
    delete (RANK_LORE as Record<string, string>).Consistent;
    try {
      expect(getRankUpCelebration(FIRST, "Consistent")).toBeNull();
    } finally {
      (RANK_LORE as Record<string, string>).Consistent = saved;
    }
  });

  it("never climbs past the top of the ladder", () => {
    expect(getRankUpCelebration(RANKS[RANKS.length - 2].name, LAST)).not.toBeNull();
    expect(getRankUpCelebration(LAST, LAST)).toBeNull();
    expect(getRankUpCelebration(LAST, "Beyond Legend")).toBeNull();
  });
});