# ADR 0002 — Reward vault is the only route to the profile balance

> **Status:** Accepted
> **Date:** 2026-10-07
> **Feature:** M4 (perfect-day celebration and reward unification)
> **Supersedes:** nothing. **Refines:** ADR 0001 §4, §5 and §7
> **Schema:** additive — `rewardSettlements` table, Dexie `version(2)`

This document was required by `DEVELOPMENT_PLAN.md` §5.9 (schema work needs a written
ADR) and was written late. `db.ts` referenced it before it existed. That is recorded
here rather than quietly corrected, because the same class of defect — a document or
claim that names something which is not true — is what §4 of ADR 0001 was written about.

---

## 1. The problem

The app had two independent routes to the same XP.

1. **Immediate.** Completing a habit credited the profile directly: `addXp(15)`,
   `addDiamonds(1)`.
2. **Deferred.** The Temporary Wallet recomputed a pending total from the same
   `habitLogs` rows and offered to pay it on an explicit claim.

Both were derived from one completion, so **every habit paid twice** — once the moment
it was ticked and again when the wallet was claimed. Nothing reconciled the two.

Three further defects compounded it, all recorded in ADR 0001 §8:

| # | Defect | Cause |
|---|---|---|
| 7.1 | The record of what had been paid lived in `localStorage` | Browser storage is not a system of record. Clearing site data or switching device made the wallet offer to pay the same days again while the XP it had paid out remained. |
| 7.2 | The balance was written before the claim record | A crash between the two paid the day twice. |
| 7.4 / 7.5 | The streak advanced by `unclaimedDays.length` | Claiming a skipped week added 7 to the streak in one tap, and `Math.max(1, …)` advanced it even on an empty claim. |

---

## 2. Decision

**The Temporary Wallet is the only route by which a habit completion reaches the profile
balance.** Completing a habit no longer credits the profile at all.

**Settlement is automatic and happens at the day boundary.** The whole pending total
pays into the profile and the wallet empties. There is no claim button, because the
button existed only to trigger a settlement that now has a trigger of its own.

**Settlement is recorded in IndexedDB, not browser storage.** A new
`rewardSettlements` table is the record of what has been paid.

### Why these, specifically

- **One route, not two reconciled ones.** Reconciliation would have needed a way to
  decide which of two disagreeing numbers is right. Removing a route cannot disagree
  with itself.
- **Automatic, because the delay was the only thing making the old model defensible.**
  ADR 0001 §6.1 keeps the end-of-day delay so a day's logs freeze in value before they
  are paid. Automatic settlement at that same boundary satisfies §6.1 exactly; a manual
  claim only ever deferred it.
- **IndexedDB for the record, not for the balance.** ADR 0001 §4 already decided the
  claim record belongs beside the balance it protects. The primary key is
  `` `${userId}:${date}` `` — deterministic, so a repeat settlement fails the `add`
  outright instead of needing a read-then-write race to lose.

---

## 3. Consequences, stated plainly

- **Profile XP no longer moves at the moment of a tick.** It moves at the day
  boundary. The UI says *pending* for exactly this reason; claiming otherwise would
  overstate a balance the user cannot yet spend.
- **Settlement needs the app alive.** If the phone is closed across midnight, nothing
  settles at 00:00 — settlement runs the first time the app is open afterwards. This is
  inherent to a local-first app with no server and no background worker, and is the
  honest description of "pays at midnight".
- **A settled day is frozen.** Once a day is settled its reward is a fact. Un-ticking a
  habit afterwards does not claw XP back. This is deliberate: it is the same boundary
  ADR 0001 §9 records for retroactive schedule edits, and it only exists because habit
  edit-history does not.
- **Rate values remain undecided.** `XP_PER_COMPLETION`, `XP_PERFECT_DAY_BONUS` and the
  creation bonus are named constants per ADR 0001 §7 and are not yet a product decision.
  Changing one is a one-line edit with no behavioural drift.

---

## 4. What this fixes

| ADR 0001 §8 defect | Status |
|---|---|
| 7.1 — claim record in `localStorage` | **Fixed.** `rewardSettlements`, in IndexedDB beside the balance. |
| 7.2 — payout written before the record | **Fixed.** Both writes share one Dexie transaction; a crash rolls back both. |
| 7.4 — streak inflated by days claimed | **Fixed.** Replaced by an explicit consecutive-day rule. |
| 7.5 — streak advanced on an empty claim | **Fixed.** Same change; an empty settlement cannot advance anything. |
| 7.3 — no schedule check | Was already fixed in `67c8c5b`; still holds. |

The streak rule itself is a bounded approximation and is documented as such at
`advanceStreakForSettlement()`: it counts the longest unbroken run of settled days and
cannot know whether the first of them continued a streak already on the profile. It is
strictly better than summing skipped days and is the option ADR 0001 §5 explicitly
permits. Deciding the streak properly needs per-day streak state, which does not exist.

---

## 5. Explicitly not decided here

- **Schedule-block rewards stay immediate.** They derive from `scheduleBlocks`, not
  `habitLogs`, so they cannot collide with this decision. They are a separate pool.
- **`ECON-3` remains open.** The planner pays 10 XP per block, the day-schedule view 10,
  and the journey view 25 — so the same block pays differently depending on which screen
  it was ticked from. That is a reward-correctness bug, deliberately left unfixed: the
  honest fix reduces what journey users have already earned, which is a product decision
  rather than a refactor.
- **Habit creation reward stays immediate** (`XP_CREATION_XP`, `XP_CREATION_DIAMONDS`).
  Creating a habit completes nothing, so there is no calendar day for it to accrue
  against, and keeping it out of the ledger means a rollover can never pay it twice.