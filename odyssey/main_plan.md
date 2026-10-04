# ODYSSEY — MAIN PLAN

> **Status of this file:** the single authoritative index of what gets built, in what
> order, and what state each feature is in. **Check this file FIRST**, before any other
> document or any code.
>
> **Last reconciled:** 2026-10-05 · baseline migrated from `DEVELOPMENT_PLAN.md` §3
> (which was reconciled against source at commit `6b42b74`).

---

## 0. HOW TO USE THIS FILE

### 0.1 Authority order (binding)

```
1. main_plan.md            <- THIS FILE. Order, priority, status. Authoritative.
2. ACTUAL CODE             <- reality. Code always beats any document.
3. DEVELOPMENT_PLAN.md     <- engineering conventions + workflow rules (still canonical for HOW)
4. MASTER_TODO_REVISED.md  <- full feature specs + rationale (read for WHAT and WHY)
5. All other Market Research docs -> evidence only, non-binding
```

If this file and a research doc disagree, **this file wins on order and status**.
If this file and the **code** disagree, **stop and reconcile** before continuing.

### 0.2 Status legend

| Status | Meaning |
|---|---|
| `SHIPPED` | Built, verified, committed, in the app |
| `PARTIAL` | Some of it exists; the remainder is listed in the brief |
| `NOT BUILT` | Researched and planned, zero code |
| `BLOCKED` | Cannot start until a named dependency clears |
| `GATED` | Legally/policy gated (Play Store, moderation, payments) |
| `DEFERRED` | Deliberately parked to a later phase |
| `NOT APPROVED` | Proposed but explicitly not a product commitment |

### 0.3 Source reference format

Every feature line cites where it came from, so you can go read the full spec:

```
- [ ] **ID** — Brief. `Status` · src: `DOC §section Lnnn` · also: `OTHER_ID`
```

`src:` points at the **canonical** description. `also:` cross-references a second
document or a sibling ID that covers the same ground — these are **not** duplicates
to implement twice, they are the same feature seen from two documents.

### 0.4 Phase order (final — do not re-derive)

| Phase | Theme |
|---|---|
| **1** | Small things, polish, micro-interactions, stabilise |
| **2** | Real feature work added to the app |
| **3** | Avatar, customisation, shop |
| **4** | Social tab |
| **5** | Wallpaper and widgets |
| **6** | Polish, non-AI Pro features, third-party integrations |
| **7** | AI |

This order is **deliberate and overrides** the phase numbering in `DEVELOPMENT_PLAN.md`
§4 and `PRODUCTION_PLAN.md`. See contradiction **C1** in §9.

---
## 1. AI AGENT WORKFLOW (binding)

This is the operating procedure for any AI or human picking up work. It is not
advisory. Follow it in order.

### Step 1 — Always start here

Before touching anything, open **this file** and find the feature. Never start work
from a research document directly. The research docs are ~350 KB and contradict each
other; this file is the index that already resolved that.

If the feature is **not listed here**, stop and add it before implementing it.

### Step 2 — Read the full spec before writing code

Every entry cites a `src:` location. **Open that file and read the full paragraph**
for that feature. The brief here is one line and is deliberately not sufficient —
the research holds the constraints, the "never do this" clauses, and the
acceptance detail. Skipping this step is how the wrong thing gets built.

### Step 3 — Follow every cross-reference

Where a line says `also: HD7`, the same capability is described in another document
or under another ID. **Read all of them.** They often add constraints the first
source did not state. This is what stops you implementing a partial version.

Check §9 (Contradictions). If the feature appears there, the conflict is **not yet
resolved** — raise it with the owner before coding.

### Step 4 — Check the status, then check the code

`NOT BUILT` means zero code. `PARTIAL` means **read the existing implementation
first** — you are extending, not starting. `SHIPPED` means verify it is actually
working before "fixing" it.

**Code beats documents.** If this file says `NOT BUILT` but the code exists, the
code wins — fix this file.

### Step 5 — Ask the battery question before writing code

For anything that runs while the app is **closed** (wallpaper, alarms, widgets,
notifications, sync):

- What wakes the device, and how often?
- What is the default when state is unreadable or the bridge fails?
- What exactly happens when the user turns it off?

If you cannot answer "what happens when the user turns it off", the feature is not
finished. A feature that cannot be stopped is a feature that can only be uninstalled.
Every new persistent flag ships **default-off** (`getBoolean(key, false)`).

### Step 6 — One feature at a time, non-negotiable

**One feature per commit**, ideally one per working session.
Cycle: implement → verify → commit → move on. Never start feature B while
feature A is uncommitted.

### Step 7 — Run the cheapest gate that can fail, first

```
tsc → lint → test → build → Kotlin compile
```

`tsc` does **not** read Kotlin. If you touched Kotlin, you must compile it.
Lint catches hook-order violations `tsc` accepts.

### Step 8 — Verify visually for anything visual

Use Puppeteer at phone width (390px). Screenshot before/after. For light **and**
dark. Do not assert a visual change works — measure it or screenshot it.

### Step 9 — Update this file in the same commit

Change the checkbox and the status. This file is the status record; there is no
other one. A feature is **not done** until it is committed and its status here
reflects reality.

### Step 10 — Report honestly

If a check could not be run, say so. **Never describe unverified work as
verified.** If something could not be proven (e.g. a clock-dependent fix tested at
00:00), state that explicitly rather than implying it works.

### Definition of Done

- [ ] Acceptance criteria met and manually verified
- [ ] `tsc`, `lint`, `build`, `test` all clean (plus Kotlin compile if Kotlin changed)
- [ ] Light **and** dark verified; 390px and two wider widths; reduced-motion checked
- [ ] Empty, loading, error and long-content states handled
- [ ] Offline behaviour verified — local-first is a product promise
- [ ] No analytics or telemetry added — this is a zero-tracking product
- [ ] Any new schema field documented in `src/lib/db.ts` with a migration note
- [ ] **This file updated** (checkbox + status) in the same commit
- [ ] **Committed** — an uncommitted feature is in progress, not done

---
## 2. VERIFIED BASELINE (migrated from `DEVELOPMENT_PLAN.md` §3)

Reconciled against source at `6b42b74`. **This is the status seed — everything in
§3–§9 inherits from it.**

### 2.1 Shipped and working

| Area | State |
|---|---|
| **Routes (9)** | `/` (circadian landing), `/habits`, `/planner`, `/journey`, `/stats`, `/shop`, `/wallpaper`, `/day-schedule`, `/profile` |
| **Habits** (`/habits`) | CRUD, categories, streaks, per-habit flame, completion toggle |
| **Planner** (`/planner`) | 24h visual timeline, duration distribution, drag/reschedule, edit-hour modal, live hour marker |
| **Journey** (`/journey`) | Scrollable day map, SVG bézier curves, dynamic past/future counts, today-in-view, 9 ranks |
| **Stats** (`/stats`) | Month-navigable heatmap, tap-for-24h-overview, hold-to-open-planner, rank badge |
| **Shop** (`/shop`) | Diamond store, streak-freeze, XP boosts, daily mystery chest |
| **Wallpaper** (`/wallpaper`) | Live engine + static auto-updater, isolated lock/home photos, 1-tap apply, hourly toggle, cadence notifications, schedule sync |
| **Gamification** | XP, level, diamonds, 9 ranks (Beginner→Legend), streak, Temporary Wallet |
| **Data** | Dexie `OdysseyDB`, 6 tables, compound indexes, UTC timestamps |
| **Native** | Kotlin bridge (34 methods), Live Wallpaper Service, hourly + boot workers, cadence notifications, in-place APK updater via FileProvider |
| **Theming** | `theme-store` / `theme-provider` / `theme-switcher`, anti-FOUC script, light/dark/system |
| **Tests** | Vitest + fake-indexeddb, 8 suites, all green (exceeds the P0-T5 target of 5) |
| **Release** | v1.3.6, `versionCode` 11, live on Vercel with APK at `/downloads/odyssey-latest.apk` |

### 2.2 Technical debt register

| ID | Debt | Impact | Priority |
|---|---|---|---|
| **D1** | `android-bridge.ts` ~1000 lines, 34 methods, 3 namespace aliases | Highest god-node (34 edges); any change risks 16 wallpaper controls | High |
| **D2** | `useUserStore` 33 edges — mixes profile, wallet, shop, rank | Split into profile/wallet/inventory | High |
| **D3** | Category union drift + ~50 colour aliases | Every new category feature inherits the mess | High |
| **D4** | `theme-store.initTheme()` added a `matchMedia` listener with no cleanup | Leak; multiplies if called more than once | **Fixed** |
| **D5** | Planner/journey/stats bypass Zustand, read `db` directly | Two data-access styles | Medium |
| **D6** | Knowledge graph stale — built from `efa7dc9a` | Run `graphify update .` before impact analysis | Medium |
| **D7** | No test suite | **Fixed** — 8 suites now exist | ~~High~~ |
| **D8** | `seedInitialData()` empty function, 2 call sites | Dead code | Low |
| **D9** | Dual XP accounting: profile XP vs Temporary Wallet XP | Double-claim risk — specified in `docs/adr/0001-reward-economy.md` | High |

---
## 3. PHASE 1 — Small things, polish, micro-interactions, stabilise

Everything here is small (30 min – 4 hrs each) and ships independently. Do these
first: cheap, de-risks later phases, and several are correctness bugs.

### 3.1 Stabilise tasks (carry-over from the old Phase 0)

- [x] **P0-T1** — Land in-flight theme work + fix `matchMedia` leak. `SHIPPED` · src: `DEVELOPMENT_PLAN.md §4 L272`
- [ ] **P0-T2** — Refresh knowledge graph (`graphify update .`). `NOT BUILT` · src: `DEVELOPMENT_PLAN.md §4 L273`
- [ ] **P0-T3** — Category normalisation: promote `normalizeCategory()` to a shared util, narrow the union, document alias retirement. `PARTIAL` — cleanup landed the helper, but the type is still dual-case and `habit-colors.ts` still carries ~50 aliases · src: `DEVELOPMENT_PLAN.md §4 L274`, `§2.5 L135`
- [x] **P0-T4** — Specify reward economy (closes D9). `SHIPPED` · src: `docs/adr/0001-reward-economy.md`
- [x] **P0-T5** — First tests. `SHIPPED` — 8 suites · src: `DEVELOPMENT_PLAN.md §4 L276`
- [ ] **P0-T6** — Native bridge adapter pattern (closes D1). `NOT BUILT` · src: `DEVELOPMENT_PLAN.md §4 L277`
- [ ] **P0-T7** — Remove dead code `seedInitialData()` (D8). `NOT BUILT` · src: `DEVELOPMENT_PLAN.md §4 L278`
- [ ] **DEBT** — D2 split `useUserStore`; D5 unify data access; D6 refresh graph. `NOT BUILT` · src: `DEVELOPMENT_PLAN.md §3.3 L217`

### 3.2 Known defects found by audit (fix before new features)

- [ ] **BUG-1** — Category colour defined 3× independently; the wallpaper imports `habit-colors.ts` **zero** times, so a category can be green in-app and amber on the lockscreen. `NOT BUILT` · src: `wallpaper-generator.ts:506` `getCatDetails()`, `planner/page.tsx:552` `getCatStyle()`, canonical `habit-colors.ts`
- [ ] **BUG-2** — 24-hour spectrum contradiction: generator draws it (`wallpaper-generator.ts:386`), preview says removed (`wallpaper-preview.tsx:253`). `PARTIAL` · see **C2**
- [x] **BUG-3** — `initTheme()` `matchMedia` listener without cleanup. `SHIPPED` · src: `DEVELOPMENT_PLAN.md §3.3 L224`

### 3.3 Micro polish — Tier 1 (30 min – 2 hrs each)

src for all: `MASTER_TODO_REVISED.md §19 L959–977`

- [ ] **M1** — Local-first trust badge. `NOT BUILT` · also: `A8`
- [ ] **M2** — Habits page empty state. `NOT BUILT` · also: `A8`
- [ ] **M3** — Planner empty state "clean slate". `NOT BUILT` · also: `A8`
- [ ] **M4** — All-habits-done celebration card (+50 XP). `NOT BUILT`
- [ ] **M5** — Creation confirmation toast naming first milestone. `NOT BUILT` · also: `B15`
- [ ] **M6** — First-open welcome banner (3 pillars). `NOT BUILT` · also: `A8`
- [ ] **M7** — "Last done: Today at 8:15 AM" subtitle. `NOT BUILT` · also: `B15`
- [ ] **M8** — Daily capacity indicator. `NOT BUILT` · also: `C5`
- [ ] **M9** — Sticky completion fraction header. `PARTIAL` — renders, not sticky · also: `C4`
- [ ] **M10** — Wallpaper completion gauge. `NOT BUILT` · → **Phase 5** · also: `G2`
- [ ] **M11** — Time-period colour accents. `NOT BUILT` · also: `C1`
- [ ] **M12** — "Up next in 35 min" ticker. `PARTIAL` — nextBlock computed, no ticker · also: `C4`
- [ ] **M13** — Warm microcopy across toasts/counters. `NOT BUILT`
- [ ] **M14** — Unique rank level-up dialogs (9 ranks). `NOT BUILT`
- [ ] **M15** — Achievement unlock micro-narratives. `NOT BUILT`
- [ ] **M16** — Onboarding goal category tags. `NOT BUILT` · → **Phase 2** · also: `A1`
- [ ] **M17** — AI processing orbital loader. `NOT BUILT` · also: `A6`
- [ ] **M18** — Tip jar / coffee button. `NOT BUILT` · → **Phase 3** · also: `F11`

---
### 3.4 Small enhancements — Tier 2 (2–4 hrs each)

src: `MASTER_TODO_REVISED.md §19 L979–1006`

- [ ] **S1** — Per-habit streak flames. `PARTIAL` — flame present · also: `E2`
- [ ] **S2** — Habit priority tags. `NOT BUILT` · → **Phase 2** · also: `B9`
- [ ] **S3** — Energy level indicators. `NOT BUILT` · → **Phase 2** · also: `B9`
- [ ] **S4** — Habit cue/trigger field. `NOT BUILT` · → **Phase 2** · also: `B8`
- [ ] **S5** — Habit reward field. `NOT BUILT` · → **Phase 2** · also: `B8`
- [ ] **S6** — Identity statement field. `NOT BUILT` · → **Phase 2** · also: `B8`, `G4`
- [ ] **S7** — Habit "Why" purpose statement. `NOT BUILT` · → **Phase 2** · also: `B8`
- [ ] **S8** — 2-minute emergency version. `NOT BUILT` · → **Phase 2** · also: `B12`
- [ ] **S9** — Break bad habits / Quit mode. `NOT BUILT` · → **Phase 2** · also: `B3`
- [ ] **S10** — Multi-colour date completion rings. `PARTIAL` — rings exist, not segmented · also: `B5`
- [ ] **S11** — Swipe-right to complete gesture. `NOT BUILT` · → **Phase 2** · also: `B4`
- [ ] **S12** — Swipe-left action drawer. `NOT BUILT` · → **Phase 2**
- [ ] **S13** — Inline numeric stepper for measurable habits. `NOT BUILT` · → **Phase 2** · also: `B3`
- [ ] **S14** — Tap-and-hold commitment ritual. `NOT BUILT` · also: `A5`
- [ ] **S15** — Horizontal day-swipe navigation. `NOT BUILT` · → **Phase 2** · also: `C1`
- [x] **S16** — Current-time indicator line. `SHIPPED` · also: `C1`
- [ ] **S17** — Buffer gap visualiser. `NOT BUILT` · → **Phase 2** · also: `C5`
- [ ] **S18** — Planned duration auto-calculator. `PARTIAL` — field exists · also: `C2`
- [ ] **S19** — Keystone habit pinning. `NOT BUILT` · → **Phase 2** · also: `B10`
- [ ] **S20** — Today's Highlight pinning. `NOT BUILT` · → **Phase 2** · also: `B10`
- [ ] **S21** — "Eat That Frog" morning bonus. `NOT BUILT` · → **Phase 2** · also: `B10`
- [ ] **S22** — Hero unlogged-habit position. `PARTIAL` — sorts first · also: `G2`
- [ ] **S23** — Week-over-week delta card. `NOT BUILT` · → **Phase 2** · also: `E4`
- [ ] **S24** — Streak milestone popups. `NOT BUILT` · → **Phase 2** · also: `E3`
- [ ] **S25** — Daily morning energy check-in. `NOT BUILT` · → **Phase 2** · also: `E6`

### 3.5 Cross-surface consistency (Phase 0 carry-over)

- [ ] **CONS-1** — Habit colour + period must match across card, date strip, planner and wallpaper. `PARTIAL` — category casing unified; colour mapping still triplicated (**BUG-1**) · src: `MASTER_TODO_REVISED.md §8 L510`, `§15.4 L763`
- [ ] **CONS-2** — Narrow-screen sweep across all 5 main surfaces. `PARTIAL` — only `sm:` breakpoints in use, no `md:`; 4 fixed pixel widths remain · src: `MASTER_TODO_REVISED.md §8 L510`
- [x] **CONS-3** — Navigation reachability. `SHIPPED` — all 5 nav destinations resolve; `/profile` correctly excluded as a dead route

**Phase 1 exit gate:** `tsc`/`lint`/`test`/`build` clean; BUG-1 fixed; P0-T6 adapter landed; no uncommitted work.

---
## 4. PHASE 2 — Real feature work added to the app

The core product. Habits, schedule, focus, stats, reminders. Most of the research
catalogue lands here.

### 4.1 Onboarding & first run — `MASTER_TODO_REVISED.md §5 A L184–200`

- [ ] **A1** — Short goal-based first run (goal picker → 3–4 editable habits → usable plan <60s). `NOT BUILT` — `/` is a circadian landing page, **no `/onboarding` route** · also: `XL14`, `M16`
- [ ] **A2** — Animated walkthrough, one concept per scene, contextual not exhaustive. `NOT BUILT`
- [ ] **A3** — Optional interests/profession, skip-able, never used to obscure price. `NOT BUILT` · also: `HD25`
- [ ] **A5** — Commitment moment (identity line + hold-to-commit). `NOT BUILT` · also: `S14`
- [ ] **A6** — Loading/processing animation instead of blank screens. `NOT BUILT` · also: `M17`
- [ ] **A7** — Just-in-time permission education with animated preview. `NOT BUILT` · also: `D6`
- [ ] **A8** — Welcome / empty states / local-data trust. `PARTIAL` — empty states absent (**M2**, **M3**) · also: `M1`, `M6`
- [ ] **A4** — Optional AI assessment/coach. `NOT BUILT` · → **Phase 7**

### 4.2 Habits — `§5 B L202–232`

- [ ] **B1** — Searchable template library with filters + preview. `NOT BUILT` · also: `HD29`
- [ ] **B2** — Clean create/edit form, core fields first, expandable detail. `PARTIAL` — basic CRUD form exists; no priority/energy/cue/why/identity fields · also: `S4`–`S7`
- [ ] **B3** — Habit types: binary / measurable / avoid / time-limit, type-matched controls + undo. `NOT BUILT` — currently binary only · also: `S9`, `S13`
- [ ] **B4** — Swipe/slide completion with visible button alternative + feedback. `NOT BUILT` · also: `S11`, `S12`
- [ ] **B5** — Stable per-habit colour across card, strip, schedule, wallpaper. `PARTIAL` — see **BUG-1** / **CONS-1** · also: `S10`, `HD5`
- [ ] **B6** — Grid / List / Heatmap view switcher, saved preference. `NOT BUILT` · also: `HD1`
- [ ] **B7** — Challenge-linked habits with preview + confirm. `NOT BUILT`
- [ ] **B8** — Habit motivation fields (note/Why/identity/cue/routine/reward/2-min). `NOT BUILT` · also: `S4`–`S8`
- [ ] **B9** — Priority / energy / context tags with text+icon (never colour alone). `NOT BUILT` · also: `S2`, `S3`
- [ ] **B10** — Keystone / Daily Highlight / Frog, one each per day. `NOT BUILT` · also: `S19`–`S21`
- [ ] **B11** — Habit stacking "After A, do B" + temptation bundles. `NOT BUILT` · also: `HD16`, `HD20`
- [ ] **B12** — Flexible habits, rollover, hardening window. `NOT BUILT` · also: `HD17`
- [ ] **B13** — Pause / archive / inactive review (14-day prompt). `PARTIAL` — freeze exists as a shop item only · also: `HD18`, `HD19`
- [ ] **B14** — Quick-capture inbox/backlog. `NOT BUILT` — schema table `inboxItems` exists, no UI · also: `HD3`
- [ ] **B15** — Completion labels (creation confirm, last-done, own streak). `PARTIAL` · also: `M5`, `M7`

### 4.3 Schedule & planner — `§5 C L234–254`

- [ ] **C1** — Single-day visual timeline, current-time line, period colours. `PARTIAL` — timeline + time line shipped (`S16`); period colours not (`M11`) · also: `S15`, `S16`
- [ ] **C2** — Duration sizing + drag/reschedule + edit modal. `PARTIAL` — drag reschedule shipped; **overlap detection** missing · also: `S18`
- [ ] **C3** — Today at a Glance header (day, done/total, streak, capacity, Start). `NOT BUILT` · also: `M8`, `M9`
- [ ] **C4** — Up Next line + done/total in header and wallpaper. `PARTIAL` — wallpaper NOW/NEXT shipped; no ticker · also: `M12`
- [ ] **C5** — Capacity and buffer warnings (never block saving). `NOT BUILT` · also: `M8`, `S17`
- [ ] **C6** — Availability windows, conflict suggestions, ideal week. `NOT BUILT`
- [ ] **C8** — Morning planning and evening shutdown flows. `PARTIAL` — evening modal exists but is a **nudge, not a ritual** · also: `HD11`, `HD12`
- [ ] **C9** — Reschedule-on-miss + one-tap schedule image share. `NOT BUILT` · also: `HD28`
- [ ] **C7** — Calendar sync. `NOT BUILT` · → **Phase 6**
- [ ] **C10** — Desktop keyboard shortcuts. `NOT BUILT` · → **Phase 6**

---
### 4.4 Focus & digital wellbeing — `§5 D L256–272`

- [ ] **D1** — Full-screen Focus Session with Why, countdown, Mark Complete. `NOT BUILT`
- [ ] **D2** — Timer choices: stopwatch / countdown / Pomodoro layouts. `NOT BUILT` — **no focus timer at all** · also: `HD13`
- [ ] **D3** — Subject/category analytics for sessions. `NOT BUILT`
- [ ] **D5** — Focus Guard nudge, soundscapes, breathing. `NOT BUILT` · also: `HD14`, `HD15`
- [ ] **D8** — Focus start animation (radar/ripple). `NOT BUILT`
- [ ] **D4** — Focus rooms/presence. `NOT BUILT` · → **Phase 4**
- [ ] **D6** — App/site blocking + Study Mode (allow-list YouTube). `NOT BUILT` · → **Phase 6**
- [ ] **D7** — Social unlock with avatar consequences. `NOT BUILT` · → **Phase 3** — see **C4**

### 4.5 Stats & reflection — `§5 E L274–300`

- [x] **E1** — Monthly heatmap. `SHIPPED` — month grid + navigation · also: `HD21` (the 52-week variant is tracked separately)
- [ ] **E2** — Per-habit history/streak separate from global. `PARTIAL` — streak shown, no graph/milestone history · also: `S1`
- [ ] **E3** — Milestones 7/14/30/60/100/365 with unique copy. `NOT BUILT` · also: `S24`
- [ ] **E4** — Weekly comparison/report. `NOT BUILT` · also: `S23`
- [ ] **E5** — Time/day performance by period and weekday. `NOT BUILT` · also: `HD23`, `HD24`
- [ ] **E6** — Optional 1–5 morning energy log. `NOT BUILT` · also: `S25`
- [ ] **E7** — Deep Work hours/target and time allocation. `NOT BUILT` · also: `HD22`
- [ ] **E8** — Goals/habit linking (week/month/year). `NOT BUILT`
- [ ] **E9** — Identity + compound effect projection. `NOT BUILT`
- [ ] **E10** — Parallel Self weekly actual-vs-perfect. `NOT BUILT` · also: `FD7`
- [ ] **E11** — Habit Weather forecast with reasons + uncertainty. `NOT BUILT` · → **Phase 7** · also: `I14`, `FD8`
- [ ] **E12** — Schedule replay + cue latency. `NOT BUILT` · → **Phase 5** · also: `XL15`
- [ ] **E13** — Monthly Essentialism audit (Commit/Pause/Archive). `NOT BUILT` · also: `I20`, `FD11`

### 4.6 Medium implementations — Tier 3 (4–8 hrs each)

src: `MASTER_TODO_REVISED.md §19 L1008–1042`

- [ ] **HD1** — Tri-mode habit view switcher. `NOT BUILT` · also: `B6`
- [ ] **HD2** — Left-rail structured timeline layout. `PARTIAL` — rail exists · src: `§19 L1011`
- [ ] **HD3** — Inbox drawer for unscheduled backlog. `NOT BUILT` · also: `B14`
- [ ] **HD4** — Consistent light theme polish (Lifestack-inspired palette). `PARTIAL` — light mode works; palette not aligned · src: `§15.4 L767`
- [ ] **HD6** — Multi-trigger habit notifications (exact / −5 / −15 / on end). `NOT BUILT`
- [ ] **HD7** — Morning blueprint push 07:00. `NOT BUILT`
- [ ] **HD8** — Evening streak defence alert 20:00. `NOT BUILT`
- [ ] **HD9** — "Never miss twice" alert. `NOT BUILT`
- [ ] **HD10** — Sunday weekly digest. `NOT BUILT`
- [ ] **HD11** — Guided morning planning flow. `NOT BUILT` · also: `C8`
- [ ] **HD12** — Evening shutdown & reflection modal. `PARTIAL` — nudge exists, not a ritual · also: `C8`
- [ ] **HD13** — Contextual Pomodoro engine. `NOT BUILT` — see **D2**
- [ ] **HD14** — Focus audio soundscapes. `NOT BUILT` · also: `D5`
- [ ] **HD15** — Breathing pacer widget (4-7-8 / Box). `NOT BUILT` · also: `D5`
- [ ] **HD16** — Habit stacking chains. `NOT BUILT` · also: `B11`
- [ ] **HD17** — Flexible auto-rollover to next free slot. `NOT BUILT` · also: `B12`
- [ ] **HD18** — Habit vacation/freeze 1–30 days without streak reset. `PARTIAL` — shop item only · also: `B13`
- [ ] **HD19** — Auto-archive inactive habits (14+ days). `NOT BUILT` · also: `B13`
- [ ] **HD20** — Temptation bundling tag. `NOT BUILT` · also: `B11`
- [ ] **HD21** — 52-week annual heatmap. `NOT BUILT` · also: `E1`
- [ ] **HD22** — Deep work hour accumulator. `NOT BUILT` · also: `E7`
- [ ] **HD23** — Time-of-day performance graph. `NOT BUILT` · also: `E5`
- [ ] **HD24** — Best vs worst day analysis. `NOT BUILT` · also: `E5`
- [ ] **HD29** — Searchable template library. `NOT BUILT` · also: `B1`
- [ ] **HD30** — Sequenced routine runner with audio cues. `NOT BUILT`
- [ ] **HD5** — Habit & category colour picker. `NOT BUILT` · → **Phase 3** · also: `B5`
- [ ] **HD28** — Shareable timetable image exporter. `NOT BUILT` · also: `C9`
- [ ] **HD25** — Profession-tailored onboarding + paywall. `NOT BUILT` · → **Phase 6** · also: `A3`
- [ ] **HD26** — Modular feature pricing. `NOT BUILT` · → **Phase 6**
- [ ] **HD27** — 7-day trial conversion hook. `NOT BUILT` · → **Phase 6**

**Phase 2 exit gate:** onboarding route live; habit types beyond binary; focus timer working; capacity warnings non-blocking.

---
## 5. PHASE 3 — Avatar, customisation, shop

Progression, identity, cosmetics and the economy around them.

### 5.1 Gamification & avatar catalogue — `MASTER_TODO_REVISED.md §5 F L302–324`

- [ ] **F1** — Existing progression (XP/ranks/thresholds, rank messages, avatar scenes). `PARTIAL` — XP + 9 ranks shipped; unique rank dialogs missing (`M14`) · also: `M14`, `FD4`
- [ ] **F2** — Achievement badge wall with visible conditions + earned date. `NOT BUILT` · also: `M15`, `FD1`
- [ ] **F3** — Completion celebration (confetti, warm copy, first-day card). `PARTIAL` — confetti exists; no first-day card · also: `M4`
- [ ] **F4** — Chapters and seasonal items (30-day arcs, themed packs). `NOT BUILT` · also: `FD3`, `G10`
- [ ] **F5** — Avatar/pet/skills with grouped inventory. `NOT BUILT` · also: `XL1`
- [ ] **F6** — Avatar house/world reacting to real follow-through. `NOT BUILT` — *the stated original differentiator* · also: `XL1`, `XL2`
- [ ] **F7** — User-defined real-world reward shop, separate from cosmetics. `NOT BUILT` · also: `J6`
- [ ] **F8** — Streak shield and recovery. `PARTIAL` — purchasable shield shipped; no earned grace shield · also: `FD2`
- [ ] **F9** — Marketplace for user-made items. `NOT BUILT` · → **Phase 6** · also: `SC7`
- [ ] **F10** — Cash out virtual currency. `NOT APPROVED` — *explicitly not a product commitment*; needs funding, fraud, payment, legal review · src: `§5 F L322`
- [ ] **F11** — Developer coffee support tile. `NOT BUILT` · also: `M18`

### 5.2 Avatar world & flagship items — `§19 Tier 5 L1067–1083`

- [ ] **XL1** — Interactive avatar living room engine. `NOT BUILT` · also: `F6`
- [ ] **XL2** — Dynamic furniture habit sync (bookshelf, desk, plants, eggs). `NOT BUILT` · also: `F6`
- [ ] **XL3** — Room themes & background environments. `NOT BUILT` · also: `F6`
- [ ] **XL4** — Avatar nudge engine (dialogue bubbles). `NOT BUILT` · also: `F6`
- [ ] **XL7** — Avatar health damage (hardcore mode). `NOT BUILT` · `GATED` — see **C4** · also: `D7`
- [ ] **HD5** — Habit & category colour picker (preserve violet brand accent). `NOT BUILT` · also: `B5`, `§15.4 L767`

### 5.3 Economy correctness (must precede shop expansion)

- [x] **D9** — Dual XP accounting (profile vs Temporary Wallet). `SHIPPED` — specified in `docs/adr/0001-reward-economy.md`; **implementation still to verify** · src: `DEVELOPMENT_PLAN.md §3.3 L229`
- [ ] **ECON-1** — `useUserStore` split into profile / wallet / inventory slices (D2). `NOT BUILT` · src: `DEVELOPMENT_PLAN.md §3.3 L222`
- [ ] **ECON-2** — XP curve: live is flat 500/level; research proposes `100 × L^1.5`. `DEFERRED` — flat curve ships for v1.4, curve change is a **v2.0 migration**. See **C3** · src: `DEVELOPMENT_PLAN.md §2.7 L158`

**Phase 3 exit gate:** avatar room live; badge wall populated; inventory grouped and explained; XP double-claim impossible.

---
## 6. PHASE 4 — Social tab

⚠️ **This is the first phase that breaks local-first.** It requires a backend,
accounts, moderation and a Play Store UGC compliance review. See contradiction
**C1** for the ordering risk this phase carries.

### 6.1 Social catalogue — `MASTER_TODO_REVISED.md §5 H L354–370`

- [ ] **H1** — Profiles/privacy with granular per-field and per-habit visibility. `NOT BUILT` · `GATED`
- [ ] **H2** — Share habits/templates with preview + import control. `NOT BUILT` · `GATED` · also: `SC4`
- [ ] **H3** — Activity feed, comments, high-fives, rate-limited nudges. `NOT BUILT` · `GATED` · also: `SC3`
- [ ] **H4** — Community challenges with noncompetitive route. `NOT BUILT` · `GATED` · also: `SC5`
- [ ] **H5** — Focus presence/leaderboard. `NOT BUILT` · `GATED` · also: `D4`, `XL8`, `XL10`
- [ ] **H6** — Discover/milestones feed. `NOT BUILT` · `GATED`
- [ ] **H7** — Team/calendar collaboration. `NOT BUILT` · → **Phase 6** · also: `SC9`

### 6.2 Social matrix — `§19 Phase 5 L1119–1131`

- [ ] **SC1** — Public user profile with trophy shelf + heatmap. `NOT BUILT` · `GATED` · also: `H1`
- [ ] **SC2** — Friend system & following with privacy controls. `NOT BUILT` · `GATED`
- [ ] **SC3** — Social comments & high-fives. `NOT BUILT` · `GATED` · also: `H3`
- [ ] **SC4** — One-tap routine sharing links. `NOT BUILT` · `GATED` · also: `H2`
- [ ] **SC5** — Community challenge squads + leaderboards. `NOT BUILT` · `GATED` · also: `H4`
- [ ] **SC6** — Squad habit heatmap. `NOT BUILT` · `GATED`
- [ ] **SC8** — Real-world impact rewards (charity/tree planting). `NOT BUILT` · `GATED` — not approved, see **C5**
- [ ] **SC9** — External calendar 2-way sync. `NOT BUILT` · → **Phase 6**
- [ ] **SC10** — Wear OS companion. `NOT BUILT` · → **Phase 6**
- [ ] **SC7** — Marketplace for item/skin trading. `NOT BUILT` · → **Phase 6** · also: `F9`

### 6.3 Live-social items relocated from the gamification phase

src: `MASTER_TODO_REVISED.md §19 Tier 5` — these sat under "Gamification" but are
social features.

- [ ] **XL8** — Live social focus counter ("142 students focusing now"). `NOT BUILT` · `GATED` · also: `H5`
- [ ] **XL9** — Radar sweep when entering study rooms. `NOT BUILT` · `GATED`
- [ ] **XL10** — Live focus leaderboard. `NOT BUILT` · `GATED` · also: `H5`
- [ ] **XL11** — Study-room audio sync + squad Pomodoro. `NOT BUILT` · `GATED`

### 6.4 Social gate checklist — must clear **before** any user can publish

src: `DEVELOPMENT_PLAN.md §4 L405–410`

- [ ] **GATE-1** — Families Policy compliance confirmed if children are in the declared audience. `NOT BUILT`
- [ ] **GATE-2** — UGC Policy: moderation, ToS, reporting, blocking confirmed. `NOT BUILT`
- [ ] **GATE-3** — Guardian controls and age-band design agreed. `NOT BUILT`
- [ ] **GATE-4** — Per-region legal review (data residency, DPDP Act if India launch). `NOT BUILT`

**Hard rules:** everything opt-in with granular per-field visibility. Sharing
previews exactly what the recipient sees. No anonymous stranger chat. No unsolicited
adult-to-minor DMs. Reporting, blocking and moderation ship **with** the feature.

**Phase 4 exit gate:** all four GATE items implemented *before* any user can publish content.

---
## 7. PHASE 5 — Wallpaper and widgets

Odyssey's **core differentiator** — the product is defined by it
(`MASTER_TODO_REVISED.md §1 L13, L19`). The engine already ships; this phase deepens it.

### 7.1 Wallpaper catalogue — `§5 G L326–352`

- [x] **G1** — Schedule wallpaper with current hour + done/upcoming blocks. `SHIPPED` — live engine + static updater + isolated lock/home photos · also: `G12`
- [x] **G2** — Current/next priority, incomplete before complete, fraction visible. `SHIPPED` — `currentBlock`/`nextBlock` computed · also: `M10`, `S22`
- [ ] **G3** — Habit-state cue: Prep → Active → Done appearance. `NOT BUILT` · also: `FD15`
- [ ] **G4** — Identity line during the habit's window. `NOT BUILT` · also: `S6`, `FD16`
- [ ] **G5** — Schedule palette / energy gradient (sunrise→midday→sunset). `NOT BUILT` · also: `§12 L633`
- [ ] **G6** — Decay/recharge desaturation, **default off until validated**. `NOT BUILT` · also: `FD17`
- [ ] **G7** — Ghost schedule overlay (planner-first; wallpaper may be too dense). `NOT BUILT` · also: `FD19`
- [ ] **G8** — Themes/countdown styles with preview before applying. `NOT BUILT`
- [ ] **G9** — Life Week theme (weeks lived/remaining, approximate + dismissible). `NOT BUILT` · also: `FD13`
- [ ] **G10** — Chapter covers (chapter number, top habit, best streak). `NOT BUILT` · also: `F4`, `FD3`
- [ ] **G11** — Shareable replay/template export. `NOT BUILT` · also: `E12`, `HD28`
- [ ] **G12** — Duration-weighted spectrum + live countdown. `PARTIAL` — spectrum drawn but **not duration-weighted**; contradiction **C2** · also: `G1`
- [ ] **G13** — Wallpaper-exclusive cues, user-controlled and readable. `NOT BUILT`

### 7.2 Wallpaper state items (relocated from the gamification phase)

src: `MASTER_TODO_REVISED.md §19 Tier 4 L1061–1065` — these sat under "Behavioral
Systems" but are wallpaper features.

- [ ] **FD15** — Wallpaper dynamic state transitions (Pre-Warning → Active Glow → Completed Dim). `NOT BUILT` · also: `G3`
- [ ] **FD16** — Live identity statement on lock screen. `NOT BUILT` · also: `G4`
- [ ] **FD17** — Wallpaper neglect decay mode (3-day desaturation). `NOT BUILT` · also: `G6`
- [ ] **FD18** — Circadian sky gradient background. `NOT BUILT` · also: `G5`
- [ ] **FD19** — Ghost schedule overlay. `NOT BUILT` · also: `G7`

### 7.3 Widgets & ambient surfaces

- [ ] **XL12** — Android Glance home-screen widgets (2×2 and 4×1). `NOT BUILT` · src: `§12 L606`
- [ ] **XL13** — Persistent notification-shade progress HUD. `NOT BUILT` · src: `§12 L607`
- [ ] **XL15** — Daily schedule replay video generator. `NOT BUILT` · → shared with Phase 2 · also: `E12`, `G11`

⚠️ **Battery gate.** Wallpaper, widgets and shade HUD all run while the app is
closed. Step 5 of the workflow applies in full: each needs a documented wake
source, a **default-off** flag, a route guard as well as hidden UI, and a defined
"what happens when the user turns it off". The existing wallpaper master switch
(`P8-E1`) is the reference pattern.

**Phase 5 exit gate:** spectrum contradiction resolved (**C2**); widgets default-off with route guards; decay/decoration features behind explicit opt-in.

---
## 8. PHASE 6 — Polish, non-AI Pro, third-party integrations

### 8.1 Monetisation — `§5 J L420–432`

- [ ] **J1** — Useful free plan (core schedule/habits/progress/wallpaper, no forced trial). `PARTIAL` — app is entirely free today; no trial exists · src: `PRODUCTION_PLAN.md §6 L153`
- [ ] **J2** — Clear paid value: feature, problem, example, period, trial, cancellation, charge date. `NOT BUILT` · `GATED`
- [ ] **J3** — Modular plans vs full bundle with real totals shown. `NOT BUILT` · `GATED` · also: `HD26`
- [ ] **J4** — Personalise examples, never hide terms. `NOT BUILT` · also: `A3`, `HD25`
- [ ] **J5** — Trial timing (deliver value before offering trial). `NOT BUILT` · also: `HD27`
- [ ] **J6** — Separate shop economies (earned vs paid cosmetics vs real-world rewards). `NOT BUILT` · also: `F7`

**Constraint:** one Pro subscription, monthly and annual. **No token packs, no
per-module passes, no real-money trading.** Core habits, schedule, completion and
graphs stay free.

### 8.2 Third-party integrations

- [ ] **C7** — Calendar sync: read-only overlay first, then two-way. `NOT BUILT` · also: `SC9`, `§12 L659`
- [ ] **SC9** — Google/Outlook two-way sync with conflict handling. `NOT BUILT`
- [ ] **SC10** — Wear OS companion app. `NOT BUILT` — *separate platform project* · src: `§12 L608`
- [ ] **D6** — App/site blocking + Study Mode. `NOT BUILT` — needs Accessibility/UsageStats · also: `XL5`, `XL6`
- [ ] **XL5** — App & website blocker integration. `NOT BUILT` · `GATED` — see **C4**
- [ ] **XL6** — Task-unlock gate (complete habit to open blocked app). `NOT BUILT` · `GATED` · also: `D7`
- [ ] **INT-1** — Screen-time dashboard (time by app/category + trends). `NOT BUILT` · src: `§12 L656`
- [ ] **INT-2** — Routine voice transitions for timer-guided stacks. `NOT BUILT` · src: `§12 L657`
- [ ] **SC7** — Cosmetic marketplace (needs moderation, ownership, fraud, economy rules). `NOT BUILT` · `GATED` · also: `F9`
- [ ] **C10** — Desktop keyboard shortcuts. `NOT BUILT` — additive, web-only

### 8.3 Polish, hardening & behavioural systems

src: `MASTER_TODO_REVISED.md §19 Tier 4 L1046–1065`

- [ ] **FD1** — 24-badge achievement system. `NOT BUILT` · also: `F2`
- [ ] **FD2** — Non-punitive streak recovery screen. `NOT BUILT` · also: `F8`
- [ ] **FD3** — Monthly seasons & chapter passes. `NOT BUILT` — *bundles wallpaper + cosmetic rewards; see **C6*** · also: `F4`, `G10`
- [ ] **FD4** — Rank-up cinematic avatar entry. `NOT BUILT` · also: `F1`
- [ ] **FD5** — Habit SIP auto-scaling after 14×100%. `NOT BUILT` · also: `I9`
- [ ] **FD6** — Habit Resonance card visuals (new→glow→gold→diamond). `NOT BUILT` · src: `§12 L618`
- [ ] **FD7** — Parallel Self projection. `NOT BUILT` · also: `E10`
- [ ] **FD8** — Habit Weather daily forecast. `NOT BUILT` · → **Phase 7** · also: `E11`
- [ ] **FD9** — Compound effect visualiser. `NOT BUILT` · also: `E9`
- [ ] **FD10** — Minimum Viable Habit (MVH) emergency switch. `NOT BUILT` · src: `§12 L614`
- [ ] **FD11** — Monthly essentialism audit. `NOT BUILT` · also: `E13`
- [ ] **FD12** — Habit debt clearing system. `NOT BUILT` · src: `§12 L622` — **keep optional, capped, non-compounding; consider excluding from v1**
- [ ] **FD13** — Memento Mori / Life Weeks dot grid. `NOT BUILT` · also: `G9`
- [ ] **FD14** — Decision Fatigue Triage mode (collapse to one active task). `NOT BUILT` · src: `§12 L631`
- [ ] **XL14** — Interactive landing & onboarding. `NOT BUILT` — → **Phase 2** as `A1`
- [ ] **POL-1** — Battery/render hardening: default-off background features, render cost. `PARTIAL` — wallpaper master switch shipped (`P8-E1`); 29 `backdrop-blur` surfaces remain on the planner · src: `inefficiencies.md`, `DEVELOPMENT_PLAN.md §4 P8`

### 8.4 Habit-science extras — `§12 L637–644`

- [ ] **SCI-1** — Personal affirmations (1–3 saved, optional display). `NOT BUILT`
- [ ] **SCI-2** — Visualization prompt (what a good day looks like). `NOT BUILT`
- [ ] **SCI-3** — Intentional "not doing" list (private, distinct from anti-habits). `NOT BUILT`
- [ ] **SCI-4** — Pay-yourself-first scheduling. `NOT BUILT`
- [ ] **SCI-5** — Soft active-habit limit suggestion (never a hard cap). `NOT BUILT`
- [ ] **SCI-6** — Weekly Mind Sweep capture into inbox. `NOT BUILT`
- [ ] **SCI-7** — Habit recommendation engine (curated mappings first). `NOT BUILT` · → **Phase 7** · also: `I22`
- [ ] **SCI-8** — Mood logging (exploratory, lower confidence, no diagnosis). `NOT BUILT`

**Phase 6 exit gate:** free/Pro difference understandable; purchase+restore work; core usable without a trial; integrations behind explicit permission.

---
## 9. PHASE 7 — AI

**Everything in this phase is `NOT BUILT`. Zero AI code exists today.**
Build in this order: local deterministic rules → statistical patterns → LLM last.

### 9.1 Tier A — Local deterministic rules (zero cost, 100% offline)

src: `MASTER_TODO_REVISED.md §19 L1088–1100`

- [ ] **AI-1** — Period completion probability at habit creation. `NOT BUILT` · also: `I1`
- [ ] **AI-2** — Overcommitment warning engine (>50% above 14-day average). `NOT BUILT` · also: `I2`
- [ ] **AI-3** — Persistent weak-day detection. `NOT BUILT` · also: `I3`
- [ ] **AI-4** — Energy-slot conflict alert. `NOT BUILT` · also: `I4`
- [ ] **AI-5** — Schedule collision resolver. `NOT BUILT` · also: `I5`, `C6`
- [ ] **AI-6** — Optimal time learner (~30 days). `NOT BUILT` · also: `I6`
- [ ] **AI-7** — Automated weekly progress narrative (templated). `NOT BUILT` · also: `I7`
- [ ] **AI-8** — Dynamic streak recovery path. `NOT BUILT` · also: `I8`, `FD2`
- [ ] **AI-9** — Smart auto-reschedule on miss. `NOT BUILT` · also: `I10`
- [ ] **AI-10** — Weekly routine optimizer. `NOT BUILT` · also: `I11`
- [ ] **AI-11** — Monthly habit pruning recommendations. `NOT BUILT` · also: `I20`, `E13`

### 9.2 Tier B — Statistical ML / correlation (local math)

src: `MASTER_TODO_REVISED.md §19 L1101–1107`

- [ ] **AI-12** — Habit catalyst correlation detector. `NOT BUILT` · also: `I12`
- [ ] **AI-13** — Energy-performance correlation. `NOT BUILT` · also: `I13` ⚠️ **ID collision — see C7**
- [ ] **AI-14** — Predictive day completion forecast. `NOT BUILT` · also: `I14`, `E11`, `FD8`
- [ ] **AI-15** — Habit time-drift detector. `NOT BUILT` · also: `I15`
- [ ] **AI-16** — Burnout early warning (20% velocity drop / 14 days). `NOT BUILT` · also: `I16`

### 9.3 Tier C — Natural language & LLM coaching (cloud/hybrid)

src: `MASTER_TODO_REVISED.md §19 L1108–1116`

- [ ] **AI-17** — Natural-language habit creation. `NOT BUILT` · also: `I17`
- [ ] **AI-18** — Natural-language schedule command. `NOT BUILT` · also: `I17`
- [ ] **AI-19** — Conversational AI onboarding profiler. `NOT BUILT` · also: `A4`, `I18`
- [ ] **AI-20** — AI habit & routine architect (multi-week blueprints). `NOT BUILT`
- [ ] **AI-21** — Personalized AI weekly coach narrative. `NOT BUILT` · also: `I22`
- [ ] **AI-22** — Habit recommendation engine. `NOT BUILT` · also: `I22`, `SCI-7`
- [ ] **AI-23** — Dynamic conversational personality profiler. `NOT BUILT` · also: `I19`
- [ ] **I21** — Wallpaper theme suggestion (never change silently). `NOT BUILT` · also: `G8`

**Non-negotiable AI rules** (`§5 I L374`): require sufficient history, explain the
evidence, and let users dismiss or correct. Never auto-change a habit, never block
saving, never diagnose, describe correlation rather than causation. If chat claims
to create or edit items, it must actually do so.

**Phase 7 exit gate:** Tier A+B shipping offline with explanations; no dark patterns; LLM features clearly optional.

---
## 10. CONTRADICTIONS LOG

Open items the owner must resolve. **Do not implement a feature listed here until
it is resolved.**

### C1 — Social ships before AI (phase-order conflict) · **OPEN**

- **This file** places Social at Phase 4, AI at Phase 7.
- `DEVELOPMENT_PLAN.md §2.3 L94` resolved the opposite: **"AI ships before Social"**,
  recorded as *"an intentional deviation from `PRODUCTION_PLAN.md`, so nobody
  'fixes' it."*
- **Their reason:** Tier A/B AI is deterministic local math over Dexie — no backend,
  no accounts, no moderation, no legal surface. Social needs accounts, a backend,
  moderation tooling, reporting/blocking, and Google Play UGC + Families policy
  compliance.
- **Risk of the chosen order:** social without moderation and UGC compliance is a
  store-rejection risk, and it breaks local-first earlier than necessary.
- **Decision:** this file follows the owner's ordering (social at Phase 4). Recorded
  so the tradeoff stays visible. **Confirm before starting Phase 4.**

### C2 — 24-hour spectrum bar: draw or drop? · **OPEN**

- `wallpaper-generator.ts:386` draws a 24-hour spectrum bar with a "now" needle.
- `wallpaper-preview.tsx:253` carries a comment saying it was **removed** — it
  competed with the clock and *"at phone width the strip compressed to an unreadable
  sliver."*
- Only one surface was changed, so preview and generator disagree.
- **Options:** (a) keep everywhere and fix the narrow-width squeeze — preserves the
  research feature, closes the original complaint; (b) drop everywhere — one delete,
  loses a feature the research treats as core.
- **Interacts with `G12`**, which additionally wants duration-weighting.

### C3 — XP curve: flat vs exponential · **RESOLVED, deferred**

Live code is `level = floor(xp / 500) + 1`. `MASTER_TODO_REVISED.md §21` proposes
`100 × L^1.5`. **Flat curve ships for v1.4**; the change is a **v2.0 migration** with
an XP-recalculation utility. Tracked as **ECON-2**.

### C4 — Avatar damage vs the non-shame principle · **OPEN**

- `D7` / `XL7` propose avatar HP loss (and, in one variant, avatar death losing
  user-owned customisations).
- The research itself flags this as **conflicting**: *"These are conflicting punitive
  implementations. Preserve them as proposed variants only."*
- **Required before building:** opt-in, visible damage meter, advance warning,
  recovery/shield, **no destruction of paid or user-owned items**, clear disable path.

### C5 — Cash out / real-money features · **NOT APPROVED**

`F10` (cash out virtual currency) and `SC8` (charity rewards) are explicitly not
product commitments. They need sustainable funding, fraud controls, payment
handling and separate legal/financial review. **Do not promise or build these.**

### C6 — FD3 bundles two phases · **OPEN**

`FD3` (Monthly Seasons & Chapter Passes) grants *"exclusive wallpaper **and** cosmetic
rewards"* — it spans Phase 3 (avatar/customisation) and Phase 5 (wallpaper). Needs
splitting or an explicit owner decision.

### C7 — `AI-n` ID collision · **RESOLVED**

`AI_TODO.md` and `MASTER_TODO_REVISED.md` **both use `AI-n` with different meanings**
(e.g. `AI-1`, `AI-13`). **`MASTER_TODO_REVISED.md` IDs are canonical.** `AI_TODO.md`
and `TODO.md` are frozen archives — never cite an `AI-n` ID without the
MASTER_TODO_REVISED definition attached. src: `DEVELOPMENT_PLAN.md §2.1 L67`

### C8 — Schema proposal vs live schema · **RESOLVED**

`MASTER_TODO_REVISED.md §20.1` proposes a new `Habit` schema that **does not match
the live one** (`title` vs `name`, `streakCurrent` vs `currentStreak`).
**The live `src/lib/db.ts` is the schema.** New fields are added by **additive
migration**; never adopt §20.1 wholesale. Any deviation needs an ADR in
`docs/adr/`. src: `DEVELOPMENT_PLAN.md §2.4 L106`

### C9 — Checkboxes are unreliable as status · **RESOLVED**

Every research checkbox is `- [ ]` (452 total, **zero ticked**), yet Phase 1 shipped
via git without ticking any. **Status lives only in this file.**
src: `DEVELOPMENT_PLAN.md §2.8 L167`

---
## 11. SOURCE DOCUMENT INDEX

| Document | Role | Authority |
|---|---|---|
| **`main_plan.md`** (this file) | Order, priority, status | **CANONICAL** |
| `DEVELOPMENT_PLAN.md` | Engineering conventions §5, workflow §6, risks §7 | **CANONICAL for HOW** |
| `Market Research/MASTER_TODO_REVISED.md` | 140-item catalogue §5, matrix §19, schemas §20 | Reference — full specs |
| `Market Research/PRODUCTION_PLAN.md` | Phase 0–7 framing, exit gates | Reference — superseded on conflict |
| `Market Research/PHASE_0_AUDIT_REPORT.md` | Verified-vs-assumed audit | Reference — **factual error: says Next.js 14; app is 16.3.5** |
| `Market Research/TODO.md` | Older non-AI list | **SUPERSEDED** archive |
| `Market Research/AI_TODO.md` | Older AI list | **SUPERSEDED** archive — ⚠️ ID collision, see C7 |
| `Market Research/MASTER_TODO.md` | Older combined list | **SUPERSEDED** archive — despite its title, it is **not** the single source of truth |
| `Market Research/App_Reviews.md`, `Review_Analysis.md`, `UI_UX_review.md` | Competitor evidence | Evidence only |
| `Market Research/Habit Research/`, `Schedule Research/` | Habit science, competitor tables | Evidence only |
| `Market Research/Apps Videos/` | 15 competitor recordings | Local only — **git-ignored** (265 MB) |

### Superseded archives — how to reference them

`MASTER_TODO_REVISED.md §5` deduplicates `TODO.md`, `AI_TODO.md`, the habit and
schedule feature lists, `integration_roadmap.md`, `books_brainstorm_and_habits.md`,
`Review_Analysis.md` and `App_Reviews.md`. **Every feature they describe already
appears above under its canonical ID.** Do not implement an archive item separately
— find its canonical ID here and use that.

If you find an archive feature with **no** canonical equivalent, it is genuinely
new: **add it to this file first**, then implement it.

### Coverage note

This file enumerates the canonical catalogue (`§5 A–J`, 113 items) plus the
production matrix (`§19`, 140 items), consolidating to ~250 unique features. Items
appearing in two places are linked with `also:` rather than duplicated. The three
superseded archives contribute no features that are absent above.

---

## 12. CHANGELOG

| Date | Change |
|---|---|
| 2026-10-05 | **Created.** Migrated the status record from `DEVELOPMENT_PLAN.md` §3 (reconciled against `6b42b74`); consolidated all six backlog docs into the 7 owner-defined phases; recorded 9 contradictions (4 open). Market Research docs un-ignored so they are tracked. |
| 2026-10-05 | **Propagated the new rules across all docs.** `AGENTS.md` now mandates `main_plan.md` first (status rule, code-beats-docs, battery question added as non-negotiables); `.clinerules` gained a §0 Source of Truth section; `FEATURES.md` dropped its "canonical status of record" claim; `MASTER_TODO_REVISED`, `PRODUCTION_PLAN`, `MASTER_TODO`, `TODO`, `AI_TODO` and `PHASE_0_AUDIT_REPORT` all carry headers pointing here and marking their own phase numbers non-binding; `DEVELOPMENT_PLAN.md` §4 maps its P0–P8 onto Phases 1–7. |