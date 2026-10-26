# ADR 0006 — Habit lifecycle: pause as a dated window, let-go as a recoverable archive

Date: 2026-10-26 · Feature: B13 (main_plan.md) · Owner decisions: review card 1A,
archive-with-restore 2A, pause chips + custom 1–30 3C.

## Decision

Two additive, optional fields on `Habit` (db.ts):

- `pausedFrom?: string` / `pausedUntil?: string` — local `YYYY-MM-DD` strings.
- (existing) `archivedAt?: string` stays the "let go" marker; no new field.

**Pause is a DATED WINDOW, not a flag.** All pause math lives in one pure module,
`src/lib/utils/habit-lifecycle.ts` (presets 3/7/30 + custom clamped to 1–30,
`pauseUntil`, `isPauseActive`, `isPauseWindowOn`, `pauseDaysLeft`, staleness at
14 quiet days with any logged day counting as a touch).

### Root-cause exemption (rule 17)

`isHabitScheduledOnDate` (habit-colors.ts) — the ONE shared "is this habit
expected on this date" predicate — answers **false** for any date inside the
pause window. Every expectation sink therefore de-expects with no edits of its
own: the frog, the S22 "next up" hero, planner date-strip counts, weekly
reports (its due check runs through the same predicate), and the habits page's
done/total header. Nothing re-derives its own pause rule.

Keystone and wallpaper are the two surfaces that must additionally *drop* the
habit, not just un-expect it: `resolveKeystoneHabit` skips a pause-active-today
keystone (the pin returns on resume, no profile rewrite), and
`orderHabitsForDisplay` moves paused habits to the bottom of the list;
`wallpaper-habits` excludes the pause window (`dateStr` form) or paused-today
(legacy "now" form) from wallpaper picks.

### Lazy expiry — nothing runs while the app is closed

There is no timer, alarm, or notification. A pause "ends itself" by derivation:
when today passes `pausedUntil`, `isPauseActive`/`isPauseWindowOn` simply stop
firing, and the habit re-enters the normal list with all expectations intact.
The stored window is deliberately NOT cleared on expiry (no writes on read),
consistent with the app resetting when the profile is unreadable.

### Resume clamps the window; it does not erase it

`resumeHabit` sets `pausedUntil` to **yesterday** (keeping `pausedFrom`) so the
days the user deliberately paused keep being exempt in every historical report
— they read as rest, never as "missed" — and since every counter is derived
from `habitLogs` rows that never move (ADR 0005 / B25), no number has to repair
itself. A window that never covered yesterday is cleared outright.

### Let go = recoverable archive

`deleteHabit` remains a soft-archive (`archivedAt` stamped, history untouched).
The only destructive path is `destroyHabit` (deletes the habit row AND its
`habitLogs`), reachable only from inside the archive behind a two-click
confirm. `restoreHabit` clears `archivedAt` and the caller refetches with
force. **The archive UI lives on the PROFILE page** (`ArchivedHabitsCard`),
per owner instruction 2026-10-26 — nothing archive-related renders on the
habits screen — and both restore and destroy drop the localStorage mirror so
no stale cache can paint a restored or destroyed habit wrongly. Archive
emptiness says "Nothing archived yet" on the profile.

### The 14-day review is ask-first

The review card is shown when a habit has 14+ fully quiet days (last log day —
or, if never touched, its created day — that old). Any log row counts as touch,
including B16 emergency-minimum partial fills. It offers Pause / Let go / Keep
per habit and never pauses or archives by itself. Dismissing stores WHICH habit
ids were dismissed (`odyssey_b13_review` in localStorage, read only inside a
post-hydration effect), so the card re-opens only when a NEW habit crosses the
line — not repeatedly for the same quiet one.

## Consequences

- Additive schema; legacy rows (no pause fields) read exactly as before.
- No timers/battery cost (the review card is derived from the store on open).
- Paused habits stay VISIBLE at the bottom of the list with a
  "Paused · N days left" chip and Resume (owner rule) — handled in
  `orderHabitsForDisplay` + `PausedHabitRow`.
- Mirror-cache only seeds paint; the IndexedDB read is authoritative, the same
  as the existing `deleteHabit` (one-tick paint lag acceptable).
