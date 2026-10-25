import { describe, expect, it } from "vitest";
import {
  FROG_XP_MULTIPLIER,
  KEYSTONE_XP_MULTIPLIER,
  XP_PER_COMPLETION,
  computeDayReward,
  frogBonusXp,
  keystoneBonusXp,
} from "./reward-rules";

/**
 * S19 (keystone) + S21 (frog) — the bonuses, pinned before they are wired in.
 *
 * The rules that matter for trust:
 *   - both are ADD-ONS to the base reward, never a multiplier applied to it;
 *   - the two bonuses ADD to each other, never multiply;
 *   - a day with no bonuses is worth exactly what it was worth before.
 */

describe("keystone bonus (S19)", () => {
  it("pays 1.5x the live base, rounded once, as an add-on", () => {
    expect(KEYSTONE_XP_MULTIPLIER).toBe(1.5);
    expect(XP_PER_COMPLETION).toBe(15);
    // 15 * 1.5 = 22.5 -> 23 total, so the add-on is 8.
    expect(keystoneBonusXp()).toBe(8);
  });

  it("follows a retuned base instead of freezing a number", () => {
    expect(keystoneBonusXp(10)).toBe(5);
    expect(keystoneBonusXp(20)).toBe(10);
  });

  it("never returns a negative add-on", () => {
    expect(keystoneBonusXp(0)).toBe(0);
  });
});

describe("frog bonus (S21)", () => {
  it("pays 2x the live base as an add-on", () => {
    expect(FROG_XP_MULTIPLIER).toBe(2);
    expect(frogBonusXp()).toBe(15);
    expect(frogBonusXp(10)).toBe(10);
  });
});

describe("computeDayReward with captured bonuses", () => {
  it("adds bonuses on top of the base and the perfect-day bonus", () => {
    const reward = computeDayReward(2, true, keystoneBonusXp() + frogBonusXp());
    expect(reward.xp).toBe(2 * XP_PER_COMPLETION + 50 + 8 + 15);
    expect(reward.bonusXp).toBe(23);
    expect(reward.perfectBonusXp).toBe(50);
  });

  it("keeps the old answer when there are no bonuses", () => {
    expect(computeDayReward(3, false).xp).toBe(45);
    expect(computeDayReward(3, false).bonusXp).toBe(0);
    expect(computeDayReward(0, true).xp).toBe(50);
  });

  it("adds the two bonuses rather than multiplying them", () => {
    const both = computeDayReward(1, false, keystoneBonusXp() + frogBonusXp());
    expect(both.xp).toBe(38);
    // The multiply bug would have paid 15 * 1.5 * 2 = 45.
    expect(both.xp).not.toBe(Math.round(XP_PER_COMPLETION * KEYSTONE_XP_MULTIPLIER * FROG_XP_MULTIPLIER));
  });

  it("ignores a negative or fractional bonus rather than paying it", () => {
    expect(computeDayReward(1, false, -10).xp).toBe(15);
    expect(computeDayReward(1, false, 7.9).xp).toBe(22);
  });
});
