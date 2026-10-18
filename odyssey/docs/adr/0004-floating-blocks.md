# ADR 0004 - Where a block waits when a drag pushes it off its hour

> **Status:** Accepted
> **Date:** 2026-10-18
> **Feature:** C2 (drag to reschedule, with floating displaced blocks)
> **Supersedes:** the "swap" introduced in `6f53dbd`. **Refines:** nothing.
> **Schema:** additive - a new store, `OdysseyFloatingBlocks/blocks: 'id, date'`. No field
> added, removed or retyped on `ScheduleBlock`, and no Dexie version bump on `OdysseyDB`.

Required by `AGENTS.md` non-negotiable 2: schema changes are additive by default and need an ADR.

---

## 1. The problem

Dropping a block onto an occupied hour has to move the occupant somewhere. The first
attempt (`6f53dbd`) **swapped**: the occupant was parked in the mover's vacated hour, hidden
from the rail while it floated.

Two things are wrong with that:

1. **The hour the user dragged from does not stay empty.** It looks empty only while the
   occupant is floating; the occupant's row is sitting in it, so on the next read from
   storage the hour has a block again. The user's report: *"the place from where I drag it
   stays as it is."*
2. **The occupant's own time is silently rewritten.** Parking a 3-hour mover's slot onto a
   1-hour occupant made the occupant 3 hours long. That is the `BUG-12`/`BUG-5` class of
   failure: a save path altering a field the user did not touch.

## 2. The decision

A displaced block is **taken off the timeline** and held in its own store until the user
drops it somewhere. It keeps its own row, unchanged, including its own start and end time.

```ts
// src/lib/utils/floating-blocks.ts
OdysseyFloatingBlocks.blocks : 'id, date'   // the full ScheduleBlock row
```

- **Displace:** `holdFloatingBlock(occupant)` **then** delete the row from `scheduleBlocks`.
  Holding first is the whole safety argument: if the write fails, the block stays on the
  timeline. A block held nowhere is a lost block.
- **Place:** put the row back into `scheduleBlocks` with its new hour, then release the held
  copy. The worst case is then a block that is on the day *and* still held, which the read
  path de-duplicates - never a block that exists nowhere.
- **Load:** held rows for the open date become draggable icons again, so leaving the app
  mid-drop and coming back shows the same state.

### Why its own store, not a flag on the block

A flag (`isFloating`) would need a field on `ScheduleBlock`, a migration-versions bump, and
then **every** reader of `scheduleBlocks` would have to learn to skip it: the rail, the
first-paint cache, the wallpaper/native sync, the stats rollups. Miss one and a held block
is counted as scheduled time.

With a separate store the guarantee is structural instead of remembered: *if it is not in
`scheduleBlocks`, it is not on the day.* Every existing reader keeps working with no change,
and the only code that knows about held blocks is the drag that creates them.

## 3. Consequences

- **Good:** the hour a block is dragged from stays empty, across a reload.
- **Good:** a displaced block is byte-for-byte what it was before it was displaced.
- **Good:** nothing is lost if the user leaves mid-drop.
- **Bad:** a held block is off the day until it is dropped, so it is not in the wallpaper
  sync, the allocation bar or the stats rollups. It is not hidden from the user - it is on
  screen as an icon - but a user who never drops it leaves it unscheduled.
- **Neutral:** held rows are scoped by date, so a held block reappears as an icon whenever
  its own day is open, not only the day it was displaced on.

## 4. Alternatives considered

| Option | Why not |
|---|---|
| Park the occupant in the mover's vacated hour (the swap) | The hour does not stay empty, and the occupant's length is rewritten |
| Leave the occupant where it is, hidden by an in-memory list | Two blocks share one hour in storage; a reload shows one and silently loses sight of the other |
| Add `isFloating` to `ScheduleBlock` | Every reader of the day must remember to filter it. See §2 |
| Derive the floating set by detecting two blocks on one hour | Which of the two floats is not recoverable from the data, so a reload could float the block the user just placed |
| Reuse `status: 'pivoted'` as the marker | `pivoted` already means something to the user. Reusing it is the silent-alteration failure, on the field that names it |

## 5. Rollback

Delete `src/lib/utils/floating-blocks.ts`, the two call sites in `handleMoveBlock` /
`handleDropFloating`, and restore the parked-slot write. Rows in `OdysseyFloatingBlocks` are
then unreachable - recover them by copying them back into `scheduleBlocks` before rollback
if any are held, then drop the store. Nothing in `OdysseyDB` is touched either way.
