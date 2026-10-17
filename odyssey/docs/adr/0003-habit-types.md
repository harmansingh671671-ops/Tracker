# ADR 0003 - Habit types, and what "done" means

> **Status:** Accepted
> **Date:** 2026-10-17
> **Feature:** B3 (habit types) + S13 (numeric stepper), **scoped to two of four types**
> **Supersedes:** nothing. **Refines:** nothing.
> **Schema:** additive - `Habit.type`, `Habit.unit`, `Habit.targetValue`, `HabitLog.value`. No Dexie version bump.

Required by `AGENTS.md` non-negotiable 2: schema changes are additive by default and need an ADR.

---

## 1. The problem

Every habit in the app is a boolean. `HabitLog.completed: boolean` is the entire record of
whether a habit happened, so "I read 20 pages" and "I read 3 pages" are indistinguishable —
both are simply `true` or `false`.

That is not a missing field. It is a missing *question*. The app cannot answer "how many of
the last fourteen days did I hit my target", because for most habits there is no target to
miss.

`main_plan.md` has asked for habit types since it was written (`B3`, `S13`, and `S9`/`C2`/
`B4` all blocked behind it). It is the root of that cluster.

## 2. Scope — two types, not four

The spec asks for four: binary, measurable, avoid, time-limit. **This ADR covers two.**

| Type | Status | Reason |
|---|---|---|
| `simple` | existing, unchanged | today's behaviour |
| `counted` | **new** | the one with the most value; what the reference screenshots showed |
| `avoid` | **deferred** | needs a `violation` state, which changes what a completed day *means* for streaks — and streak logic was just changed by `M15`/`S1` on `main` |
| `timelimit` | **deferred** | needs a running per-habit timer on a phone. `D2` records that **there is no focus timer at all**; this is that feature, not this one |

Shipping the two easy ones first is not a compromise on the hard ones. It is the only way to
find out whether the shape below is right before four UI variants depend on it.

## 3. The decision

```ts
type HabitType = 'simple' | 'counted';

interface Habit {
  // ... unchanged
  type?: HabitType;      // absent = 'simple'
  unit?: string;         // 'pages', 'cups', 'reps'. counted only
  targetValue?: number;  // counted only. The number that makes a day complete.
}

interface HabitLog {
  // ... unchanged
  value?: number;        // absent on a simple habit. What was actually logged.
}
```

### Why every new field is optional

`AGENTS.md` and `BUG-12` both learned the same lesson from the same direction: **an escape
hatch that accepts anything constrains nothing.** `Habit.category` was
`HabitCategory | (string & {})` and enforced no rule at all.

So the type is a **closed union**, and every field is optional with a documented meaning for
its absence — not `HabitType | (string & {})`. Absent `type` means `simple`. That is the
whole default.

**Additivity is a hard requirement, not a preference.** A user who has been using this app
has thousands of `HabitLog` rows with no `value` field. Those rows must keep reading
correctly without a migration, because IndexedDB is not type-checked and a migration that
rewrites history is how `BUG-5` turned a streak of 0 into 1 in nine places.

## 4. What "done" means

This is the part that actually matters, and it is where the risk is.

| Type | A day is complete when |
|---|---|
| `simple` | `log.completed === true` — **exactly as today** |
| `counted` | `(log.value ?? 0) >= habit.targetValue` |

`log.completed` is **not the authority for a counted habit.** It is a cached convenience for
UI. The authority is the value against the target.

**A counted habit that has a value below target is NOT complete**, and must not:

- increment `currentStreak`
- increment `totalCompletions`
- award XP
- fire the perfect-day calculation
- count toward a milestone (`M15`)

### Why this is the riskiest line in the feature

The repo has already shipped this exact bug once. `BUG-5` reported **a streak of 0 as 1 in
nine places** — a completion was recorded without a streak being deserved, and the error
propagated. A counted habit introduces a second way to be "logged but not complete", which
is precisely the shape that bug had.

**So the completion predicate is one pure function, tested, and every caller uses it.** Not
one caller deciding for itself. Nine call sites is how `BUG-5` happened; nine call sites is
how it happens again.

## 5. A defect found while writing this, and NOT fixed here

`habit-store.ts:540` computes the streak as arithmetic on a toggle:

```ts
const newStreak = isCompleted ? habit.currentStreak + 1 : Math.max(0, habit.currentStreak - 1);
```

This is wrong independently of habit types, in at least two ways:

1. **Un-completing an old day decrements the *current* streak.** Completing Mon–Fri and then
   unticking Monday does not break a streak that runs from Tuesday; it should break the one
   that runs to Monday. This decrements regardless.
2. **Completing a past day increments the *current* streak**, as though it were today.

Both predate this feature. **This ADR does not fix them**, because a streak rewrite is its own
change with its own migration questions, and bundling it would make a contained feature
unreviewable.

**What this ADR does do:** make the predicate correct at the point of truth, so that when
someone does rewrite the streak logic, there is one correct answer for "was this day
completed" to build on. Recorded in `main_plan.md` as `BUG-15`.

## 6. Consequences

- **Good:** `S13` and `B3` are unblocked. `C2` (overlap detection) and `B4` (gesture
  completion) now have a place to hang a per-type control.
- **Good:** additive, no migration, no version bump, no rewrite of anyone's history.
- **Bad:** two ways for a day to be "logged" — `completed: true` with `value: 0`. The
  predicate handles it, but **any future call site that reads `completed` directly will be
  wrong for counted habits.** This is a real trap and the reason §4 is a single function.
- **Neutral:** `avoid` and `timelimit` remain unbuilt, so the enum may grow later. Adding
  members to a union is additive; the shape does not need to change.

## 7. Alternatives considered

| Option | Why not |
|---|---|
| Reuse `completed` as a count (e.g. `2` = two) | `boolean` is the declared type; coercing it hides the data and breaks every reader that trusts the type |
| A separate `habitValues` table | One more table for one optional number. The log row is already the record of what happened on a date |
| Add a free-text `notes` field and parse it | No. That is the `(string & {})` escape hatch with worse ergonomics |
| All four types now | Two of them need a violation state and a running timer. Neither is cheap, and both would be built on a shape not yet proven |

## 8. Rollback

Delete the four fields from the interfaces and the predicate. Rows written under this ADR
keep their extra properties in IndexedDB and are ignored by the old code, because nothing
older reads `value`. **No data loss on rollback** — the worst case is that a counted habit
reads as a simple one the user ticked.