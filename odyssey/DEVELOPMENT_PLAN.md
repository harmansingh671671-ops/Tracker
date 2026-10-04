# ODYSSEY - DEVELOPMENT PLAN (CANONICAL)

> **Status:** Active - single source of truth for *what gets built* and *how*.
> **Owner:** Every developer, AI agent, and contributor must follow this document.
> **Last reconciled against code:** 2026-10-03 @ commit `6b42b74`

---

## 0. WHY THIS DOCUMENT EXISTS

The `Market Research/` folder contains ~300 KB of overlapping planning documents written
across four months in multiple passes. They contradict each other on feature numbering,
schema shape, phase ordering, and framework version. A developer following those files
directly will build the wrong thing.

This document **supersedes them for implementation purposes**. It does not delete them -
they remain the *evidence base* (competitor analysis, habit science, UX rationale). This
plan is the *decision layer*.

**Rule of precedence:**

```
1. main_plan.md           (order, priority, STATUS - single source)
2. THIS DOCUMENT          (engineering conventions, workflow, conflicts)
3. ACTUAL CODE            (reality - code always beats docs)
4. MASTER_TODO_REVISED.md (feature catalogue + rationale)
5. All other Market Research files (evidence only, non-binding)
```

If this document and a Market Research file disagree, **this document wins** on
engineering and workflow. On **order and status**, `main_plan.md` wins. If
anything disagrees with the **code**, **stop and reconcile** - one is wrong; fix
it before work continues.

---

## 1. DOCUMENT AUTHORITY MAP

| File | Role | Authority |
|---|---|---|
| `DEVELOPMENT_PLAN.md` (this) | Order, gates, conventions | **CANONICAL** |
| `Market Research/MASTER_TODO_REVISED.md` | Full 140-item feature catalogue + rationale | Reference -- use for *what* and *why* |
| `Market Research/PRODUCTION_PLAN.md` | Phase 0-7 framing, exit gates | Reference -- superseded where conflicting |
| `Market Research/PHASE_0_AUDIT_REPORT.md` | Verified-vs-assumed audit | Reference -- **has one factual error, see 2.6** |
| `Market Research/UI_UX_review.md` | Competitor UI teardown, anti-patterns | Reference -- good anti-pattern source |
| `Market Research/App_Reviews.md`, `Review_Analysis.md` | Raw competitor reviews | Evidence only |
| `Market Research/Habit Research/`, `Schedule Research/` | Habit science, competitor tables | Evidence only |
| `Market Research/TODO.md` | Older non-AI list | **SUPERSEDED** by MASTER_TODO_REVISED |
| `Market Research/AI_TODO.md` | Older AI list | **SUPERSEDED** by MASTER_TODO_REVISED |
| `Market Research/Apps Videos/` | 15 competitor screen recordings | Evidence only |

### 1.1 Market Research is tracked

The planning docs under `Market Research/` **are** committed (they are the evidence
base that `main_plan.md` cites by file and line number). Only
`Market Research/Apps Videos/` is git-ignored -- 265 MB of competitor `.mp4`
recordings that would bloat every clone and exceed GitHub's 100 MB per-file limit.

Consequences:

- Acceptance criteria, status and decisions **must** live in `main_plan.md` at the
  repo root, not only in `Market Research/`.
- All tracked status lives in `main_plan.md` plus git history.
- If the recordings must be shared across machines, that needs a deliberate
  separate sync. Treat each checkout's copy as local.

---

## 2. CONFLICT RESOLUTIONS -- THE ANSWER KEY

Contradictions found during analysis. **These are now resolved. Do not re-litigate.**

### 2.1 Feature-ID collision -- CRITICAL

`AI_TODO.md` and `MASTER_TODO_REVISED.md` **both use the `AI-n` namespace with different meanings.**
Verified collision:

| ID | `AI_TODO.md` says | `MASTER_TODO_REVISED.md` says |
|---|---|---|
| `AI-1` | Scheduling insight at habit creation | Period Completion Probability at Creation |
| `AI-13` | Habit **correlation** detector | **Energy-Performance** correlation |

> **RESOLUTION:** `MASTER_TODO_REVISED.md` `AI-n` IDs are canonical. `AI_TODO.md` and `TODO.md` are
> frozen archives. Never reference an `AI-n` ID without the MASTER_TODO_REVISED definition attached.
> `PRODUCTION_PLAN.md` already flags that AI_TODO's summary says 22 while its list runs to AI-23 --
> treat every AI_TODO count as unreliable.

### 2.2 Phase-numbering collision

Three different phase schemes exist:

- `PRODUCTION_PLAN.md`: Phase 0-7 (8 phases; **social before AI**)
- `MASTER_TODO_REVISED.md` section 8: Phase 0-5
- `MASTER_TODO_REVISED.md` section 19: Phase 1-5 (**AI before social**)

> **RESOLUTION:** Adopt the `PRODUCTION_PLAN.md` Phase 0-7 skeleton, but reorder social and AI (see
> 2.3). Canonical phase names are defined in section 4. Any other document's phase numbers are
> non-binding.

### 2.3 Social vs AI ordering -- deliberate deviation

`PRODUCTION_PLAN.md` places Social (P4) before AI (P5).

> **RESOLUTION -- AI ships before Social.**
>
> Reason: Tier A/B "AI" is **deterministic local math over Dexie** -- no backend, no accounts, no
> network, no moderation, no legal surface. Social requires accounts, a backend, moderation tooling,
> reporting/blocking, and Google Play UGC + Families policy compliance. Shipping the cheap, local,
> high-value work first de-risks the schedule.
>
> This is an **intentional deviation from `PRODUCTION_PLAN.md`**, recorded here so nobody "fixes" it.
### 2.4 Schema conflict -- CRITICAL, decision required before P2

`MASTER_TODO_REVISED.md` section 20.1 proposes a **brand-new `Habit` schema that does not match the
live one.**

| Field | Live `src/lib/db.ts` | Proposed section 20.1 |
|---|---|---|
| name | `name` | `title` |
| streak | `currentStreak` / `longestStreak` | `streakCurrent` / `streakBest` |
| state | `archivedAt?` | `isArchived`, `isPaused`, `pauseUntil?` |
| category | `Health` / `Mindfulness` / ... (mixed case) | `health` / `learning` / `deep_work` / ... (lowercase enum) |
| -- (absent) | | `type: 'binary' | 'measurable' | 'avoid' | 'time_limit'` |
| -- (absent) | | `targetValue`, `unit`, `durationMinutes` |
| -- (absent) | | `priority`, `energyLevel`, `isKeystone`, `isFrog` |
| -- (absent) | | `cueText`, `whyText`, `identityStatement`, `twoMinuteVersion` |

Same divergence exists for `ScheduleBlock` (`isCompleted` vs `status: pending|completed|missed|pivoted`)
and `Profile` (`rankTitle`/`currentXP`/`avatarRoom` vs `militaryRank`/`xp`/`equippedMascot`).

> **RESOLUTION:** The live `src/lib/db.ts` is the schema. Section 20.1 is an **unapproved proposal.**
> New P2 fields are added by **additive migration on the existing shapes**, never by adopting 20.1.
> Rationale: the live schema is already shipped, already synced to Android, and already has the
> 18-hour fully-filled-day rule encoded in `day-status.ts` built on the current `status` field.
>
> Any deviation requires a written ADR in `docs/adr/` (see 5.9).
>
> **NOTE:** `ScheduleBlock.status` (4-state, incl. `pivoted`) is **richer** than the proposal's
> `isCompleted` boolean. Keep it. Do not simplify.

### 2.5 Existing category-union drift -- real bug

```ts
// src/lib/db.ts -- BOTH cases are live in the type:
category: 'sleep'|'work'|'habits'|'buffer'|'Work'|'Study'|'Health'|'Sleep'|'Leisure'|'Admin'
```

`journey-day-schedule.tsx` needs a `normalizeCategory()` to survive this. `habit-colors.ts` carries
**~50 hand-maintained alias strings** mapping to 4 colours.

> **RESOLUTION:** Lowercase snake_case enum is the target
> (`'health'|'learning'|'deep_work'|'mindfulness'|'detox'|'custom'`), consistent with section 20.1.
> **No big-bang rename in feature work.** Per-feature rule: when you touch a category value, normalise
> it at the boundary and migrate that value only. Retire aliases once unused. Tracked as **P0-T3**.

### 2.6 Framework version -- factual error in PHASE_0_AUDIT_REPORT.md

`PHASE_0_AUDIT_REPORT.md` section 2 states **"Next.js 14 Web Layer"**. The app is on **Next.js 16.3.5**.

> **RESOLUTION:** **Next.js 16.3.5.** The audit report's diagram label is stale and wrong. `AGENTS.md`
> is explicit: *"This is NOT the Next.js you know."* Before writing any Next.js-specific code, read
> `node_modules/next/dist/docs/`. Mandatory. Do not trust training-data Next.js 14/15 knowledge.

### 2.7 XP curve conflict

Live code: `level = floor(xp / 500) + 1` (flat 500 XP/level).
Decision matrix section 21: `XP_Required = 100 * (Level ^ 1.5)` (L5 = 1118, L10 = 3162).

> **RESOLUTION:** **Ship the flat curve for v1.4.** It is live, players have progress against it, and
> changing it retroactively invalidates existing users' levels. The curve change is a **v2.0
> migration** with an XP-recalculation utility. Tracked as **P3-BACKLOG-1**. Documented, not forgotten.

### 2.8 Plan vs reality -- "checked" does not mean done

Every feature checkbox in `Market Research/` is `- [ ]`. **But Phase 1 shipped via git (`c862657`,
`6b42b74`) without updating any checkbox.** Checkboxes are unreliable as status.

> **RESOLUTION (superseded 2026-10-05):** the status record has moved to
> **`main_plan.md`**, which is now the single source of truth. When you finish a
> feature, update its line in `main_plan.md`. The research checkboxes stay unticked
> by design -- they are a frozen backlog, not a progress tracker.

---

## 3. VERIFIED BASELINE — STATUS NOW LIVES IN `main_plan.md`

> **STATUS MIGRATED (2026-10-05).** The built / not-built / technical-debt tables
> that lived here are now maintained in **`main_plan.md` §2**, which is the single
> status record for the project. That copy was reconciled against source at
> `6b42b74` and has since been updated (v1.3.6 shipped, 8 test suites, D4/D7 fixed).
>
> **Do not re-add status tables here.** If you need to know what is built, open
> `main_plan.md` first. This section is retained only as a pointer.

### 3.1–3.3 → see `main_plan.md`

The previous contents of this section (shipped features, not-built features, and
the technical debt register D1–D9) are preserved verbatim in git history at commit
`6b42b74` and in `main_plan.md` §2.1 (shipped) and §2.2 (debt register).

---

### 3.1 Working, shipped, verified → moved

See `main_plan.md` §2.1.

### 3.2 Not built → moved

See `main_plan.md` §3–§9, where every feature carries its own status.

### 3.3 Technical debt register → moved

See `main_plan.md` §2.2. Items D4 and D7 are now closed; the rest are tracked
there and in Phase 1 (`P0-T3`, `P0-T6`, `P0-T7`, `DEBT`).

---

## 4. PHASE PLAN

Nine phases. **Each has an exit gate that must be objectively verifiable.** Do not start a phase
until the previous gate is met and recorded in git.

```
P0 Stabilise -> P1 Daily Clarity -> P2 Routines -> P3 Progression & Ambient
                                                          |
      P7 Expansion <- P6 Launch <- P5 Social <- P4 AI (local) <-+
                                                          |
                 P8 Efficiency & Battery Hardening (cross-cutting)
```

| Phase | Theme | Scope | Est. |
|---|---|---|---|
| **P0** | Stabilise | Debris clearing, tests, correctness | 1-2 wks |
| **P1** | Daily Clarity | Onboarding, empty states, glanceability | 3-4 wks |
| **P2** | Routines | Focus, reminders, rollover, recovery | 4-6 wks |
| **P3** | Progression & Ambient | Avatar, widgets, reward-economy correctness | 6-8 wks |
| **P4** | AI (local) | Tier A/B deterministic intelligence | 3-4 wks |
| **P5** | Social | Accounts, feed, moderation -- GATED | 8-12 wks |
| **P6** | Launch | Play Store, subscriptions, OTA | 4-6 wks |
| **P7** | Expansion | Calendar sync, Wear OS, marketplace | open |
| **P8** | Efficiency & Battery Hardening | Default-off background features, render cost. **Gates P6/P7.** | ongoing |

---

### PHASE 0 -- STABILISE (current phase)

**Goal:** remove ambiguity and correctness risk before adding features. No new user-facing features.

> **DELIVERY RULE -- one feature at a time.** P0 tasks are delivered **individually**, not batched.
> Each task below is a separate, self-contained change: implement, verify, commit, *then* move to
> the next. Never combine multiple P0 tasks into one commit or one working session. A half-finished
> task left uncommitted is how this repo ended up with unmerged theme work and schema drift.
>
> A task is not "done" until it is committed and its exit condition is objectively verified.

| ID | Task | Done when |
|---|---|---|
| **P0-T1** | **Land the in-flight theme work** | `theme-store` + `theme-provider` + `theme-switcher` committed; D4 listener leak fixed with cleanup; light and dark visually verified on 4 routes |
| **P0-T2** | Refresh knowledge graph | `graphify update .` run; `GRAPH_REPORT.md` commit hash matches HEAD |
| **P0-T3** | Category normalisation groundwork | `normalizeCategory()` promoted to one shared util; type narrowed to a single documented union; alias map documented with a retirement order. **Incremental only, no big-bang rename** (see 2.5) |
| **P0-T4** | Specify the reward economy | Written spec for profile-XP vs Temporary-Wallet-XP, when transfers happen, double-claim prevention (closes D9). **Done** -- see `docs/adr/0001-reward-economy.md` |
| **P0-T5** | First tests | Vitest + `fake-indexeddb`. Cover `evaluateDayCompletion`, `calculateRank`, `build24HourlyBlocks`, `getJourneyDayNumber`, `toggleHabitLog` |
| **P0-T6** | Adapter pattern for the native bridge | Wrap the 3 namespace aliases behind one typed module so D1 is no longer a monolith. **Behaviour-preserving.** |
| **P0-T7** | Remove dead code | `seedInitialData()` emptied (D8) |

**EXIT GATE:** theme work committed; graph fresh; `tsc --noEmit` clean; `npm run lint` clean; reward
economy spec written; at least 5 test suites green; native bridge wrapped with zero behaviour change.

---

### PHASE 1 -- DAILY CLARITY

**Goal:** a new user understands the app in 30 seconds. Highest-ROI phase -- the research is emphatic
that **onboarding was the single most-praised quality across 12 reviewed apps.**

| Work | IDs | Notes |
|---|---|---|
| First-run onboarding | XL14, M16 | `/onboarding` route, skippable, under 60s, animated previews. Reuse `/`'s circadian dial as step 2 |
| Empty states | M2, M3 | Highest ROI in the entire backlog -- every empty screen is a dead end today |
| Trust and welcome | M1, M6 | Local-first trust badge, 3-pillar welcome banner |
| Creation feedback | M5, M13, M14, M15 | Confirmation toast, warm microcopy, per-rank level-up lore, badge narratives |
| Glanceability | M4, M7-M12 | Completion fraction, up-next ticker, last-done label, capacity indicator, period colours, wallpaper gauge |
| Wallpaper 24-hour gauge (**deferred here**) | M4, M12 | The segmented 24-hour spectrum strip and its glowing "now" needle were removed from the Wallpaper Studio preview -- at phone width the strip compressed to an unreadable sliver and it duplicated the clock sitting directly above it. The concept is **not cancelled**, only relocated. Rebuild it here against the Phase 1 time period system (M11) and decide deliberately where it belongs: as a real 24-hour gauge, or merged into the planner's balance bar. Do not re-add it to the preview unexamined. |
| Time period system | M11 | Morning amber / Afternoon blue / Evening purple / Night indigo -- **map onto existing CSS vars, never raw hex** |
| Habit identity fields | S4, S5, S6, HD29, HD30 | Cue, why, identity, daily-highlight, frog. Additive schema migration (see 2.4) |

**EXIT GATE:** new user reaches first completion in under 60s with no dead ends; empty, single-habit and
full-day states all designed; light and dark verified; fraction header consistent across planner,
journey, stats and wallpaper; schema migration tested against existing data.

---

### PHASE 2 -- ROUTINES

**Goal:** the app handles real life -- missed days, travel, overloaded weeks.

| Work | IDs | Notes |
|---|---|---|
| Focus timer | HD13, HD14, HD15 | Pomodoro, soundscapes, 4-7-8 breathing |
| Reminder system | HD6-HD10 | Multi-trigger, morning blueprint, streak defence, never-miss-twice, Sunday digest |
| Rituals | HD11, HD12 | Morning planning and evening shutdown. Entry points already exist in the shell |
| Flexibility | HD17, HD18, HD19 | Rollover, vacation/freeze, auto-archive. **Requires additive migration (see 2.4)** |
| Analytics depth | HD21-HD24 | 52-week heatmap, deep-work accumulator, time-of-day graph, best/worst day |
| Category picker | HD5 | User-customisable colours, accessible contrast preserved |
| **Unstructured Inbox / Backlog** (**reinstated here**) | HD16, M17 | **Removed from the planner in P0 and deliberately re-homed here, not cancelled.** The "Unstructured Inbox / Backlog" trigger bar and its `InboxDrawer` were stripped from `src/app/planner/page.tsx` to cut P0 chrome; the `inboxItems` Dexie table and the `InboxItem` type are still in `src/lib/db.ts` and the component still exists at `src/components/planner/inbox-drawer.tsx`, so nothing was lost but a mount point. Rebuild it as a first-class quick-capture: capture without scheduling, triage, then schedule into an open hour. It belongs to Phase 2 because an inbox is the entry point for overloaded weeks, which is this phase's goal. |

**P2 platform rules -- non-negotiable:**

- **App blocking (XL5/XL6) does NOT ship in P2.** See Risk R1.
- Prefer **inexact alarms / WorkManager**. Request `SCHEDULE_EXACT_ALARM` only for a feature that
  genuinely needs minute precision, check access before scheduling, degrade gracefully when denied.
- Every auto-reschedule needs **preview + explicit apply + undo** (Rule 2, section 5.3).

**EXIT GATE:** schedule and completion history agree across all screens; timezone and recurrence correct
across DST; offline core fully works; reminders and permissions can be declined without breaking the
app; widgets and wallpaper reflect the same state as the in-app views.

---

### PHASE 3 -- PROGRESSION & AMBIENT

**Goal:** make progress tangible. **Precondition: P0-T4 reward-economy spec is approved.**

| Work | IDs | Notes |
|---|---|---|
| Avatar world | XL1-XL4 | Room engine, furniture sync, themes, nudges |
| Ambient surfaces | XL12, XL13 | Glance widgets, notification shade HUD -- same saved state as the app |
| Shop hardening | -- | Prices, unlock conditions, retry-safe awards |
| Store split | -- | Break up `useUserStore` into profile / wallet / inventory slices (closes D2) |
| Replay video | XL15 | 10s day recap for sharing |

**Rules:** reward grants must be **idempotent** -- no duplicate XP on re-render or double-tap.
Purchases are **cosmetic only** and never confer progress advantage. Strict mode is opt-in, bounded,
recoverable, and **never removes earned or paid items**.

**EXIT GATE:** reward rules visible; no duplicate awards on replayed events; users can recover;
purchases never remove owned items; `useUserStore` split; avatar state mirrors real habit data.

---

### PHASE 4 -- AI (LOCAL / DETERMINISTIC)

**Goal:** ship intelligence with zero backend, zero cost, zero privacy surface.

**Tier A -- pure local logic (first: AI-1 through AI-9)**
Period completion probability; overcommitment warning; weak-day detection; energy-slot conflict;
schedule collision resolver; optimal-time learner; weekly narrative template; streak recovery path;
smart auto-reschedule.

**Tier B -- local statistics (AI-10 through AI-16)**
Weekly routine optimiser; monthly pruning; catalyst correlation; energy correlation; predictive
forecast; time-drift detector; burnout early warning -- **rename to a neutral "workload/consistency
trend"**.

**Thresholds (decision matrix section 21 -- editable, not sacred):**

| Rule | Default |
|---|---|
| Overcommitment | load > 150% of 14-day rolling average |
| Heavy-day warning | 8+ habits **or** 6+ planned hours |
| Decision fatigue | 6+ habits **and** 0 completed by 11:00 |
| Pruning audit | completion < 35% over 30 days |
| Weak-day pattern | weekday < 40% for 4+ consecutive weeks |
| Habit XP | +10; Frog bonus 2.0x before 10:00; Keystone 1.5x; Perfect day +50 XP +5 diamonds |

**Hard rules:** every prediction shows **sample size and confidence**; wait for sufficient history;
describe correlation as correlation. AI **never** silently creates, moves, completes or deletes a
commitment -- everything is a preview the user approves.

**Tier C (LLM) is deferred to P6+** and requires a provider-neutral gateway, server-side credentials,
explicit opt-in for cloud context, and a visible credit meter.

**EXIT GATE:** all Tier A/B green; predictions carry confidence and sample size; every generated change
requires approval; offline and low-data states are honest; zero network calls.

---

### PHASE 5 -- SOCIAL (GATED)

**Do not start until P0-P4 exit gates are met and the platform questions below are answered.**

Backend, accounts and sync are required -- this is the first phase that breaks local-first.

**Scope:** SC1-SC6 (public profiles, friends, comments/high-fives, routine sharing links, challenge
squads, squad heatmaps).

**Hard rules:** everything is **opt-in** with granular per-field visibility. Sharing previews exactly
what the recipient sees. No anonymous stranger chat. No unsolicited adult-to-minor DMs. Reporting,
blocking and moderation ship **with** the feature, not after. Social stays free.

**Google Play gates -- resolve before coding:**

- [ ] Families Policy compliance confirmed if children are in the declared audience
- [ ] UGC Policy -- moderation, ToS, reporting, blocking requirements confirmed
- [ ] Guardian controls and age-band design agreed
- [ ] Per-region legal review (data residency, DPDP Act if India launch is on the roadmap)

**EXIT GATE:** privacy defaults, age bands, guardian controls, reporting, blocking and moderation
operations all implemented **before** any user can publish content.

---

### PHASE 6 -- LAUNCH

One Pro subscription, monthly and annual. **No token packs, no per-module passes, no real-money
trading.** Core habits, schedule, completion, Phase 2 graphs and the free AI chat allowance stay free.

**EXIT GATE:** free/Pro difference is understandable; purchase and restore work on both channels;
cancel/manage works; core features usable without starting a trial; trial terms disclosed before
enrolment.

---

### PHASE 7 -- EXPANSION

Two-way Google/Outlook calendar sync (distinct from P2's read-only overlay); Wear OS companion;
cosmetic marketplace (only after moderation, ownership, fraud and economy rules exist); opt-in cloud
backup with conflict handling and deletion/export.

---

### PHASE 8 -- EFFICIENCY & BATTERY HARDENING (final phase, cross-cutting)

**Status: ACTIVE.** This is the final development phase. It started during P3 and is **binding on
P6 and P7** -- a feature that fails this phase does not ship, regardless of how complete it is.

**Why it exists.** Odyssey ships background work: a live wallpaper that redraws continuously while
the app is closed, and an hourly alarm that wakes the device. The full audit is in
`inefficiencies.md`. The headline finding: the dominant battery cost was **not** Chromium, it was the
native live wallpaper. `MainActivity` already calls `webView.onPause()` when backgrounded, so
WebView cost is bounded to foreground use.

**P8-E1 -- Wallpaper master switch (delivered).** A fail-closed, default-off master switch for the
entire wallpaper mechanism.

- **Default is OFF**, everywhere. `prefs.getBoolean("wallpaper_enabled", false)` -- the `true`
  default that previously existed made "enabled" the fallback for any unreadable state.
- **Hiding is not enough.** Turning it off hides the Wallpaper Studio card on Stats *and* guards the
  `/wallpaper` route, because a bookmark or back-button entry would otherwise still reach the
  controls.
- **Turning it off stands the mechanism down, it does not just hide it:** stops the render loop,
  cancels the hourly alarm, detaches the Odyssey wallpaper and restores the user's own chosen lock
  and home wallpapers.
- **Native is authoritative.** The bridge wins whenever it can answer -- *including* `false`. A
  stale browser `localStorage` value must never resurrect a wallpaper the user switched off. The
  previous `nativeEnabled || webEnabled` did exactly that, so `localStorage` is now consulted only
  when there is no bridge at all (the web preview).
- **Fail closed on error.** If the bridge exists but throws, the state is treated as OFF. An unknown
  state must never resolve to "on" for a background service.

**P8-E2 -- Render cost: the wallpaper is now static.** The engine previously ran a ~30 FPS loop that
redrew the entire ~900-line scene thirty times a second to move a single alpha value, re-reading and
re-parsing the schedule JSON on **every one** of those frames even though it only changes when the
app syncs or the day rolls over. Now:

- renders **once**, then re-renders **only on the minute boundary** -- the shortest interval at which
  anything on screen can actually change, since the clock is the only time-dependent element;
- re-arms on the boundary (`60_000 - now % 60_000`) rather than a flat 60s, so the clock never shows
  the previous minute for a few seconds each hour;
- caches the parsed schedule in `CachedSchedule`, invalidated on the sync broadcast and on rollover;
- freezes the beacon glow at a fixed mid-cycle value instead of animating it;
- **draws nothing further at all when the user has applied an alternate wallpaper** -- if their own
  image is what's actually displayed, there is nothing to redraw.

Per-second cost drops from ~30 renders to 1 per minute, and the timer is a `Handler` callback that
only runs while the engine is visible -- so it produces **no wakeups at all** when the screen is off.

**P8-E3 -- Power-claim honesty.** Source comments claimed "zero battery drain". They now describe
what the engine actually does. Do not write a power claim you have not measured.

**P8-E4 -- Open, tracked in `inefficiencies.md`.** `Paint` objects are still allocated per render
(~57 per frame). At 1 render per minute instead of 30 per second this is now a rounding error rather
than a drain, so it is **not** worth optimising further unless the refresh rate is ever raised.

**EXIT GATE:** every background subsystem is default-off and reachable only through an explicit
user opt-in; disabling it measurably reduces wakeups and CPU; the Kotlin bridge compiles; the web
build, lint, typecheck and tests all pass.

---

## 5. ENGINEERING CONVENTIONS (binding on all code)

### 5.1 Stack (verified -- do not substitute)

Next.js **16.3.5** | React **19.2.8** | TypeScript **5.9** | Tailwind **4.3** | Shadcn **base-nova** |
Base UI (`@base-ui/react`, **not** Radix) | Lucide React | Zustand 5 | Dexie 4 | date-fns 4 |
Framer Motion 13 | Recharts 3

### 5.2 Mandatory pre-flight for any Next.js work

`AGENTS.md` states *"This is NOT the Next.js you know."* Version 16.3.5 has breaking changes.

1. Read the relevant guide in `node_modules/next/dist/docs/` **before writing code**
2. Heed every deprecation notice
3. Do not apply training-data Next.js 14/15 patterns from memory
4. The `nextjs-agent-rules` block in `AGENTS.md` is regenerated by `next dev` -- **commit it alongside
   your work** so the tree stays clean. Removing it just re-creates the diff.

### 5.3 Architecture rules

| # | Rule |
|---|---|
| 1 | **One source of truth.** Habits, occurrences, completions, streaks, rewards, wallpaper and notifications must never hold independent conflicting state. Dexie is authoritative; Android SharedPreferences is a **read-only cache**. |
| 2 | **No silent changes.** Rollover, auto-reschedule, bulk edits and AI drafts get preview + explicit apply + undo. |
| 3 | **Accessible interaction.** Every gesture has a visible alternative. Colour is never the sole status signal. Support large text, screen readers, reduced motion and narrow phones. |
| 4 | **Permission integrity.** Request special access only when the user starts that feature. Explain why, allow decline, preserve graceful behaviour. |
| 5 | **Privacy integrity.** Habit identity, energy, mood, age estimates and sharing are all optional. Preview sensitive lock-screen and export content. |
| 6 | **Evidence honesty.** Treat research numbers as *source claims*, not guaranteed results. Thresholds are hypotheses. Show confidence. |
| 7 | **Traceability.** Every feature ID stays tracked: planned, shipped, changed, deferred or excluded. Nothing is silently dropped. |

### 5.4 Styling rules

- **Never raw hex in components.** Use the CSS-var-backed Tailwind tokens: `bg-surface-container`,
  `text-on-surface-variant`, `border-outline/15`, `text-primary`, `bg-surface-container-lowest/90`.
  The Material 3 token set lives in `globals.css` and is wired through `tailwind.config.ts`.
- **No hardcoded pixel widths.** Use `w-full`, `max-w-md/xl`. Existing layout max is
  `max-w-xl sm:max-w-2xl`.
- **Mobile-first.** Standard breakpoints only (`sm:`, `md:`, `lg:`). Respect `pt-safe` / `pb-safe`.
- **Icons:** `lucide-react` only. Inline SVG only for logo marks.
- **Path alias:** `@/*` maps to `./src/*`.
- **Always support light AND dark.** Every new surface is checked in both.
- Feature-specific colours (M11 period accents, user-chosen habit colours) are the *only* legal
  exception -- and they must still meet contrast requirements and map consistently across card, date
  strip, planner and wallpaper.
- **Canvas exception:** `<canvas>` drawing cannot read CSS custom properties directly. Read tokens via
  `getComputedStyle()` at draw time and re-render on theme change.
### 5.5 Data rules

- Dates: `YYYY-MM-DD`. Times: 24-hour `HH:mm`. Timestamps: UTC ISO.
- **Never mutate Dexie state directly from components** -- go through the store layer.
- Schema changes are **additive** by default (see 2.4). Anything destructive needs a migration version
  bump, a written ADR and a tested fallback.
- Category values: normalise at the boundary via `normalizeCategory()`. Never add another inline alias.
- Any change affecting the wallpaper/native payload must update `buildNativeSchedulePayload()` and the
  Kotlin parser together. **They are one contract split across two languages.**

### 5.6 State rules

- Zustand store per domain (`user`, `habit`, `schedule`, `wallpaper`, `theme`). No god-stores.
- Side effects (native sync, IndexedDB writes) live in the store or an explicit service -- never in
  render bodies.
- Any `useEffect` that registers a listener **must return a cleanup**. *(D4 is the existing violation.)*
- Direct `db` reads from a page are allowed only where the page is analytics/stateless, and must be
  commented with the reason.

### 5.7 Android / native rules

- The bridge is a **contract**, not a convenience layer. Any new bridge method needs: a Kotlin
  implementation, a TS type declaration, a browser-safe fallback, and an entry in
  `buildNativeSchedulePayload` if it carries schedule data.
- Assume **dual path**: every native feature needs a graceful web/PWA fallback. Never gate core
  function behind the bridge.
- Permissions: prefer install-time/normal. Runtime prompts only on explicit user action, with an
  explanation screen first (Regain's pattern is the reference -- see `UI_UX_review.md` section 23).
- Any wallpaper change requires visual verification on a real device or emulator.
- **Every background feature is default-off.** See rule 6.6 step 2. Ship `getBoolean(key, false)`.
- **Turning a feature off must actually stop it**, not merely hide its UI: stop the loop, cancel
  the alarm, release the wakeup, restore whatever it replaced.
- **Do not remove a permission that is unused** without confirming zero call sites -- an unused
  permission in the manifest is both Play-review surface and a false claim to the user.
- **Kotlin is not covered by `tsc`.** Any native change is unverified until `:app:compileDebugKotlin`
  exits 0. See rule 6.6 step 5.
- **OTA release order is strict: bump `version.json` -> rebuild the APK -> put it at
  `public/downloads/odyssey-latest.apk` -> push.** `app/build.gradle` reads `versionCode`/`versionName`
  straight out of `version.json`, so an APK built *before* the bump carries the old versionCode and
  Android rejects the in-place install with `INSTALL_FAILED_VERSION_DOWNGRADE`. The API also only
  offers an update when `latest > installed`, so bumping the version alone -- without a rebuilt APK --
  advertises a build that cannot install. Note the download URL is fixed at
  `/downloads/odyssey-latest.apk` in `src/app/api/app-version/route.ts`; the file must be named
  exactly that or the download 404s.

### 5.8 Accessibility and performance floors

- Touch targets at least 44x44px. Body text at least 14px.
- Contrast at least 4.5:1 for text, 3:1 for large text and UI.
- Honour `prefers-reduced-motion` on all Framer Motion animations.
- Every interactive element keyboard-reachable with a visible focus ring.
- Virtualise lists past ~50 items (heatmaps and journey map are already close to this).
- Target: no hydration mismatch. `localStorage` reads happen in `useEffect` or behind a mounted guard
  -- the codebase already does this correctly; keep it that way.

### 5.9 Required checks before opening a PR

```bash
npx tsc --noEmit     # must be clean
npm run lint         # must be clean
npm run build        # must succeed
npm test             # must pass (from P0-T5 onward)
```

- **Native/Kotlin changes additionally require `:app:assembleDebug` to exit 0** (rule 6.6
  step 5). None of the four commands above read Kotlin, so a green set of them says nothing about
  the bridge -- and this is the command that produces the APK.
- **UI work:** verify light and dark, three screen widths (360 / 390 / 430), keyboard nav, reduced motion.
- **Native work:** verify the web fallback still works with the bridge absent.
- **Data work:** verify against **existing** IndexedDB data, not just fresh installs.
- **Schema work:** add a written ADR to `docs/adr/`.
- **Background work:** verify the default is OFF on a fresh install, that the feature genuinely
  stops when switched off, and that a bridge failure resolves to OFF.

---

## 6. HOW WORK MOVES

### 6.1 One feature at a time (non-negotiable)

This is the single most important process rule in this document.

- **One feature per commit.** Not one feature per branch, not one feature per PR -- one feature per
  *commit*, and ideally one feature per working session.
- The cycle is always: **implement -> verify -> commit -> then move on.**
- **Never** start feature B while feature A is uncommitted. Half-finished work is how this repo
  accumulated an unreleased theme system, category drift and a schema mismatch.
- If a task turns out to be larger than expected, still finish it before starting anything else, or
  explicitly park it with a written note. Do not leave a half-migrated state.
- A feature is "in progress" until it is committed and its exit condition is verified.

### 6.2 Branching

`main` is protected and always shippable. Branch naming: `feature/<phase>-<id>-<slug>`, for example
`feature/P1-M2-habits-empty-state` or `fix/P0-T1-theme-listener-leak`.

### 6.3 Commit format

```
<type>(<scope>): <subject>

Refs: <FEATURE_ID>          # e.g. M2, HD13, AI-6
Plan: DEVELOPMENT_PLAN.md section 4
```

Types: `feat`, `fix`, `refactor`, `perf`, `style`, `docs`, `chore`, `test`.

### 6.4 Commit hygiene

- One logical change per commit. Never mix a feature with an unrelated reformat.
- Never commit secrets, `.env*`, or real user data.
- **Do not commit `Market Research/`** -- it is git-ignored by design (see 1.1).
- Native rebuilds are expensive: prefer fixing web code over rebuilding the APK. The APK exists for
  native capability only.

### 6.5 Definition of Done

A feature is **done** only when all of these are true:

- [ ] Acceptance criteria met and manually verified
- [ ] `tsc`, `lint`, `build` and `test` all clean
- [ ] Light **and** dark verified; three widths verified; keyboard and reduced-motion checked
- [ ] Empty, loading, error and long-content states handled
- [ ] Offline behaviour verified (local-first is a product promise)
- [ ] No analytics or telemetry added -- this is a local-first, zero-tracking product
- [ ] `main_plan.md` updated — checkbox **and** status, in the same commit (see 2.8)
- [ ] Any new schema field documented in `src/lib/db.ts` with a migration note
- [ ] **Committed** -- an uncommitted feature is not done, it is in progress
---

### 6.6 Efficiency-first agent workflow (binding, from P8 onward)

**Motivation.** On this codebase an agent that only asks "does it work?" shipped a feature that
burned battery continuously with the app closed, and separately shipped a Kotlin file that had
never been compiled. Both were invisible to `tsc`, `lint` and the test suite. The workflow below is
the cheapest way to catch both classes of defect.

**Step 1 -- Ask the battery question before writing code, not after.**

For any feature that runs when the app is *closed*, answer these first, in writing:

- What wakes the device? (alarm, service, timer, broadcast)
- How often, and what does each wake cost?
- What is the **default** if state is unreadable, missing, or the bridge fails?
- What exactly happens when the user turns it off?

If the feature has no answer to "what happens when the user turns it off", it is not finished. A
feature that cannot be stopped is a feature that can only be uninstalled.

**Step 2 -- Default-off is a rule, not a preference.** Every new persistent flag ships as
`getBoolean(key, false)`. Any default that resolves to *doing work* is wrong, because it makes
"enabled" the fallback for every failure mode -- unreadable preferences, a bridge that throws, a
half-written store. Encode it in a test (`wallpaper-toggle-store.test.ts` is the pattern), not in a
comment.

**Step 3 -- Hide the UI *and* guard the route.** Hiding an entry point is presentation, not
enforcement. Anything a user can reach by URL, by bookmark or by the back button needs its own
guard.

**Step 4 -- One source of truth, and it must be the authoritative one.** Native state wins over a
browser mirror whenever native can answer -- *including* when it answers "no". `a || b` where `a` is
authoritative silently converts "authoritative no" into "yes".

**Step 5 -- Compile what you changed. Do not assume.** `tsc` does not read Kotlin. This repo has no
`gradlew` checked in, and **this machine's Android Studio ships JBR 25 while the project is pinned to
Kotlin 1.9.22 / AGP 8.2.2 / Gradle 8.4** (all 2023-era). Left alone, every Android build fails with:

```
Daemon compilation failed: null
java.lang.IllegalArgumentException: 25.0.3
```

The Kotlin daemon cannot even parse the JDK version string. The permanent fix is already committed in
`android/gradle.properties` -- `kotlin.compiler.execution.strategy=in-process` bypasses the daemon.
So Android Studio builds work normally now, and from the CLI:

```bash
cd android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
& "$env:USERPROFILE\.gradle\wrapper\dists\gradle-8.4-bin\*\gradle-8.4\bin\gradle.bat" assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

**Exit code 0 is the gate.** If this ever regresses, the properly supported fix is to install a
**JDK 17** and set `org.gradle.java.home` to it, rather than upgrading Kotlin -- upgrading to 2.x
means migrating `kotlinOptions` to the `compilerOptions` DSL and is a separate change with its own
risk.

**Step 6 -- Run the cheapest gate that can fail, first.** `tsc` -> `lint` -> `test` -> `build` ->
Kotlin compile. `lint` in particular catches hook-order violations (`rules-of-hooks`) that `tsc`
accepts and that only otherwise appear at runtime.

**Step 7 -- Report honestly.** If a check could not be run, say so in the summary. Never describe
unverified work as verified.

---

## 7. RISK REGISTER

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| **R1** | **App blocking (XL5/XL6) requires an `AccessibilityService`.** Google Play requires a prominent separate disclosure, affirmative consent and policy review. Approval is **not guaranteed**, and a rejection can block release. | CRITICAL | **Keep out of the first release.** If pursued, ship as a standalone companion module so the main app never depends on it. Verify policy eligibility *before* building. |
| **R2** | Reward inflation / double-claim via the Temporary Wallet (D9) | High | P0-T4 spec before any P3 reward work. Idempotent grant keys. |
| **R3** | Native bridge regression (34 methods, 3 aliases, D1) | High | P0-T6 adapter plus a web fallback path tested with the bridge absent. |
| **R4** | No automated tests at all (D7) | High | P0-T5. Pure functions first -- they hold the most business logic. |
| **R5** | Category drift compounds (D3) | High | P0-T3 normalisation plus a hard rule against new aliases. |
| **R6** | Local-first to social breaks the privacy promise (P5) | High | P5 gated. Explicit opt-in account transition; per-field visibility. |
| **R7** | Research is git-ignored, so decisions can be lost | Medium | All tracked decisions live in this file plus `docs/adr/`. |
| **R8** | Scope creep -- 140 items is not a release scope | Medium | Phase gates are hard. Exit gates must be objectively verifiable. |
| **R9** | Research numbers treated as guaranteed uplift | Medium | Rule 6 in section 5.3. Always show confidence and sample size. |
| **R10** | Knowledge graph stale, leading to wrong impact analysis | Medium | P0-T2, then re-run after each phase. |
| **R11** | **Half-finished work left uncommitted** -- already happened once (the theme system sat uncommitted across multiple sessions) | High | Rule 6.1. One feature at a time, committed before moving on. |
| **R12** | **Unverified native code shipped** -- there is no `gradlew` in the repo, so Kotlin can look "done" while never having been compiled. A real syntax error shipped through a fully green web test suite. | High | Rule 6.6 step 5. Compile `:app:assembleDebug` before committing any `.kt` change. Consider committing the Gradle wrapper so this stops depending on local caches. |
| **R14** | **JDK/toolchain drift breaks all Android builds** -- Android Studio's bundled JBR moved to JDK 25, but the project is pinned to Kotlin 1.9.22 / AGP 8.2.2. The Kotlin daemon fails with `IllegalArgumentException: 25.0.3` and no APK is produced. Silent until the *next* Android Studio update. | High | Fixed via `kotlin.compiler.execution.strategy=in-process` in `android/gradle.properties`. Proper remedy is a JDK 17 toolchain pin (`org.gradle.java.home`) once a JDK 17 is installed. Re-check this after any Android Studio or Gradle upgrade. |
| **R13** | **Background battery burn** -- the live wallpaper drew continuously with the app closed, defaulted to enabled, and could not be turned off from the UI. | High | Rule 6.6 steps 1-4, phase P8. Default-off, route-guarded, native-authoritative, fail-closed. |

---

## 8. IMMEDIATE NEXT ACTIONS

> **Feature status lives in `FEATURES.md`, not here.** That file is the canonical register of what is
> shipped, ready, blocked and gated. This section keeps the reasoning. If the two ever disagree,
> `FEATURES.md` is the status of record and this section is the stale one — fix it.

Delivered strictly one at a time per rule 6.1. Do these in order; nothing else starts until the P0
exit gate is met.

1. **Fix and land the theme work** (P0-T1) -- already half-written and currently uncommitted. Fix the
   D4 listener leak while doing it. Suggested as two commits: (a) the leak fix alone, (b) the feature
   itself once verified in both themes.
2. ~~**Refresh the knowledge graph** (P0-T2)~~ **DONE 2026-10-04.** Rebuilt from `dda4383d`:
   542→854 nodes, 991→1454 edges, 30→59 communities. The report is now tracked in git; `graph.json`
   (906 KB) and `graph.html` (740 KB) stay ignored as local artifacts. Closes D6 and R10.
3. **Write the reward-economy spec** (P0-T4) -- closes the highest-severity open correctness risk.
4. **Stand up the test harness** (P0-T5) -- Vitest plus `fake-indexeddb`, five pure-function suites.
5. **Wrap the native bridge** (P0-T6) -- behaviour-preserving adapter.
6. **Normalise categories** (P0-T3) -- incrementally, no big-bang rename.
7. **Remove dead code** (P0-T7) -- empty out `seedInitialData()`.
8. Then, and only then, start **P1 -- Daily Clarity**, beginning with M2 and M3 (empty states).

### 8.1 Deferred backlog (explicitly not forgotten)

| ID | Item | Why deferred |
|---|---|---|
| P0-T1b | Replace ~40 theme-blind hex values in `wallpaper-preview.tsx`, landing `page.tsx`, `feedback-modal.tsx`, `habit-month-calendar.tsx`, `edit-habit-modal.tsx` | Needs `getComputedStyle()` for the canvas. Do after the theme system is committed, as its own feature. |
| P3-BACKLOG-1 | XP curve change to `100 * level^1.5` | Would invalidate existing users' levels (see 2.7). v2.0 plus recalc utility. |
| P3-BACKLOG-2 | Rename "burnout early warning" to a neutral "workload trend" | Naming and claims cleanup -- do it when Tier B lands (P4). |
| P7-BACKLOG-1 | Two-way calendar sync | Distinct from P2's read-only overlay; needs account and conflict design. |
| P7-BACKLOG-2 | Wear OS companion | Needs mobile data stable first. |
| P7-BACKLOG-3 | Cosmetic marketplace | Needs moderation, ownership, fraud and economy rules. |
| -- | Real-money cash-out / charity rewards | Exploratory only. Not an approved feature. Needs funding and payment review. |
| -- | Tier C LLM features | Needs gateway, server-side keys, credit meter, opt-in cloud context. |
| -- | App blocking (XL5/XL6) | Risk R1. Keep out of the first release. |

---

## 9. CHANGELOG

| Date | Change | Author |
|---|---|---|
| 2026-10-03 | Plan created. Reconciled 8 contradictions across the Market Research corpus: feature-ID collision, phase collision, schema divergence, Next.js version error, XP curve, checkbox drift, git-ignore, and plan-vs-reality. Verified baseline against `6b42b74`. | Cline |
| 2026-10-03 | Added the one-feature-at-a-time delivery rule (6.1, reinforced in 4, 6.5, Quick Reference) and logged it as risk R11. Restored content lost during an edit. | Cline |
| 2026-10-04 | Opened **P8 Efficiency & Battery Hardening** as the final, cross-cutting phase (gates P6/P7). Landed the wallpaper master switch: default-off everywhere, `/wallpaper` route-guarded as well as hidden, disable stops loop + cancels hourly alarm + restores the user's lock/home wallpapers, native authoritative over stale `localStorage`, fail-closed on bridge error. Cached the schedule JSON per change instead of per frame. Removed the unused `WAKE_LOCK` permission. Split the `FLAG_LOCK or FLAG_SYSTEM` apply. Added rule 6.6 (efficiency-first agent workflow), risks R12/R13, and the Kotlin-compile gate in 5.9. | Cline |
| 2026-10-04 | Made the live wallpaper **static** (P8-E2, closing 2.1). Removed the ~30 FPS loop: renders once, re-renders on the minute boundary to keep the clock correct, re-arms on the boundary rather than a flat 60s. Freezes the beacon glow at a fixed value. Draws nothing further when the user has an alternate wallpaper. ~30 renders/sec -> 1/min, and zero wakeups while the screen is off. | Cline |
| 2026-10-04 | Fixed a build-blocking JDK mismatch (R14): Android Studio ships JBR 25, but Kotlin 1.9.22's compile daemon cannot start on it (`IllegalArgumentException: 25.0.3`, "Daemon compilation failed"). Set `kotlin.compiler.execution.strategy=in-process` in `android/gradle.properties` and raised `org.gradle.jvmargs` to 4096m to match. Verified with a from-scratch `clean assembleDebug` -> BUILD SUCCESSFUL, 11.32 MB APK. | Cline |

---

## 10. QUICK REFERENCE

```
CURRENT PHASE ........ P8 Efficiency & Battery Hardening (ACTIVE, gates P6/P7)
NEXT UP ............ P0-T1 -- land the in-flight theme work
BIGGEST BUG ........ D4 -- theme-store matchMedia listener leak
BIGGEST RISK ....... R1 -- AccessibilityService and Play policy
BATTERY RULE ....... Default OFF, must be stoppable, native authoritative (6.6)
DELIVERY ........... ONE FEATURE AT A TIME. Implement, verify, commit, then next.
CANONICAL SCHEMA ... src/lib/db.ts  (NOT MASTER_TODO_REVISED section 20.1)
CANONICAL AI IDS ... MASTER_TODO_REVISED.md AI-1..AI-23  (NOT AI_TODO.md)
FRAMEWORK .......... Next.js 16.3.5 -- read node_modules/next/dist/docs/ first
VALIDATE ........... npx tsc --noEmit && npm run lint && npm run build && npm test
KOTLIN ............. cd android && :app:compileDebugKotlin  (tsc does NOT check .kt)
```

*End. If reality and this document disagree, reality is right -- update this document in the same PR.*
