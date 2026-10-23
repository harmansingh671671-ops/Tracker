# ADR 0006 — Keystone habit

> **Status:** Accepted
> **Date:** 2026-10-23
> **Feature:** `S19` (Phase 2)
> **Schema:** one optional, unindexed `Profile.keystoneHabitId`. No Dexie version bump.
> **Scope:** web only. The habits screen and the web wallpaper (preview + generated image); the native Kotlin payload is untouched.

---

## 1. The problem

The profile had **no link to any habit**. A habit was one row among many, ordered only by
when it was created, so the app could not say "this is the one that matters most" — and the
user could not either. Every habit was equally first.

The wallpaper made the gap visible. It rotates at most four habits by time of day, and it
does so **twice, independently**: the preview selects in `wallpaper-preview.tsx` and the
canvas generator selects in `wallpaper-generator.ts`. Both early-return their input unchanged
when there are four habits or fewer, so even a perfectly sorted list would not pin anything.
A habit the owner cares about could be absent from the wallpaper on one surface and present
on the other, in the same minute.

The streak vocabulary retired in ADR 0005 is **not** relevant to this feature. A keystone is
not a streak, is not fragile, and is not broken by a missed day; it is a designation.

## 2. The decision

### 2.1 One perimeter: a single optional reference

`Profile.keystoneHabitId?: string` — the user's one keystone habit, written through the
existing `updateUser` → `updateUserProfile` partial patch. It is **not** indexed and gets no
Dexie version bump: it is read only through the profile row the app already loads, never
queried.

Habits remain the source of truth for existence; the profile holds only the reference. One
habit per user is therefore a property of the field, not a convention.

### 2.2 The reference is a hint, never a promise

`resolveKeystoneHabit` (in `src/lib/utils/keystone.ts`) returns **null** for a missing id, an
id that no longer matches a habit, and a habit carrying `archivedAt`. That tolerance is the
same rule the app already applies to `readPrimaryGoal`: a vanished reference collapses to
nothing rather than being trusted or "repaired".

The consequence is deliberate: **archiving a keystone retires the pin without rewriting the
profile.** Nothing has to clean up after an archive, delete, or restore, and a stale id costs
nothing but is never rendered.

### 2.3 Two rules, both wrapped around the existing order

- **Habits list** — `orderHabitsForDisplay` puts the keystone first and leaves every other
  habit in its incoming order. No keystone means the order is untouched. It never mutates the
  array it is given and never duplicates the keystone. Both the list view and the heatmap view
  read this ordering.
- **Wallpaper row** — `withKeystoneOnWallpaper` wraps the existing selector rather than
  replacing it: resolve the keystone from the **whole** habit list, prepend it, drop it from
  the rest, and slice to `maxCount`. This is what defeats the selector's `<= maxCount`
  early-return; sorting alone cannot. `maxCount <= 0` returns nothing, so the row can never
  overflow its own budget by one.

Both surfaces (preview and generated canvas) call the same wrapper, so they cannot disagree.

### 2.4 Designation lives in the habit edit sheet, above the tabs

The row is "Keystone habit" with the secondary line "The one habit that holds the rest up".
It renders **above** the sheet's History / Edit Details switcher, so the default History tab
shows it without a second tap; no new state and no change to the default tab were needed.

The action is a `Make keystone` button; once set, it renders as a quiet `Keystone` chip.
There is **deliberately no "clear keystone" action**: choosing another habit moves the pin,
and archiving retires it. An empty state would add a second, invisible way to lose the
designation for no user benefit.

### 2.4.1 The first habit becomes the keystone

When the user has no keystone and creates a habit, that habit is pinned in the same flow. The
empty state already promises "Add your keystone habit", so the first habit becomes one rather
than leaving the promise unkept. Only the empty slot is filled: a later habit never steals the
pin from a habit that already holds it.

### 2.4.2 The marker

The marker is the word "Keystone", in one shared component (`KeystoneBadge`) used by both the
list card and the heatmap card — the two copies had already drifted in size. It is word-only:
the app has no keystone glyph, and inventing a dependency for one word is a poor trade.

On the list card it sits on the **second line**, the one that already carries "Last done…",
outside the name row. From there it cannot take width from the name, the status pills (`Rest
Day`, the time-period accent) or the completion ring at 360px — which is exactly what an
inline pill beside the name did: it left ≈25px of name at 360px and none at 320px.

### 2.5 No reward arithmetic

The keystone is **not** a scoring concept in this ADR. No XP, diamond, rank or progress
number reads `keystoneHabitId`.

## 3. What was deliberately left out

- **The 1.5× XP multiplier is deferred by owner decision (2026-10-23).** It was the other
  half of the original `S19` brief and is recorded here as the feature's **PARTIAL
  remainder** — not forgotten, not rejected. When it is built it belongs in the reward path
  (`economy.ts` / the log write), never in these display helpers.
- **Native / Kotlin.** The Android wallpaper re-selects habits on its own and drops habit
  `id` entirely (`HobbyItem` carries no id), so the phone **cannot** honour the pin without a
  Kotlin payload change. That cannot be built on this machine. The shipped surface for the
  pin is the web preview and the generated wallpaper image; the Kotlin side keeps its
  existing independent selection until it is migrated.
- **Backup import asymmetry.** Export spreads the whole profile, so `keystoneHabitId`
  travels; import restores blocks and habits only and ignores `json.user`. That asymmetry is
  **pre-existing** for every profile field and is not fixed here.
- **`getDisplayHobbies`** remains unused and lint-warned. It is dead code with its own
  removal, not part of this change.

## 4. Consequences

- The habits screen gains one leading row and one marker, both readable in light and dark.
  The marker lives on the card's second line, outside the name row, so it cannot take width
  from the name, the status pills or the completion ring at 360px.
- The first habit is pinned automatically; a user who never opens the edit sheet still has a
  keystone from the moment they have a habit.
- A habit can disappear from a list only by being deleted or archived; archiving also
  silently unpins it, which is the intended one-step retirement.
- Two wallpaper selectors are now one rule. A future third surface must call
  `withKeystoneOnWallpaper` rather than re-implement the pin.
- The profile carries a dangling id whenever the keystone is deleted. That is accepted by
  design (§2.2) and costs no cleanup path.
- The `1.5×` remainder is a reward-path change with its own verification, and this ADR does
  not authorise it.

## 5. Verification

- The 17 unit tests in `src/lib/utils/keystone.test.ts` cover the **three pure functions
  only**: resolution tolerance, list ordering, and the wallpaper wrap. They say nothing about
  the wiring.
- The wiring — ordering in both views, the marker on both card types, the sheet row above the
  tabs, both wallpaper wraps, and the first-habit pin — is verified by a **scripted browser
  probe**, not by unit tests. A green unit suite is not evidence that the screen shows the
  keystone first.
