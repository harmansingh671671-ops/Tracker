# ADR 0007 — Daily energy log

> **Status:** Accepted
> **Date:** 2026-10-24
> **Feature:** `S25` (Phase 2), with `E6`
> **Schema:** one additive table, `energyLogs`. Dexie version 3.
> **Scope:** web only. No native payload, no notification, no scheduler.

---

## 1. The problem

The app has never asked how the user actually feels. Every screen measures output
(habits done, hours planned, days reviewed) but nothing records the state the day
started from, so no later feature can ask "do you do better on low-energy days?"
or "which weekday drains you?" — the questions `E5` exists for.

The research line is deliberately small: a five-second, optional, dismissible
1-to-5 energy prompt on first app open. That is a *log*, not a coaching feature.

## 2. The decision

### 2.1 A table, not browser storage

The answer is the user's own data and must survive clearing site data, a browser
switch, or an app reinstall. `localStorage` is a preference store in this app, not
a system of record (the same reasoning as ADR 0001 §4, which moved reward claims
out of it). So the level goes in IndexedDB next to habit logs.

The **skip** is different: "don't ask me again today" is a preference, not
history. It stays in `localStorage` under a per-day key, so a stale skip can never
be mistaken for a logged answer.

### 2.2 One perimeter: the primary key

`id` is `${userId}:${date}`. Like `RewardSettlement`, the key itself is the
uniqueness rule: one answer per user per local day. A double-tap or a retry
replaces the row instead of appending a second one, and no read-then-write race
is needed to keep that true.

`date` is the **local** calendar day (`localDateStr()`), never a UTC slice: the
prompt is shown and suppressed against local days, and a UTC key disagrees for
every timezone that is not UTC — the exact bug ADR-era fixes already hit twice.

### 2.3 When it asks

Once per local day, on the first open after the first paint, on any screen the
app shell wraps — except onboarding (`/`) and the day editor (`/day-schedule`),
where a modal would interrupt a flow rather than accompany one. It asks only when
a profile exists **and** at least one habit exists, so a brand-new user is never
asked before they have said hello.

No time window. The spec says "upon first app open", and gating on the morning
would mean a user who opens the app at 13:00 is never asked at all. The copy says
"today", not "this morning", so the app never claims a time it does not know.

### 2.4 What is deliberately not included

- **Editing today's answer.** One tap closes the day. A changed mind is a new
  day's answer; an edit affordance invites fiddling with a five-second log.
- **Reminders or notifications.** It appears when the app is opened. Nothing
  runs while the app is closed, so there is no wake-up, no default state, and
  nothing to turn off (the battery question in `AGENTS.md` rule 10).
- **Using the value to change the schedule.** That is a coaching feature with its
  own rules; S25 only records. `E5` reads the log later.
- **Native widget or Kotlin payload.** The native side builds its own state.
- **Backup export.** The JSON backup already exports only blocks, habits and the
  profile — habit logs are not in it either. Expanding backup is its own change,
  not a side effect of this one.

## 3. Consequences

- A new Dexie version (3) with one store. Additive: no existing row, field or
  index changes, so no upgrade function is needed.
- One small read on mount (`energyLogs.get` + a habit count) and one on
  `visibilitychange`. No timer, no polling.
- If the write fails, the sheet stays open with an inline error; the answer is
  never closed away silently.
- An older build opened after this one refuses the database (Dexie `VersionError`);
  that is inherent to any version bump. The reverse direction — this build opening an
  older database — upgrades in place.
- Future trend features can query `[userId+date]` ranges without a migration.
