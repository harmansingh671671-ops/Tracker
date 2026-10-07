# ODYSSEY — MAIN PLAN

> **Status of this file:** the single authoritative index of what gets built, in what
> order, and what state each feature is in.
>
> **Read `Market Research/context.md` FIRST**, before this file and before any code.
> It carries the product brief, stack, data model, environment, durable
> learnings and live task state, so no agent has to be prompted for context.
> This file remains the only record of **feature order and status**.
>
> **Last reconciled:** 2026-10-07 · baseline migrated from `DEVELOPMENT_PLAN.md` §3
> (which was reconciled against source at commit `6b42b74`).

---

## 0. HOW TO USE THIS FILE

### 0.1 Authority order (binding)

```
1. Market Research/context.md  <- agent entry point. Orientation + durable learnings.
2. main_plan.md                <- THIS FILE. Order, priority, status. Authoritative.
3. ACTUAL CODE                 <- reality. Code always beats any document.
4. DEVELOPMENT_PLAN.md         <- engineering conventions + workflow rules (still canonical for HOW)
5. MASTER_TODO_REVISED.md      <- full feature specs + rationale (read for WHAT and WHY)
6. All other Market Research docs -> evidence only, non-binding
```

`context.md` sits above this file for **orientation only** — product, stack,
schema, environment, learnings, and where the work currently stands. It never
carries feature status. Where the two disagree on order or status, **this file
wins**; where either disagrees with the code, **the code wins**.

If this file and a research doc disagree, **this file wins on order and status**.
If this file and the **code** disagree, **stop and reconcile** before continuing.

### 0.2 Status legend

| Status | Meaning |
|---|---|
| `SHIPPED` | Built, verified, committed, in the app |
| `BUILT` | Code exists and is committed, but **not yet verified against a stated acceptance criterion in its current phase**. Used heavily in the performance phase (§6.5), where an item may already be delivered by earlier work but the measurement has not been re-taken |
| `PARTIAL` | Some of it exists; the remainder is listed in the brief |
| `NOT BUILT` | Researched and planned, zero code |
| `BLOCKED` | Cannot start until a named dependency clears |
| `GATED` | Legally/policy gated (Play Store, moderation, payments) |
| `DEFERRED` | Deliberately parked to a later phase |
| `NOT APPROVED` | Proposed but explicitly not a product commitment |

> **`BUILT` vs `SHIPPED` is not cosmetic.** `SHIPPED` means someone measured or
> verified it. `BUILT` means it is in the tree and nobody has yet checked it
> against its acceptance criteria. Never promote `BUILT` to `SHIPPED` without a
> before/after number or an explicit check. A line that says `BUILT` and names what
> still needs verifying is honest; one that quietly says `SHIPPED` is not.

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
| **Performance** | Load speed, render cost, battery, bundle and load-path — **§6.5**. Unnumbered because it must not collide with Phase 4; runs after Phase 4 and before Phase 5 |
| **5** | Wallpaper and widgets |
| **6** | Polish, non-AI Pro features, third-party integrations |
| **7** | AI |

This order is **deliberate and overrides** the phase numbering in `DEVELOPMENT_PLAN.md`
§4 and `PRODUCTION_PLAN.md`. See contradiction **C1** in §9.

**The performance phase is `DEFERRED`-friendly and GATED-free**: it needs no backend, no
account, no Play policy decision, and no legal review. It is also the only phase that
makes every later phase cheaper and safer to build, which is why it sits before the
wallpaper work in Phase 5. See **C12** for why it is unnumbered and why `POL-1` was
moved into it.

---
## 1. AI AGENT WORKFLOW (binding)

This is the operating procedure for any AI or human picking up work. It is not
advisory. Follow it in order.

### Step 1 — Always start here

Open **`Market Research/context.md` first**, then **this file**, and find the
feature. Never start work from a research document directly. The research docs
are ~350 KB and contradict each other; `context.md` is the orientation layer and
this file is the index that already resolved the conflicts.

**Do not ask the owner to repeat context that is already written down.** If
something is missing from `context.md`, that is a defect in that file — add it
(Step 9b) rather than requesting it again.

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

### Step 9 — Update the status record in the same commit

Change the checkbox and the status. This file is the status record; there is no
other one. A feature is **not done** until it is committed and its status here
reflects reality.

### Step 9b — Write back to `context.md` in the same commit

`Market Research/context.md` is only worth reading if it stays true. Before the
same commit lands:

- **Shipped a feature** → add a `§9 Session Log` entry (facts, not narration).
- **Learned a non-obvious constraint, or a bug and its real fix** → log it, and
  add it to `§11 Rules` if it is a permanent rule.
- **Found a wrong fact in `context.md`** → fix it in place. Never leave a
  known-wrong line, and never accumulate a changelog of corrections.
- **Moved the working tree, HEAD, or the next feature** → update `§10`.

Verify before writing — every line in that file was read out of the code, not
recalled. No secrets, no API keys, no PII. Full protocol in `context.md` §0.2.

**Order is mandatory: `main_plan.md` (this file) first, then `context.md`, then
commit — all three in one commit.** `context.md` points at this file and must be
written knowing what the status now says. The sequence is
`implement → verify → main_plan.md → context.md → commit`.

A commit carrying code but neither document is the **same defect as uncommitted
work**, only harder to spot: `git status` is clean, so nothing prompts a follow-up,
and the next session has no record of what shipped. Skipping either document means
the feature is **in progress**, not done.

The same rule covers knowledge that did *not* ship as planned. A feature id that was
dropped, deferred, renamed, or built under a different id must say so here in the
same commit — silence is the traceability failure rule 7 exists to prevent.

### Updating a status means sweeping its cross-references, not just its own line

**When you ship a feature id, every line in this file that mentions it must be
re-checked in the same commit.** Ticking the box on your own line is the
*minimum*, and it is not sufficient: these ids are cross-referenced dozens of
times, and a stale neighbour is worse than a stale tick because it looks
authoritative.

Two ways it actually goes wrong, both caught in this repo:

- **The line understates what you did.** `M4` sat at `PARTIAL` reading *"no page
  mounts the component yet"* — untrue from the commit that built it. Nobody
  re-read their own line after mounting the thing.
- **The lines that cite it are now wrong.** `F3` still claimed *"no first-day
  card"* after `M4` shipped one, and `B15` gave no detail at all once two of its
  three halves landed.

So the procedure for shipping any id is:

```
1. flip your own checkbox AND correct your own status wording
2. grep this file for the id, and for every id your commit also touched
3. fix each hit that your change made false, even if that line belongs to
   another feature or another phase
4. re-read your own line once, after the code is in, not before
```

Step 4 is not optional bookkeeping. Writing the status *before* the code is how
`M4` ended up describing a component that had not been mounted yet, and then
never revisited. **`BUILT` is a claim about shipped reality; write it last.**
`PARTIAL` must name what is missing — a bare `PARTIAL` is not a status, it is a
way of avoiding one.

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
- [ ] **`context.md` written back** (§0.2) in the same commit
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
- [ ] **P0-T6** — Native bridge adapter pattern (closes D1). `PARTIAL` — the alias-resolution adapter **has landed**: `nativeBridge()` / `hasNative()` / `callNative()` / `callNativeBool()` in `src/lib/utils/android-bridge.ts`, with `odyssey/bridge-boundary` in ESLint making direct `window.OdysseyAndroid` access a lint error (59 duplicated blocks removed). **What remains:** the module is still one 829-line file holding all 34 methods, so D1's "god-node" half is unclosed — it needs splitting by concern, behaviour-preserving · src: `DEVELOPMENT_PLAN.md §4 L277`
- [ ] **P0-T7** — Remove dead code `seedInitialData()` (D8). `NOT BUILT` · src: `DEVELOPMENT_PLAN.md §4 L278`
- [ ] **DEBT** — D2 split `useUserStore`; D5 unify data access; D6 refresh graph. `NOT BUILT` · src: `DEVELOPMENT_PLAN.md §3.3 L217`

### 3.2 Known defects found by audit

Both remaining defects proved to be **wallpaper** defects, so both moved to Phase 5.

- [x] **BUG-3** — `initTheme()` `matchMedia` listener without cleanup. `SHIPPED` · src: `DEVELOPMENT_PLAN.md §3.3 L224`
- **BUG-1, BUG-2** → **Phase 5** (`§7.2 Wallpaper correctness`). BUG-2 is already tracked there as `G12`.

### 3.3 Micro polish — Tier 1 (30 min – 2 hrs each)

src for all: `MASTER_TODO_REVISED.md §19 L959–977`

- [x] **M1** — Local-data trust badge. `BUILT` — copy is owner-set: *"Your data will not leave your device without your consent."* (supersedes both research drafts); `LocalDataTrustBadge` renders on **Profile** and inside Settings' **Local Vault** card. **Onboarding surface not built — there is no `/onboarding` route, see `A1`** · also: `A8`
- [x] **M2** — Habits page empty state. `BUILT` — `HabitsEmptyState` component: keystone-block illustration drawn with CSS-var tokens (re-themes light/dark), pulsing (+) ring on a new `keystonePulse` keyframe gated on `prefers-reduced-motion` in `globals.css`, copy "Your journey begins with one keystone habit" + "Pick the one habit that holds the rest up", CTA "Add your keystone habit" opens the existing create modal. Also removed a **false zero** on this screen: the day readout printed `0/0 (0%)` with no habits at all, which is the same confident-false-zero class the M9 header placeholder exists to prevent — it now reads "Nothing scheduled yet" · also: `A8`
- [x] **M3** — Planner empty state "clean slate". `BUILT` — `PlannerEmptyState` sits above the rail and points at the gesture that already works (tap any hour), so it adds no new button and no new path. Illustration is the planner's own rail spine with one highlighted hour, drawn with CSS-var tokens and animated by `slateSweep` + `slateTapPulse`, both gated on `prefers-reduced-motion` in `globals.css` the way `keystonePulse` is. **Spec copy changed with owner approval:** the researched line *"Tap + or import a routine template"* promised two things that do not exist — there is no + button and no template import (`B1`/`HD29`, still Phase 2) — so it now reads *"Tap any empty hour to schedule your first block."* A day in the past that was left blank was not a choice, so it gets different copy (*"Nothing was scheduled on this day"*) rather than being called a clean slate. Visibility is gated on a new `blocksLoading` flag, because the planner reads `db` directly (D5) and `blocks` is `[]` on first paint for **every** day — without it, a full day would flash "clean slate" before the read resolved · also: `A8`
- [x] **M4** — All-habits-done celebration card (+50 XP). `BUILT` — `PerfectDayCard` **is mounted**, on the **Habits** screen above the vault banner; this line previously read "no page mounts the component yet", which stopped being true in the very commit that built it. The reward work was the larger half: the vault is now the **only** route for habit rewards, so the double-count closed. Ticking a habit no longer credits the profile directly — it accrues, and the whole vault pays in at the day boundary and empties. The claim record moved out of `localStorage` into a new `rewardSettlements` table (defects 7.1/7.2, ADR 0002), so clearing site data can no longer make the app re-pay the same days, and the streak no longer jumps by the number of days skipped (defects 7.4/7.5, ADR 0001 §5). Rates are named constants per ADR 0001 §7 · also: `FD1`, `F3`, `B15`
- [x] **M5** — Creation confirmation toast naming first milestone. `BUILT` — habit creation toast reads *"Your journey with {Habit Name} begins now. First milestone: 3-day streak."* · also: `B15`
- [x] **M6** — First-open welcome banner (3 pillars). `BUILT`, then **relocated into the onboarding flow** when **A1** shipped (§10 C11) — the three pillars and the **M1** trust badge are now step 2 of `/`, not a card on the Habits tab. `WelcomeCard` and its `shouldShowWelcomeCard` visibility rule were **deleted** rather than left in two places: a dismissible banner makes no sense inside a guided flow, and its copy described itself in terms of a screen it no longer lived on. The rule it was built for survives as `lib/utils/onboarding-flow.ts`: any state that asserts "this is empty" must check loading first, because a store that loads starts empty for *every* user. Zero-habit users on `/habits` fall back to the **M2** keystone empty state. Wallpaper copy stays hedged — "if you want it there" — because P8-E1 made the wallpaper default-OFF · also: `A8`
- [ ] **M7** — "Last done: Today at 8:15 AM" subtitle. `NOT BUILT` · also: `B15`
- [ ] **M8** — Daily capacity indicator. `NOT BUILT` · also: `C5`
- [x] **M9** — Completion fraction header. `BUILT` — `CompletionFractionHeader` sits above the date strip (in-flow, not pinned); animated, built from swappable slots so further readouts can be added later; arithmetic lives in `lib/utils/habit-progress.ts` (unit-tested, no NaN on empty days). Slot keys are namespaced by slot id (`getHeaderSlotKeys`, regression-tested) — bare keys made the icon and label both `"rest"` on an empty day and threw React's duplicate-key error · also: `C4`
- **M10** — Wallpaper completion gauge → **Phase 5** (`§7.5`). `PARTIAL` — `G2` already ships the fraction; the gauge render on the wallpaper does not exist · also: `G2`
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

- [ ] **CONS-1** — Habit colour + period must match across card, date strip, planner and wallpaper. `PARTIAL` — category casing unified; colour mapping still defined **4×** (**BUG-1**, now in Phase 5 §7.2) · **stays in Phase 1:** only its wallpaper half moved to Phase 5; card/strip/planner remain here · src: `MASTER_TODO_REVISED.md §8 L510`, `§15.4 L763`
- [ ] **CONS-2** — Narrow-screen sweep across all 5 main surfaces. `PARTIAL` — only `sm:` breakpoints in use, no `md:`; 4 fixed pixel widths remain · src: `MASTER_TODO_REVISED.md §8 L510`
- [x] **CONS-3** — Navigation reachability. `SHIPPED` — all 5 nav destinations resolve; `/profile` correctly excluded as a dead route

**Phase 1 exit gate:** `tsc`/`lint`/`test`/`build` clean; P0-T6 adapter landed; CONS-2 narrow-screen sweep done; no uncommitted work. **BUG-1/BUG-2 no longer gate this phase** — they moved to Phase 5 §7.2.

---
## 4. PHASE 2 — Real feature work added to the app

The core product. Habits, schedule, focus, stats, reminders. Most of the research
catalogue lands here.

### 4.1 Onboarding & first run — `MASTER_TODO_REVISED.md §5 A L184–200`

- [x] **A1** — Short goal-based first run. `BUILT` — **shipped in Phase 1 as a phase-order exception, see §10 C11.** `/` is now a five-step flow (`intro → circadian → welcome → habits → protocol`) rather than a scrolling pitch. **Habits created during the flow are real**: step 2 reuses `CreateHabitModal` and writes through the habit store, so they are already on the Habits tab when the flow ends (verified end to end — created in step 2, present on `/habits` after commit). The flow tracks the ids *it* created, so step 3 can never present a returning user's pre-existing habits as "the ones you added". Profile bootstrap is awaited before any save, because `addHabit` needs a `userId` and would otherwise fail silently. Step 3 is **removable** (A1's "editable final preview") and **allows zero habits** — blocking there turns an introduction into a gate · also: `XL14`, `M16`
- [ ] **A2** — Animated walkthrough, one concept per scene, contextual not exhaustive. `NOT BUILT`
- [ ] **A3** — Optional interests/profession, skip-able, never used to obscure price. `NOT BUILT` · also: `HD25`
- [ ] **A5** — Commitment moment (identity line + hold-to-commit). `NOT BUILT` · also: `S14`
- [ ] **A6** — Loading/processing animation instead of blank screens. `NOT BUILT` · also: `M17`
- [ ] **A7** — Just-in-time permission education with animated preview. `NOT BUILT` · also: `D6`
- [ ] **A8** — Welcome / empty states / local-data trust. `PARTIAL` — both empty states ship (**M2** habits, **M3** planner); the welcome content ships as step 2 of the onboarding flow (**A1**, carrying **M6**'s pillars), so all three named surfaces of the M1 badge now exist. **Goal labels are the remaining gap** — the flow does not ask for a goal yet, which is **M16**'s job, not A8's · also: `M1`, `M6`
- [ ] **A4** — Optional AI assessment/coach. `NOT BUILT` · → **Phase 7**

### 4.2 Habits — `§5 B L202–232`

- [ ] **B1** — Searchable template library with filters + preview. `NOT BUILT` · also: `HD29`
- [ ] **B2** — Clean create/edit form, core fields first, expandable detail. `PARTIAL` — basic CRUD form exists; no priority/energy/cue/why/identity fields · also: `S4`–`S7`
- [ ] **B3** — Habit types: binary / measurable / avoid / time-limit, type-matched controls + undo. `NOT BUILT` — currently binary only · also: `S9`, `S13`
- [ ] **B4** — Swipe/slide completion with visible button alternative + feedback. `NOT BUILT` · also: `S11`, `S12`
- [ ] **B5** — Stable per-habit colour across card, strip, schedule, wallpaper. `PARTIAL` — see **BUG-1** / **CONS-1** · **stays in Phase 2:** the wallpaper share of this is Phase 5 §7.2; card/strip/schedule remain here · also: `S10`, `HD5`
- [ ] **B6** — Grid / List / Heatmap view switcher, saved preference. `NOT BUILT` · also: `HD1`
- [ ] **B7** — Challenge-linked habits with preview + confirm. `NOT BUILT`
- [ ] **B8** — Habit motivation fields (note/Why/identity/cue/routine/reward/2-min). `NOT BUILT` · also: `S4`–`S8`
- [ ] **B9** — Priority / energy / context tags with text+icon (never colour alone). `NOT BUILT` · also: `S2`, `S3`
- [ ] **B10** — Keystone / Daily Highlight / Frog, one each per day. `NOT BUILT` · also: `S19`–`S21`
- [ ] **B11** — Habit stacking "After A, do B" + temptation bundles. `NOT BUILT` · also: `HD16`, `HD20`
- [ ] **B12** — Flexible habits, rollover, hardening window. `NOT BUILT` · also: `HD17`
- [ ] **B13** — Pause / archive / inactive review (14-day prompt). `PARTIAL` — freeze exists as a shop item only · also: `HD18`, `HD19`
- [ ] **B14** — Quick-capture inbox/backlog. `NOT BUILT` — schema table `inboxItems` exists, no UI · also: `HD3`
- [ ] **B15** — Completion labels (creation confirm, last-done, own streak). `PARTIAL` — **creation confirm shipped** (`M5`, names the first milestone) and **own streak / perfect-day labelling shipped** with `M4`; **last-done is still `NOT BUILT` and is `M7`, the next open line in Phase 1** · also: `M5`, `M7`, `M4`

### 4.3 Schedule & planner — `§5 C L234–254`

- [ ] **C1** — Single-day visual timeline, current-time line, period colours. `PARTIAL` — timeline + time line shipped (`S16`); period colours not (`M11`) · also: `S15`, `S16`
- [ ] **C2** — Duration sizing + drag/reschedule + edit modal. `PARTIAL` — drag reschedule shipped; **overlap detection** missing · also: `S18`
- [ ] **C3** — Today at a Glance header (day, done/total, streak, capacity, Start). `NOT BUILT` · also: `M8`, `M9`
- [ ] **C4** — Up Next line + done/total in header and wallpaper. `PARTIAL` — wallpaper NOW/NEXT shipped; no ticker · **stays in Phase 2:** header work is Phase 2; the wallpaper gauge share is Phase 5 §7.5 (`M10`) · also: `M12`
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
- **E12** — Schedule replay + cue latency → **Phase 5** (`§7.5`), merged into `G11` / `XL15`. `NOT BUILT` · also: `XL15`
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
- [ ] **F3** — Completion celebration (confetti, warm copy, first-day card). `PARTIAL` — confetti exists; **the celebration card shipped with `M4`** (`PerfectDayCard`, mounted on Habits, fires when every habit due for the day is complete), so "no first-day card" is no longer true. The warm-copy sweep across toasts and counters is what remains · also: `M4`
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

- [x] **D9** — Dual XP accounting (profile vs Temporary Wallet). `SHIPPED` — specified in `docs/adr/0001-reward-economy.md`, and the **implementation landed with `M4`** (this line previously said "implementation still to verify"). The double-count is closed: the vault is the only route for habit rewards, the claim record lives in IndexedDB (`rewardSettlements`, keyed `userId:date` so it is idempotent), payout and record share one transaction, and the streak advances by a consecutive-day rule rather than by days claimed. Decision of record: `docs/adr/0002-reward-vault.md` · src: `DEVELOPMENT_PLAN.md §3.3 L229`
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
## 6.5. PERFORMANCE PHASE — load speed, render cost and battery

**Origin:** `inefficiencies.md` **§11** — the 18-item performance overhaul, imported verbatim
from `tracker-performance-master-prompt.md`, which has been **deleted**. That file is the
**authority** on this work: 18 ranked items with sub-steps, priorities and acceptance criteria.
This section is a **self-contained restatement** so an agent working here does **not** have to
open the audit for routine work.

**Two rules keep them from drifting:**

1. **On any conflict, `inefficiencies.md` §11 wins.** If this section and that file disagree,
   **this section is the stale one** — fix it in the same commit.
2. **Editing one requires editing the other.** Never change an item here without checking
   `inefficiencies.md` §11, and never change §11 without updating here. `MASTER_TODO_REVISED.md`
   §23 is a third restatement and is bound by the same rule.

### 6.5.1 Why this phase exists, and what it does *not* do

The master prompt's own ground rule #1 is *"verify before you change… if something is
already fixed or described inaccurately, say so and move on."* Applying that rule to the
current tree changed the shape of this phase before it was written, so read §6.5.2
before touching anything.

This phase **does not** add features. It makes what already exists load faster, render
smoother and cost less battery. Any change that alters what the user sees or does is out
of scope here and belongs to a feature phase — **except** where an item explicitly
requires a visible difference, and then it must be called out in the report.

### 6.5.2 ⚠️ RECONCILIATION — read this first, it changes what the work actually is

The master prompt's figures came from a prior code review, not from measurement. Five of
its eighteen items are **already delivered** and **four of its numbers are wrong** in this
tree today. Verified against source on 2026-10-08:

| # | Master prompt says | This tree, verified | Consequence |
|---|---|---|---|
| **#1** | Wallpaper redraws **30×/s**; ~**1,710 `Paint` allocs/sec** (~99% of redraw work wasted) | **Already delivered** by `P8-E2`. `OdysseyLiveWallpaperService.kt` uses `REFRESH_INTERVAL_MS = 60_000L` and re-arms on the minute boundary; the schedule JSON is cached, not re-parsed per frame | **The item's headline motivation no longer exists.** `P8-E4` already ruled the residual ~57 `Paint` allocations per render "a rounding error rather than a drain" at 1 render/minute. Sub-steps 1c/1h must **not** be implemented on the old reasoning |
| **#2c** | Wallpaper needs an hourly alarm that can be replaced | **Already delivered** — the wallpaper uses `handler.postDelayed`, no alarm | But `RTC_WAKEUP` **still exists** at 2 sites in `OdysseyCadenceNotificationWorker.kt`, so #2a/2b/2d remain genuinely open |
| **#4a** | `wallpaper-preview.tsx` runs `setInterval(…, 1000)` for a **minute-precision** clock | **Already fixed** — it re-arms on `msToNextMinute` | But there are **7 `setInterval` calls app-wide**, **no shared clock module exists**, and `journey-day-schedule.tsx` still ticks every **5 s** |
| **#7** | "~22 stacked heavy blur layers" | **41 occurrences across 21 files** | Larger than estimated; budget accordingly |
| **#12** | "8 instances" of `SharedPreferences.commit()` | **9** | Small drift, re-count before acting |
| **#15** | Remove the unused `WAKE_LOCK` permission | **Already removed** — only a comment remains in the manifest | Verify against the **merged** manifest, then close |
| **#3** | Assumes bundled assets vs remote URL is open | **Remote**: `MainActivity` calls `webView.loadUrl(targetUrl)` | The "bundled / `WebViewAssetLoader`" branch **does not apply**; the remote branch (caching, service worker, preconnect) does |
| — | — | **No `gradlew` in the repo**, and the documented JDK-25 vs Kotlin-1.9.22 daemon failure (risk **R14**) | See §6.5.4 — native items cannot be signed off on this machine |

**So the phase is ~4 delivered, ~3 partial, ~11 open.** Implement it as a verification
and measurement phase first. **Do not "optimise" a 30 FPS loop that no longer exists.**

### 6.5.3 The items — full detail, in priority order

Sub-steps are reproduced so this section stands alone. Item → master prompt mapping is
1:1 and in the same order.

- [ ] **PERF-0** — Baselines and reconciliation. `NOT BUILT` — **do this before PERF-1.** Re-verify every figure in §6.5.2 against source and record actuals, then capture baselines per §6.5.4. Android: `adb shell am start -W` (cold start), `dumpsys gfxinfo` (jank), `dumpsys batterystats`, `dumpsys alarm | grep <package>` (wakeups), Android Studio CPU/Memory profilers, Perfetto. Web: `chrome://inspect` against the WebView (Performance + Memory), React DevTools Profiler, bundle analyzer, Lighthouse on a **production** build. **Always release builds on a real mid/low-end device — not the emulator, not debug.** If profiling contradicts the §6.5.2 ranking, finish the measurement, report the conflict, and ask before reordering · src: `inefficiencies.md` §11 §0

- [x] **PERF-1** — Stop re-rendering the whole wallpaper 30×/second. `BUILT` — **delivered by `P8-E2`**; 1a (cached static scene), 1b (invalidate on size/rotation/data/hour-rollover/theme/photo change), 1d (parse JSON once, cached), 1e (minute-boundary re-arm via `60_000 - now % 60_000`) and 1f (stop when not visible / on surface destroyed) are in the service; the beacon glow is frozen at a fixed mid-cycle value and **nothing is drawn at all when the user has applied an alternate wallpaper**. **Needs verification:** confirm zero drawing while invisible, confirm no allocation in the draw path, and re-measure wallpaper CPU. **Do not implement 1c/1h on the old 30 FPS reasoning** — `P8-E4` already classified that work as not worth doing at 1 render/minute. If a re-measure contradicts `P8-E4`, report it rather than quietly re-opening 1c · src: `OdysseyLiveWallpaperService.kt`, `DEVELOPMENT_PLAN.md §4 P8`, `inefficiencies.md`

- [ ] **PERF-2** — Eliminate wasted device wake-ups. `PARTIAL` — **2c already delivered** (wallpaper uses `Handler.postDelayed`, no alarm). Still open: **2a** move the "is the live wallpaper active?" early-return **before** any alarm is scheduled, and cancel an existing alarm when the wallpaper is removed/deactivated; **2b** prefer inexact/non-waking scheduling (`WorkManager` periodic, `setInexactRepeating`, `setAndAllowWhileIdle` with a non-`WAKEUP` type) and keep a waking alarm **only** for user-visible notifications that truly must fire on time, with the correct exact-alarm API and permission for the target SDK; **2d** re-schedule correctly after reboot/time change only if still needed. `RTC_WAKEUP` remains at 2 sites in `OdysseyCadenceNotificationWorker.kt`. **The master prompt quotes both "~24 wasted wakeups/day" and "48 wakeups/day" — verify the real count with `dumpsys alarm` and report the true number.** Acceptance: no wake-up alarms for the wallpaper when it is not active; the early return happens before any alarm is set; notification timing still works · src: `OdysseyCadenceNotificationWorker.kt`

- [ ] **PERF-3** — Cold-start and WebView load path. `NOT BUILT` — **the app is served from a remote URL** (`MainActivity` → `webView.loadUrl(targetUrl)`), so the bundled-asset branch does not apply. Do instead: **3a** add HTTP caching headers and/or a service worker for the shell and static assets, and preconnect early; **3b** warm the WebView up early (`Application.onCreate` via an idle handler, or first thing in the Activity) and **reuse a single instance**; **3c** never block the main thread at startup — defer analytics, non-first-screen bridges and alarm setup until after first frame (AndroidX App Startup or `Looper.myQueue().addIdleHandler`); **3d** native splash via the `SplashScreen` API, dismissed when the web side signals ready through a bridge `onAppReady()` after first paint, so the user never sees a white WebView; **3e** sensible WebView settings — `domStorageEnabled`, `cacheMode = LOAD_DEFAULT`, hardware acceleration on, `setWebContentsDebuggingEnabled(false)` in release; **3f** prefetch other routes **on idle**, not at startup. Acceptance: measurably lower cold-start-to-first-paint (via `am start -W` plus a JS `performance.mark` reported over the bridge), no white flash, no startup main-thread jank · src: `MainActivity.kt`

- [ ] **PERF-4** — Redundant JS timers and clock re-renders. `PARTIAL` — **4a already delivered** in `wallpaper-preview.tsx` (`msToNextMinute` boundary re-arm). **7 `setInterval` calls app-wide, no shared clock.** Do: **4b** build one shared `useNow()` hook backed by `useSyncExternalStore` with **one timer total**, started when the first subscriber mounts and stopped when the last unmounts, replacing all the scattered timers; if a screen genuinely needs finer granularity, offer an **explicit opt-in** granularity rather than a private timer. `journey-day-schedule.tsx` at 5 s is the worst remaining offender; the 3 s day-change detectors on the planner and habits screens are date-boundary checks, not clocks — decide deliberately whether each is a clock or a boundary poll. **4c** pause while `document.hidden` and refresh immediately on `visibilitychange` to visible. **4d** isolate the clock display into a tiny component so a tick does not re-render a whole page. **4e** test minute rollover, midnight rollover, DST change and timezone change. Acceptance: exactly one active clock app-wide, ticks on minute boundaries, ~60× fewer renders on the preview screen, no timers while backgrounded · src: `wallpaper-preview.tsx`, `journey-day-schedule.tsx`, `planner/page.tsx`

- [ ] **PERF-5** — Route-level code splitting and bundle diet. `NOT BUILT` — measured today: `planner/page.tsx` **48.3 KB**, `habits/page.tsx` **45.4 KB**, `journey-day-schedule.tsx` **44.9 KB**, `day-schedule/page.tsx` **39.5 KB**, `stats/page.tsx` **35.8 KB**. Do: **5a** add the bundle analyzer and record per-route JS baseline; **5b** confirm route-level splitting actually happens — heavy, below-the-fold or modal-only components use `next/dynamic` (with `ssr: false` where appropriate for a WebView app) or `React.lazy`; **5c** extract hooks and sub-components out of the five files above into `hooks/` and `components/`. **The onboarding flow is the proof this works: `app/page.tsx` was 710 lines and is now 8.2 KB after the A1 extraction** — follow that pattern; **5d** trim dependencies — replace heavy date libs with `date-fns`/dayjs (the app already uses `date-fns`), import icons individually via `optimizePackageImports`, remove unused packages, avoid importing whole utility libraries; **5e** production hygiene — minification on, source maps off in the shipped build, `compiler.removeConsole` for production, Tailwind purging unused CSS; **5f** enable the React Compiler only if the profiler shows benefit. Acceptance: smaller initial JS per route with KB before/after, route components load on demand, **no file over ~15–20 KB without good reason** · src: the five files above

- [ ] **PERF-6** — JS ↔ Kotlin bridge and wallpaper sync efficiency. `NOT BUILT` — **6a** debounce/throttle wallpaper-sync calls from JS with a 300–500 ms trailing debounce; never sync per keystroke or per render; **6b** send only when data actually changed — compare a hash/version of the payload and skip no-op updates; **6c** batch multiple preference writes into a single `Editor` transaction; **6d** keep `@JavascriptInterface` methods fast — real work on a background thread/dispatcher, never on the bridge thread. Acceptance: editing a schedule triggers **at most one** bridge call and **one** cache rebuild per burst of edits · src: `OdysseyWallpaperBridge.kt`, `lib/utils/android-bridge.ts`

- [ ] **PERF-7** — Reduce heavy `backdrop-filter` blur. `NOT BUILT` — **41 occurrences across 21 files** today (the master prompt's "~22 stacked" undercounts; `POL-1` said 29, also stale). Do: **7a** audit and list every `backdrop-blur-*` use with file, class, and whether it sits over scrolling or animated content; **7b** reduce layer count — replace many small stacked blurs with a few larger blocks, and **never nest blurs**; **7c** use cheaper effects where visually acceptable — semi-transparent solids or opacity gradients instead of blur; **7d** cap radii — nothing above `backdrop-blur-md` on full-screen or scrolling surfaces, and never animate an element that has `backdrop-filter`; **7e** low-end fallback — detect via `navigator.deviceMemory` / `hardwareConcurrency` or a native flag and swap blur for flat translucent backgrounds. **Mitigating factor to state in the report, not hide:** `MainActivity.onPause()` → `webView.onPause()` already pauses rendering in the background, so this is a **foreground-only** cost — jank while scrolling and animating. Acceptance: fewer blur layers, smoother scrolling confirmed by `gfxinfo` jank % or the Chrome Performance panel, design unchanged on a normal device · src: `POL-1`, `inefficiencies.md`

- [ ] **PERF-8** — React render efficiency in the heavy screens. `NOT BUILT` — **8a** profile first with React DevTools Profiler and fix only real hot spots; **8b** memoise expensive derived data (`useMemo` for sorted/filtered lists), stabilise callbacks passed to memoised children (`useCallback`), and `React.memo` the list-row components; **8c** virtualise lists exceeding ~50 rows (`@tanstack/react-virtual` is **not** currently a dependency — evaluate before adding; note the reuse rule: existing code → stdlib → installed dep → new package last); **8d** split state/context so a change to one slice does not re-render the whole tree, colocating state near its use; **8e** never do work during render — no `JSON.parse`, no `localStorage` reads, no date-heavy computation in render bodies; move to memoised selectors or effects; **8f** stable `key`s everywhere, never array-index keys on reorderable lists. Acceptance: fewer and cheaper commits on the heavy screens; interactions feel instant on a low-end device · src: planner, day-schedule, habits, journey

- [ ] **PERF-9** — Animation and compositing hygiene. `NOT BUILT` — **9a** animate only `transform` and `opacity`, never `width`/`height`/`top`/`left`/`box-shadow`/`filter`; **9b** pause infinite CSS animations when off-screen or when the page is hidden (`IntersectionObserver` / `visibilitychange`); **9c** honour `prefers-reduced-motion` — note the existing house pattern of putting keyframes inside a `prefers-reduced-motion: no-preference` query in `globals.css`; **9d** use `will-change` sparingly, only on elements that actually animate; **9e** avoid layout thrashing — no read-write-read of layout properties in loops. Acceptance: no continuously running animation on invisible elements; steady 60 fps in common interactions · src: `app/globals.css`

- [ ] **PERF-10** — Fonts, images and static assets. `NOT BUILT` — **10a** self-host fonts via `next/font`, subset them, `font-display: swap`, load only the weights actually used (two display faces are in use on the landing/onboarding flow — verify whether both are needed on every step); **10b** convert raster images to WebP/AVIF at sensible dimensions, inline tiny SVGs, remove unused assets from the web bundle and APK; **10c** lazy-load below-the-fold images with explicit width/height to prevent layout shift; **10d** preload only the truly critical font/asset. Acceptance: smaller asset payload with before/after, no layout shift on load · src: `app/layout.tsx`

- [ ] **PERF-11** — Bitmap handling for custom wallpapers. `NOT BUILT` — **11a** `.recycle()` bitmaps that are replaced or discarded, **never** one still being drawn or cached; **11b** decode smartly with `inJustDecodeBounds` + `inSampleSize` at screen size, never full resolution, `RGB_565` when no alpha is needed, decode off the draw thread; **11c** cache the decoded custom image keyed by URI + modified time so it is not re-decoded on every rebuild; **11d** handle `OutOfMemoryError`/decode failure with a fallback. Acceptance: lower peak memory in the Memory Profiler, no repeated decodes, no crashes on large images · src: `renderWallpaper`

- [ ] **PERF-12** — `SharedPreferences.commit()` → `apply()`. `NOT BUILT` — **9 instances** today (the master prompt says 8; re-count). Replace with `apply()` (async) and batch per transaction (see PERF-6c). **Check each call site:** `apply()` is safe for in-process readers because in-memory state updates immediately, but **keep `commit()`** where another process reads the value or durability before process death is required — and document why at that site. Acceptance: no blocking disk I/O on the bridge thread, behaviour unchanged · src: `OdysseyWallpaperBridge.kt`

- [ ] **PERF-13** — Release build optimisation. `NOT BUILT` — `android/app/build.gradle` has **`minifyEnabled false`** today. **13a** enable R8 `minifyEnabled true` and `shrinkResources true` for release, and fix any keep-rules needed for `@JavascriptInterface` classes and reflection; **13b** add a **Baseline Profile** and a Macrobenchmark module for cold start; **13c** ship an **AAB** so ABI/density splits reduce install size; **13d** remove unused Gradle dependencies and resources (Android Lint "unused resources"). Acceptance: smaller APK/AAB, faster cold start, and **the release build still works end to end — test the bridge and the wallpaper**, since R8 can strip exactly the reflection-dependent code this app depends on · src: `android/app/build.gradle`

- [ ] **PERF-14** — Logging, leaks and lifecycle hygiene. `NOT BUILT` — **14a** strip or gate `Log.*` in hot paths and release builds, and remove `console.log` from production web code (the ESLint config already warns on `no-console`); **14b** ensure every `Handler` callback, `BroadcastReceiver`, listener and coroutine is cancelled/unregistered in the matching lifecycle callback (`onDestroy`, `onVisibilityChanged`, `onPause`) — **debt D4 in this repo was exactly a listener without cleanup**; **14c** destroy the WebView correctly in `onDestroy` (remove from parent, `stopLoading`, `destroy`) to avoid leaks; **14d** add LeakCanary to **debug builds only** and fix what it reports. Acceptance: no leaks in a normal usage session, no logging in hot loops · src: `DEVELOPMENT_PLAN.md` §5.6, debt register D4

- [x] **PERF-15** — Remove the unused `WAKE_LOCK` permission. `BUILT` — **already delivered**; the permission is gone and only an explanatory comment remains in `AndroidManifest.xml`. **Needs verification:** confirm via the **merged** manifest that nothing (including a dependency) re-adds it; if a dependency does need it, document that instead of removing the line silently. Acceptance: build passes, app works, merged manifest no longer requests `WAKE_LOCK` · src: `android/app/src/main/AndroidManifest.xml`

- [ ] **PERF-16** — Dependency and dead-code audit. `NOT BUILT` — **16a** run `depcheck`/`knip` for the web side and the Gradle dependency report for Android, then remove what is unused; **16b** update dependencies with known performance fixes (Next.js, React, AndroidX WebKit) **after reading the changelogs**, and test thoroughly — the app is pinned to **Next.js 16.3.5** and the upgrade path is not casual; **16c** delete unused components, routes and assets left from earlier iterations. Note: `seedInitialData()` is currently an **empty function** and is tracked as debt **D8** — a known dead-code candidate · src: `DEBT` D8

- [ ] **PERF-17** — Storage layer modernisation. `NOT BUILT` — ⚪ **optional; skip unless measurement shows benefit.** If preferences are growing large or are accessed from multiple threads, migrate `SharedPreferences` to Jetpack **DataStore** (async, transactional). On the web side, confirm `localStorage` reads/writes are not in render paths and that large JSON is not re-serialised on every change — note the `odyssey/storage-boundary` ESLint rule already funnels all of it through `lib/utils/logger.ts`. Also note the deliberate counter-example: **reward settlement records must stay in IndexedDB, not `localStorage`** (ADR 0002) — do not migrate those. · src: `docs/adr/0002-reward-vault.md`

- [ ] **PERF-18** — Performance regression guardrails. `NOT BUILT` — **there is no `PERFORMANCE.md` and no `.github/workflows` in the repo today.** **18a** add a bundle-size budget to CI that fails the build if a route's JS grows past an agreed threshold; **18b** add Lighthouse CI (or equivalent) on the production web build; **18c** add the Macrobenchmark startup test from PERF-13 to CI if feasible; **18d** write `PERFORMANCE.md` documenting the baselines, the final numbers, the rules (no allocations in draw loops, one shared clock, no wake-up alarms unless essential, a blur budget) and **how to re-measure**. Acceptance: a regression in bundle size or cold start fails CI rather than being discovered later · src: `inefficiencies.md` §11

### 6.5.4 Honest measurement boundary — read before promising anything

**The native items (PERF-1 verification, 2, 3, 11, 13, 14) cannot be fully signed off on this
machine, and this phase must not pretend otherwise.**

- There is **no `gradlew`** in the repo. The Android build runs through the documented
  manual Gradle path with Android Studio's bundled JBR, and the Kotlin daemon cannot
  start on JDK 25 with this project's Kotlin 1.9.22 pin (`IllegalArgumentException: 25.0.3`,
  risk **R14**).
- There is **no physical device attached**, and the master prompt requires measurements
  on a **real mid/low-end device, release build** — not the emulator, not debug.
- Therefore: `tsc`, `lint`, `build`, `vitest`, Lighthouse, bundle analyzer, React
  Profiler and the browser suite **can** all be run here. `adb`/`dumpsys`/`gfxinfo`/
  `batterystats` and R8/Baseline-Profile/AAB outcomes **cannot**.

**Rule:** a native item may be implemented and reported, but it stays `BUILT` with
"unverified — needs a device" until someone measures it. **Never** write `SHIPPED` for a
native item on the strength of a green web test suite — `tsc` does not read Kotlin, and a
real syntax error once shipped through a fully green web suite (risk **R12**).

### 6.5.5 `POL-1` absorbed here — nothing lost

`POL-1` previously lived in Phase 6 §8.3 and read:

> *"Battery/render hardening: default-off background features, render cost. `PARTIAL` —
> wallpaper master switch shipped (`P8-E1`); 29 `backdrop-blur` surfaces remain on the
> planner · src: `inefficiencies.md`, `DEVELOPMENT_PLAN.md §4 P8`*

Both halves are preserved: the **default-off master switch** is delivered (`P8-E1`, and
is covered by the battery rule in `AGENTS.md` and `DEVELOPMENT_PLAN.md` §6.6), and the
**render-cost** half is **this phase** — `PERF-7` for blur and `PERF-1`/`PERF-9` for
draw cost. The **29** figure was stale and is corrected to the measured **41 across 21
files**. The Phase 6 line now points here so the original location still says where the
work went. Recorded as **C12**.

### 6.5.6 Phase exit gate

- `PERF-0` baselines recorded, and every §6.5.2 figure either confirmed or corrected in
  writing — **no item implemented on a stale premise**
- All web-side items measurable on this machine either `SHIPPED` with before/after
  numbers, or explicitly `DEFERRED` **with a reason**
- Every native item implemented, compiled, and reported as `BUILT` + "unverified — needs a
  device" until measured on hardware
- `PERFORMANCE.md` written with baselines, final numbers, the four rules and how to
  re-measure
- No visual or behavioural regression: reference screenshots taken first, and any visible
  difference called out in the report
- `POL-1` fully accounted for; no item duplicated across two phases
- Working tree clean, `main_plan.md` and `context.md` updated before the commit

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

### 7.2 Wallpaper correctness — do these **first** in this phase

These are defects, not features. Fix them before adding any new wallpaper capability,
because every new visual below draws category colours and would inherit the drift.

- [ ] **BUG-1** — Category colour defined **4× independently**, and the four disagree.
  The wallpaper imports `habit-colors.ts` **zero** times, so the same category shows a
  different colour in-app vs on the lockscreen. `NOT BUILT` · also: `P0-T3`
  - `wallpaper-generator.ts:506` `getCatDetails()` — hex, own taxonomy (Rest/Vitality/Sync/Renewal/Focus)
  - `planner/page.tsx:552` `getCatStyle()` — Tailwind classes, private local copy
  - `day-schedule/page.tsx:99` `getCatStyle()` — Tailwind classes, exported near-duplicate of the planner's
  - `habit-colors.ts` — canonical hex map, ~50 alias strings
  - **Confirmed drift:** `Rest` is `#F59E0B` amber in-app but `#818cf8` indigo on wallpaper;
    `Sleep` is `#8B5CF6` violet in-app but indigo on wallpaper; `Sync` has no in-app mapping at all.
  - **Note:** the canvas needs hex, the UI needs Tailwind classes — so the fix is one colour
    map plus one *derived* class map, not one file serving both blindly.
  - **DoD:** a test asserts planner, day-schedule and wallpaper resolve the same category
    to the same colour, so this cannot silently regress.
- [ ] **BUG-2** — 24-hour spectrum contradiction: generator draws it (`wallpaper-generator.ts:386`),
  preview says removed (`wallpaper-preview.tsx:253`). `PARTIAL` · see **C2** · tracked as **`G12`**

### 7.3 Wallpaper state items (relocated from the gamification phase)

src: `MASTER_TODO_REVISED.md §19 Tier 4 L1061–1065` — these sat under "Behavioral
Systems" but are wallpaper features.

- [ ] **FD15** — Wallpaper dynamic state transitions (Pre-Warning → Active Glow → Completed Dim). `NOT BUILT` · also: `G3`
- [ ] **FD16** — Live identity statement on lock screen. `NOT BUILT` · also: `G4`
- [ ] **FD17** — Wallpaper neglect decay mode (3-day desaturation). `NOT BUILT` · also: `G6`
- [ ] **FD18** — Circadian sky gradient background. `NOT BUILT` · also: `G5`
- [ ] **FD19** — Ghost schedule overlay. `NOT BUILT` · also: `G7`

### 7.4 Widgets & ambient surfaces

- [ ] **XL12** — Android Glance home-screen widgets (2×2 and 4×1). `NOT BUILT` · src: `§12 L606`
- [ ] **XL13** — Persistent notification-shade progress HUD. `NOT BUILT` · src: `§12 L607`
- [ ] **XL15** — Daily schedule replay video generator. `NOT BUILT` · → shared with Phase 2 · also: `E12`, `G11`

⚠️ **Battery gate.** Wallpaper, widgets and shade HUD all run while the app is
closed. Step 5 of the workflow applies in full: each needs a documented wake
source, a **default-off** flag, a route guard as well as hidden UI, and a defined
"what happens when the user turns it off". The existing wallpaper master switch
(`P8-E1`) is the reference pattern.

### 7.5 Wallpaper items relocated from Phases 1–2

Both were tagged `→ Phase 5` but sat in earlier phases. Neither is a background
service, so the battery gate above does not apply.

- [ ] **M10** — Wallpaper completion gauge: render the completion percentage and
  fraction directly on the wallpaper. `PARTIAL` — `G2` ships the fraction in the
  data layer, but nothing renders the gauge · src: `MASTER_TODO_REVISED.md §19 L982` · also: `G2`
- [ ] **E12** — Schedule replay + cue latency. `NOT BUILT` — **same feature as `G11`
  and `XL15`**, do not build three times · src: `MASTER_TODO_REVISED.md §19 L1095` · also: `XL15`, `G11`

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
- [x] **XL14** — Interactive landing & onboarding. `BUILT` — landed with **A1** in Phase 1 (§10 C11). `/` is a five-step flow with working state and navigation: Next/Back with Back hidden on step 1 and Next hidden on step 5, a step indicator, an animated circadian preview, and a **theme choice (System/Light/Dark) available on every step that becomes the app's setting** — `setTheme` writes the same `odyssey_theme_mode` key the anti-FOUC script in `layout.tsx` reads, so no extra plumbing. System stays the default because the toggle writes **only on an explicit tap**; writing the resolved value on mount would persist a mode the user never chose. One way in: the old page had four separate controls (a header "Launch App", a hero "Explore Habit Studio", and five footer links) that each marked onboarding complete, so the whole introduction was skippable — verified zero bypass links remain · also: `A1`
- [x] **POL-1** — Battery/render hardening: default-off background features, render cost. `BUILT` — **moved to §6.5 (Performance phase) as `PERF-0`…`PERF-18`**, see **C12**. Both halves are accounted for and nothing was dropped: the **default-off master switch** shipped with `P8-E1` and remains enforced by the battery rule in `AGENTS.md` and `DEVELOPMENT_PLAN.md` §6.6; the **render-cost** half is now `PERF-1`, `PERF-7` and `PERF-9`. **Needs verification:** the original line claimed *"29 `backdrop-blur` surfaces remain on the planner"* — the measured figure is **41 occurrences across 21 files**, so that number was stale and is corrected in §6.5 · src: `inefficiencies.md`, `DEVELOPMENT_PLAN.md §4 P8`, §6.5

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

### C8 — `XL-n` ID collision · **RESOLVED**

`XL14` carries **three different meanings** across the sources:

- `MASTER_TODO_REVISED.md §19 L1094` — Interactive Landing & Onboarding (canonical)
- `PRODUCTION_PLAN.md L196` — Social media blocker with stakes
- `PHASE_0_AUDIT_REPORT.md L297` — Cinematic Onboarding Experience

Also broken: `MASTER_TODO_REVISED.md L67` maps the `/wallpaper` route to `M3` and `S14`,
but those IDs mean *Habits empty state* and *Commitment ritual* everywhere else — a
second collision in the same table.

**Decision:** `MASTER_TODO_REVISED.md` IDs are canonical. This file tracks `XL14` as
*Interactive Landing & Onboarding*, routed to Phase 2 as `A1`. Never cite an `XL-n`,
`M-n` or `S-n` ID from a source other than `MASTER_TODO_REVISED.md`. Same rule as **C7**.

### C9 — Schema proposal vs live schema · **RESOLVED**

`MASTER_TODO_REVISED.md §20.1` proposes a new `Habit` schema that **does not match
the live one** (`title` vs `name`, `streakCurrent` vs `currentStreak`).
**The live `src/lib/db.ts` is the schema.** New fields are added by **additive
migration**; never adopt §20.1 wholesale. Any deviation needs an ADR in
`docs/adr/`. src: `DEVELOPMENT_PLAN.md §2.4 L106`

### C10 — Checkboxes are unreliable as status · **RESOLVED**

Every research checkbox is `- [ ]` (452 total, **zero ticked**), yet Phase 1 shipped
via git without ticking any. **Status lives only in this file.**
src: `DEVELOPMENT_PLAN.md §2.8 L167`

### C11 — Onboarding shipped in Phase 1, not Phase 2 · **RESOLVED (owner decision)**

`A1` and `XL14` were listed in **Phase 2**. They shipped in **Phase 1** on
2026-10-07. Recording it here so the plan does not quietly contradict itself.

**Owner decision, not an implementation detail.** Phase gates are normally hard,
and `AGENTS.md` rule 9 says skipping one is the plan owner's call rather than
something an agent does on its own. It was escalated and approved.

**Why it was defensible rather than merely convenient:**

- Phase 1's own work made it necessary. **M2**, **M3** and **M6** all landed
  first-run surfaces (empty states, a welcome card) and each needed the question
  *"when does a new user first see this?"* answered. Leaving the answer as a
  Phase 2 item meant shipping three screens that assumed a first-run experience
  that did not exist yet.
- **M6 was moved, not duplicated.** Its content became step 2 of the flow and the
  card was deleted from `/habits`. One implementation, one place.
- Phase 2 loses its single largest item. What remains there is substantive but
  none of it blocks the daily-use loop.

**What Phase 2 gave up:** `A2` (animated walkthrough), `A3` (interests),
**M16** (onboarding goal category tags). `M16` is the notable one — **A1 shipped
without asking for a goal**, so "goal labels" remain the open half of **A8**.
That is a deliberate gap, not an oversight: the goal picker wants the habit
template library to suggest against, and adding one without suggestions would be
a picker that promises tailoring it cannot yet deliver.

### C12 — A performance phase was added, unnumbered, and `POL-1` moved into it · **RESOLVED (owner decision)**

A new phase was added for the 18-item performance overhaul in
`tracker-performance-master-prompt.md`, and `POL-1` was dissolved into it.

**Three structural decisions, all made deliberately rather than by accident:**

1. **It is `§6.5` and it is unnumbered as a phase.** It sits between Phase 4 (Social) and
   Phase 5 (Wallpaper). It is titled "PERFORMANCE PHASE" rather than "Phase 4.5" because
   `§6` is already *PHASE 4 – Social tab*; a second block numbered "Phase 4" would create
   a duplicate phase name that breaks the §0.4 order table and every "Phase 4" reference
   in the repo. **Renumbering the later sections was rejected**: §7–§12 carry **33
   cross-references inside this file alone**, plus more in `DEVELOPMENT_PLAN.md`,
   `FEATURES.md` and `context.md`, and each is a chance to break a citation silently.

2. **`POL-1` was absorbed, and nothing was lost.** Its full original wording is preserved
   verbatim in §6.5.5 so the text survives the move. Both halves survive it: the
   default-off master switch (delivered, `P8-E1`) and the render-cost work (now `PERF-1`,
   `PERF-7`, `PERF-9`). The Phase 6 line was rewritten as a pointer rather than deleted,
   so the original location still records where the work went. **Its "29
   `backdrop-blur` surfaces" figure was stale — measured at 41 across 21 files.**

3. **`inefficiencies.md` §11 is the authority; §6.5 is a self-contained restatement.** The
   owner required that an agent working the phase not have to reopen the master prompt for
   routine work. That created a drift risk, so §6.5 carries two binding rules: on conflict
   **`inefficiencies.md` §11 wins** and §6.5 is the stale side; and **editing one requires
   editing the other**.

   **Superseded 2026-10-08, later the same day:** the drift risk was removed at the source
   rather than managed by rule. `tracker-performance-master-prompt.md` has been **deleted** and
   its full content **imported verbatim into `inefficiencies.md` §11**, so there is now a
   **single** authority rather than two documents plus an anti-drift protocol. The two rules
   above still apply, now across three restatements: `inefficiencies.md` §11 (authority),
   `MASTER_TODO_REVISED.md` §23, and this §6.5 (status of record).

**The reconciliation finding is the point of this entry.** Applying the master prompt's
own "verify before you change" rule before writing the phase found that **5 of its 18
items are already delivered** (#1 core, #2c, #4a, #15, plus the wallpaper half of `POL-1`)
and **4 of its figures are wrong** (blur 22 → 41, `commit()` 8 → 9, the 1,710/sec
allocation estimate, and its bundled-asset assumption for #3 — the app serves a **remote**
URL). Implementing the list as written would have meant optimising a 30 FPS loop that was
removed by `P8-E2` months earlier. Hence `PERF-0` is a mandatory baselines-and-reconcile
step, and every already-delivered item is recorded `BUILT` **with what still needs
verifying** rather than quietly closed.

**Also added by this change:** `BUILT` as a distinct status in §0.2. It was already used
on a dozen lines (M1–M6, A1, XL14) but was **absent from the legend**, so nothing defined
what it meant. It now means *code exists, not yet verified in this phase* — deliberately
weaker than `SHIPPED`, which means someone measured it. Native items in this phase stay
`BUILT` until measured on hardware, because there is no `gradlew` in the repo and no
device attached (see §6.5.4).

---
## 11. SOURCE DOCUMENT INDEX

| Document | Role | Authority |
|---|---|---|
| **`Market Research/context.md`** | Agent entry point: product, stack, schema, environment, durable learnings, live task state. Written back every session (Step 9b) | **CANONICAL for orientation** — never for status |
| **`main_plan.md`** (this file) | Order, priority, status | **CANONICAL for status** |
| `DEVELOPMENT_PLAN.md` | Engineering conventions §5, workflow §6, risks §7 | **CANONICAL for HOW** |
| **`inefficiencies.md` §11** | 18-item performance overhaul, priorities and acceptance criteria, imported verbatim from the now-deleted `tracker-performance-master-prompt.md` | **CANONICAL for the performance phase (§6.5)** — on conflict, it wins and §6.5 is the stale side |
| `PERFORMANCE.md` | Perf baselines, final numbers, the rules, how to re-measure | **Not yet written** — `PERF-18d` |
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
| 2026-10-08 | **Performance phase: authority consolidated into `inefficiencies.md` §11, master prompt deleted.** §6.5 and `MASTER_TODO_REVISED.md` §23 had each been bound to `tracker-performance-master-prompt.md` by an "edit one, edit the other" rule. Managing two sources with a protocol is worse than not having two, so the prompt's content was **imported verbatim into `inefficiencies.md` §11** and the file **deleted** — one authority, and the drift rule disappears with the drift. Also corrected two stale figures in that audit while I was in it: `backdrop-blur` occurrences **46 → 41 across 21 files** (the "22 heavy" sub-count is explicitly marked *not* re-verified, so it stands as a floor rather than a fact), and `SharedPreferences.commit()` **8 → 9**. §6.5's authority rules, C12 and the §11 source index were repointed; the provenance of the import is recorded in all three places rather than erased · src: `inefficiencies.md` §11, `main_plan.md` §6.5 |
| 2026-10-08 | **Added the performance phase (§6.5) and dissolved `POL-1` into it.** Owner instruction. §6.5 carries all 18 items of the performance master prompt **in full, inline**, so an agent working the phase does not have to reopen it. **Unnumbered on purpose:** `§6` is already *PHASE 4 – Social tab*, and renumbering §7–§12 would touch **33 cross-references in this file alone** plus four more documents. `POL-1`'s wording is preserved verbatim in §6.5.5 and its Phase 6 line became a pointer, so nothing is lost — its stale "29 `backdrop-blur` surfaces" is corrected to the measured **41 across 21 files**. Recorded as **C12**. **Reconciling before writing changed the work:** 5 of 18 items are already delivered (`#1` core via `P8-E2`, `#2c`, `#4a`, `#15`, and `POL-1`'s master switch) and 4 figures are wrong (blur 22→41, `commit()` 8→9, the 1,710/sec allocation estimate, and `#3`'s bundled-asset assumption — the app serves a **remote** URL via `loadUrl(targetUrl)`). So `PERF-0` is a mandatory baselines-and-reconcile step, and delivered items are recorded `BUILT` **with what still needs verifying**. Added `BUILT` to the §0.2 legend, where it was already used on a dozen lines but never defined; it means *code exists, not yet verified*, deliberately weaker than `SHIPPED`. §6.5.4 states the measurement boundary plainly — no `gradlew`, no device, so native items stay `BUILT` + "unverified — needs a device" and must never be promoted on a green web suite alone (R12). |
| 2026-10-07 | **Process rules hardened, on owner instruction.** Two failures this session, both costing real time, are now enforced rather than merely noted. (1) **The commit sequence is mandatory and ordered**: `implement → verify → main_plan.md → context.md → commit`, all three in one commit — a commit with code but no status update is the same defect as uncommitted work, only harder to spot because `git status` is clean. Added to §1, to `AGENTS.md` non-negotiables 11 and to `FEATURE_WORKFLOW.md` Stage 3, with the rule extended to cover features that did *not* ship as planned (dropped, deferred, renamed) so silence never stands in for a decision. (2) **Background servers must never be left running**: `Start-Process` returns as soon as the process spawns and then leaves it alive forever, holding its port; the next start fails with `EADDRINUSE` while silently serving the **previous** build, so a clean page load is not evidence that the change under test is the change being tested. `AGENTS.md` gained a worked start/assert/kill chain and the rule to kill by the **port's owning PID** (not a remembered PID — `next start` spawns a child). Also recorded in `FEATURE_WORKFLOW.md` §Process traps: headless Chrome defaults to dark, the OTA update modal's fixed overlay swallows `page.click`, never edit markdown with PowerShell `Set-Content` (it re-encoded all of `context.md` once), and a failing assertion on the headline requirement needs a control before a fix. |
| 2026-10-07 | **M3 shipped.** Planner zero-block state (`PlannerEmptyState`). Researched copy changed with owner approval because it promised a + button and a template import, neither of which exists — template import is `B1`/`HD29`, Phase 2. Added a `blocksLoading` flag so the state cannot fire on the pre-read `[]` that the planner holds on first paint for every day (D5: it bypasses the schedule store, so there was no loading flag to borrow). Logic extracted to `shouldShowPlannerEmptyState()` with 6 regression tests → 116 green. |
| 2026-10-07 | **Adopted `Market Research/context.md` as the agent entry point.** It existed but was structurally corrupted — text severed mid-sentence and re-appended at the end — so every fact was re-verified against source and the file rewritten whole (product, stack, routes, schema, stores, reward economy, pure-logic modules, 7 phases, environment/toolchain/tests/design system, people/memory/research, session log, git + live task state, binding rules). New **§0** defines the mechanism: read `context.md` → `main_plan.md` → cited spec at session start; write back at session end. Propagated here — §0 header + authority order now put `context.md` first **for orientation only**; **Step 1** requires reading it and forbids asking the owner for context already written down; new **Step 9b** requires the write-back in the same commit; **Definition of Done** gained a checkbox; §11 source index and `AGENTS.md` non-negotiables point at it. Status remains exclusive to this file (C10). `.gitignore` no longer ignores `context.md`, so a fresh clone gets it. |
| 2026-10-05 | **Created.** Migrated the status record from `DEVELOPMENT_PLAN.md` §3 (reconciled against `6b42b74`); consolidated all six backlog docs into the 7 owner-defined phases; recorded 9 contradictions (4 open). Market Research docs un-ignored so they are tracked. |
| 2026-10-05 | **Propagated the new rules across all docs.** `AGENTS.md` now mandates `main_plan.md` first (status rule, code-beats-docs, battery question added as non-negotiables); `.clinerules` gained a §0 Source of Truth section; `FEATURES.md` dropped its "canonical status of record" claim; `MASTER_TODO_REVISED`, `PRODUCTION_PLAN`, `MASTER_TODO`, `TODO`, `AI_TODO` and `PHASE_0_AUDIT_REPORT` all carry headers pointing here and marking their own phase numbers non-binding; `DEVELOPMENT_PLAN.md` §4 maps its P0–P8 onto Phases 1–7. |
| 2026-10-05 | **Consolidated all wallpaper work into Phase 5.** Audited Phase 0 carry-overs through Phase 4. `BUG-1`/`BUG-2` → new §7.2 (defects first). `M10` and `E12` moved out of Phases 1–2 into new §7.5 — both had been tagged `→ Phase 5` for weeks without ever being moved; `E12` is the same feature as `G11`/`XL15` and is now marked do-not-build-three-times. `M10` corrected `NOT BUILT` → `PARTIAL` because `G2` already ships the fraction. `CONS-1`, `B5` and `C4` mention the wallpaper but span card/strip/planner/header too, so they **stay** in their phases with a note naming the Phase 5 share. Phase 4 (Social) has no wallpaper work. Fixed two pre-existing numbering bugs: two sections both numbered 7.3, and two contradiction entries both numbered C9 (now C10). Added **C8** — `XL14` means three different things across three sources, same class of bug as C7. |