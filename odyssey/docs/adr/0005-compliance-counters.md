# ADR 0005 — Days done: two cumulative counters replace the streak

> **Status:** Accepted
> **Date:** 2026-10-19
> **Feature:** `B25` (Phase 2)
> **Supersedes:** ADR 0001 §5 and §7.4/§7.5 **on the web**, and `BUG-15`'s web symptom.
> **Schema:** none. The counters are derived; no field, no Dexie version bump.
> **Scope:** web only. The native wallpaper payload is deliberately untouched.

---

## 1. The problem

The app measured consistency as a **consecutive-day streak**, and it did so with
arithmetic on a toggle. `BUG-15` recorded the two failures that follow from that
shape:

1. Un-completing an **old** day decremented the **current** streak, so unticking
   Monday after a Mon–Fri run changed a number that had nothing to do with Monday.
2. Completing a **past** day incremented the **current** streak, so back-filling
   history manufactured current momentum.

`BUG-5` was the same class in nine places: a zero was rendered as one. A streak is
also a *fragile* metric: a single missed day erases months, which is why the shop
had to sell a "freeze" to make the number survivable.

The owner asked for the opposite property: **count the days that were done, keep
them, and never take one away because of a later day.**

## 2. The decision

Two counters, both **derived from rows that already exist** and never
incremented. A derived count cannot drift; editing a past day lowers a total
instead of corrupting a running number.

### 2.1 Per habit — "days done"

A day counts for a habit only when **both** hold:

- the habit was **scheduled** for that day (`isHabitScheduledOnDate`), and
- the day is **genuinely complete** (`isHabitComplete`).

So a once-a-week habit ticked on all seven days earns **one**, and a counted
habit at 3 of 20 earns **none**. This is the same schedule-aware rule the reward
vault already uses (ADR 0001 §6.2), and the same completion predicate the rest of
the app uses (ADR 0003).

For a quit (`avoid`) habit, a **clean** day counts and a **slip** day does not.

### 2.2 App-wide — schedule compliance

A day counts only when the user **wrote all the hours and reviewed all of them**:

- at least **18 planned hours** (`FULL_DAY_HOURS`), and
- **every block reviewed** to `completed` or `missed`.

That is exactly `isCompletelyDone` in `day-status.ts`. A missed hour is a
reviewed hour; a pending hour is not.

### 2.3 What the numbers drive

- **Rank** is now earned in app-wide days done (`calculateRank(daysComplied)`).
- **Milestones** (3 / 7 / 14 / 30) are per-habit days done. Because the counter
  only rises when history says so, a milestone is **permanent once reached** —
  there is no "broken streak" to walk the user back below it.
- The **Streak Freeze Shield** is retired: the shop item, the shop's Protection
  filter, and the profile's freeze card are gone. A cumulative count does not
  need to be protected from a bad day.

### 2.4 The permanence guarantee — and its one exception

"Permanent once earned" holds for **days**: toggling does not move a current
number (that is the `BUG-15` fix), un-ticking a past day lowers only that day,
and a celebrated milestone is recorded per habit and never un-fires.

The exception is **habit configuration**. Both counters evaluate history against
the habit's settings *as they are now*, so editing a habit retroactively re-prices
its history:

- retarget a habit from 5 → 3 days/week, and past completions on the now-unscheduled
  days stop counting — the total falls though no day was touched;
- raise a counted habit's target from 10 → 20, and past days at 15 that used to
  count stop counting (and lowering a target makes past days count that had not yet).

This is accepted, not overlooked: deriving from current config is the reason the
counters cannot drift (§3.1), and the fix would be to snapshot each day's
schedule/target into the log row at write time — a schema change that prices in
its own ADR and is not wanted while config edits are rare. The one user-facing
bar that cannot drift this way is the app-wide 18-hour number, which is a
developer constant (`FULL_DAY_HOURS`), not per-user state.

## 3. Where the numbers live

Neither number is stored.

| Counter | Source | Computed in |
|---|---|---|
| Per habit | `habitLogs` (via the store's `historyLogs` / `historyValues`) | `habit-store.daysDoneByHabit`, rebuilt on every fetch and every log write |
| App-wide | `scheduleBlocks` | `user-store.daysComplied`, recomputed in `fetchUser` |

The pure logic is `src/lib/utils/compliance.ts`:

- `countScheduleCompliedDays(blocks)` — groups by `date`, then applies
  `isCompletelyDone` per day.
- `buildDaysDoneMap(habits, historyLogs, historyValues)` —
  `habitId -> days done`.

`user-store.fetchUser` reads the whole `scheduleBlocks` table. That is a deliberate
trade: it is once per screen mount, it is always correct, and a stored copy was
rejected because a stored copy can only go stale. The three web paths that can
change whether a day is complied — reviewing hours, saving an hour, deleting an
hour — call `fetchUser()` again, so the header and journey banner move on the same
tick.

### 3.1 Deviation from the approved brief

The brief proposed an additive `profiles.daysComplied` as a "self-healing cache".
It was **not added**. It would have needed a timestamp or a recompute hook at every
schedule write to avoid lying, and a field that can be stale is exactly the
`BUG-5`/`BUG-15` failure this change removes. The brief's own principle —
"recompute from history, no data rewrite" — is satisfied by deriving on read.

### 3.2 `day-status.ts` was correct in its docs and wrong in its code

The type union already said `fully_completed` meant "completely filled (>=18h)
**and** 100% reviewed", but the branch accepted `isFullyReviewed` alone. That let a
3-hour day reviewed end to end claim the brightest heatmap cell. It now requires
`isCompletelyDone`, which:

- makes the stats "Days Done" KPI and the heatmap agree, and
- downgrades a fully-reviewed day under 18h to `mostly_reviewed`.

That is a **visible** change: the brightest green now means a genuine full day.

## 4. What was deliberately left alone

- **Native / Kotlin.** `android-bridge/**`, the wallpaper studio preview, and the
  wallpaper generator still read `profiles.streak` and `habits.currentStreak`.
  The native label change is **pending**; the fields are still written so the
  phone does not go blank in the meantime.
- **Consequently `BUG-15` survives on the native side.** It is fixed on the web
  because no web surface reads the stored streak any more.
- **`WeeklyReport.streakAtWeekEnd`** is declared but never written (dead field).
  It is left in place and commented, not silently repurposed.
- **`economy.ts`'s streak-freeze branch** stays and stays tested. The shop no
  longer offers the item; removing the purchase rule is a separate deletion with
  its own test churn, and a backup containing a freeze count must still restore.

## 5. Rejected alternatives

- **Increment on toggle.** Reproduces `BUG-15`: a counter edited by the same
  event that toggles the log cannot know whether it is counting today or 2019.
- **Reuse `Habit.totalCompletions`.** It counts completions on unscheduled days
  too, so it is not "days done". It is still shown, honestly labelled
  "Completed".
- **Keep the streak and add a second number.** Two numbers that disagree about
  the same history is the `CONS-1` collision class. The owner chose one metric.
- **Persist the counters.** See §3.1.

## 6. Verification

- `src/lib/utils/compliance.test.ts` — 15 tests: the 18-hour bar, a pending hour,
  a missed hour as reviewed, date grouping, unscheduled days, counted targets,
  quit slips, and the derived "un-tick lowers the count" case.
- `day-status.test.ts` — pins the stricter `fully_completed`.
- `warm-copy.test.ts`, `achievements.test.ts` — label and milestone wording.
- Full suite green; `tsc --noEmit` and `next lint` clean.
- **Visual pass (2026-10-19, follow-up):** headless Chrome at 390px, light and
  dark, across `/planner`, `/stats`, `/journey`, `/habits`, `/shop` and a habit
  card created through the real form. Two findings came out of it, both fixed:
  the empty-state label surfaces render honestly ("No days done yet", the shop's
  Protection filter gone), but the per-habit chip drew its **flame icon even when
  the label rendered nothing at zero** — a bare icon over "Category • 🔥". The
  chip (and its separator, on the list card) now hides with the label; a quit
  habit keeps its distinct `0d clean` state in both themes. The heatmap's
  completed-cell colours were **not** verified visually — the seeded profile has
  no reviewed days to paint.
