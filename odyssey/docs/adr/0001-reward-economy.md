# ADR 0001 — Reward economy

> **Status:** Accepted
> **Date:** 2026-10-03
> **Closes:** D9 (dual XP accounting), R2 (reward inflation / double-claim)
> **Feature:** P0-T4
> **Scope:** Describes existing behaviour and decides the open questions. **No code is
> changed by this document.** Implementation is a separate, later feature.

---

## 1. Why this document exists

The app has two XP balances and no written rule connecting them. The behaviour exists only as
code, split across `habit-store.ts` and `user-store.ts`. This document pins it down so that
Phase 3 reward work builds on a known foundation instead of guessing.

**Read this before changing any reward code.** Sections 2-6 are the rules. Section 8 lists what the
current code gets wrong.

---

## 2. The two balances

| Balance | Name | Where it lives | Mutable by |
|---|---|---|---|
| Pending | **Temporary Wallet** | Derived; recomputed from `habitLogs` | Nobody. Read-only, recomputed on every fetch. |
| Real | **Profile XP** | `user.xp` in IndexedDB | `user-store.addXp()`, called only by a claim |

The Temporary Wallet is **not stored**. It is recalculated from scratch by every
`fetchTemporaryWallet()` call, which scans completed `habitLogs`.

---

## 3. The reward lifecycle

```
habit completed on day D
        |
        +-- D is today -> shown as "accrued today" (todayAccruedXp). NOT claimable.
        |
        +-- D is in the past AND unclaimed AND the habit was due on D
                -> appears in unclaimedDays, xp = completions * XP_PER_COMPLETION
                -> sits in the Temporary Wallet indefinitely
                        |
                        +-- user taps Claim
                                -> XP and diamonds added to profile
                                -> streak updated
                                -> D marked claimed  (see section 4)
```

**Current rates** (see section 7 — value not settled):

```ts
XP_PER_COMPLETION = 15
DIAMONDS_PER_COMPLETION = 1
```

---

## 4. Decision 1 — The claim record belongs in the database

**Decided: yes.**

`claimedDates` currently lives in `localStorage` under `odyssey_claimed_habit_rewards_${userId}`,
while the profile balance lives in IndexedDB. Two databases, one of them user-clearable.

**The rule:** the record of what has been claimed is application state and must be stored in the
same database as the balance it protects. Browser storage is not a system of record.

**Why it matters:** clearing site data, switching browser, or switching device discards the claim
record while the XP it paid out remains in IndexedDB. The Temporary Wallet then offers to pay the
same days again.

**Implementation requirement (not yet done):** a claim must be idempotent — a unique key per
`(userId, date)` written **in the same operation** as the payout, so a reward can be granted at
most once even under retry.

---

## 5. Decision 2 — Streak must not jump on bulk claim

**Decided: no.**

`claimTemporaryWallet()` currently does:

```ts
const newStreak = (uStore.user.streak || 0) + Math.max(1, unclaimedDays.length);
```

Skipping a week and claiming it in one tap adds 7 to the streak. Since `calculateRank()` derives the
rank badge purely from streak, ranks inflate without any change in actual consistency.

**The rule:** streak measures consistency and must advance only under a defined day-by-day rule. A
bulk claim must not sum skipped days into the streak.

**Implementation requirement:** the streak delta on claim must be 0, or computed from an explicit
consecutive-day rule. Never `unclaimedDays.length`.

**Two sub-questions this document does not settle** — they belong to the streak feature:

- Does a *missed* day break the streak, or only freeze it?
- Does claiming late (day D claimed on day D+7) preserve a streak that would otherwise have broken?

---

## 6. Decision 3 — Reward on the day it was earned, and only if it was due

**Decided:** keep the end-of-day delay, **and** add a same-day requirement. Both parts bind.

### 6.1 The delay is kept

A day's rewards become claimable only after that day ends. `fetchTemporaryWallet()` filters
`d < today`.

**Why:** once claimable, a day's logs are frozen in value. Without the delay, a user could edit the
same day repeatedly and accumulate unbounded XP from one calendar day.

### 6.2 A reward is earned only if the habit was *due* that day

**A completed habit earns nothing on a day it was not scheduled.** Doing a Monday-only habit on a
Tuesday earns no XP, and cannot be claimed later against a different day.

**Why:** without this, off-schedule completions are free XP. The current code applies no such check
— `fetchTemporaryWallet()` counts every completed log regardless of whether the habit was due. A
user who marks a once-a-week habit done on all seven days collects seven days of rewards for one
day of work.

**The rule:**

> XP and diamonds are earned when a habit that was **scheduled for that date** is **completed on
> that same date**. Neither condition alone is sufficient.

**Existing support:** `isHabitScheduledOnDate(habit, dateStr)` in `src/lib/utils/habit-colors.ts`
already resolves this, via `getHabitScheduledDays()`. The Temporary Wallet does not use it today.

**Boundary — deliberately excluded:** whether a completion counts if the habit's schedule was
*edited retroactively* to include a past date. That needs habit edit-history, which does not exist.
Recorded in section 9.

---

## 7. Decision 4 — Reward rates are not settled

**Decided: defer.** `XP_PER_COMPLETION = 15` and `DIAMONDS_PER_COMPLETION = 1` are current values
with no recorded origin. They look like placeholders.

Until decided, the rates are **implementation detail, not spec**. Code must read them from named
constants — never inline the literals — so changing them later is a one-line edit with no
behavioural drift.

---

## 8. Known defects in the current implementation

**Not** fixed by this document. This is the implementation backlog for a follow-up feature.

| # | Defect | Rule violated |
|---|---|---|
| 7.1 | Claim record stored in `localStorage`, not the database | 4 |
| 7.2 | Payout written *before* the claim record (line 145 vs 166), so a crash between them pays out twice | 4 |
| 7.3 | No schedule check — unscheduled completions are paid | 6.2 |
| 7.4 | Streak inflated by the number of days claimed | 5 |
| 7.5 | `Math.max(1, unclaimedDays.length)` advances streak even on an empty claim | 5 |

---

## 9. Future work (explicitly not forgotten)

| Item | Needs |
|---|---|
| Retroactive schedule edits | Habit edit-history. Until then a user can widen `targetDays` to cover a past week and claim it. |
| Streak definition | Separate feature; section 5 does not decide it. |
| Reward rates | Product decision, deferred. |
| Rank thresholds | `calculateRank()` ignores its `efficiency` parameter — ranks are streak-only. |
| Server-side validation | Everything is local-first and client-verifiable. The trust model changes in P5. |

---

## 10. Summary

```
EARN      A habit scheduled for date D, completed on D.   (both required)
CLAIMABLE Only after D ends.
CLAIMED   Once per (user, date), recorded in the database.
STREAK    Never incremented by the number of days claimed.
RATES     Named constants, value not yet decided.
```
