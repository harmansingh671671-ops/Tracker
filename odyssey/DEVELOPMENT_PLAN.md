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
1. THIS DOCUMENT          (decisions, order, gates)
2. ACTUAL CODE            (reality - code always beats docs)
3. MASTER_TODO_REVISED.md (feature catalogue + rationale)
4. All other Market Research files (evidence only, non-binding)
```

If this document and a Market Research file disagree, **this document wins.** If this
document and the **code** disagree, **stop and reconcile** - one is wrong; fix it before
work continues.

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

### 1.1 Market Research is git-ignored

`.gitignore` line 52 excludes `Market Research/`. **Zero research files are tracked in git.**

Consequences everyone must know:

- Do **not** store acceptance criteria, status or decisions only in `Market Research/` - they will be lost.
- All tracked status lives in this file plus git history.
- If research must be shared across machines it needs a deliberate separate sync. Until then, treat
  each checkout's copy as local and non-authoritative.

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

> **RESOLUTION:** Section 3 is the only status record. When you finish a feature, update section 3
> **and** tick the box. Two places, always.

---

## 3. VERIFIED BASELINE -- WHAT ACTUALLY EXISTS

**Reconciled against source on 2026-10-03 @ `6b42b74`.** 65 TS/TSX files, 9 routes, 11 component
directories. This table is the status record -- update it when you ship.

### 3.1 Working, shipped, verified

| Area | Verified working |
|---|---|
| **Planner** (`/planner`) | 24h inline hour blocks, NOW/NEXT, 3-state review (Unreviewed/Tick/Cross), future-hour lock, infinite date strip, inbox drawer, distribution modal, localStorage frame-0 cache |
| **Day schedule** (`/day-schedule`) | Vertical timeline, category tags, inline task creator, category picker, sleep auto-fill (8h) |
| **Habits** (`/habits`) | 3 view modes (list/grid/heatmap), GitHub-style heatmap 10-col, month nav + arrows, create/edit modal, template library, per-habit streaks |
| **Journey** (`/journey`) | Scrollable day map, SVG bezier curves, dynamic past/future day counts, today-in-view tracking |
| **Stats** (`/stats`) | Month-navigable calendar heatmap, tap-for-24h-overview, hold-to-open-planner, rank tier badge |
| **Shop** (`/shop`) | Diamond store, streak-freeze purchase, XP boosts, daily mystery chest, reward-celebration modal |
| **Wallpaper** (`/wallpaper`) | Live engine + static auto-updater, isolated lock/home custom photos, 1-tap apply, hourly auto-update toggle, cadence notifications, schedule sync and verify |
| **Gamification** | XP, level, diamonds, 9 ranks (Beginner to Legend), streak, **Temporary Wallet** (claim-on-review) |
| **Data** | Dexie `OdysseyDB`, 6 tables, compound indexes, UTC timestamps |
| **Native** | Kotlin bridge (34 methods), Live Wallpaper Service, hourly + boot workers, cadence notifications, in-place APK updater via FileProvider |
| **Theming** | **IN FLIGHT / UNCOMMITTED**: `theme-store.ts`, `theme-provider.tsx`, `theme-switcher.tsx`, anti-FOUC script, light/dark/system |

### 3.2 Not built (researched and planned, zero code)

| ID | Feature | Notes |
|---|---|---|
| XL14 | **Interactive onboarding flow** | No `/onboarding` route. `/` is a circadian-dial marketing page, not a first-run flow |
| M1-M3, M6 | Local-first trust badge, **empty states**, welcome banner | Zero matches in code. Highest-ROI polish |
| M4-M5 | All-done celebration card, creation-confirmation toast | -- |
| M7-M12 | Last-done, capacity indicator, completion fraction, up-next ticker, period colours, wallpaper gauge | M10/M11/M12 absent from wallpaper |
| HD11-HD12 | Morning planning / evening shutdown rituals | Evening reminder modal exists but is a nudge, not a ritual |
| HD13-HD15 | Pomodoro, soundscapes, breathing pacer | No focus timer at all |
| HD17-HD19 | Flexible rollover, vacation/freeze, auto-archive | Freeze exists as a *shop item* only |
| HD21-HD24 | 52-week heatmap, deep-work accumulator, time-of-day graph, best/worst day | -- |
| S4-S6, HD29-HD30 | Cue / why / identity fields, daily highlight, frog | -- |
| XL1-XL4 | Avatar world, furniture sync, room themes, nudge engine | -- |
| XL12-XL13 | Home-screen widgets, notification shade HUD | -- |
| XL5-XL7 | App blocker, task-unlock gate, hardcore damage | **See Risk R1 -- gated** |
| AI-1..AI-23 | All AI | Zero. Tier A/B are local math only |
| SC1-SC10 | All social and expansion | Zero. Requires backend |

### 3.3 Technical debt register

| ID | Debt | Impact | Priority |
|---|---|---|---|
| D1 | `android-bridge.ts` ~1000 lines, 34 bridge methods, 3 namespace aliases | Highest god-node (34 edges). Any change risks breaking 16 wallpaper controls | High |
| D2 | `useUserStore` 33 edges -- mixes profile, wallet, shop purchases, rank derivation | Split into profile/wallet/inventory slices (P3) | High |
| D3 | Category union drift + ~50 colour aliases (see 2.5) | Every new category feature inherits the mess | High |
| D4 | `theme-store.initTheme()` adds a `matchMedia` listener with **no cleanup** | Memory leak pattern; multiplies if `initTheme` is ever called more than once | **Fix in P0** |
| D5 | Planner/journey/stats pages bypass Zustand, read `db` directly | Two data-access styles in one app | Medium |
| D6 | Knowledge graph stale -- built from `efa7dc9a`, HEAD `6b42b74` | Run `graphify update .` before any impact analysis | Medium |
| D7 | No test suite at all | 65 files, zero automated tests | High |
| D8 | `seedInitialData()` is an **empty function** with 2 call sites | Dead code; misleading name | Low |
| D9 | Dual XP accounting: profile XP vs Temporary Wallet XP | Reward-inflation / double-claim risk -- must be specified before P3 | **High** |

---
## 4. PHASE PLAN

Eight phases. **Each has an exit gate that must be objectively verifiable.** Do not start a phase
until the previous gate is met and recorded in git.

```
P0 Stabilise -> P1 Daily Clarity -> P2 Routines -> P3 Progression & Ambient
                                                          |
      P7 Expansion <- P6 Launch <- P5 Social <- P4 AI (local) <-+
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
| **P0-T4** | Specify the reward economy | Written spec for profile-XP vs Temporary-Wallet-XP, when transfers happen, double-claim prevention (closes D9) |
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

- **UI work:** verify light and dark, three screen widths (360 / 390 / 430), keyboard nav, reduced motion.
- **Native work:** verify the web fallback still works with the bridge absent.
- **Data work:** verify against **existing** IndexedDB data, not just fresh installs.
- **Schema work:** add a written ADR to `docs/adr/`.

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
- [ ] Section 3 status table updated **and** the research checkbox ticked (see 2.8)
- [ ] Any new schema field documented in `src/lib/db.ts` with a migration note
- [ ] **Committed** -- an uncommitted feature is not done, it is in progress
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

---

## 8. IMMEDIATE NEXT ACTIONS

Delivered strictly one at a time per rule 6.1. Do these in order; nothing else starts until the P0
exit gate is met.

1. **Fix and land the theme work** (P0-T1) -- already half-written and currently uncommitted. Fix the
   D4 listener leak while doing it. Suggested as two commits: (a) the leak fix alone, (b) the feature
   itself once verified in both themes.
2. **Refresh the knowledge graph** (P0-T2) -- run `graphify update .` and commit the new report.
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

---

## 10. QUICK REFERENCE

```
NEXT UP ............ P0-T1 -- land the in-flight theme work
BIGGEST BUG ........ D4 -- theme-store matchMedia listener leak
BIGGEST RISK ....... R1 -- AccessibilityService and Play policy
DELIVERY ........... ONE FEATURE AT A TIME. Implement, verify, commit, then next.
CANONICAL SCHEMA ... src/lib/db.ts  (NOT MASTER_TODO_REVISED section 20.1)
CANONICAL AI IDS ... MASTER_TODO_REVISED.md AI-1..AI-23  (NOT AI_TODO.md)
FRAMEWORK .......... Next.js 16.3.5 -- read node_modules/next/dist/docs/ first
VALIDATE ........... npx tsc --noEmit && npm run lint && npm run build && npm test
```

*End. If reality and this document disagree, reality is right -- update this document in the same PR.*
