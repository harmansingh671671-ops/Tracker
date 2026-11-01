# ADR 0007 — Challenge-linked habits (B7)

**Status:** accepted, 2026-11-01
**Feature:** `B7` in `main_plan.md`

## Context

B7 asks for challenges whose goal, duration and schedule changes are previewed
before any habit is added, with the user confirming first. The app already has
habit **packs** (curated groups of templates with a preview and an add-all), so
the only genuinely new state is: *which challenge created this habit, when it
started, and how long the user agreed to*.

That state has to answer one question — "Day 6 of 21" — and nothing else. It is
not a schedule, it does not run in the background, and it must not become a
second source of truth that can disagree with the habit list.

## Decision

Store the challenge on the habit rows it created, as three **optional** fields:

| field | meaning |
|---|---|
| `challengeId` | which challenge, e.g. `morning-21` |
| `challengeStartedAt` | local `YYYY-MM-DD` of day one |
| `challengeDurationDays` | the length the user confirmed |

No new table, no Dexie version bump, no migration.

## Why this and not a `challenges` table

- **No index is needed.** Nothing ever queries "all challenges"; progress is
  read from the habits already loaded on the habits screen.
- **No orphan state.** A separate table would have to be kept consistent with
  habit deletion: delete the habits, and a challenge row would survive claiming
  a commitment that no longer exists. On the habit row, the challenge disappears
  exactly when the habits do.
- **A Dexie version bump is a real cost** — every existing install runs an
  upgrade path. The repo has paid that cost once for a removed store (`S25`);
  paying it again for fields that need no index would be unjustified.

## Consequences

- Existing habits are unaffected: the fields are absent, and every reader treats
  absent as "not part of a challenge" (the same pattern as `type?: HabitType`
  in ADR 0003).
- Progress is **derived**, never stored: `getChallengeStatus()` counts days from
  `challengeStartedAt`. There is no timer, so nothing runs while the app is
  closed and no state can go stale.
- **Ending a challenge writes nothing.** The label drops off after
  `challengeDurationDays`; the habits stay as normal habits. Auto-archiving at
  the end was rejected: it removes rows the user may still want, which is the
  silent-data-alteration failure this repo has hit before.
- A challenge never duplicates or edits an existing habit — `planChallengeStart()`
  splits templates into "add" and "already have", and the preview reports the
  skipped ones. There is no overwrite path at all.
- Challenges deliberately reuse existing packs, so the habit catalogue has one
  source and the two cannot drift apart.

## Alternatives rejected

- **A `challenges` table** — orphan state, an extra migration, no query benefit.
- **Storing progress (`currentDay`)** — a number that can go stale or be wrong
  after a clock change; derived is always correct.
- **Auto-archiving habits when the challenge ends** — destructive and silent.
- **Challenges writing planner blocks** — out of scope for B7's approved
  version; the preview states "no schedule changes" so the promise stays true.
