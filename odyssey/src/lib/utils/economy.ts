import { type Profile } from "@/lib/db";

/**
 * The reward economy — ADR 0001 §7, extracted.
 *
 * **Why this is not in the store.** `buyItem` used to live inside
 * `useUserStore` and had **no tests at all**: the insufficient-funds branch,
 * the streak-freeze branch and the instant-XP branch were each a handful of
 * lines that nothing ever executed except a real purchase. A diamond balance
 * bug would have shipped silently.
 *
 * The rules are pure — they read a snapshot of the profile and return a
 * proposed patch — so they belong here where they can be tested directly.
 * The store keeps owning the single `profiles` row; see `main_plan.md` D2 for
 * why splitting that row across stores would be actively worse.
 *
 * **Every rate is a named constant**, per ADR 0001 §7. The level curve was
 * written out as `Math.floor(xp / 500) + 1` in five places and the `/ 500`
 * progress divisor in two more, so changing the curve meant finding them all
 * by hand.
 */

/** XP required per level. The researched `100 x L^1.5` curve is DEFERRED to
 *  v2.0 (ECON-2, contradiction C3) — this is the flat placeholder it replaced,
 *  and it is a placeholder on purpose, not an oversight. */
export const XP_PER_LEVEL = 500;

/** XP granted by an "instant mastery" style purchase. */
export const INSTANT_XP_PURCHASE = 100;

/** The level a given XP total sits at. Never below 1. */
export function levelFromXp(xp: number): number {
  const safe = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  return Math.floor(safe / XP_PER_LEVEL) + 1;
}

/**
 * Progress through the current level, 0-100.
 *
 * A level boundary reads **100**, not 0: at exactly one level's worth of XP
 * you have finished that level, and reporting 0 there would make a full bar
 * look empty.
 */
export function xpProgressPercent(xp: number): number {
  const safe = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  const into = safe % XP_PER_LEVEL;
  return into === 0 && safe > 0 ? 100 : Math.round((into / XP_PER_LEVEL) * 100);
}

/** What a purchase would do, computed without touching the database. */
export interface PurchaseQuote {
  ok: boolean;
  message: string;
  /** The patch to apply. Empty when `ok` is false. */
  updates: Partial<Profile>;
}

/** The slice of a profile a purchase actually reads. */
export interface PurchaseSnapshot {
  diamonds: number;
  xp: number;
  equippedItems: string[];
  streakFreezeCount: number;
}

export function snapshotOf(user: Profile): PurchaseSnapshot {
  return {
    diamonds: user.diamonds || 0,
    xp: user.xp || 0,
    equippedItems: user.equippedItems || [],
    streakFreezeCount: user.streakFreezeCount || 0,
  };
}

/**
 * Quotes a shop purchase.
 *
 * `itemIdOrName` is whatever the caller passes, and the shop passes the item
 * **`id`** (`"streak-freeze"`, `"xp-boost"`, `"instant-xp"`, `"titan-crest"`),
 * not the display name.
 *
 * Branch order matters and is the whole point of this function:
 *
 * - **freeze / shield** -> arms a streak freeze
 * - **instant** -> grants XP now
 * - **boost** -> equips a multiplier and grants nothing
 * - otherwise -> cosmetic; charges diamonds and equips only
 *
 * **The original checked `includes("xp")` before distinguishing a boost, so
 * buying the 2x XP Chrono Boost -- which "Doubles all XP earned for 24h" --
 * silently also handed out 100 instant XP.** Verified in-browser: 600 XP went
 * to 700 on a boost purchase. Matching on `instant` first fixes it, and the
 * boost branch is now explicit rather than falling through, so a future id
 * cannot quietly inherit the wrong behaviour. This is the fragility named
 * below, realised rather than hypothetical.
 *
 * Matching stays substring-based because the shop has no stable item ids to
 * match exactly on, and every id is a hand-written literal. It is stated here
 * rather than hidden, and the tests below pin each id to its own branch so a
 * rename fails loudly instead of silently re-granting something.
 */
export function quotePurchase(
  snapshot: PurchaseSnapshot,
  itemIdOrName: string,
  cost: number
): PurchaseQuote {
  const diamonds = Number.isFinite(snapshot.diamonds) ? snapshot.diamonds : 0;

  if (diamonds < cost) {
    return {
      ok: false,
      message: `Insufficient diamonds! Need ${cost}, have ${diamonds}`,
      updates: {},
    };
  }

  const lower = String(itemIdOrName ?? "").toLowerCase();
  const updates: Partial<Profile> = {
    diamonds: Math.max(0, diamonds - cost),
    // Set, not appended blindly: buying the same item twice must not
    // duplicate it in the equipped list.
    equippedItems: Array.from(new Set([...(snapshot.equippedItems || []), itemIdOrName])),
  };

  if (lower.includes("freeze") || lower.includes("shield")) {
    updates.streakFreezeActive = true;
    updates.streakFreezeCount = (snapshot.streakFreezeCount || 0) + 1;
  } else if (lower.includes("instant")) {
    // Must be tested BEFORE any bare "xp" test: the boost's id also contains
    // "xp", and a boost must not pay out.
    const newXp = (snapshot.xp || 0) + INSTANT_XP_PURCHASE;
    updates.xp = newXp;
    updates.level = levelFromXp(newXp);
  } else if (lower.includes("boost")) {
    // A 24h multiplier. Equipping it is the whole effect; granting XP here
    // would let a user buy the same XP twice over.
  }

  return {
    ok: true,
    message: `Acquired ${itemIdOrName}!`,
    updates,
  };
}