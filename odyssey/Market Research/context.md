# CONTEXT.md — odyssey (Habit Tracker): everything an agent needs

> **Read this file FIRST, before `main_plan.md`, before any code.**
> This is the onboarding brain-dump: product, stack, repo layout, governing
> docs, data model, engineering rules, workflow, environment, people, history,
> gotchas, and the live task state.
>
> It exists so a new agent (or a new session) never has to be prompted for
> context and never has to rediscover it. Section **§0** is the protocol that
> makes it self-maintaining.
>
> **Precedence:** if this file disagrees with the code, **the code is right** —
> fix this file in the same commit. If it disagrees with `main_plan.md` on
> feature order or status, `main_plan.md` wins. This file never holds feature
> status; it points at it.

---

## 0. HOW TO USE THIS FILE (the mechanism)

### 0.1 At the start of every session — read, don't ask

```
1. context.md          <- this file. Everything below follows from it.
2. main_plan.md        <- feature order, phase, STATUS (authoritative)
3. the cited src: spec <- read the full paragraph before coding
```

Read §11 (Rules) before you write anything. It is short and it is binding.

**Do not ask the owner to repeat what is written here.** If something is
missing, that is a bug in this file — add it, do not request it again.

### 0.2 At the end of every session — write back before you commit

`context.md` is only worth reading if it is kept true. Before your commit:

| What changed | Update here |
|---|---|
| Shipped a feature | §9 Session Log (new entry) + §1 if user-visible |
| Learned a non-obvious constraint / bug + real fix | §9 Session Log, and §11 if it is a permanent rule |
| A fact below is wrong | Fix it in place, same commit. Never leave a known-wrong line |
| Working tree state, HEAD, next feature | §10 Git + task state |
| Env/tooling surprise (shell, ports, gates) | §7 Environment |

Rules for the write-back:

- **Update in the same commit as the code.** Context is not a follow-up task.
- **Facts only, no narration.** "The Kotlin daemon cannot start on JDK 25 — compile
  in-process" beats a story about the failure.
- **No secrets, no API keys, no PII.** `.env` holds keys; never copy them here.
- **Delete what became false.** Do not accumulate a changelog of corrections.
- **Verify before writing.** Every line in this file was read out of the code,
  not recalled. If you did not check it, do not assert it.

### 0.3 What belongs here vs `main_plan.md`

| | `context.md` (this file) | `main_plan.md` |
|---|---|---|
| Purpose | Fast orientation + durable learnings | Order, priority, **status** |
| Read cost | One file, ~5 min | 800+ lines |
| Changes | Every session | Only when a feature ships |
| Feature status | **Never** — points at `main_plan.md` | Canonical |

Status lives in `main_plan.md` and nowhere else (rule C10).

---

## 1. PRODUCT IDENTITY

**odyssey** is a mobile-first habit, schedule, focus, and personal-progress app
built around a **live Android wallpaper** — the phone wallpaper surfaces the
user's plan and progress on every unlock, while the app remains the place to
plan, edit, and review. Combines: day planner, habit formation/tracking,
gamified progression (XP, ranks, shop, avatar, optional social), and focus
tools. Strongest market position per research: schedule + habits + focus + RPG
progression + live wallpaper, where competitors cover only one or two.

**Product promise:** "Help me see what matters now, make starting easy, and
recover kindly when the day does not go to plan."

**Product/UI principles** (MASTER_TODO_REVISED §1): glanceability first; one
simple default with depth on demand; warm and respectful, never shaming missed
days (strict accountability is opt-in); tangible progress; mobile-first narrow
layouts; user control over AI (recommends, explains; never silently alters);
explain local-first privacy clearly.

**Positioning note** (`video_analysis_shuomi`): the owner explicitly does not
want Notion/Obsidian complexity — a focused, non-overwhelming tool.

**Release state:** v1.3.6, `versionCode` 11 (`odyssey/version.json` — the
single source; `android/app/build.gradle` parses it, do not hardcode a version
there). Live on Vercel, APK at `/downloads/odyssey-latest.apk`.

---

## 2. TECH STACK (from `odyssey/package.json` — exact)

| Layer | Choice |
|---|---|
| Framework | Next.js **16.3.5** (NOT 14 — `PHASE_0_AUDIT_REPORT.md` says 14; that is a documented factual error), App Router, React 19.2.8 |
| UI | Tailwind CSS v4 via `@tailwindcss/postcss`; `lucide-react`, `framer-motion` 13.2.0, `tw-animate-css`, `@base-ui/react`, `shadcn` 4.21 |
| State | Zustand 5 — 7 stores, see §5 |
| Data | Dexie 4 (`dexie-react-hooks`) `OdysseyDB`, 6 tables, compound indexes, UTC timestamps; `fake-indexeddb` in tests |
| Dates | `date-fns` 4; `react-day-picker` 10. Habit dates are `YYYY-MM-DD` **local** strings |
| Charts | recharts 3 |
| IDs | `uuid` 14 |
| Native | Kotlin (6 `.kt` files), Live Wallpaper Service, hourly + boot workers, cadence notifications, in-place APK updater via FileProvider, **34 bridge methods** |
| Tests | Vitest 3 (`environment: "node"`, no jsdom — §7), coverage-v8 |
| Lint | ESLint 9 + eslint-config-next 16.3.5, plus 6 custom odyssey guard rails (§7) |
| TS | TypeScript 5, `tsc --noEmit` |
| Scripts | `dev` / `build` / `start` / `lint` / `typecheck` / `test`=`vitest run` / `test:watch` |

**Never add a dependency without checking this table first.** The reuse order
is: existing repo code → standard library → already-installed dependency →
new package last (Ponytail rule, `.clinerules` §2).

### Where to run commands

The app is `odyssey/`. **`npm run dev` from the workspace root (`C:\PROJECTS`)
works** — a root `package.json` delegates every script into `odyssey/` via
`npm --prefix odyssey run <script>`. It installs nothing and has no
`node_modules`, so there is no second install to drift out of sync.

Run scripts from either location; both work. Prefer `odyssey/` when you need
`node_modules` resolution or relative paths to resolve naturally. Do **not** add
a `workspaces` field to the root `package.json` — the app is not set up for
workspace hoisting, and declaring one would move dependency resolution out of
`odyssey/node_modules` and break the install.

---

## 3. ROUTES (9, all shipped — `main_plan.md` §2.1)

| Route | Purpose |
|---|---|
| `/` | Circadian landing page (marketing dial, **not** a first-run flow — onboarding gap is XL14/A1) |
| `/habits` | Habit CRUD, categories, streaks, per-habit flame, completion toggle; create/edit modals; date strip, month calendar, heatmaps |
| `/planner` | 24h visual timeline, duration distribution, drag/reschedule, edit-hour modal, live hour marker, infinite date strip, completion-fraction header, clean-slate empty state |
| `/journey` | Scrollable day map, SVG bézier curves, dynamic past/future counts, today-in-view, 9 ranks |
| `/stats` | Month-navigable heatmap, tap-for-24h-overview, hold-to-open-planner, rank badge |
| `/shop` | Diamond store, streak-freeze, XP boosts, daily mystery chest |
| `/wallpaper` | Live engine + static auto-updater, isolated lock/home photos, 1-tap apply, hourly toggle, cadence notifications, schedule sync |
| `/day-schedule` | Day schedule detail page |
| `/profile` | Profile, rank info, theme switcher, wallpaper toggle, settings sheet, local-data trust badge |

**No `/onboarding` route exists.** `src/lib/utils/onboarding.ts` holds only a
storage flag (`ONBOARDING_STORAGE_KEY`, `hasCompletedOnboarding()`,
`markOnboardingComplete()`) — the flow itself is unbuilt (XL14/A1).

`/profile` is correctly excluded from bottom-nav as a dead route (CONS-3
SHIPPED).

---

## 4. DATA MODEL — `src/lib/db.ts` IS THE CANONICAL SCHEMA

Rule (AGENTS.md #2, `main_plan.md` C9): the live `db.ts` is the schema.
`MASTER_TODO_REVISED.md §20.1` proposes a *different* `Habit` shape (`title`
vs `name`, `streakCurrent` vs `currentStreak`) — an **unapproved** proposal.
Never adopt it wholesale. New fields are additive migrations; deviations need
an ADR in `docs/adr/`.

Dexie `OdysseyDB`, `version(1)`, 6 tables:

| Table | Fields |
|---|---|
| `profiles` | identity + `xp`/`level`/`diamonds`/`streak`/`highestStreak`/`militaryRank`/`integrityScore`/`unlockedBadges`/`equippedItems`/`equippedTheme`/`equippedMascot`/`equippedSound`/`notificationsEnabled` |
| `scheduleBlocks` | `date` (`YYYY-MM-DD`), `startTime`/`endTime` (`HH:mm`), `title`, canonical `category`, `energyLevel?` (`high`/`medium`/`low`), `status` (`pending`/`completed`/`missed`/`pivoted`), `missReason?`, `completedAt?`, `isCommitted` |
| `habits` | `name`, `icon`, `category`, `period?` (morning/afternoon/evening), `timeOfDay?`, `frequency` (daily/weekly), `targetDaysPerWeek?`, `targetDays?` (1=Mon..7=Sun), `currentStreak`, `longestStreak`, `totalCompletions`, `archivedAt?` |
| `habitLogs` | `habitId` + `date` + `completed` (compound) |
| `weeklyReports` | `weekStart`/`weekEnd`, `totalScheduledHours`/`totalCompletedHours`, `completionRate`, `topCategory`, `mostProductiveHour`, `streakAtWeekEnd`, `diamondsEarned`, `xpEarned`, `categoryBreakdown` |
| `inboxItems` | `title`, `timeHorizon` (`today`/`this_week`/`someday`), `estimatedMinutes?`, `priority?`, `category?` |

Indexes are declared in the same `.stores({...})` block (`db.ts:179`) — several are
compound, e.g. `profiles: 'id, userId, …'`, `habitLogs: 'habitId, date, [habitId+date]'`,
`weeklyReports: 'id, userId, weekStart, [userId+weekStart]'`.

Canonical categories are **Title Case** (`SCHEDULE_CATEGORIES`, `HABIT_CATEGORIES`
const arrays in `db.ts:59`/`db.ts:76`):

- Schedule: Work / Study / Health / Sleep / Leisure / Admin / Habits / Buffer
- Habits: Health / Mindfulness / Learning / Productivity / Social / Growth

`normalizeCategory()` (`db.ts:85`) maps any legacy spelling onto the canonical
one, case-insensitively, and **preserves unrecognised values** rather than
dropping them. Colour mapping is still defined **4×** across the app — that is
BUG-1 / CONS-1, tracked in Phase 5 §7.2.

**P0-T3 remains `PARTIAL`**: the helper is shared, but the type union is still
dual-case — `ScheduleBlock.category:102` and `Habit.category:117` are both
`Category | (string & {})`, which accepts any string and so defeats the point of
the union — and `habit-colors.ts` still carries ~50 colour aliases.

**The `.stores({...})` map is at `db.ts:179`, `this.version(1)`.**

---

## 5. STORES (Zustand) AND STATE FLOW

```
db.ts (Dexie/IndexedDB) ──► stores (Zustand) ──► components ──► UI
                ▲                        │
                └──── habit-cache.ts ─────┘ (localStorage mirror, last-known-good)
```

Stores live in `src/lib/stores/` (7 files):

| Store | Role |
|---|---|
| `habit-store.ts` | `habits[]`, `todayLogs` (habitId→HabitLog), `historyLogs` (habitId→date→bool), `todayLogsDate`, `loadedUserId`, **`loading` starts TRUE**, `temporaryWallet`. Actions: `hydrateFromCache`, `fetchHabits`, `fetchTemporaryWallet`, `claimTemporaryWallet`, `add/update/toggle/deleteHabit`, `clearAllHabits`. `XP_PER_COMPLETION = 15` (line 13), `DIAMONDS_PER_COMPLETION` — **named constants per ADR 0001 §7, never inline** |
| `user-store.ts` | profile + wallet + shop + rank in **one** store (33 edges — debt **D2 OPEN**, split is ECON-1, Phase 3) |
| `schedule-store.ts` | schedule blocks |
| `theme-store.ts` | light/dark/system + anti-FOUC inline script in `layout.tsx`, reads `odyssey_theme_mode` |
| `wallpaper-store.ts` | wallpaper state |
| `wallpaper-toggle-store.ts` | **answers the battery question in code**: sets native `wallpaper_enabled=false`, stops the 30 FPS loop, cancels the hourly alarm |

**Enforced boundaries** (`eslint.config.mjs`) — bypassing these is a lint error,
not a style preference:

- `odyssey/storage-boundary` — all `localStorage` access goes through
  `src/lib/utils/logger.ts` (`readString`/`readJson`/`readBool`/`readNumber`/
  `writeString`/`writeJson`/`remove`/`has`, plus `logWarn`/`logError`). 85
  direct call sites were removed in P8.
- `odyssey/bridge-boundary` — all native access goes through
  `src/lib/utils/android-bridge.ts` (`nativeBridge()`/`hasNative()`/
  `callNative()`/`callNativeBool()`). Never touch `window.OdysseyAndroid`,
  `window.Android` or `window.AndroidWallpaper` directly — 59 duplicated
  blocks were removed in P8.

**Known wart (D5 OPEN):** planner/journey/stats bypass Zustand and read `db`
directly. Two data-access styles coexist. Not to be fixed opportunistically.

### Reward economy (ADR 0001, Accepted 2026-10-03 — READ BEFORE TOUCHING REWARDS)

Two balances: the **Temporary Wallet** (pending, derived, recomputed from
`habitLogs` on every fetch — never stored) and **Profile XP** (`user.xp`,
mutable only via an explicit claim).

Lifecycle: a habit completed on day D → if D is today it shows as
accrued-today and is **not** claimable → once D is past, unclaimed, and the
habit was due on D, it sits in `unclaimedDays` at `completions × 15` XP → the
user taps Claim → XP + diamonds move to the profile and D is marked claimed.

**EARN rule:** a habit must be **scheduled for D AND completed on D** — neither
alone suffices. Fixed in `67c8c5b`, uses `isHabitScheduledOnDate()` from
`habit-colors.ts`.

Open defects: claim record lives in localStorage not the DB (7.1); payout is
written before the claim record (7.2); streak inflated by days claimed (7.4);
`Math.max(1, …)` advances the streak on an empty claim (7.5). `calculateRank()`
derives rank purely from streak and ignores its `efficiency` param. Level curve
is flat: `floor(xp / 500) + 1`; the researched `100 × L^1.5` curve is **DEFERRED**
to v2.0 (ECON-2, contradiction C3).

### Pure-logic modules — the only unit-testable surface

- `src/lib/utils/habit-progress.ts` — `getDayHabitProgress()` (scheduled/
  completed/eligible counts; the denominator falls back to `eligible` on rest
  days; `percent` is **null, not 0**, on an empty day so the UI can say
  "nothing scheduled" instead of a confident false 0%; `isAllCompleted` requires
  a non-empty day), `isHabitCompletedOnDate()` (today read from **both**
  `todayLogs` and `historyLogs` so pre-midnight completions survive rollover),
  `getHeaderSlotKeys()` (namespaced `icon:`/`label:` keys — see §9).
- `src/lib/utils/habit-colors.ts` — `getHabitScheduledDays()`,
  `isHabitScheduledOnDate()`, `getHabitColor()`, `getLocalTodayStr()`.
  ~50 colour aliases remain (10.11).
- `src/lib/utils/gamification.ts` — `calculateRank()`, `getRankInfo()`,
  `getNextRank()`; 9 ranks, Beginner → Legend.
- `src/lib/utils/planner-empty-state.ts` — `shouldShowPlannerEmptyState()`
  (M3): loading is checked first and short-circuits, so a screen that reads the
  DB directly can never assert "this day is blank" during the read window.
- `src/lib/utils/day-status.ts` — 18-hour fully-filled-day rule for block `status`.
- `src/lib/utils/journey.ts` — `getJourneyDayNumber()`, `getDateForJourneyDay()`.
- `src/lib/utils/wallpaper-generator.ts` — canvas render + `build24HourlyBlocks()`.
- `src/lib/utils/confetti.ts` — `triggerStreaksConfetti()`.
- `src/lib/habit-cache.ts` — localStorage mirror (read/write/clear per user).
- `src/lib/seed.ts` — `seedInitialData()` is an **empty function** (dead code,
  debt **D8**), `resetAllDataToZero()`.
- `src/lib/categories.ts` — category helpers (tested).

---

## 6. GOVERNING DOCUMENTS (authority order is binding)

```
1. context.md            <- THIS FILE. Orientation + durable learnings.
2. main_plan.md          <- order, priority, STATUS. Authoritative.
3. ACTUAL CODE           <- reality. Code always beats any document.
4. DEVELOPMENT_PLAN.md   <- engineering conventions + workflow (canonical for HOW)
5. MASTER_TODO_REVISED.md<- 140-item catalogue + rationale (WHAT and WHY)
6. All other Market Research docs -> evidence only, non-binding
```

- **`main_plan.md`** (~824 lines): §0 how-to-use + status legend
  (SHIPPED/PARTIAL/NOT BUILT/BLOCKED/GATED/DEFERRED/NOT APPROVED); §1 binding
  10-step agent workflow (Step 9b adds the `context.md` write-back) +
  Definition of Done; §2 verified baseline (§2.1
  shipped table, §2.2 debt register D1–D9 — D4 and D7 marked **Fixed**);
  §§3–9 the 7 phases with `src:`
  citations and `also:` cross-refs on every line; §10 contradictions C1–C10;
  §11 source index; §12 changelog.
- **`DEVELOPMENT_PLAN.md`**: §0 why it exists (Market Research is ~300 KB of
  overlapping, contradictory passes — this doc is the decision layer); §1
  authority map; §2 conflict answer key (ID collisions; `MASTER_TODO_REVISED`
  wins; schema conflict; phase-order conflict); §3 baseline reconciliation;
  §4 P0–P8 with machine-verifiable exit gates; §5 UI/UX rules; §6 workflow
  rules (6.1 one-feature-per-commit, 6.2 no half-finished uncommitted work,
  6.6 the 7-step change protocol); §7 risk register R1–R12.
- **`AGENTS.md`** (repo `odyssey/`): the Next.js-16 agent-rules block
  (auto-regenerated by `next dev` — committing it keeps the tree clean) + the
  10 non-negotiables + FEATURE_WORKFLOW pointer + Hindsight memory rules.
  This is the file every agent auto-loads; it now points at this file.
- **`CLAUDE.md`**: a one-line `@AGENTS.md` include.
- **`FEATURE_WORKFLOW.md`**: BEFORE (brief in app terms, no code/jargon, 7
  sections, approval gate) → DURING (one feature, verification matrix) → AFTER
  (plain-language report, honest about visibility, commit, STOP).
- **`.clinerules`** (workspace **parent**, `C:\PROJECTS`): §0 source of truth,
  §1 Graphify-first search, §2 Ponytail reuse hierarchy, §3 plan-first surgical
  execution, §4 UI standards, §5 pre-commit review.
- **`docs/adr/0001-reward-economy.md`**: the reward spec (see §5).
- **`docs/HINDSIGHT.md`** (repo parent `C:\PROJECTS`): Hindsight server setup.
- **`FEATURES.md`**: supplementary register. **Status has MOVED to
  `main_plan.md`** (C10). Its NEXT UP table and the P8 cleanup-campaign record
  are still useful; its status columns are not.
- **`inefficiencies.md`** (repo `odyssey/`): the audit whose findings became the
  P8 guard rails.

### The 7 phases (`main_plan.md` order — overrides all other phase numbering, C1)

1. **Small things, polish, micro-interactions, stabilise** — M1–M18 micro,
   S1–S25 tier-2, CONS-1–3 cross-surface, P0-T2/T3/T6/T7 stabilise. Exit gate:
   gates clean, P0-T6 adapter landed, CONS-2 narrow-screen sweep, no uncommitted
   work.
2. **Real feature work added to the app** — onboarding A1–A8, habits B1–B14,
   schedule C1–C8, focus HD1–HD30, stats E1–E13, reminders G/N, reflection J.
3. **Avatar, customisation, shop** — F1–F11, XL1–XL4. Economy correctness first:
   D9 specified (ADR 0001), ECON-1 store split, ECON-2 deferred.
4. **Social tab** — H1–H7, SC1–SC10, XL8–XL11. **The first phase that breaks
   local-first**: needs backend + accounts + UGC moderation + Play Families
   compliance **before any user publishes** (GATE-1..4). Social-before-AI is
   owner-chosen but an OPEN dispute (**C1**) — confirm before starting Phase 4.
5. **Wallpaper + widgets** — G1–G12+, BUG-1/BUG-2 live here (§7.2). The core
   differentiator; the engine ships, this phase deepens it.
6. **Polish, non-AI Pro features, third-party integrations** — SC7/SC9/SC10/F9.
7. **AI, in three tiers** — A local deterministic rules AI-1–AI-11 (zero cost,
   offline) → B statistical ML AI-12–AI-16 → C LLM coaching AI-17–AI-23 + I21
   (cloud, opt-in, gated). Non-negotiable AI rules: sufficient history, explain
   the evidence, dismissable/correctable, **never** auto-change, **never** block
   saving, **never** diagnose, correlation not causation.

---

## 7. ENVIRONMENT, TOOLCHAIN, TESTING

### Shell — Windows / PowerShell 5.1

- Commands run from the working directory; use the tool's `workdir` parameter
  rather than `cd`. Default to `workdir: C:\PROJECTS\odyssey` — the app root.
  Quote paths containing spaces (`'Market Research'`).
- **Not available:** `head`, `wc`, `chmod`, heredocs (`<<EOF`), `cat -n`.
  Use `Get-Content`, `Select-Object`, `Set-Content`.
- Dependent commands: `cmd1; if ($?) { cmd2 }`. `&&` does not work in PS 5.1.
- File reads/edits go through the dedicated file tools, not shell cmdlets.

### Dev server

`Start-Process npx next dev -WindowStyle Hidden`, then poll. Port 3000 is
sometimes taken and the server has come up on **3001** — always verify with
`Get-NetTCPConnection -LocalPort 3000,3001` rather than assuming.

### Gates — cheapest that can fail, first

```
npx tsc --noEmit  →  npx eslint <files>  →  npx vitest run  →  npm run build  →  Kotlin
```

`tsc` does **not** read Kotlin. If Kotlin changed, it must be compiled.

**The Kotlin build has no `gradlew` in the repo** (only `gradle/` config), and
the Kotlin daemon cannot start on this machine's JDK — Android Studio bundles
JBR 25.0.3, but the project is pinned to Kotlin 1.9.22 / AGP 8.2.2 / Gradle 8.4
(2023-era) and the daemon dies with `IllegalArgumentException: 25.0.3`. So the
in-process Kotlin compiler is used. **Treat any Kotlin change as unverified
until `:app:assembleDebug` has actually run** (risk R12) — say so honestly
rather than implying it passed.

### Tests

`vitest.config.ts`: `environment: "node"`, `include: ["src/**/*.test.ts"]`,
`@` → `./src`. **No jsdom by design** (P0-T5) — every target is a pure function
and a DOM environment would only slow and fragilise them. Co-locate tests next
to their source.

Current: **10 suites, 116 tests, all green** (verified this session:
`Test Files 10 passed (10)`, `Tests 116 passed (116)`).

| Suite | Covers |
|---|---|
| `src/lib/utils/habit-progress.test.ts` | day progress, slot keys |
| `src/lib/utils/habit-colors.test.ts` | scheduling + colour |
| `src/lib/utils/gamification.test.ts` | rank maths |
| `src/lib/utils/day-status.test.ts` | 18-hour fill rule |
| `src/lib/utils/wallpaper-generator.test.ts` | block building |
| `src/lib/utils/onboarding.test.ts` | onboarding flag |
| `src/lib/utils/wallpaper-toggle-store.test.ts` | battery-question behaviour |
| `src/lib/categories.test.ts` | category normalisation |
| `src/lib/habit-cache.test.ts` | localStorage mirror (`fake-indexeddb`) |
| `src/lib/utils/planner-empty-state.test.ts` | the loading-vs-empty guard (M3) |

### ESLint guard rails (`eslint.config.mjs`)

Next `core-web-vitals` + `typescript`, then six odyssey rules:
`no-empty` (empty catch is an **error** — this is how 77 silent failures
happened), `no-console` (warn; `warn`/`error` allowed),
`@typescript-eslint/no-explicit-any` (error — zero remain), `eqeqeq` smart,
`prefer-const`, plus the two boundary rules in §5.

### Definition of Done (`main_plan.md` §1 + `DEVELOPMENT_PLAN.md` §6.5)

Acceptance criteria met **and manually verified**; `tsc`/lint/build/test clean
(+ Kotlin compiled if Kotlin changed); light **and** dark at 390px and two wider
widths; reduced-motion honoured; empty/loading/error/long-content states
handled; **offline works** (local-first is a product promise); zero analytics or
telemetry; any new schema field documented in `db.ts` with a migration note;
`main_plan.md` updated in the same commit; **this file updated** (§0.2);
**committed** — uncommitted work is in progress, not done.

### Design system

- `src/app/globals.css` owns **all** colour. `:root, .light` (line 4) and
  `.dark` (line 60). Light: bg `#F8F5FB`, primary `#6C00FF` violet. Dark: bg
  `#0b1326`, primary `#5af0b3` mint. Journey tokens: `--journey-completed`,
  `--journey-upcoming`, node bg/text/border.
- **Never raw hex in components** — CSS-var Tailwind tokens only
  (`bg-surface-container`, `text-on-surface-variant`, `border-outline/10`).
- Motion: framer-motion `AnimatePresence` + `motion`; keyframes in `globals.css`
  (`modalBackdropFadeIn/Out`, `modalSheetSlideUp/Down`, `floatSlow`,
  `radarWave`, `pulseGlow`, `shimmerGlow`, `pageFadeIn`, `viewSlideIn`) plus
  `twFadeIn`/`twSlideInFromBottom`/`twZoomIn` compat utilities. Decorative
  animations (`date-ring-pulse`, `keystonePulse` M2, `slateSweep`/`slateTapPulse`
  M3) put their keyframes inside `@media (prefers-reduced-motion: no-preference)`
  and set `animation: none` under `reduce` — no JS, no hydration-time flash.
- Layout: mobile-first flexbox, `sm:/md:/lg:` only, **no hardcoded pixel
  widths** (`w-full max-w-md`, layout `max-w-xl sm:max-w-2xl`).
- Every interactive element needs explicit hover/focus/active/loading/disabled
  states, must be keyboard reachable with a visible focus ring, and must honour
  reduced motion.
- **Visual verification:** `puppeteer-core` + system Chrome at phone width
  (390px — also 360 and 430), before/after screenshots, light **and** dark.
  *Do not assert a visual change works — screenshot it or measure it.*
  Screenshots catch things assertions miss: the M3 pulse rendered two (+)
  marks side by side while every scripted assertion passed.

---

## 8. PEOPLE, MEMORY, RESEARCH LANDSCAPE

- **Owner:** project owner. Sets goals, approves plans and briefings, and
  decides phase order. Wants work done with verification and dislikes chatter.
  Treat any phase-gate or scope question as theirs alone to answer.
- **Agents:** any AI or human picking up work follows §0 → `main_plan.md` §1 →
  `FEATURE_WORKFLOW.md`. Architect + implementer in one: read the cited spec,
  state the plan, execute surgically, verify with evidence, report honestly,
  commit, stop.
- **Hindsight memory:** persistent cross-session memory via a local
  `hindsight-api` on `http://127.0.0.1:8888` (Dahl LLM endpoint). Retain
  architecture decisions, non-obvious constraints and bug fixes **with full
  context** — it extracts the facts itself, so do not pre-summarise. Recall
  before non-trivial work in an unfamiliar area.
  - On Windows the `uvx hindsight-embed memory …` subcommand **does not work**
    (it shells out to `/bin/bash` and needs WSL). Use the REST API instead —
    see `C:\PROJECTS\docs\HINDSIGHT.md`.
  - **Never** store secrets, API keys or user PII.
  - Config lives in `C:\PROJECTS\.env` (git-ignored). Verify with
    `.\.venv\Scripts\python.exe test_hindsight.py`.
- **Graphify:** `graphify-out/GRAPH_REPORT.md` + `graph.json`, plus an MCP
  server (`query_graph`/`get_node`/`get_neighbors`/`god_nodes`/`shortest_path`/
  `list_prs`). **`.clinerules` §1 makes this the first search tool** — query the
  graph before a broad filesystem scan. `graphify update .` refreshes it; the
  CLI is on PATH via the Python 3.11 Scripts folder (it warns that the installed
  skill is newer than the package — harmless).

### Research corpus (`Market Research/`, tracked in git except `Apps Videos/`)

- **`MASTER_TODO_REVISED.md`** (~1320 lines) — canonical IDs. §1 product
  definition, §6 habit science + templates, §7 schedule synthesis, the
  140-item catalogue, §19 phase matrix, §20 schema proposal (**unapproved**).
- `PRODUCTION_PLAN.md` — Phase 0–7 framing and exit gates (superseded on conflict).
- `PHASE_0_AUDIT_REPORT.md` — verified-vs-assumed; **one known factual error**
  (says Next.js 14; the app is 16.3.5).
- `TODO.md`, `AI_TODO.md`, `MASTER_TODO.md` — **SUPERSEDED archives**. Their
  `AI-n`/`XL-n`/`M-n`/`S-n` IDs collide with the canonical ones. Never cite an
  ID without the `MASTER_TODO_REVISED.md` definition attached (C7/C8).
- `App_Reviews.md`, `Review_Analysis.md`, `UI_UX_review.md` — competitor
  teardowns (Structured, Sunsama, Motion, Reclaim, TimeStripe, Fabulous, Finch).
- `Habit Research/` — `integration_roadmap.md` (Tiers M/S; the research home of
  M9), `feature_lists.md`, `books_brainstorm_and_habits.md`.
- `Schedule Research/` — `competitor_analysis.md`, `feature_lists.md`.
- `Apps Videos/` — 15 competitor `.mp4`s, 265 MB, **git-ignored**, local only.

---

## 9. SESSION LOG — durable learnings

Newest first. One entry per shipped feature or hard-won lesson. Facts, not
narrative. **Add an entry in the same commit as the work** (§0.2).

### 2026-10-07 — M3 planner clean-slate state, and a false zero the loading flag caught

**Shipped:** a day on the planner with nothing on it now reads as a deliberate
blank instead of 24 identical "Empty Slot" rows.
`src/components/planner/planner-empty-state.tsx`. No button by design — the copy
points at the tap-an-hour gesture that already works on every row, so no second
path to the same action. Illustration is the planner's own rail spine with one
highlighted hour, in CSS-var tokens. `slateSweep` (highlight travelling the
spine) and `slateTapPulse` (glow behind the highlighted hour) are new keyframes
in `globals.css`, gated inside `prefers-reduced-motion: no-preference` like
`keystonePulse`. Verified reduced motion really silences them
(`animationName: "none"`, not just the class applied).

**The spec copy was wrong and was changed with owner approval.** Research says
*"Tap + or import a routine template to begin."* Neither exists: there is no +
button (you schedule by tapping an hour), and template import is `B1`/`HD29`,
still `NOT BUILT` in Phase 2. Shipping it would have put a promise on screen
that nothing backs. Now reads *"Tap any empty hour to schedule your first
block."*

**Also split the copy for past days.** "Your day is a clean slate" on a day that
has already passed describes a choice the user did not make. Past blank days now
read *"Nothing was scheduled on this day"*, with a shape that is otherwise
identical.

**The false zero this would have shipped — worth generalising:**
`shouldShowPlannerEmptyState()` checks `blocksLoading` **first** and
short-circuits. The planner reads `db` directly rather than through the schedule
store (debt **D5**), so `blocks` is `[]` on first paint for **every** day,
including days that have blocks. Testing `blocks.length === 0` alone asserts
"this day is blank" during the window where the truth is "we have not looked
yet" — a full day would flash "Your day is a clean slate" at the user. Same
class as the habit readout printing `0/0 (0%)` with no habits and as
`percent: null` in `habit-progress.ts`. The `finally` block clears the flag on
the failure path too, so a **failed** read shows the timeline rather than
claiming the day is empty. 6 tests → 116 green.

**A design iteration, recorded because the first version was wrong:** the pulse
originally floated as a separate (+) badge over the illustration, which put two
(+) marks on screen and read as a duplicate control. It now animates the glow
behind the single highlighted hour, opacity only — an SVG rect has no
box-shadow ring to expand, and scaling it distorts its stroke.

**Transferable lessons:**
- Any surface that bypasses a store (D5) has no `loading` flag to inherit.
  Write one before adding a state that asserts an empty result, or you will
  render a confident claim during the read window.
- Clear an ad-hoc loading flag in `finally`, not on the success path. "Could not
  find out" must not render as "there is nothing there".
- **Hydration marker, corrected:** `context.md` previously recorded checking
  `#__next` and React expandos. On a **production** build in this app `#__next`
  does **not** exist — the check reported `false` for a fully working, fully
  hydrated page. The reliable signal is counting nodes carrying a
  `__react*` expando key (864 on `/planner`). Believing the `#__next` check
  would have meant re-diagnosing a working build as broken. React-keyed node
  count is the marker to use.
- Screenshots are the fastest way to catch a duplicate control. Every assertion
  in the script passed while two (+) marks sat in the picture.

### 2026-10-07 — Root `package.json` launcher

`npm run dev` from `C:\PROJECTS` failed with `ENOENT … package.json`, because the
app and its manifest live in `odyssey/`. Added a root `package.json` that
delegates all eight scripts via `npm --prefix odyssey run <script>`, so the same
commands work from either directory.

Deliberately **not** a workspaces setup: no `workspaces` field, no root
`node_modules`, nothing installed. A root launcher cannot drift from the app's
real script list the way a duplicated script block would, and adding
`workspaces` would hoist dependency resolution out of `odyssey/node_modules` and
break the install.

### 2026-10-07 — M2 habits empty state, and a headless-verification trap

**Shipped:** the zero-habit state on `/habits` is now a keystone-block
illustration with a pulsing (+) and the line *"Your journey begins with one
keystone habit."* New component `src/components/habits/habits-empty-state.tsx`.
The keystone is an inline SVG filled with `var(--primary-container)` /
`var(--primary)`, so it re-themes with light/dark — no raw hex in a component.
The pulse is a new `keystonePulse` keyframe in `globals.css` whose keyframes sit
inside `@media (prefers-reduced-motion: no-preference)`, matching how
`date-ring-pulse` already does it. Verified reduced-motion actually silences it
(`animationName: "none"`), not just that the class was applied.

**Also removed a false zero.** The day readout above the list printed
`0/0 (0%)` when there were no habits at all. With no denominator, that is a
confident false zero — the exact failure the M9 header placeholder was built to
prevent. It now reads "Nothing scheduled yet".

**The trap — worth knowing before you trust any browser verification here:**
against `next dev` on port 3010, **no click worked at all.** The create-habit
modal did not open from the new CTA, did not open from the pre-existing
"New Habit" header button, and the List→Grid view switcher did not toggle. The
cause was not app code: the DOM nodes carried **no React expando keys** and
`#__next` was absent, i.e. the page never hydrated. Re-running the identical
script against `next start` (production build, port 3100) gave
`reactExpandos: 2`, `onClickPresent: true`, the view switcher toggling, and the
modal opening with its backdrop.

**Transferable lessons:**
- **Verify interaction against a production build, not `next dev`.** A
  non-hydrated dev page fails every click identically, which reads exactly like
  a broken button. Check for React expandos on a node before believing a click
  did nothing.
- **Always run a control.** Comparing the pre-existing button against the new one
  is what proved this was environmental rather than a regression. Without that
  control the obvious conclusion — "my new button is broken" — would have been
  wrong.
- **A confident zero needs a null state.** `percent: null` (habit-progress) and
  "Nothing scheduled yet" are the same idea in two places. When a denominator
  does not exist, say so.

### 2026-10-07 — `context.md` adopted as the agent entry point

The file existed but was **structurally corrupted**: text was severed
mid-sentence and re-appended at the end (§4 cut off at "frequency daily/weekly,",
the 7-phase list stopped at phase 2, and the tail was orphaned fragments of §1,
§4, §5 and §6). Every fact below was re-verified against source this session and
the file was rewritten in one piece. `main_plan.md` §0/§1/§9/§11/§12 and
`AGENTS.md` now mandate reading it first and writing it back before committing.

Verified during that pass: 9 suites / 110 tests green · `vitest.config.ts` is
node-env with no jsdom · `android-bridge.ts` is 829 lines with the
`nativeBridge()` adapter already in place (**so P0-T6's `NOT BUILT` status is
stale — the adapter landed, see §12**) · `onboarding.ts` is a flag with no
route · stores are 7, in `src/lib/stores/` · version lives in `version.json`
and `build.gradle` parses it.

### 2026-10-04 — M9 completion-fraction header, and the slot-key bug

**Shipped:** an animated completion-fraction header above the planner date strip
— in-flow, **not pinned** (pinning was dropped, C4) — built from a swappable
`HeaderSlot[]` array so later readouts append without touching the component.
Two rows (readouts above, progress bar below, so a long label can never shove
the bar). A same-height shimmer placeholder, because an empty store must never
print a confident false `0/0`. Numbers reflect the **selected** day, not today.
The decorative bar is hidden from assistive tech. Arithmetic lives in
`lib/utils/habit-progress.ts`.

**The bug (caught from user screenshots):** `3/5 Habits Done · 60%` rendered
*below* the date strip and `0/5 · 0%` showed despite 3 of 5 being checked. One
bug, two stack frames: `iconKey` and `labelKey` both evaluated to the bare
string `"rest"` on a rest day, producing a duplicate key inside one shared
`AnimatePresence` → React threw *"Encountered two children with the same key"*.
Deterministic, not flaky — `isAllCompleted` requires `scheduledCount > 0`, so on
a rest day the icon is **always** `"rest"`.

**Missed in the first verification pass, for two reasons worth remembering:**
(1) only `console.warn` was hooked, but React key errors go to `console.error`;
(2) five daily habits were seeded immediately after the rewrite, so
`isRestDay` never became true during testing.

**The fix:** `getHeaderSlotKeys()` — a pure helper returning namespaced
`icon:<state>` / `label:<state>`, making collision structurally impossible. Six
regression tests (rest day, empty/null/undefined lists, partial, complete, label
changes on fraction change, icon stable mid-fill) → 104 → 110 green. A scan of
all 7 `AnimatePresence` sites and every `key={}` in `src` confirmed this was the
only derived-key collision.

**Transferable lessons:**
- Derived animation keys must be namespaced by slot (`icon:` vs `label:`), not
  bare state strings.
- When visually verifying animation, hook `console.error`, and **make the rare
  state reachable** — seeded data rarely produces it.
- A `layout`-driven `AnimatePresence` slot must animate **opacity only**;
  transform animations in those slots fight the layout transition.

---

## 10. GIT + WORKING TREE + LIVE TASK STATE

**Update this section every session.** It is the fastest way for the next agent
to know where things stand.

- Remote `origin`: `https://github.com/harmansingh671671-ops/Tracker.git`,
  branch `main`.
- HEAD at last update: `34ce528` — *"chore(root): add a package.json launcher so
  npm scripts work from the workspace root"*, on top of `31933ca` (M2 habits
  empty state). Before that, `b72842d` adopted `context.md` as the agent entry
  point and wired `AGENTS.md` / `main_plan.md` / `FEATURE_WORKFLOW.md` to it.
- Working tree: clean apart from the M3 work described above, which is staged for
  its own commit. The root `package.json` launcher (see §2, "Where to run
  commands") is the only file outside `odyssey/` and holds no dependencies.
- Lint on the touched files: **0 errors, 10 warnings** — all pre-existing
  `no-unused-vars` in `planner/page.tsx` (`useScheduleStore`, `ChevronLeft`,
  `Flame`, `Check`, `Radio`, `Zap`, `CatIcon`, …). The M3 files add none.
- Tests: **10 suites, 116 tests, all green** (M3 adds `planner-empty-state.test.ts`).
- **Verify interaction against `next start`, not `next dev`** — see §9, 2026-10-07.
  On this machine a `next dev` page renders but never hydrates, so every click
  silently no-ops.
- **Hydration marker is a React-keyed node count, not `#__next`** — see §9,
  2026-10-07. The old `#__next` check reads `false` on a working production build.
- Puppeteer is **not** a project dependency. Verify with `puppeteer-core` driven
  by the system Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`),
  installed outside the repo, so no dependency is added to the app.
- `.clinerules` lives at the workspace **parent** (`C:\PROJECTS`), with paths
  prefixed `odyssey/`. It is itself git-ignored.
- `Market Research/` **is** tracked (deliberate; decision recorded in the
  `main_plan.md` changelog 2026-10-05). Only `Apps Videos/` is ignored.

### 2026-10-07 — M4 Perfect Day reward system, and graphify availability

**Shipped (partial):** the reward calculation engine for the perfect-day bonus (`lib/utils/reward-rules.ts`), including `isPerfectDay()`, `computeDayReward()`, `advanceStreakForSettlement()`. Also shipped the `PerfectDayCard` component (`components/habits/perfect-day-card.tsx`) with CSS glow animation.  
**Not yet integrated:** the component is not mounted in any page; it needs a consumer that calls `isPerfectDay()` and passes the result to `<PerfectDayCard show={...} isToday={...} />`.

**Graph freshness note:** `graphify update .` executed at start of session, but the CLI is not available in this environment (missing from `PATH` and no local bin). The graph at `graphify-out/GRAPH_REPORT.md` is built from `dda4383d` and should be regenerated when graphify is accessible, before using it for impact analysis.

### 2026-10-07 — M5 Creation feedback toast, and M4 integration status

**Shipped:** M5 creation confirmation toast now names the first milestone. Habit creation dialog shows: "Your journey with {Habit Name} begins now. First milestone: 3-day streak." This matches the spec in `MASTER_TODO_REVISED.md` §19.

**M4 integration status:** the `PerfectDayCard` component remains unmounted. The reward engine (`reward-rules.ts`) is fully tested and working; finding the right consumer location (likely `habits/page.tsx` or `day-schedule`) is a follow-up task.

### Where the work is right now

| Item | State |
|---|---|
| Phase | **1** — polish, micro-interactions, stabilise |
| Next feature | **M6** — First-open welcome banner (3 pillars). `NOT BUILT` · also: `A8` |
| Also open in Phase 1 | P0-T3 (category type still dual-case), P0-T6 (829-line file split), P0-T7 (`seedInitialData()` dead), CONS-1, CONS-2 |
| Phase 1 exit gate | Gates clean · no uncommitted work |
| Next after Phase 1 | Phase 2 — onboarding `A1`/`XL14` is the largest gap between the app and its own research |
| Staged/approved | Nothing awaiting approval (`FEATURE_WORKFLOW.md` §CURRENTLY STAGED FEATURE is empty) |

---

## 11. RULES — DO / DO NOT (binding; distilled from `AGENTS.md`, `FEATURE_WORKFLOW.md`, `DEVELOPMENT_PLAN.md` §6, `.clinerules`)

**DO**

- Read this file → `main_plan.md` → the cited `src:` spec **in full** → every
  `also:` cross-reference.
- Get the feature **ID and phase**, brief it in app terms, and get **explicit
  approval** before writing code.
- Work **one feature per commit**; commit it before starting the next.
- Update `main_plan.md` (checkbox + status) **and this file** (§0.2) in the same
  commit as the code.
- Reuse in this order: existing repo code → standard library → installed
  dependency → new package last.
- Prefer line-range reads; **query Graphify before a broad scan**; run an
  impact analysis before editing a shared file.
- Run the cheapest gate that can fail, first.
- Visually verify at 360/390/430px, in light **and** dark, with reduced motion
  checked — and screenshot rather than assert.
- Handle empty, loading, error, long-content and offline states.
- Ask the **battery question** before writing anything that runs while the app
  is closed: what wakes the device, what is the default when state is
  unreadable, and exactly what happens when the user turns it off. Every new
  persistent flag ships **default-off** (`readBool(key, false)`).
- Speak in app terms in briefings and reports — no paths, no function names.
  Be honest about visibility: if a change is internal and the user will notice
  almost nothing, say so plainly.
- Report unverified work as unverified.

**DO NOT**

- Build anything listed **OPEN** in the contradictions log (C1 social-before-AI,
  C2 spectrum bar, C4 avatar damage, C6 FD3 split) or **NOT APPROVED**
  (cash-out, charity rewards).
- Adopt the `§20.1` schema, or cite an `AI-n`/`XL-n`/`M-n`/`S-n` ID from any
  source other than `MASTER_TODO_REVISED.md`.
- Put raw hex in a component, or ship a UI that works in only one colour mode.
- Use hardcoded pixel widths.
- Animate transform inside a `layout`-driven `AnimatePresence` slot.
- Bundle features, make speculative refactors alongside a feature, or talk
  about the next feature while one is open.
- Add analytics or telemetry — this is a zero-tracking product.
- Let an AI feature auto-change, block, or diagnose anything.
- Leave half-finished uncommitted work (R11 — the theme-system precedent).
- Ship unverified native code (R12).
- Claim tests pass without the counts and exit code.
- Maintain status anywhere but `main_plan.md`.
- Re-ask the owner for context that is written here. If it is missing or
  wrong, that is what §0.2 is for.

---

*If this file disagrees with reality, reality is right — fix this file in the
same commit.*
