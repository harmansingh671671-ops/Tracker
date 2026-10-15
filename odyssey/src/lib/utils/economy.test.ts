import { describe, it, expect } from "vitest";
import {
  levelFromXp,
  xpProgressPercent,
  quotePurchase,
  snapshotOf,
  XP_PER_LEVEL,
  INSTANT_XP_PURCHASE,
  type PurchaseSnapshot,
} from "./economy";
import type { Profile } from "@/lib/db";

/**
 * These rules had **no tests** while they lived inside `useUserStore`. They ran
 * only when a real purchase happened, so an insufficient-funds or
 * streak-freeze bug would have shipped silently and been discovered by a user
 * with a diamond balance.
 */

const rich: PurchaseSnapshot = {
  diamonds: 100,
  xp: 0,
  equippedItems: [],
  streakFreezeCount: 0,
};

describe("levelFromXp", () => {
  it("starts at level 1 with no XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("advances exactly at each level boundary", () => {
    expect(levelFromXp(XP_PER_LEVEL - 1)).toBe(1);
    expect(levelFromXp(XP_PER_LEVEL)).toBe(2);
    expect(levelFromXp(XP_PER_LEVEL * 2)).toBe(3);
  });

  it("never returns below 1, whatever it is handed", () => {
    expect(levelFromXp(-500)).toBe(1);
    expect(levelFromXp(Number.NaN)).toBe(1);
  });

  it("ignores a fractional XP total rather than truncating mid-level", () => {
    expect(levelFromXp(1000.9)).toBe(3);
  });
});

describe("xpProgressPercent", () => {
  it("is 0 at the start of a level", () => {
    expect(xpProgressPercent(0)).toBe(0);
    expect(xpProgressPercent(100)).toBe(20);
  });

  it("reads 100 on a level boundary, not 0", () => {
    // At exactly one level's worth of XP the level is finished. Reporting 0
    // there would make a completed bar look empty.
    expect(xpProgressPercent(XP_PER_LEVEL)).toBe(100);
    expect(xpProgressPercent(XP_PER_LEVEL * 3)).toBe(100);
  });
});

describe("quotePurchase — funds", () => {
  it("refuses when the balance is short, and says by how much", () => {
    const q = quotePurchase({ ...rich, diamonds: 10 }, "Streak Freeze", 25);
    expect(q.ok).toBe(false);
    expect(q.message).toBe("Insufficient diamonds! Need 25, have 10");
  });

  it("proposes no changes at all when it refuses", () => {
    // An empty patch matters: a caller that applies updates without checking
    // ok must not silently spend nothing and report success.
    expect(quotePurchase({ ...rich, diamonds: 0 }, "Anything", 1).updates).toEqual({});
  });

  it("allows spending the entire balance exactly", () => {
    const q = quotePurchase({ ...rich, diamonds: 25 }, "Thing", 25);
    expect(q.ok).toBe(true);
    expect(q.updates.diamonds).toBe(0);
  });

  it("treats a free item as always affordable", () => {
    const q = quotePurchase({ ...rich, diamonds: 0 }, "Free Thing", 0);
    expect(q.ok).toBe(true);
  });
});

describe("quotePurchase — streak freeze", () => {
  it("activates the freeze and counts it", () => {
    const q = quotePurchase(rich, "Streak Freeze", 25);
    expect(q.updates.streakFreezeActive).toBe(true);
    expect(q.updates.streakFreezeCount).toBe(1);
    expect(q.updates.diamonds).toBe(75);
  });

  it("matches a shield by substring too", () => {
    const q = quotePurchase(rich, "Diamond Shield", 25);
    expect(q.updates.streakFreezeActive).toBe(true);
  });

  it("stacks the count rather than overwriting it", () => {
    const q = quotePurchase({ ...rich, streakFreezeCount: 2 }, "Streak Freeze", 25);
    expect(q.updates.streakFreezeCount).toBe(3);
  });
});

describe("quotePurchase — instant XP", () => {
  it("grants the instant XP and recomputes the level", () => {
    const q = quotePurchase(rich, "100 Instant Mastery XP", 20);
    expect(q.updates.xp).toBe(INSTANT_XP_PURCHASE);
    expect(q.updates.level).toBe(levelFromXp(INSTANT_XP_PURCHASE));
  });

  it("adds to existing XP rather than replacing it", () => {
    const q = quotePurchase({ ...rich, xp: 600 }, "Instant XP", 20);
    expect(q.updates.xp).toBe(600 + INSTANT_XP_PURCHASE);
    expect(q.updates.level).toBe(levelFromXp(600 + INSTANT_XP_PURCHASE));
  });

  it("does not also grant a streak freeze", () => {
    // Freeze is checked first, so an item naming both would be a freeze. This
    // pins that the branches are exclusive rather than accumulating.
    const q = quotePurchase(rich, "Instant XP", 20);
    expect(q.updates.streakFreezeActive).toBeUndefined();
  });

  it("grants nothing for a multiplier boost, whose id also contains 'xp'", () => {
    // THE BUG. `buyItem` is called with the item **id**, and the 2x XP
    // Chrono Boost's id is "xp-boost" -- so the original `includes("xp")` test
    // matched it and every boost purchase also paid out 100 instant XP.
    // Confirmed in-browser: a boost took 600 XP to 700.
    const q = quotePurchase({ ...rich, xp: 600 }, "xp-boost", 25);
    expect(q.updates.xp).toBeUndefined();
    expect(q.updates.level).toBeUndefined();
    expect(q.updates.diamonds).toBe(75);
    expect(q.updates.equippedItems).toEqual(["xp-boost"]);
  });
});

describe("quotePurchase — the real shop ids each land in their own branch", () => {
  // src/app/shop/page.tsx passes item.id. If an id is renamed, one of these
  // fails instead of the item quietly changing behaviour.
  it.each([
    ["streak-freeze", "freeze"],
    ["xp-boost", "boost"],
    ["instant-xp", "instant"],
    ["titan-crest", "cosmetic"],
  ])("%s is treated as %s", (id, kind) => {
    const q = quotePurchase({ ...rich, xp: 600, streakFreezeCount: 1 }, id, 10);
    expect(q.ok).toBe(true);

    const isFreeze = q.updates.streakFreezeActive === true;
    const isInstant = q.updates.xp !== undefined;
    const isBoost = !isFreeze && !isInstant;

    if (kind === "freeze") {
      expect(isFreeze).toBe(true);
      expect(q.updates.streakFreezeCount).toBe(2);
    } else if (kind === "instant") {
      expect(isInstant).toBe(true);
      expect(isFreeze).toBe(false);
    } else if (kind === "boost") {
      expect(isBoost).toBe(true);
      expect(q.updates.equippedItems).toEqual([id]);
    } else {
      expect(isBoost).toBe(true);
    }
  });
});

describe("quotePurchase — equipped list", () => {
  it("adds the item", () => {
    const q = quotePurchase(rich, "Golden Crest", 50);
    expect(q.updates.equippedItems).toEqual(["Golden Crest"]);
  });

  it("does not duplicate an item already owned", () => {
    const q = quotePurchase({ ...rich, equippedItems: ["Golden Crest"] }, "Golden Crest", 50);
    expect(q.updates.equippedItems).toEqual(["Golden Crest"]);
  });

  it("still charges for and equips an item matching neither branch", () => {
    // The cosmetic path, and the behaviour before extraction.
    const q = quotePurchase(rich, "Golden Crest", 50);
    expect(q.ok).toBe(true);
    expect(q.updates.diamonds).toBe(50);
    expect(q.updates.streakFreezeActive).toBeUndefined();
    expect(q.updates.xp).toBeUndefined();
  });
});

describe("snapshotOf", () => {
  it("defaults absent fields rather than producing NaN", () => {
    const s = snapshotOf({ id: "u", xp: 0 } as Profile);
    expect(s).toEqual({ diamonds: 0, xp: 0, equippedItems: [], streakFreezeCount: 0 });
  });

  it("keeps a real balance intact", () => {
    const s = snapshotOf({
      id: "u", diamonds: 42, xp: 900, equippedItems: ["A"], streakFreezeCount: 1,
    } as Profile);
    expect(s.diamonds).toBe(42);
    expect(s.xp).toBe(900);
  });
});