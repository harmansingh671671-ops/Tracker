import { describe, it, expect } from "vitest";
import { calculateRank, getRankInfo, getNextRank, RANKS } from "./gamification";

describe("calculateRank", () => {
  it("returns Beginner for a zero streak", () => {
    expect(calculateRank(0)).toBe("Beginner");
  });

  it("defaults to Beginner when called with no argument", () => {
    expect(calculateRank()).toBe("Beginner");
  });

  it("promotes exactly at each rank threshold", () => {
    // Boundaries are the interesting part: off-by-one here silently locks or
    // over-rewards a user, so each is pinned individually.
    expect(calculateRank(6)).toBe("Beginner");
    expect(calculateRank(7)).toBe("Novice");
    expect(calculateRank(13)).toBe("Novice");
    expect(calculateRank(14)).toBe("Builder");
    expect(calculateRank(30)).toBe("Consistent");
    expect(calculateRank(60)).toBe("Specialist");
    expect(calculateRank(90)).toBe("Expert");
    expect(calculateRank(180)).toBe("Pro");
    expect(calculateRank(270)).toBe("Master");
    expect(calculateRank(365)).toBe("Legend");
  });

  it("clamps to Legend beyond the final threshold", () => {
    expect(calculateRank(366)).toBe("Legend");
    expect(calculateRank(10_000)).toBe("Legend");
  });

  it("ignores the legacy efficiency argument", () => {
    // The parameter is retained for call-site compatibility but is deliberately
    // unused: rank is streak-only, per docs/adr/0001-reward-economy.md.
    expect(calculateRank(30, 0)).toBe(calculateRank(30, 99));
  });

  it("never ranks above the last entry in RANKS", () => {
    const top = RANKS[RANKS.length - 1].name;
    expect(calculateRank(Number.MAX_SAFE_INTEGER)).toBe(top);
  });
});

describe("getRankInfo", () => {
  it("falls back to the first rank for unknown or legacy names", () => {
    expect(getRankInfo().name).toBe("Beginner");
    expect(getRankInfo("Civilian").name).toBe("Beginner");
    expect(getRankInfo("Explorer").name).toBe("Beginner");
    expect(getRankInfo("Nonexistent").name).toBe("Beginner");
  });

  it("matches case-insensitively", () => {
    expect(getRankInfo("legend").name).toBe("Legend");
    expect(getRankInfo("LEGEND").name).toBe("Legend");
  });

  it("returns the full descriptor for a known rank", () => {
    const info = getRankInfo("Expert");
    expect(info.streak).toBe(90);
    expect(info.division).toBe("Gold");
  });
});

describe("getNextRank", () => {
  it("advances one step", () => {
    expect(getNextRank("Beginner")?.name).toBe("Novice");
    expect(getNextRank("Expert")?.name).toBe("Pro");
  });

  it("returns null at the final rank", () => {
    expect(getNextRank("Legend")).toBeNull();
  });

  it("returns null for an unknown rank rather than throwing", () => {
    expect(getNextRank("Civilian")).toBeNull();
  });
});
