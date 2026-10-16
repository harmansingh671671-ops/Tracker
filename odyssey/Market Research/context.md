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
| State | Zustand 5 — **6** stores, see §5 |
| Data | Dexie 4 (`dexie-react-hooks`) `OdysseyDB`, **7 tables** (Dexie `version(2)`), compound indexes, UTC timestamps; `fake-indexeddb` in tests |
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
| `/` | **The first-run flow** (`A1`/`XL14`): intro → circadian preview → welcome + add habit → your habits → Day 1 commitment hold. One way in; hands off to `/planner` |
| `/habits` | Habit CRUD, categories, streaks, per-habit flame, completion toggle; create/edit modals; date strip, month calendar, heatmaps |
| `/planner` | 24h visual timeline, duration distribution, drag/reschedule, edit-hour modal, live hour marker, infinite date strip, completion-fraction header, clean-slate empty state |
| `/journey` | Scrollable day map, SVG bézier curves, dynamic past/future counts, today-in-view, 9 ranks |
| `/stats` | Month-navigable heatmap, tap-for-24h-overview, hold-to-open-planner, rank badge |
| `/shop` | Diamond store, streak-freeze, XP boosts, daily mystery chest |
| `/wallpaper` | Live engine + static auto-updater, isolated lock/home photos, 1-tap apply, hourly toggle, cadence notifications, schedule sync |
| `/day-schedule` | Day schedule detail page |
| `/profile` | Profile, rank info, theme switcher, wallpaper toggle, settings sheet, local-data trust badge |

**There is no separate `/onboarding` route, and there does not need to be one.**
The flow IS `/`. `src/lib/utils/onboarding.ts` holds the first-run storage flag
(`ONBOARDING_STORAGE_KEY`, `hasCompletedOnboarding()`,
`markOnboardingComplete()`); the step machine and commitment maths are pure
functions in `src/lib/utils/onboarding-flow.ts` (30 unit tests), and the steps
live in `src/components/onboarding/`.

Two rules worth not re-deriving:

- **Step index is in-memory only.** Reloading mid-flow restarts at step 1, but
  habits already added are in IndexedDB and survive. A returning user who cleared
  the flag is re-onboarded and would meet their own habits again on step 3 —
  which is why that step tracks the ids *this flow* created instead of reading
  the store.
- **`addHabit` needs a `userId`.** The flow awaits `getOrCreateUser()` on mount.
  Without it the first habit fails to write silently and step 3 looks empty for
  no visible reason.

`/profile` is correctly excluded from bottom-nav as a dead route (CONS-3
SHIPPED).

---

## 4. DATA MODEL — `src/lib/db.ts` IS THE CANONICAL SCHEMA

Rule (AGENTS.md #2, `main_plan.md` C9): the live `db.ts` is the schema.
`MASTER_TODO_REVISED.md §20.1` proposes a *different* `Habit` shape (`title`
vs `name`, `streakCurrent` vs `currentStreak`) — an **unapproved** proposal.
Never adopt it wholesale. New fields are additive migrations; deviations need
an ADR in `docs/adr/`.

Dexie `OdysseyDB`, **`version(2)`**, **7 tables** — `profiles`, `scheduleBlocks`, `habits`, `habitLogs`, `weeklyReports`, `inboxItems`, and `rewardSettlements`:

| Table | Fields |
|---|---|
| `profiles` | identity + `xp`/`level`/`diamonds`/`streak`/`highestStreak`/`militaryRank`/`integrityScore`/`unlockedBadges`/`equippedItems`/`equippedTheme`/`equippedMascot`/`equippedSound`/`notificationsEnabled` |
| `scheduleBlocks` | `date` (`YYYY-MM-DD`), `startTime`/`endTime` (`HH:mm`), `title`, canonical `category`, `energyLevel?` (`high`/`medium`/`low`), `status` (`pending`/`completed`/`missed`/`pivoted`), `missReason?`, `completedAt?`, `isCommitted` |
| `habits` | `name`, `icon`, `category`, `period?` (morning/afternoon/evening), `timeOfDay?`, `frequency` (daily/weekly), `targetDaysPerWeek?`, `targetDays?` (1=Mon..7=Sun), `currentStreak`, `longestStreak`, `totalCompletions`, `archivedAt?` |
| `habitLogs` | `habitId` + `date` + `completed` (compound) |
| `weeklyReports` | `weekStart`/`weekEnd`, `totalScheduledHours`/`totalCompletedHours`, `completionRate`, `topCategory`, `mostProductiveHour`, `streakAtWeekEnd`, `diamondsEarned`, `xpEarned`, `categoryBreakdown` |
| `inboxItems` | `title`, `timeHorizon` (`today`/`this_week`/`someday`), `estimatedMinutes?`, `priority?`, `category?` |

Indexes are declared in the same `.stores({...})` block (`db.ts:206`) — several are
compound, e.g. `profiles: 'id, userId, …'`, `habitLogs: 'habitId, date, [habitId+date]'`,
`weeklyReports: 'id, userId, weekStart, [userId+weekStart]'`.

Canonical categories are **Title Case** (`SCHEDULE_CATEGORIES`, `HABIT_CATEGORIES`
const arrays in `db.ts:48`/`db.ts:67`):

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

**The `version(1)` `.stores({...})` map is at `db.ts:206`, and `version(2)` adds `rewardSettlements` at `db.ts:220`** (ADR 0002 — a new table only, no existing table modified, so `up()` has nothing to do).

---

## 5. STORES (Zustand) AND STATE FLOW

```
db.ts (Dexie/IndexedDB) ──► stores (Zustand) ──► components ──► UI
                ▲                        │
                └──── habit-cache.ts ─────┘ (localStorage mirror, last-known-good)
```

Stores live in `src/lib/stores/` (**6** stores — the 7th file there is `wallpaper-toggle-store.test.ts`):

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
- `src/lib/seed.ts` — `resetAllDataToZero()` only. **`seedInitialData()` was removed 2026-10-15** (`P0-T7`, debt **D8** closed): it was an empty function awaited from 3 call sites, so removing it changed nothing observable but took the codebase off a file that exported a no-op as if it did work.
- Category helpers live in `db.ts` itself (`normalizeCategory`, `SCHEDULE_CATEGORIES`,
  `HABIT_CATEGORIES`) and are tested by `src/lib/categories.test.ts`. **There is no
  `src/lib/categories.ts`** — an earlier version of this file listed one; the test imports
  from `./db`.

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

### The phases (`main_plan.md` order — overrides all other phase numbering, C1)

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
4.5. **Performance** — `PERF-0`…`PERF-18` in `main_plan.md` **§6.5**, spec in
    `MASTER_TODO_REVISED.md` §23, **authority `inefficiencies.md` §11** (the 18-item
    master prompt was deleted and imported there verbatim, so there is one source, not
    two plus an anti-drift rule). **Unnumbered on purpose** (§6 is already Phase 4; a
    second "Phase 4" would duplicate it) and **no phase renumbering** — §7–§12 carry 33
    cross-references in `main_plan.md` alone. Adds no features. Absorbs **`POL-1`** from
    Phase 6 (C12). **Starts with `PERF-0`, a mandatory reconcile**: 5 of the 18 items are
    already delivered and 4 of the audit's figures are wrong, so implementing the list as
    written would optimise a 30 FPS loop that `P8-E2` removed.
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

**`Start-Process` NEVER terminates.** It returns as soon as the process spawns and
then leaves the server running **forever**, holding its port. The tool call looks
finished, which is exactly the trap — an agent that treats the call's return as
"done" walks away holding a Node process. This happened three times in one
session before it was written down.

**The rule: never issue `Start-Process` on its own line.** Chain it into one
command that starts, asserts `Ready`, and (in the *same* command as whatever
used it) kills by the port's owning PID:

```powershell
Start-Process npx.cmd -ArgumentList "next","start","-p","3100" `
  -WindowStyle Hidden -WorkingDirectory "C:\PROJECTS\odyssey" `
  -RedirectStandardOutput "$env:TEMP\opencode\server.log" `
  -RedirectStandardError  "$env:TEMP\opencode\server.err.log"
Start-Sleep -Seconds 7
if (Select-String -Path "$env:TEMP\opencode\server.log" -Pattern "Ready" -Quiet) {
  "server ready"
} else { "NOT READY"; Get-Content "$env:TEMP\opencode\server.err.log" | Select-Object -Last 5 }

# …after the verification, in the SAME command…
Get-NetTCPConnection -State Listen -LocalPort 3100 |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1
if (Get-NetTCPConnection -State Listen -LocalPort 3100 -ErrorAction SilentlyContinue) {
  "PORT STILL OPEN"     # treat as a hard failure, not a warning
} else { "server killed" }
```

**Why the port's PID and not a remembered one:** `next start` spawns a child, so
the process you started may already be gone and the one holding the port is not
the one you know about.

**Why assert `Ready`:** a server that failed to bind still answers requests —
with the **previous** build. "The page loaded" is therefore not evidence that
what you are testing is what you changed. `EADDRINUSE` in the error log means
you are reading stale output.

Kill **every** listener on 3000 / 3001 / 3100 before finishing, and say so in
the report. A server left running is the one mistake that silently corrupts the
*next* task rather than the current one.

**Headless Chrome defaults to `prefers-color-scheme: dark`.** The theme resolves
through that media query (`theme-store.ts` + the anti-FOUC script in
`layout.tsx`), so a "light mode" screenshot pass that only leaves the mode on
`system` silently renders **dark** — light mode looks verified when it was never
loaded. Force both: `page.emulateMediaFeatures([{name:"prefers-color-scheme",
value:"light"}])` **and** set `odyssey_theme_mode` in `evaluateOnNewDocument`.
Assert the rendered background rather than trusting the run name.

**Assert the theme by reading `--background`, not `backgroundColor`.** Light mode
paints a *gradient* (`--body-bg: linear-gradient(...)`), so
`getComputedStyle(document.body).backgroundColor` returns `rgba(0, 0, 0, 0)` for
light — which reads as "no background", not "light", and a pass built on it cannot
distinguish a working light pass from a silently-dark one. Read
`getComputedStyle(document.documentElement).getPropertyValue('--background')`:
`#f8f5fb` light, `#0b1326` dark. The same class of bug as the `#__next` probe — a
check that cannot fail is not a check.

**A fixed `z-50` overlay swallows real mouse clicks.** `AppShell` renders
`<AppUpdateModal />` on every route, and it appears on a fresh profile. Use
`page.click` → nothing happens, because the click lands on the backdrop and the
target reads as broken. Use a DOM click instead (`el.click()` via `evaluate`),
which bypasses hit-testing. **Always run a control** before believing an
interaction is broken: M6's dismiss button looked dead for two debug cycles
because of this overlay, not because of the button.

**Never edit markdown with PowerShell `Set-Content`.** It re-encodes the whole
file — BOM added, UTF-8 em-dashes become mojibake — and silently corrupts
hundreds of lines. It did exactly this to this file once (318 insertions / 227
deletions of encoding noise). Fix: `git checkout --` the file and redo the edits
with the file tools. `context.md` §7 already said to use the file tools; that line
now has a scar on it.

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
- **Visual verification:** system Chrome at phone width (390px — also 360 and 430),
  before/after screenshots, light **and** dark.
  *Do not assert a visual change works — screenshot it or measure it.*
  Screenshots catch things assertions miss: the M3 pulse rendered two (+)
  marks side by side while every scripted assertion passed.
  **Prefer a page that measures itself** (it writes its own
  `getBoundingClientRect()` results into the DOM and `--dump-dom` reads them
  out) over a pixel scan. A scan measured the wrong viewport and reported two
  defects that did not exist; a self-measuring page settles the same question in
  one run. `puppeteer-core` is **not currently available** — see §10 and §9
  2026-10-16 for how to drive Chrome without it, and for the two Chrome
  behaviours (`--window-size` ignored, IndexedDB stalled under virtual time) that
  will otherwise be rediscovered the hard way.

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

### 2026-10-16 — Quick schedule: two controls removed, and an `<input>` that could never wrap

**Owner instruction (two parts, from screenshots).** Removed from `/day-schedule` only:
the **3-state review toggle** (Tick / Cross / Unreviewed) on every hour row, and the
**"Day N Focus & Title" card**. Scope confirmed with the owner first: `/planner` and
`/journey` keep the identical toggle, and completed blocks keep the struck-through
styling the owner asked to preserve.

**The tick/cross was not decoration, and saying so is the point of this entry.** Tapping it
wrote the block's status, fired confetti and haptic, and paid `XP_PER_BLOCK_COMPLETED`
(and its negation). `/day-schedule` therefore no longer offers **any** way to complete or
miss a block — the XP path for blocks is now planner/journey-only. `handleToggleComplete`
was deleted rather than left unreachable, taking `CheckCircle2`/`XCircle`/`Circle`,
`triggerStreaksConfetti`, `XP_PER_BLOCK_COMPLETED` and `addXp` with it. The **read** side is
deliberately intact: `isCompleted` still styles completed rows struck through, because that
status is written elsewhere and would otherwise be invisible here.

**The Focus & Title card was the app's only writer of `odyssey_day_name_*`.** `/journey`
*reads* that key; nothing else sets it. So removing the card retires the ability to name a
day app-wide — **a new user can now never set a title**, and `/journey`'s read can only ever
find a title written before this change. The two **reads** were kept: a title the user
already typed is their data, and deleting it from the UI would be destroying it. The write
path (`handleUpdateDayName`, `writeString`) is gone.

**Long task text could not wrap, and no CSS could have fixed it.** The field was an
`<input>` with `truncate`. An input cannot wrap — it scrolls horizontally and `truncate`
merely clips at whatever width the row happened to be. Replaced with a **`<textarea rows={1}>`**
plus `break-words` (so a single 57-char token breaks instead of scrolling) and an
**autosize** that sets `height` to `scrollHeight`. The row then grows to fit. The hour block
resizes because it is a flex row and the textarea is its tallest child.

**The autosize is called from two places on purpose.** `onChange` covers typing, but the
value is also written from *outside* the field by the block-sync effect, so it is also called
from the ref callback — which React re-invokes on every render. Measured: the height after a
reload (value from IndexedDB) equals the height while typing, at all 8 width/theme
combinations. **Setting `height:auto` first is not redundant** — a textarea's natural height
is one row, so measuring `scrollHeight` without collapsing it first reports its current
height and a *shrinking* edit leaves the box too tall.

**Enter is a genuine regression risk of the input→textarea swap**, because Enter normally
inserts a newline. The page's Enter = save + advance to the next hour. Verified in-browser:
the title arrives intact with no `\n`, and focus still lands on the next hour's field.

**A verification harness of mine passed with meaningless numbers, and only the numbers gave
it away.** First run reported 360px → 5 lines, 360px dark → 10, 390 → 13/17, 430 → 18/21,
768 → 15/17. Theme changed the line count, and 430px "wrapped" into *more* lines than 360px —
both impossible. Cause: seeded rows live in **IndexedDB**, and a reused browser context made
each run type into a field already holding the previous run's value, so the text doubled
every iteration (2×, 3×, 4×… matched the reported counts exactly). Every assertion still
passed, because the text genuinely did wrap. Fixed with `createBrowserContext()` per
combination, and **a guard added that asserts the field holds exactly what was typed** — the
check that would have caught it. Corrected figures: lines now *fall* with width
(360→5, 390→5, 430→4, 768→3) and light/dark match exactly, which is what wrapping should do.
This is the same failure class as the reused-page probe in §9 2026-10-15: **a green run that
never left the starting state is worse than a red one**, and here the tell was that the
numbers moved when nothing about the layout had.

**Verification:** `tsc` exit 0; eslint **0 errors**, 7 warnings all pre-existing at HEAD
(`db`, 3 unused chevrons, `Trash2`, `addDiamonds`, `handleClearBlock`) — none introduced, and
5 newly-dead imports removed; **22 suites / 346 tests green**; production build clean.
In-browser at **360/390/430/768 in light and dark**: 0 review controls, 0 "Saved" chips, no
Focus & Title card; text wraps to 2–5 lines, **no internal vertical scroll**
(`scrollHeight ≤ clientHeight`) and **no horizontal scroll** (`scrollWidth ≤ clientWidth`) on
any field; the long row is 141px against a 64px short row; document horizontal overflow 0.
Separately proven end to end: a block completed on `/planner` still renders
`text-decoration-line: line-through` here with zero controls. 8 screenshots reviewed.
**No background server left running** — 3000/3001/3100 verified closed.

### 2026-10-16 — BUG-8, one CSS property caused two bugs that looked unrelated: the picker opened behind the cards, and the dim overlay covered one row instead of the screen

**Reported from a screenshot:** tapping the category icon on an hour row opened the "Select Block
Type" list *behind* the rows below it, so only slivers of it were visible.

**There was no `z-index` bug.** Both symptoms came from one line: **every hour card carries
`backdrop-blur-xl`**, and `backdrop-filter` makes an element **both a stacking context and a
containing block for `position: fixed` descendants**. That single fact produced two failures:

1. The dropdown's own `z-50` resolved **inside its own card** and could not lift it past the next
   card. Measured with `document.elementFromPoint` over the middle of an open dropdown: the topmost
   element was the **08:00 card**, not the dropdown.
2. The `fixed inset-0` "tap outside to close" scrim **collapsed onto the tapped card's own box**.
   Measured: **725x62px — the card — inside a 762x484 viewport.** That is why the screenshot shows
   only the tapped row dimmed; everything below it was simply painted over the scrim too.

**Neither is fixable by raising the dropdown.** The fix is structural: the card that owns an open
picker is raised (`stackClass`, `z-50`), and the scrim moved **out of the cards** to the list
wrapper, which has no `backdrop-filter`, so `fixed inset-0` covers the viewport again. Re-measured
after: topmost element over the dropdown **is** the dropdown, scrim **is** viewport-sized.

**A picker now deliberately outranks the "current hour" / "just saved" highlight** (`z-50` beats
`z-20`). Those were two hardcoded `relative z-20` strings; folding them into one `stackClass` was
also the only way to avoid a Tailwind conflict between two z-index utilities in one class list,
whose resolution depends on stylesheet order rather than attribute order.

**Two things I got wrong and corrected, both by measuring rather than reasoning:**

- **I assumed the dropdown was simply under-stacked** and nearly "fixed" it by raising `z-50`. That
  would have changed nothing: it was already `z-50`. Measuring `elementFromPoint` first is what
  showed the real problem was the *containing block*, not the z-index.
- **My verification fixture silently went stale and I nearly trusted it.** It hardcoded two
  stylesheet chunk filenames; those names are content-hashed, so after one `npm run build` the
  links 404'd, the page rendered **unstyled**, and the measurement came back
  `dropdown: 746x0` — obviously wrong, and I had already printed it as a result. The fixture now
  discovers `.next/static/chunks/*.css` at write time. **A fixture that links build output must
  resolve it at run time, and its own measurement should sanity-check the numbers it expects.**

**Left alone, deliberately:** the picker still opens *downward*, so on the last hours of the day it
runs off the bottom of the screen. That is a real latent bug but a different one from the reported
symptom, and fixing it means measuring available space per row.

### 2026-10-16 — Two sessions are editing `day-schedule/page.tsx` at the same time; here is how this change was committed without touching the other's work

**A concurrent session is working in this repo.** Twice now it has moved underneath this one: it
finished and committed `7dd58eb` (the half-finished edit that was breaking `tsc`) mid-task, and
during BUG-8 it began adding an inline day-title editor (`refocusTitleRef`, `beginTitleEdit`,
`commitTitle`, `cancelTitleEdit`, ~65 lines) to the **same file this task was editing**. A `npm run
build` in the middle of its write failed with `Cannot find name 'refocusTitleRef'` — a race, not a
real defect, and `tsc --noEmit` passed seconds later.

**Committing with `git add -A` here would have swept ~130 lines of someone else's unfinished work
into this commit** — the exact failure this repo's status rules exist to prevent.

**The fix was to never touch the working tree at all**, rather than to stash, reset, or restore it:

```
git show HEAD:odyssey/src/app/day-schedule/page.tsx > head.tsx   # clean base
# apply ONLY this task's edits to head.tsx, producing mine.tsx
git diff --no-index --no-prefix head.tsx mine.tsx > mine.patch  # path headers rewritten
git apply --cached mine.patch                                   # stages; working tree untouched
git commit                                                      # commits HEAD + these hunks only
```

The other session's edits then remained in the working tree as an ordinary unstaged diff against the
new HEAD. **`git checkout --` on a file another agent is actively writing is the dangerous version of
this**, and so is any save-and-restore: both have a window in which the other session's write is lost.

**Two PowerShell traps hit on the way.** `Set-Content -Encoding UTF8` **adds a BOM** (PS 5.1), which
corrupts a patch file — `[System.IO.File]::WriteAllText($p, $text, (New-Object
System.Text.UTF8Encoding($false)))` is the safe form, and asserting the first three bytes are not
`239,187,191` is the check that proves it. And **heredocs (`<<EOF`) do not work in PS 5.1** at all,
so commit messages must be written to a file and passed with `git commit -F`.

### 2026-10-16 — M19, the Daily Allocation bar now reads left-to-right in time, and why 24 flex children were already wrong

**Owner instruction, from a screenshot of the Day Schedule screen:** *"Rewrite the logic of this
bar, make it like the 1st hour on the left then 2nd hour to its right 3rd hour to right of 2nd like
that, and make sure that it also cover the semicircle on both ends."*

**The old bar grouped by category, not by time.** It was five children sized as a share of 24 —
all Focus, then all Vitality, then Sync, then Renewal, then Rest. A day running
Sleep → Vitality → Sleep → Work → Sleep therefore rendered as **one indigo block beside one violet
block with the order of the day discarded**: the strip could not be read as a day at all, only as
five totals. It is now **24 one-hour slices, left to right = 00:00 → 23:00**, each coloured by that
hour's own category. Adjacent same-category hours merge into one band — which is what the shape of a
day actually looks like — and category changes show a crisp one-hour boundary.

**The old layout was also quietly broken, which is worth writing down because it was invisible.**
A flex row of 24 children whose widths already summed to **100%**, plus a 2px `gap` between each
one, over-constrains the row: flexbox shrinks all 24 to make room, and the 23 gaps ate roughly **15%
of every slice**. Nothing looked wrong, because the result was still a plausible bar. Slices are now
**absolutely positioned** (slice *h* starts at *h*/24 and is exactly 1/24 wide) inside the
`rounded-full overflow-hidden` track, which tiles the capsule with no seam and no over-constraint.

**"Cover the semicircle on both ends" is a geometry claim, so it was measured rather than eyeballed.**
At a 328px track: the first slice's left edge sits **0.00px** inside the track's left edge and the
last slice's right edge **0.01px** inside its right edge (sub-pixel rounding). `border-radius`
computes to `9999px` with `overflow: hidden`, so both caps are clipped out of a slice that reaches
them — there is no notch.

**The category colours moved into the shared module rather than being reused from the pages.** The two
screens keep their own `getCatStyle` maps and **the planner's has no `dotClass` at all** (only an
`accentGlow`), so "just reuse the page's colour map" would have meant adding a second and third
spelling of the same five colours. `lib/utils/allocation-bar.ts` now owns the geometry *and* the five
category colours, and **11 tests** pin the tiling, the equal widths, both caps, the midnight label and
the empty-input case. A short or missing input yields 24 open slices, **never a collapsed bar** — the
bar is a fixed frame of reference for the day, so a data glitch must not shrink it.

**`isPlannedHour` is now named on both screens, because a bar and its own caption must not be two
derivations of the same fact** (M8's lesson). The two screens still count differently **on purpose** —
Day Schedule counts a typed-but-unsaved title, Planner counts only saved blocks — and that difference
is now written in a comment instead of being something a reader has to rediscover. Nothing about the
legend's numbers changed.

### 2026-10-16 — Visual verification on this machine: IndexedDB never completes under headless Chrome, so the geometry was verified with a self-measuring fixture

**Worth knowing before anyone repeats a browser pass here.** There is **no `puppeteer-core`
installed** (not in `node_modules`, not global, no npx cache) even though §7 describes it as the
visual-verification tool, and Chrome **155.0.8059.80** is the system browser. Three things cost real
time and each would cost it again:

1. **`--headless=new` does not work; `--headless=old` does**, and PowerShell's capture of its stdout
   produced nothing. `cmd /c "... > file 2>&1"` is what actually writes the output. The same pattern
   already used for `git diff --output` is the reliable one here.
2. **`--window-size` is ignored** — the layout viewport came back **504px** for every width asked for,
   which is how a first pixel-scan concluded the bar was wider than its card and that hour 23 was
   missing. **Both were artefacts of measuring the wrong thing.** A page that reports its own
   `getBoundingClientRect()` settles this in one run where a pixel scan cannot; pinning the fixture's
   container to an explicit `width:390px` gave the real 328px track.
3. **IndexedDB never completes under `--virtual-time-budget`.** Every page stayed at
   *"Loading schedule blocks…"* and the seed page never left `running`, at 8s, 20s, 30s and 45s alike.
   So **no data-driven state of this app can be exercised in-browser in this environment** — that is
   an environment limit, not a product one, and it should not be reported as a product failure.

**What was verified, and how.** The real pages' **prerendered DOM** confirms both `/day-schedule` and
`/planner` emit the new `<div aria-hidden="true" class="relative h-2(.5) w-full
bg-surface-container-highest rounded-full overflow-hidden">` track, and that the old `flex gap-0.5`
bar is gone from both. The **filled-slices render** was then verified with a temporary fixture served
from the app's own origin, generated by the **real** `buildAllocationSlices` through a throwaway vitest
file, screenshotting the app's **real compiled CSS** at 390px in **both themes** (light and dark both
correct: Focus is violet in light, mint in dark) and having the page **report its own measurements**.
The fixture, its generator and the seed page were **deleted in the same commit** — `git status` shows
only the four real files.

### 2026-10-15 — BUG-7 the wallpaper switch that would not stay off, and a native fix that is NOT verified

**Reported by the owner:** turn the Odyssey wallpaper off, close the app, reopen it — the
switch is ON again, but the wallpaper image itself is unchanged.

**Root cause, found by reading the Kotlin rather than the JS.** `syncSchedule()` and
`syncScheduleWithResult()` in `OdysseyWallpaperBridge.kt` both did:

```kotlin
editor.putBoolean("wallpaper_enabled", true)
```

**unconditionally**, as part of writing schedule data. `AppShell` calls
`syncCurrentScheduleToNative()` from a `useEffect` on mount — so **every app launch** pushed a
schedule and re-armed the master switch the user had just turned off. The flag then read back
true, the switch showed ON, and **nothing re-applied Odyssey's wallpaper** because the user's own
image had already been restored in the previous session. That accounts for the reported symptom
exactly, *including* the otherwise-baffling half: the button changed but the wallpaper did not.

**It was also a battery bug, which is why it matters beyond the annoyance.** Turning the switch off
cancels the hourly alarm; the next launch re-armed the engine that alarm had just been cancelled
for. The whole point of the master switch (`P8-E1`) is that the wallpaper stays down unless asked
for, and a background data sync was quietly undoing the user's decision.

**Both lines removed.** The flag is now written only where the user actually asks for a wallpaper:
`setWallpaperMasterEnabled(true)`, the live-wallpaper picker, and `enableHourlyAutoUpdate()`. The
broadcasts and the static-lockscreen refresh are untouched, so an enabled wallpaper still updates
exactly as before.

**I initially suspected my own P0-T6 change to `wallpaper-toggle-store.ts`.** I checked it, and the
JS flip (`enabled: ok ? enabled : !enabled`) only fires when `clearLockscreenWallpaper()` throws,
which returns `true` on the normal path — so it is not this bug. **I did not "fix" the JS to
compensate for a native bug I had not yet found**, which would have hidden the real defect.

**⚠️ THIS IS UNVERIFIED NATIVE CODE AND MUST NOT BE REPORTED AS FIXED.** `tsc` does not read Kotlin,
and this machine **cannot compile Kotlin at all** — no `gradlew` in the repo, and no `java`, `gradle`
or `kotlinc` anywhere on PATH. The change is two deleted lines and the file's braces balance
(220/220), which rules out a structural mistake but proves nothing about compilation. **It needs an
APK build and the reproduction: switch off → close → reopen → the switch must stay OFF** (R12).

**One correction I made immediately:** I ticked `BUG-6`'s checkbox by reflex while editing the plan
and reverted it — `BUG-6` is unconfirmed and unfixed. Ticking a box because you are editing that
part of the file is exactly the status-drift this repo keeps auditing for.

### 2026-10-15 — Two console errors on the Armory screen, and a fix I had to throw away

**Fixed (1) — hydration mismatch on the chest card.** `chestClaimed` was initialised with a **lazy
`useState` that read `localStorage`**. There is no `localStorage` on the server, so the server
rendered `false` while the client rendered the stored value, and the card's `className` differed on
each side — React threw, discarded the server HTML and re-rendered. Now initialised to the server's
answer and corrected after mount, the same shape as `planner-empty-state.ts`. The correction is
wrapped in `queueMicrotask` because the `react-hooks` rule (correctly) rejects a synchronous
`setState` in an effect — **the same fix M14 used for the rank dialog.**

**Found alongside it: the chest key was UTC.** Both the read and the write used
`new Date().toISOString()`, so for anyone whose local date differs from the UTC date the chest was
written under one key and looked for under another, and "today" rolled over at the wrong hour. Both
now use `getLocalTodayStr()`, the local-date helper the rest of the app already uses. **Fixing only
the hydration would have left the read and the write disagreeing**, which is a quieter bug than the
one reported.

**Fixed (2) — the "0 Freeze Active" chip** is removed from the vault reserves card, on owner
instruction. The genuinely useful part of the feature is unaffected: the Streak Freeze item still
carries its own `N Active` badge when you own one (`shop/page.tsx:57`).

**NOT fixed (3) — the anti-FOUC script warning, because the fix broke something better.**
React warns that a `<script>` rendered inside a component is never executed client-side, which is
true of *client* renders and not of the server HTML this app relies on. The supported replacement is
`next/script` with `strategy="beforeInteractive"`, so I swapped it — **and measured a regression.**
With `next/script`, the light theme's `class="light"` was **not** set at `domcontentloaded`; with the
original raw `<script>` it always is. I confirmed this by stashing my change, rebuilding, and running
the same probe against the original, which passed both themes where mine failed one. **Reverted.**

**A console warning is cheaper than a white flash on every page load for light-mode users**, and that
is the trade the measurement settled. `layout.tsx` is unchanged; the warning remains. The rule now
worth writing down: **do not silence a framework warning by adopting a "more correct" API without
measuring the behaviour the warning was merely noise in front of.**

**Two of my own harness mistakes again.** A regex checked for `id="odyssey-theme-init"` in the tag
*attributes* while the script lives in the tag *body*, so it reported a correct script as missing.
And an earlier check read the theme class only once, at a moment where a race could masquerade as a
product bug. Reading early *and* settled made the difference visible instead of guessed at.

Verified: **zero console errors or warnings across all 7 routes in both themes**, 346 tests green,
build clean, anti-FOUC confirmed intact on both themes, and the Armory screenshot confirms the chip
is gone with the vault balance untouched.

### 2026-10-15 — Owner instruction: remove the Shop "Bonus Tier" bar

**Removed** the bar at the top of `/shop` reading *"Bonus Tier Active • Week 2 Streak"* with
*"+35 💎"*, on owner instruction from a screenshot.

**It was not wired to anything.** Both "Week 2 Streak" and "+35" were hardcoded string literals —
the bar claimed the same bonus tier to every user regardless of their actual streak, which is the
same "confident line of copy that is not true" class this repo keeps auditing for, except static:
it was not even computed wrongly, it was simply never connected. The vault reserves card directly
below it *is* real (`0 Diamonds`, `Earn +15 💎 / day`), so the removal leaves the screen showing a
true balance as its first element.

A comment records why it was removed and that reinstating it should mean deriving both numbers
rather than restoring the literals — otherwise the next person restores the fake.

**Two wrong assumptions of mine while locating the other screenshots**, both worth recording:

1. **`/wallpaper` redirects to `/stats`, and that is intentional, not a bug.** `wallpaper/page.tsx`
   redirects when the wallpaper master toggle is off, and `P8-E1` made that toggle **default-off**.
   I reported it as a discovered defect before reading the guard. The battery rule is working as
   designed — the app's background feature stays off until the user asks for it.
2. **A probe that reuses one browser page across routes silently keeps the previous route.** It
   reported *identical* metrics for `/journey`, `/wallpaper` and `/stats` — three different screens —
   and I nearly drew a conclusion from it. A fresh page per route fixed it. **Three pages agreeing
   is not evidence; it is a sign the measurement is not moving.**

### 2026-10-15 — CONS-1, where the recorded defect was stale and the real one was a label

**Shipped:** the last open Phase 1 item. Habit colour and category text now agree across every
surface.

**The recorded claim was stale.** CONS-1 said *"colour mapping still defined 4×"*. `P0-T3` had
already left exactly **one** map, and all seven colour-bearing sites — `habits/page`,
`edit-habit-modal`, `habit-date-strip`, `habit-heatmap`, `habit-github-heatmap`,
`habit-month-calendar` and the planner's `infinite-date-strip` — already call the same
`getHabitColor` and pass it through `style={{ color: habitColor }}`. Grep confirms **no surface
holds a raw hex or a second map.**

**The real defect was in the labels.** Three sites each invented their own fallback — `"Routine"`
twice, `"General"` once — and **neither is a canonical domain**; both are retired vocabulary.
Because they are strings rather than typed values they never failed to compile, so the app could
display a category that exists nowhere in the schema without anything going red.

**And the same missing category produced two different colours on two screens.** `"General"` was
in the legacy map, so it painted Craft & Skill blue; `"Routine"` was not, so it fell through to
the name hash. One habit, two colours, depending on which screen you looked at — which is the
whole of CONS-1, stated precisely.

One shared `habitCategoryLabel()` replaces all three, and it **normalises as well as falling
back**. My first version only handled the empty case, and the test I wrote for it caught the gap:
an un-migrated row still holding `"health"` would be labelled `health` while being painted
Vitality & Fitness emerald. **The label and the colour cannot disagree** — that is now the rule,
and it is asserted rather than hoped for.

An uncategorised habit reads **"Uncategorised"** rather than being handed a category name it does
not have, and a user's own unrecognised label is preserved verbatim, because it is their data.

**Period accents were already consistent** — `getTimePeriodAccent` has a single consumer and no
competing fallback — so that half of the line needed nothing.

**Phase 1 is complete.** All five planned items done, plus three defects found along the way
(`BUG-4` mojibake, `BUG-5` false streaks, and the boost that paid out XP).

### 2026-10-15 — D2 closed WITHOUT splitting it, and the split would have made it worse

**Shipped:** debt **D2** closed by *not* doing the thing it asked for, after reading the store.

`useUserStore` is 76 lines, and the "33 edges" that motivated D2 turned out to be **"many screens
read the profile"** — which is not god-node-ness. Every member operates on the **same single
`profiles` row**: `buyItem` reads `diamonds`, `equippedItems` and `streakFreezeCount` and then
writes `diamonds`, `equippedItems`, `streakFreeze*`, `xp` and `level`; `addXp` reads and writes
`xp`/`level`; `resetToZero` rewrites the whole row. Splitting "profile / wallet / shop" would
create **two sources of truth for one row** and widen an already-present `await` race on a
read-modify-write — on a store with exactly one concern. **D1 deserved splitting because it mixed
five unrelated concerns. This mixes none.**

This changed my recommendation *after* the owner had approved a Phase 1 split, so I went back and
asked rather than building it. The briefing had said "contained", which was true about effort and
wrong about the thing that mattered.

**The real gap was where the tests weren't.** `buyItem` had **zero tests**: the insufficient-funds,
streak-freeze and instant-XP branches only ever ran during a real purchase, so a diamond-balance
bug would have shipped silently and been found by a user with a balance. Those rules are now pure
functions in `src/lib/utils/economy.ts` with **26 tests**, and `XP_PER_LEVEL` is a named constant
per ADR 0001 §7 rather than `Math.floor(xp / 500) + 1` written out in **5** places.

**Extracting them surfaced a live economy bug.** `buyItem` is called with the item **`id`**, and the
2x XP Chrono Boost's id is `"xp-boost"` — which the original `includes("xp")` test matched. So
**every boost purchase also silently paid out 100 instant XP**, on top of the 24h multiplier the
user paid for. Confirmed in-browser (600 XP went to 700), then fixed by testing `instant` before any
bare `xp` and giving the boost its own explicit branch. A test now pins each of the four real shop
ids to its own branch, so a rename fails loudly instead of silently re-granting something.

**The fragility was documented before it was found.** The extraction note said substring matching on
a hand-written id was "a real fragility... stated here rather than hidden", and the very next
browser run showed it was not hypothetical.

**D5 is deferred, and the plan understated it by roughly 10×.** It records "planner/journey/stats
bypass the store"; **29 files** actually import `db` directly — 10 screens, every planner modal,
the wallpaper page, several utilities. That is a multi-day architectural change, not a stabilise
task, and `context.md` already says "not to be fixed opportunistically". Deferred to Phase 3 with
the measured number attached so the estimate stops being wrong.

### 2026-10-15 — P0-T6, and a lint guard that had been half-dead since it was written

**Shipped:** one 855-line native-bridge module became six, split by concern. `core` (the only
module permitted to touch `window.*`), `schedule`, `wallpaper`, `notifications`, `app-update`,
and an `index` barrel.

**The barrel is the design decision, not the split.** `index` re-exports everything, so **not one
of the 8 consumers was edited**. A refactor that needs 8 files changed in step is a refactor that
can be half-applied. Export sets were diffed mechanically against the old file: **41 → 43,
nothing lost**, the two additions being `errText` and `trueStreak`, previously module-private.

`BRIDGE_OWNER` moved with the code, to `android-bridge/core.ts`, so the lint exemption points at a
file that exists.

**The split exposed that `odyssey/bridge-boundary` had been half-dead since it was written.** Its
selector was `MemberExpression[object.object.name='window'][...]`, which matches only the
**two-level** form `window.OdysseyAndroid?.syncSchedule(x)`. The common form `window.OdysseyAndroid`
is **one level** and sailed through. Proven by probe before changing anything — one-level exited 0,
two-level errored — then fixed to match both, and verified against all four violation shapes plus
the legitimate `nativeBridge()` call.

**The fixed rule immediately caught 2 real violations in `wallpaper-toggle-store.ts`** that had been
shipping the entire time. This is the third time in this repo's recent history that a guard was
found not to guard (`#__next`, the light-mode `backgroundColor` probe, now this). **A guard that
cannot fail is not a guard, and a config that reads as enforcement is worse than one that does not,
because it is trusted.**

**Rerouting those two then exposed a battery bug I was about to introduce myself.** The obvious
rewrite uses `callNativeBool`, which collapses *"the bridge said no"* and *"the bridge could not be
reached"* into a single `false`. The existing code then does `enabled: !enabled` — so a user who
switched the wallpaper **off** and hit a throwing bridge would have had it switched **back on**.
That is precisely the battery question this repo insists on answering before anything persistent
ships. Now `callNative`'s `undefined` is handled explicitly: **unreachable settles off in both
directions**, refusal still flips. Two tests cover it, and one of them is a **control** — the same
call must still succeed against a working bridge, or the failure test could pass simply by
breaking the feature.

**Three of my own errors in this item, all caught by gates rather than by reading:** I removed
`callNativeBool` from the imports while `readNativeFlag` still used it, so a *pre-existing* test
broke and `tsc` had not yet been re-run; one new test asserted a bridge refusal the mock cannot
simulate; another set the stored flag without the native one and so failed for its own reasons.
The first is the one worth remembering: **`tsc` run before the edit is not `tsc` run after it.**

**Verification:** `tsc` exit 0, eslint **0 errors** (84 pre-existing warnings), **21 suites / 316
tests green**, build clean. In-browser: no mojibake, no layout regressions across 42 combinations,
category migration intact, streak labels intact.

**Phase 1 now has no outstanding gate criterion.**

### 2026-10-15 — P0-T3, where the escape hatch turned out to be load-bearing

**Shipped:** habits now have **one** category vocabulary, and `Habit.category` is a closed union.

**The type was not sloppy — it was holding up a disagreement.** `Habit.category` was
`HabitCategory | (string & {})`, a union that accepts any string and therefore constrains nothing.
The reason it existed: **three competing vocabularies.**

1. the schema declared **6** categories — Health, Mindfulness, Learning, Productivity, Social, Growth
2. the create/edit form offers **4 DOMAINS** — Mindful Focus, Vitality & Fitness, Renewal & Health, Craft & Skill
3. the colour lookup had a **third set of 7** groups

So every habit the app actually created carried a category the schema did not declare. **Owner
decision: the form's 4 are canonical**, because they are the only values a user can pick.

**Narrowing the type immediately paid for itself — it caught 8 real violations** the moment it was
closed, across `app/page.tsx`, `habits/page.tsx`, both habit modals, `goal-tags`,
`habit-template-library`, `wallpaper-generator` and two test fixtures. Each was a string that had
been quietly assignable since the union was widened. `DOMAINS` in both modals and `domainLabel`
in the template library are now typed `HabitCategory`, so a rename breaks **at the source** rather
than producing a category nobody can write.

**The most important finding was a collision the single normaliser was silently resolving in the
wrong direction.** `normalizeCategory` checked the **schedule** list before the habit list, and
`'health'` and `'sleep'` exist in **both** vocabularies — so a *habit* saved as `"sleep"` resolved
to the schedule's `"Sleep"` and never reached a domain at all. It is now split:
`normalizeCategory` is schedule-only (existing contract and its nine tests untouched) and
`normalizeHabitCategory` handles habits. **One function serving two vocabularies that share words
is not deduplication, it is a coin flip.**

**The colour map went from 70 keys to 4, and 26 of the 70 were unreachable.** `getHabitColor`
compared `key.toLowerCase() === category.toLowerCase()`, so every lowercase duplicate sitting
behind a Title Case twin could never match. They read as coverage and provided none. The seven
keyword-heuristic branches went too — they matched substrings like `cat.includes("zen")` in
categories no write path can produce, and a substring match on a user's own label is how a habit
ends up green for reasons nobody can explain. **All four domain colours are asserted as literal
hexes so no habit is repainted by this change.**

**The migration is a safety net, not a conversion — and that was worth proving rather than
assuming.** `LEGACY_HABIT_CATEGORY_MAP` plus a `version(2).upgrade()` rewrites existing rows, but
`create-habit-modal` writes `tpl.domainLabel` and **never** `tpl.category`, and the habit store
never touches `category` — so **no live write path can produce a legacy value**. That is why
`Social` and `Growth`, which have no fourth-domain equivalent, could be mapped to the nearest
instead of raising a product question: there is no data to lose. Both facts are recorded on the
line rather than assumed, because "we have no legacy data" is exactly the claim that is wrong
when someone finds a `put()` I missed.

**The upgrade is declared on `version(2)`, not a new version.** Only row *values* change — the
`category` index already exists and no field is added, removed or retyped — so bumping the schema
version would make a data-only migration look like a schema change.

**Verification:** 14 new tests. `tsc` exit 0, eslint 0 errors, **21 suites / 314 tests green**,
build clean. Browser: a v1 database seeded with `Health`, `Mindfulness`, `Learning`, `sleep` and an
unrecognised label comes back as `Vitality & Fitness`, `Mindful Focus`, `Craft & Skill`,
`Renewal & Health`, and **`Gardening` preserved verbatim** — unknown user data survives the
migration, which is the property that matters most. No mojibake and no layout regressions across
all 42 probe combinations.

### 2026-10-15 — BUG-5 the streak that was 1 when it was 0, in nine places

**Shipped:** every falsified streak in the app now reports its **true** value.

**The finding.** `currentStreak || 1` turns a genuine zero into 1, and the native wallpaper
renders that number inside an **amber achievement pill**. So a habit with no streak arrived on
the lock screen wearing a trophy while the app said *"No streak yet"* on screen. **M13 fixed
exactly this on the web side in 2026-10-08 and the native side was never touched.**

**The idiom was not one site, it was nine, across three files** — and two of them are
user-visible text the user reads without opening anything:

| Where | Was | Now |
|---|---|---|
| `/journey` header | `"{user?.streak \|\| 1}d Streak"` next to an amber flame | reuses M13's `getStreakLabel`/`isStreakActive` — **"No streak yet"**, muted |
| wallpaper header | fell back to `data.activeDay` (**journey day**, not a streak) beside the label "DAYS STREAK" | `data.userStreak ?? 0` |
| placeholder habits | inherited `data.userStreak` — shown to a user with **no habits at all** | always `0`; a placeholder habit has never been completed |
| bridge payload ×4, canvas generator, sync result | `\|\| 1` / `?? 1` | `trueStreak()` |

**Why it survived: `buildNativeSchedulePayload` had no tests at all.** Not one. `tsc`, lint
and 283 tests were green the entire time, because none of them ever constructed the payload.
It now has 14, including the specific case that would reintroduce the defect.

**The Journey header was the worst of them** — the most prominent position on that screen, with
a flame icon and amber text, and it was still live **a week after** M13 shipped the helper
designed to fix exactly this. Three separate screens now read a streak three different ways.

**My own test was wrong before the code was, again.** I asserted a numeric string `"7"` should
coerce to `0`. It should not: a habit whose streak round-tripped through storage as `"7"`
really does have a 7-day streak, and flattening it to 0 discards the user's history — trading
one false number for another. It coerces to `7`. The repo has now recorded this class four
times; the reason it keeps recurring is that "make it safe" and "make it true" are different
goals and only one of them is the job.

**Browser verification caught a defect I introduced, and then four defects in the harness.**
The first fix rendered **"No streak yet Streak"** — grammatical nonsense, because I appended
`" Streak"` to a label that already carries the phrase. The `long` variant of `getStreakLabel`
already says *"5-day streak"*, so the suffix was never needed. The harness then failed three
times in a row for reasons that were **all mine, none the app's**: `put({id, streak})` replaces
the whole IndexedDB record and wipes every field; the write was not awaited before `reload`;
and the assertion still looked for the short form after the label changed.

**And the harness's first real failure was a genuine finding.** With three profiles in the
database, `/journey` rendered a *different* profile's streak than the one seeded — because
`getOrCreateUser()` returns `users[0]` from an **unordered** `toArray()`. Recorded as **BUG-6**
as a **hypothesis, not a finding**: I cannot show the app created those rows rather than my own
seeding, and it needs a control run before anything gets built. A single-profile invariant is a
schema decision and needs an ADR, not a patch.

**Deliberately not done, and recorded rather than half-done:** the Kotlin side reads
`optInt("currentStreak", 1)`, so an absent key still becomes 1. Fixing it is a native change
and **this machine cannot compile Kotlin** — no `gradlew`, and JBR 25 cannot start the Kotlin
1.9.22 daemon. Shipping it blind is forbidden (R12). Hiding the amber pill at zero needs canvas
**and** native layout work, because both derive the card's text width from the pill's position.

### 2026-10-15 — BUG-4 mojibake, and a guard that caught itself

**Shipped:** 5 mojibake sequences across 2 files, all in text the user sees, all the
signature of the documented PowerShell `Set-Content` incident (§7).

- the **notification title** rendered `Odyssey â€¢ XX:57 Heads-Up` instead of `•`
- the **habits date strip** rendered `Completed âœ“` instead of `✓`
- the two **fallback habit icons** sent to the wallpaper were `ðŸ§˜` / `ðŸ'§`
  instead of 🧘 / 💧

**Found while reading `android-bridge.ts` for P0-T6, not by any gate.** That is the lesson:
`tsc`, lint and 283 tests were all green the whole time these were shipping. Nothing asserted
on any of those strings, so the only detection path was a human reading them — and
`git ls-files` / a codepoint scan is now part of the routine.

**Repaired by codepoint, not by search-and-replace.** The byte sequences were confirmed first
(`U+00E2 20AC 00A2` → `U+2022`, and so on) and replaced with an explicit UTF-8 **no-BOM** write.
The repo already records that `Set-Content` corrupted `context.md` once; using a tool that can
corrupt files, to fix a corruption, would have been the same mistake twice.

**A guard, not a one-off fix.** `src/lib/utils/encoding.test.ts` walks every `.ts`/`.tsx`/`.css`
under `src/` on every suite and fails on any mojibake marker or a BOM. **It caught itself
twice while being written** — its own explanatory comments reproduced the bad bytes. That is the
cheapest possible proof a guard can fail, and it is the same lesson as the `#__next` probe that
reported `false` on a working page. A guard that cannot fail is not a guard.

The guard also asserts it is looking at more than 100 files, for the same reason: a scanner that
silently matches nothing reads as passing while covering nothing.

`Market Research/` and the Kotlin sources are **not** covered yet — the obvious next extension.

### 2026-10-15 — CONS-2 narrow-screen sweep, where the recorded bug was not the bug

**Shipped:** the Phase 1 exit-gate criterion `CONS-2`, plus `P0-T2` (knowledge-graph refresh)
which was run first as a tool step because the graph was 11 days stale and `.clinerules` §1
makes it the first search tool.

**The defect was not the narrow screen, and the defect on the line was not the real one.**
`CONS-2` recorded "the Feedback button overlaps a screen's primary CTA at 360px, 2.4%". Swept
all 5 main surfaces plus Profile and Wallpaper at **360 / 390 / 430** in **light and dark** —
42 combinations — with a geometric probe rather than by eye. Two things came out of that:

1. **The recorded 2.4% was a mid-scroll artifact.** A `fixed` floating button overlays whatever
   sits at its screen position, so at `scrollTop=0` it floats over mid-page content. Measured at
   full scroll, it never appeared on any route. The extra clearance `CONS-2` added is real
   insurance, but it is not the fix and the original figure did not mean what the line said.
2. **The real defect was two buttons in one corner, and it was not width-specific.**
   `/journey` renders a *"Go to Today"* quick-return pill at `fixed bottom-20 right-4 sm:right-6`
   whenever today is scrolled out of view — **the exact corner the Feedback button occupies**.
   The two covered each other by **27.1%, at every width, in both themes**. Fixed by stacking:
   the journey pill sits one button-height above the Feedback button.

**A fixed button overlapping content mid-scroll is not a defect, and that distinction is the
whole measurement.** The first probe reported 14 findings and the fix appeared to do nothing
because 14 was still the number. The probe was wrong, not the fix — and the tell was that the
count could not distinguish a stuck control from a transient. Re-measuring at full scroll
separated them: **6 genuine findings → 0**, while the 14 transients stayed 14 and are expected
for any FAB.

**The magic numbers are gone, which is the durable half.** Nav height, feedback offset, feedback
height and the reserved content space are now **four tokens in `globals.css`**, and `<main>`'s
padding is *derived* from them, so the layout and the floating button cannot drift apart again.
The `sm:` shift became a **token override inside a `min-width: 640px` media query** rather than a
Tailwind variant, so the reservation follows the button automatically — at 700px the button moves
to 96px and the reservation moves to 140px with no second number to update. Verified by reading
the computed values back: 360px → padding 124px vs button top 114px; 700px → 140px vs 130px;
**10px clearance at both**. `--app-content-bottom` also now includes
`env(safe-area-inset-bottom)`, which the old flat `pb-24` ignored — on a device with a home
indicator the nav is taller than 64px and the reservation was short by exactly that much.

**Two claims on the `CONS-2` line did not reproduce, and no fix was invented for them.**
Document horizontal scroll is **0** and off-screen elements are **0** at every width, so the
*"4 fixed pixel widths remain"* cause no defect — the arbitrary values still present are
`w-full max-w-[Npx]` caps, which adapt, or genuinely fixed decorative controls (the toggle
switch, the onboarding step dots). And *"no `md:`"* is stylistic with no measured consequence.
Both are recorded as findings rather than gaps, on the M13 precedent: manufacturing a change to
look busy is the same instinct that produces the defects.

**Verification:** 42 combinations probed before and after, **6 → 0** genuine findings;
`tsc` clean (exit 0); full lint **0 errors** (85 pre-existing warnings, none from these files);
**19 suites / 283 tests green**; production build clean; 42 screenshots at 360/390/430 in both
themes. **The theme assertion had to be rebuilt.** Reading `backgroundColor` reported
`rgba(0,0,0,0)` for light — light mode paints a *gradient*, so the check cannot see it — and the
first "light" pass was **silently rendering dark**, the exact trap §7 warns about. Reading
`--background` is the check that cannot lie: `#f8f5fb` light, `#0b1326` dark. The evening-reminder
modal also fired on a wall-clock schedule and covered every screenshot in a dim backdrop until
the harness learned to dismiss dialogs.

**Doc drift corrected in the same commit** (rule 8 — a known-wrong line is never left):
`context.md` said Dexie `version(1)` / 6 tables (it is `version(2)` / **7**, `rewardSettlements`
added by ADR 0002), cited a **non-existent `src/lib/categories.ts`**, said **7** stores (there
are 6 — the 7th file in that folder is a test), and pointed at stale `db.ts` line numbers
(`179`→`206`, `59`→`48`, `76`→`67`; `85` for `normalizeCategory` was correct). `main_plan.md` said
**8** test suites in four places (there are 19 / 283). `FEATURES.md` claimed `D8` **CLOSED** while
`P0-T7` is `NOT BUILT`, listed `XL14` as "next feature" though it shipped as `A1`, and quoted
`android-bridge.ts` at 813 lines (it is 829).

### 2026-10-08 — M16 goal category tags, and the tag that opened an empty form

**Shipped:** the five labels from `MASTER_TODO_REVISED.md` L988/L902, verbatim —
**Academic Excellence, Peak Health, Deep Focus, Mindfulness, Digital Detox** — as tappable
chips on the onboarding habits step.

**A tag that changes nothing is just a label.** Each chip carries a suggested habit (name,
icon, category) and opens the add-habit form already filled in, which is the constraint the
old contradiction note had set: a bare picker would have "promised tailoring it cannot yet
deliver". It now performs the tailoring instead, so **C11's superseded paragraph and `A8`'s
deferred "goal labels" half were both closed** and the reasoning written down rather than
quietly deleted.

**The browser caught the feature not working, twice, for two different reasons** — and both
are the kind of bug no unit test would have found:

1. **`prefilled name: ""`.** `CreateHabitModal` returns `null` while closed but keeps its
   hooks, so `useState(defaults?.name ?? "")` ran **once** on first render — while
   `defaults` was still null — and never re-read it. Tapping a tag opened an empty form.
   Fixed by remounting the modal via `key`, which is also **why no `setState`-in-effect was
   needed** — the obvious fix would have tripped the react-hooks lint rule (as it did in
   `M14`).
2. **`prefilled name: ""` again.** The modal opens on its **template browse** view, and the
   name/icon/domain fields only exist in the **custom** view. So even with correct state, a
   pre-filled form was hidden behind a template grid. Supplying `defaults` now opens the
   custom view. This is the same failure mode as `M11`'s zero-streak label — *present,
   correct, and not visible.*

**Two lists in the source disagree and were not merged.** `A1` (L199) describes the goal
question as **Focus, Health, Sleep, Balance, Digital Detox, Custom**; `M16` (L988) names
**Academic Excellence, Peak Health, Deep Focus, Mindfulness, Digital Detox**. `M16`'s five are
implemented verbatim; `A1`'s wording is recorded on both lines, because quietly unioning two
conflicting lists is how a spec stops meaning anything. A test asserts M16's list has **not**
absorbed A1's (`Sleep`, `Balance`, `Custom` must not appear).

**Categories are the modal's four real `DOMAINS`** (`Mindful Focus`, `Vitality & Fitness`,
`Renewal & Health`, `Craft & Skill`), asserted as a literal so a rename in the modal breaks
the test rather than the feature. Two tags share `Mindful Focus` — four domains cannot cover
five tags distinctly — and that collision is recorded rather than papered over with a
category the picker does not offer.

12 new tests, **283 green** across 19 suites. Verified end-to-end in-browser through the real
five-step flow at 360/390 in light and dark: five chips with correct labels and blurbs, and
tapping **Peak Health** produced a form with name `Workout`, the 🏋️ icon selected,
**Vitality & Fitness** chosen and the Morning anchor intact. **0 console errors.**

**A harness detail worth keeping:** the flow is `intro → circadian → welcome → habits →
protocol`, so "Begin Your Odyssey" lands on *circadian*, not the habits step. The check now
advances until the chip group actually exists rather than hard-coding a step number —
otherwise it reported "0 chips" and looked like a broken feature.

### 2026-10-08 — M14 rank level-up dialogs, whose hard part is refusing to fire

**Shipped:** a dialog carrying the newly earned rank's badge, division, milestone line and a
**unique piece of lore**, shown once per promotion.

**The feature is 10% rendering and 90% refusing to fire.** `getRankUpCelebration` returns
`null` — not a degraded object — in the three cases where a level-up dialog would be lying:

1. **First launch.** A new user opening the app holds the rank they were always going to
   have. Nothing was earned, so the rank is recorded silently and no dialog appears.
2. **The same rank again.** A refresh, a re-render, a second device. Strict inequality, so
   one promotion cannot be celebrated twice.
3. **A demotion.** Losing days moves a user *down* the ladder. Congratulating someone for
   *"reaching Master"* when they have just fallen to Novice is the worst lie available in
   this app, and it is the easy case to get wrong because the rank genuinely changed.

**The previous rank has to be remembered, and that is where case 3 gets subtle.** The rank
is derived from the streak inside a store the component never sees, so the previous value
lives in `localStorage`. A demotion updates that stored value **silently** — otherwise a
broken streak leaves a stale high-water mark that fires a false promotion days later, which
is the same lie arriving late instead of immediately.

**A test caught a real instance of the exact bug this design is about.**
`getRankLore` originally resolved names through `getRankInfo`, which **silently falls back
to Beginner** for anything unrecognised. So `" legend "` (leading space) and `"Warlord"` were
both handed **the Beginner's story** — a confident, wrong line of lore, from the one function
whose whole job is to not say that. It now resolves against the ladder directly and returns
`null` for anything off it. Had the test only checked the nine valid names, this would have
shipped.

**Lore is keyed by rank name, not index,** so reordering `RANKS` cannot silently attach the
wrong story to a rank. `RankInfo.description` already states the milestone (*"1 week
completed"*), so the lore says what the rank *means* instead of repeating it — and a test
asserts no lore restates its description.

**The Legend line deliberately honours the missed days:** *"Not one perfect year — a real
one, with the missed days included and the showing up anyway."* The app counts real
adherence with gaps, so a perfectionist claim at the top of the ladder would be false for
nearly every user who reaches it.

16 new tests, **271 green** across 18 suites. Verified in-browser across all four cases at
360/390 in light and dark: promotion fires with the right `Novice → Consistent` header and
the right lore; **demotion, repeat and no-change all render no dialog** while still updating
the stored rank. **0 console errors.**

**A harness bug worth recording, because it nearly inverted the result.** The first run
reported a dialog for *every* case, all headed `Beginner → Consistent`. The app was right and
the harness was wrong: it wrote the "rank you had last time" to `localStorage` immediately
after `goto`, and the app's own first-load write of its starting rank landed *afterwards* and
clobbered it — so all four cases silently became Beginner→X promotions. The fix lets the app
settle **before** seeding the preseed. **A verification script that overwrites the state
under test between setup and assertion will agree with the code no matter what the code
does**, and the tell was that four supposedly different cases returned identical text.

One lint error surfaced and was fixed rather than suppressed: calling `setState` synchronously
inside the effect cascades a second render pass, so the promotion is applied via
`queueMicrotask` — the promotion is still *recorded* immediately, so a deferred render can
never show it twice. `F1` stays `PARTIAL` (avatar scenes still missing).

### 2026-10-08 — M13 warm microcopy, whose real finding was a fabricated "1d"

**Shipped:** warmer XP toasts and a warmer streak counter, with every string in a tested
module (`warm-copy.ts`) instead of inline in JSX.

**Two rules shaped all of it, and both come from the failure this repo keeps auditing for
— a confident line of copy that is not true.**

**Warmth never outruns the event.** Completing a habit that was **not scheduled today** used
to say *"Rest-day completion registered!"*, which reads like a scheduled routine was ticked
off. It now says **"Not scheduled today, done anyway"** — warmer *and* more accurate than
before. Undoing a completion is not an achievement, so *"Completion undone."* carries no XP
figure and no praise.

**"Pending" survives.** An earlier pass at warm copy would have turned these into "XP
earned" — a nicer sentence about money the user does not have until the day's rewards settle
at midnight. The word stays, and a test asserts it on all three XP toasts so a later
"warmer" edit cannot quietly regress it.

**The real finding was a number, not a word.** The streak counter rendered
`{h.currentStreak || 1}d`, which printed **`1d` on a habit with no streak at all** — on the
habit card, right beside a completion count. `edit-habit-modal.tsx` and
`wallpaper-preview.tsx` already read the same value honestly with `|| 0`, so **both idioms
were live in one codebase and the warm one was the liar.** A real zero now reads **"No
streak yet"** and drops out of the achievement amber into the muted colour, because a zero
streak is not a failure state and should not be painted like a trophy.

**This closes `B15`, and it is worth being explicit that it is not scope creep.** The `B15`
line previously recorded that false value and **deliberately deferred it** rather than
bundling a number fix into `M7` (a copy feature). `M13` is the copy feature that owns the
streak counter's *label*, and a label function that takes the true value is the honest
implementation — routing `currentStreak || 1` into new copy would have re-blessed the lie.
The fix appears in M13 because that is where it belongs, and `B15` moves to `SHIPPED` with
the reasoning written down rather than quietly absorbed.

**The empty states were audited and left alone — on purpose.** `M13`'s brief also names
them. The Habits keystone ("Your journey begins with one keystone habit"), the Planner clean
slate, the template library and the vault **already read like a person wrote them**.
Rewriting copy that is already warm would be churn performed to look busy, which is the same
instinct that produces generic copy in the first place. Recorded on the M13 line as a
finding, not a gap.

18 new tests, **255 green** across 17 suites. Verified in-browser with two genuine zero
streaks and two real ones across **all three habit views** (list, grid, compact) at 360/390
in light and dark: zeros read "No streak yet" in the muted colour, real streaks read `1d`/`7d`
in amber, the toast read *"That's one in the bank. +15 XP pending"*, and **"No streak yet"**
fits the compact grid tile without clipping. **0 console errors.**

**A harness bug worth recording:** the first view-toggle selector guessed at `title`
attributes, silently stayed on the list view, and printed three identical passes that looked
like coverage. It only became obvious when the click step reported zero cards found. The
fix locates the toggle row from the "Today: N/M" label and asserts how many buttons it
found — a green run that never left the starting state is worse than a red one.

### 2026-10-08 — M12 "Up next in 35 min", and a clock that had three ways to lie

**Shipped:** a line under the planner header — *"Up next in 35 min · Deep Work Session
(2h)"*.

**A countdown is a clock rendered as text, and clocks lie.** Three specific ways, each
handled and tested rather than assumed:

1. **"Up next in -15 min".** A block that started a quarter hour ago is not upcoming.
   Anything started-and-unfinished is **`Now`** — which is also **C4**'s own other
   wording (L255: *"Now" or "Up next in 45 min"*), not an addition of mine.
2. **"Up next in 0 min".** Rounding a block that is 20 seconds away *down* to zero prints
   a line that claims urgency the user cannot act on. The gap **rounds up**, so the
   smallest possible value is "1 min" and `Now` covers the sub-minute case.
3. **A 22:00 → 01:00 block read as minus twenty-one hours.** Midnight-crossing blocks get
   their end pushed a day forward — and the comparison is a **strict `<`**, because the
   rail's own hour matcher (`h >= sH && h < eH`) reads *equal* times as an **empty**
   block. A `<=` would have turned a zero-length block into a 24-hour one. **My first
   test run caught exactly that**, which is the argument for writing the empty-block case
   at all.

**Nothing is rendered when there is nothing to say.** Once the day's blocks are behind us
the line disappears entirely — no empty bar, no "Nothing scheduled" — the M7/M8 precedent.
It is also **today only**: browsing to a past or future date hides it, because "in 35 min"
printed over a browsed date would be a lie about the clock. Blocks already `completed` or
`missed` are skipped — being on deck for something you gave up on is nonsense.

**One timer, not two.** The planner already had a 15s tick for the current hour and
today's date; M12 feeds its clock from that rather than adding a 30s interval, so the
countdown cannot drift out of step with the current-hour marker sitting beside it.

**Plain text, not a pill.** The header already carries the M8 capacity badge and the
completion fraction. A third coloured chip below would put three rounded blobs in a row
and read as a row of status rather than a sentence about time.

**Battery question (rule 10), answered before building:** the line exists only while the
planner page is mounted in a foreground tab. **What wakes the device:** nothing — it cannot
run while the app is closed. **Default when state is unreadable:** no line, since it is
derived from the already-loaded blocks and has no state of its own. **What happens when
the user turns it off:** there is nothing to turn off; it stops when the app is closed or
the user navigates away, and adds no new wake-ups to the interval that was already there.

26 new tests, **237 green** across 16 suites. Verified in-browser against **the real
clock** across seven scenarios: +35 min, +5h, a finished block plus an upcoming one, a
running block, a fully finished day, a `missed` block, and a 23:00→01:00 wrap — light and
dark at 360/390, **0 console errors**.

**Two of the first three browser "failures" were my test harness, not the app** — and one
was worth keeping. At 03:00 the script asserted a block "5 hours ago" should be in the
past; it was seeded as *tonight* and the app correctly said `Up next in 19h`. The harness
had no notion that early in the day most times are still in the future, so it now skips
scenarios the local clock cannot honestly express instead of asserting a falsehood.
`C4` stays `PARTIAL`: the wallpaper gauge share is still Phase 5.

### 2026-10-08 — M11 time-period accents, built on a field the app never read

**Shipped:** a small chip beside each habit's name — **Morning** / **Afternoon** /
**Evening**, in amber / blue / purple.

**The field had been dead since day one.** `Habit.period` was in the schema from the
start and the create form wrote it on every new habit, but **nothing anywhere in the app
ever read it back** — it was stored, indexed, and ignored. M11 is its first reader, which
is why the win is not just "three colours appeared".

**The spec's four hex values are not used, on purpose.** Morning `#F59E0B`, Afternoon
`#3B82F6`, Evening `#8B5CF6`, Night `#4F46E5` were chosen without reference to this app's
surfaces, and §5.4 bans a raw hex in a component outright. The **hues** are kept — amber
reads as morning, purple as evening — and the **values are re-tuned per theme** so the text
still clears 4.5:1. Light-theme `#F59E0B` on a near-white card is roughly 2.1:1 and would
have been a real accessibility failure; `--period-morning` is `#B45309` light and `#FBBF24`
dark instead. Colours live only in `globals.css`, as everywhere else.

**There is no Night, and that is a finding, not an omission.** The spec asks for four
periods. The schema's union is `'morning' | 'afternoon' | 'evening'` and the create form
offers no night option, so a night token would be **selectable by nothing** and untestable.
Rather than ship a dead token or quietly invent a fourth period in the UI, M11 covers the
three that exist and the gap is written on the M11 line and asserted in a test that pins
the count to 3.

**Colour is never the only signal** (§5.3 #3). Each accent returns a **label** as well as
classes, and the chip renders the word — a user who cannot distinguish amber from purple
still reads "Morning".

**A value that is not one of the three renders nothing.** The union is compile-time, but the
value round-trips through IndexedDB, which is not type-checked, so a habit written by an
older build can hold anything. Verified in the browser with a habit seeded as
`period: "night"`: it renders no chip and raises nothing, rather than an undefined class.

11 new tests, one of which asserts **no accent string contains a hex or rgb literal** — the
test that stops a future edit from leaking a raw colour into the component. **211 green
overall** (15 suites). Verified at 360/390 in light and dark with the computed colour read
back off the element to prove the token resolves, **0 console errors**. `C1` stays `PARTIAL`:
the rail is still not coloured by period.

### 2026-10-08 — M8 daily capacity badge, and a label that argued with itself

**Shipped:** a badge in the planner header — *"Light Day · N habits"* / *"Balanced · N habits"* /
*"Heavy Day · …"*. Implemented as **a third `HeaderSlot`**, which is exactly the extension point
M9 was built for: no other part of `CompletionFractionHeader` changed. Keyed on the **level**
rather than the label, so it cross-fades when a day's load changes category and stays put while
a habit is merely ticked.

**The source material has a gap, and it is resolved rather than hidden.** §19 labels heavy as
"8+ habits"; §21 says "8+ habits **or** six planned hours". So **6 and 7 habits are neither
light nor heavy by count alone** — they fall in Balanced, and a day is heavy on *either* signal.
Both are used because §21 L811 is explicit that a warning must compare planned hours to the
available window, and **eight 5-minute habits is not a heavy day**. Thresholds are named
constants because §22.3 calls them *"starting hypotheses, not validated limits"* — the same
treatment ADR 0001 §7 gives the XP rates.

**The label caught by browser verification, not by the pure tests.** A first pass always quoted
the hours, so nine habits and an empty schedule rendered **"Heavy Day · 0h planned"** — heavy,
but naming the signal that was *not* the reason. It reads as a contradiction and sends the
reader hunting for a bug that does not exist. The label now quotes whichever signal decided it
(`Heavy Day · 9 habits`, `Heavy Day · 6h planned`, `Heavy Day · 9 habits · 6h`), with a
regression test. **Every pure test passed while this was wrong** — the arithmetic was right and
the sentence was not.

**Read-only by construction, and that is tested rather than asserted in a comment.** Nothing in
the returned shape can block, hide, or refuse; the heavy state says *"Consider doing less"*,
and `MASTER_TODO_REVISED.md` I2 requires "never block". One test pins the exact set of returned
keys as an anti-action guarantee, so adding a `blocked` field later breaks it.

**Two "say nothing" decisions**, both following the M7 precedent — a rest day renders **no
badge** rather than "Light Day · 0 habits", and the badge is suppressed while the habit store
loads, because `habits` is empty before the read resolves and a habitless user would otherwise
be labelled light on every visit and see the label vanish.

**The planner's own `categoryStats.plannedTotal` is passed in**, not recomputed, so the badge and
the Daily Schedule Rail balance bar cannot disagree about the same day. Verified side by side: a
6-hour day shows the same 25% fill on both.

19 new tests; **199 green overall**. Verified at 360/390/430 in light and dark across all four
classifications, **0 console errors**. `C5` moves to `PARTIAL` — capacity shipped, the buffer
half is `S17` and still unbuilt.

### 2026-10-08 — M7 "last done", and a fabricated timestamp that would have shipped a lie

**Shipped:** a line under the habit name on every list card — *"Last done: Today at 8:15 AM"* /
*"Yesterday"* / *"N days ago"*, collapsing to *"Last week"* at 7–13 days and *"N weeks ago"*
beyond. A habit never completed renders **no line at all**; `formatLastDone` returns `null`
rather than printing "never", because the honest answer is that we do not know.

**The finding that shaped it.** The obvious source for the clock time is `todayLogs`, and it
**cannot be trusted**. When the store rebuilds that slice from `historyLogs` after a date
rollover it fabricates `loggedAt: new Date().toISOString()` — *now*. So a clock time read from
the store reports **"Today at 2:04 AM"** for a habit completed at 8:15 that morning, and it
does so *only* after a reload, so it looks fine in a casual test. `lastCompletedAt` is
therefore folded out of `allUserLogs` inside `fetchHabits` — the row set is already in hand, so
**no extra query** — and it is user-scoped and date-independent, so the date-change
early-returns deliberately leave it alone rather than recomputing per date change.

**Only the "today" variant needs a time,** and that is not a shortcut — `historyLogs` stores
booleans, not timestamps, so for any other day only the *date* is genuinely known. Inventing a
time would have been a guess presented as data.

**Anchored to today, not the selected date.** It describes the habit, so browsing to a past
date still answers "when did I last do this" truthfully rather than implying you stopped
existing. A future timestamp (device clock moved backwards) yields **no line**, not
"yesterday" — a lie in the other direction is just as wrong as a false zero.

**Three of my own tests were wrong before the code was,** which keeps happening and keeps being
worth catching: Sep 30 → Oct 8 is **8** days (lands in "Last week", not "1 week ago"); Sep 8 →
Oct 8 is **30** days (`4 weeks ago`, not "Last week"); and Feb 28 → Mar 1 2028 is **2** days,
because 2028 is a leap year — exactly what a naive "one month boundary = one day" assumption
gets wrong. I also had a sanity assertion that pinned the **UTC** date of a local 23:30
completion; that depends on the machine's timezone (this box is UTC+5:30, so it is the same
UTC day), so it would have passed here and failed elsewhere. Replaced with a behavioural
assertion.

**Found, reported, NOT fixed (recorded on `B15`):** the card renders `{h.currentStreak || 1}d`,
so a habit with a genuine **zero**-day streak displays **`1d`** — confirmed in the verification
screenshot. Same family as the `0/0` readout and the fake vault balance, but a *different*
fix, and folding it into M7 would be the silent scope-creep this repo keeps auditing for.

Verified against a production build at 360/390/430 in light **and** dark with all four cases
seeded into IndexedDB — today, yesterday, three days ago, never — **0 console errors**.

### 2026-10-08 — Performance spec consolidated into `inefficiencies.md` §11, master prompt deleted

The performance phase had **two** authoritative documents — `main_plan.md` §6.5 and the
restatement in `MASTER_TODO_REVISED.md` §23 — each bound to
`tracker-performance-master-prompt.md` by an *"edit one, edit the other"* rule.

**Managing two sources with a protocol is worse than not having two.** So the prompt's content
was **imported verbatim into `inefficiencies.md` §11** and the file **deleted**. One authority;
the drift rule disappears along with the drift. §6.5 and §23 remain as restatements and are
still bound to §11.

**Why `inefficiencies.md` is the right home, not an arbitrary one:** it is already the battery and
render audit that `P8` turned into rules, it already carries a **§8 "what was changed"** table
recording the delivered wallpaper fixes, and `main_plan.md` already cites it as a `src:` for
`POL-1`. The performance work is the *continuation* of that audit, so it belongs there rather
than in a separate file that would need its own status table.

**Two stale figures in that audit corrected while I was in it** — the same reconciliation
discipline applied to the document itself:

- `backdrop-blur` occurrences **46 → 41 across 21 files**. The "22 heavy" sub-count is
  explicitly marked **not re-verified** so it stands as a *floor* rather than passing off an
  estimate as a measurement.
- `SharedPreferences.commit()` **8 → 9** call sites.

Both were originally sourced from the audit and had been quoted onward into `POL-1` (which said
29), so the error had already propagated once. That is the argument for re-measuring at the point
of use rather than trusting a number copied two documents away.

**Import provenance is recorded, not erased.** §6.5, C12, `MASTER_TODO_REVISED.md` §23, the
`inefficiencies.md` header and the `main_plan.md` changelog all still say where the content came
from and that the file was deleted. Deleting the source without saying so would leave a future
reader hunting for a file that no longer exists.

The imported text is verbatim except that **Markdown heading levels are demoted two levels** so
it nests under §11.1 instead of introducing top-level `#` headings that collide with the
audit's own structure. No wording altered. Appended with explicit UTF-8 no-BOM — the earlier
`Set-Content` corruption in this repo was UTF-8 mangling, and it was verified after the fact
(0 replacement characters, 157 section signs intact, 12/12 diff on `main_plan.md`).

### 2026-10-08 — Performance phase added (§6.5), `POL-1` dissolved into it

**Owner instruction.** The 18-item overhaul in `tracker-performance-master-prompt.md`
became a phase, and the owner required its content be **written into the docs** so an
agent never has to reopen the master prompt for routine work.

**Where it lives:** `main_plan.md` **§6.5** (all 18 items inline, `PERF-0`…`PERF-18`) and
`MASTER_TODO_REVISED.md` **§23** (the specification). The master prompt stays the
**authority**: §6.5 carries two binding anti-drift rules — on conflict the master prompt
wins and §6.5 is the stale side, and editing one requires editing the other.

**Unnumbered, deliberately.** `§6` is already *PHASE 4 – Social tab*. Naming a second
block "Phase 4" would create a duplicate phase name that breaks the §0.4 order table and
every "Phase 4" reference in the repo. Renumbering §7–§12 was rejected: **33
cross-references inside `main_plan.md` alone**, plus more in `DEVELOPMENT_PLAN.md`,
`FEATURES.md` and this file. One line is the whole cost of avoiding that.

**Reconciling first changed what the phase is.** Applying the master prompt's own
"verify before you change" rule against source found **5 of 18 items already delivered**
(`#1` core via `P8-E2`, `#2c`, `#4a`, `#15`, and `POL-1`'s master switch) and **4 figures
wrong** — blur "~22" is really **41 across 21 files**, `.commit()` "8" is **9**, the
1,710-allocations-per-second estimate died with the 30 FPS loop, and `#3` assumes bundled
assets when `MainActivity` does `loadUrl(targetUrl)`, i.e. **remote**. So `PERF-0` is a
mandatory baselines-and-reconcile step, and delivered items are recorded `BUILT` **with
what still needs verifying** rather than quietly closed. Implementing the list as written
would have meant "optimising" a loop removed months earlier.

**`POL-1` dissolved, nothing lost.** Its wording is preserved verbatim in §6.5.5, both
halves survive (default-off master switch = delivered `P8-E1`; render cost = `PERF-1`/
`PERF-7`/`PERF-9`), and the Phase 6 line became a pointer rather than a deletion so the
old location still says where it went. Its stale **29** blur figure is corrected to 41.
Recorded as **C12**.

**`BUILT` added to the §0.2 status legend.** It was already used on a dozen lines (M1–M6,
A1, XL14) but was **never defined**, so nothing said what it meant. It now means *code
exists, not yet verified in this phase* — deliberately weaker than `SHIPPED`, which means
someone measured it.

**The measurement boundary is stated, not hidden** (§6.5.4). Six items are native Kotlin
and the master prompt demands `adb`/`dupsys`/`gfxinfo` on a **physical mid/low-end device,
release build**. This repo has **no `gradlew`**, JBR 25 cannot start the Kotlin 1.9.22
daemon (R14), and no device is attached. Those items stay `BUILT` + "unverified — needs a
device" and must never be promoted on a green web suite alone — `tsc` does not read
Kotlin, and a real Kotlin error once shipped through a fully green suite (R12).

### 2026-10-07 — Status sweep: three lines in `main_plan.md` were lying

Owner flagged that implemented tasks' statuses were not being updated. The last two
commits *did* carry `main_plan.md` edits, but the audit below found the statuses were
**wrong in three places** — which is worse than absent, because a wrong status is
authoritative-looking and nothing prompts anyone to re-check it.

**`M4` said `PARTIAL` and *"no page mounts the component yet"*.** Untrue from the very
commit that built it. The component **is** mounted, on `habits/page.tsx` above the vault
banner, and the reward half is far past "component built" — the vault is now the only
route for habit rewards. Now `BUILT`.

**`F3` still said *"no first-day card"* after `M4` shipped one.** Now corrected.

**`B15` gave no detail at all** — bare `PARTIAL`, while two of its three halves
(creation confirm from `M5`, own-streak labelling from `M4`) had shipped and only
last-done (`M7`) remained.

**The mechanism that let all three go stale:** these ids are cross-referenced dozens of
times in `main_plan.md`, and updating *your own line* was the whole of the previous
rule. Nothing forced a look at the neighbours. The rule is now a **sweep**, recorded in
`main_plan.md` §1 and `FEATURE_WORKFLOW.md`:

```
1. flip your own checkbox AND correct your own status wording
2. grep the file for your id, and for every id the commit also touched
3. fix each hit your change made false — even on another feature's line
4. re-read your own line once, AFTER the code is in
```

**Step 4 is the load-bearing one.** Writing the status *before* the code is exactly how
`M4` ended up describing a component that had not been mounted yet, and then was never
revisited. **`BUILT` is a claim about shipped reality — write it last.** And a bare
`PARTIAL` is not a status at all, it is a way of avoiding one; it must name what is
missing.

Note on the earlier commits: `M6`, `A1` and `XL14` statuses were updated correctly.
This was a sweep that had not been performed, not a rule that was ignored.

### 2026-10-07 — Process rules: the commit sequence, and never leaving a server running

Owner instruction after two failures in one session. Both were process failures, not
code failures, which is why they are now enforced in `AGENTS.md` and
`FEATURE_WORKFLOW.md` rather than merely noted here.

**The commit sequence is mandatory and ordered:** `implement → verify → main_plan.md →
context.md → commit`, all three in one commit. A commit carrying code but neither
document is the **same defect as uncommitted work** — only harder to spot, because
`git status` is clean so nothing prompts a follow-up, and the next session has no record
of what shipped. Order is `main_plan.md` first because `context.md` points at it and must
be written knowing what the status now says. Extended to features that did **not** ship
as planned: dropped, deferred, renamed or built under a different id must say so, because
silence is the traceability failure rule 7 exists to prevent.

Worth being precise: this rule was **already followed** for `A1`/`XL14` and `M6` — both
commits carried the doc updates. The gap was that it was a habit, not a rule, and the
owner asked for it to be structural.

**`Start-Process` never terminates, and that is the whole trap.** It returns as soon as
the process spawns, then leaves the server running forever holding its port. The tool
call *looks* finished, so an agent treating the return as "done" walks away. It happened
three times here. Now encoded as: never issue `Start-Process` alone; chain start →
assert `Ready` → use → **kill by the port's owning PID** in one command.

Two details that make the rule actually work:

- **Kill by the port's PID, not a remembered one.** `next start` spawns a child; the
  process you started may already be gone and the one holding the port is not the one
  you know about.
- **Assert `Ready`, because a server that failed to bind still answers requests — with
  the previous build.** `EADDRINUSE` means you are reading stale output, and "the page
  loaded" is not evidence that what you are testing is what you changed. This is the
  nastiest class of silent failure here: it produces a *plausible* wrong answer.

Also promoted from session notes to permanent rules in `FEATURE_WORKFLOW.md`
§Process traps: headless Chrome defaults to dark; the OTA update modal's fixed overlay
swallows `page.click`; never edit markdown with PowerShell `Set-Content`; and a failing
assertion on the headline requirement needs a control before a fix.

**On the `Set-Content` one:** it re-encoded this entire file — BOM added, UTF-8 em-dashes
turned to mojibake — producing 318 insertions and 227 deletions of pure encoding noise.
Caught by checking the diff before committing. Fixed by `git checkout --` on the file and
redoing the edits with the file tools. §7 already said to use the file tools; that line
now has a scar on it.

### 2026-10-07 — A1/XL14 first-run flow, and M6 moved into it

**Shipped:** `/` is no longer a 710-line scrolling pitch. It is a five-step flow —
`intro → circadian → welcome → habits → protocol` — with Next/Back, a step
indicator, a theme choice on every step, and a commitment hold that ends in a
spreading circle. `app/page.tsx` is now the flow host, the steps are in
`src/components/onboarding/`, and the step machine plus commitment maths are pure
functions in `lib/utils/onboarding-flow.ts` (30 unit tests).

**Habits created during the flow are real habits.** Step 2 reuses
`CreateHabitModal` and writes through the same store action the Habits tab uses,
so there is nothing to copy or sync — verified end to end: a habit added in step 2
is present on `/habits` after the commit, and the empty state is gone.

**The profile must exist before any habit saves.** `addHabit` requires a
`userId`, so the flow awaits `getOrCreateUser()` on mount. Without it the first
habit silently fails to write and the "your habits" step is empty for no visible
reason. `handleCreateHabit` guards on `profileId` rather than trusting it.

**Step 3 tracks the ids it created, never "all habits".** A returning user who
cleared the onboarding flag already has habits, and presenting those as the ones
they just added would be a lie. Same species of bug as the confident false zero: a
claim about data state made without checking whose data it is.

**One way in.** The old page had four controls that each called `enterApp()`: a
header "Launch App", a hero "Explore Habit Studio", and five footer links. Any of
them skipped the entire introduction. All removed — verified `bypassLinks: []` on
every step. Back is hidden on step 1 and Next hidden on step 5 rather than
rendered disabled, because a permanently dead button reads as a broken app.

**The commitment hold, per owner instruction: no progress bar.** While held, a
circle grows from the button until it covers the screen; at coverage it locks,
then 1s later the app opens. Details that are not obvious:

- The radius target is the viewport **half-diagonal**, not half-height. A circle
  sized to the shorter side leaves the corners uncovered.
- It is driven by **wall-clock elapsed time** through rAF, not a frame counter, so
  a dropped frame or a backgrounded tab cannot shorten the commitment.
- `hasCoveredViewport` demands **exactly 1** — no "close enough". A partly covered
  screen must not commit to a route change the user cannot take back.
- Release early cancels and shrinks back (320ms) rather than snapping to zero.
- 2500ms, up from the old 1400ms ring, eased in-out. Linear would make the first
  and last few percent feel like nothing was happening, which reads as "snappy"
  and invites an early release.
- Keyboard parity: hold Space or Enter. A single-gesture step with no non-gesture
  equivalent would be unreachable by keyboard.
- Reduced motion commits immediately instead of animating.

**Theme is a real three-way choice (System/Light/Dark) on every step, and it IS
the app setting** — `setTheme` writes the same `odyssey_theme_mode` key the
anti-FOUC script in `layout.tsx` reads before paint, so no plumbing was needed.
The control deliberately **does not write on mount**: persisting the resolved
value unprompted would override a user who never chose, which is exactly the
"system by default" behaviour that was asked for.

**M6 was moved, not duplicated.** Its pillars and the M1 trust badge are step 2;
`WelcomeCard`, `shouldShowWelcomeCard`, the dismissal flag and both test sets were
**deleted** (18 tests) rather than left in two places. A dismissible banner makes
no sense inside a guided flow, and its copy described itself in terms of a screen
it no longer lived on. Zero-habit users on `/habits` fall back to the M2 keystone
state.

**A UX flaw the first verification pass surfaced.** The welcome step ended up with
both "Add your first habit" and a neutral shell "Next" that silently skipped the
step's entire purpose — two controls reading as equal alternatives when one is a
skip. Next now reads **"Skip for now"** with nothing added and **"Continue"** once
something is. Same duplicate-control lesson as M3's two (+) marks and M6's stacked
cards.

**My own test was wrong before the app was.** The first persistence run reported
the habit missing from `/habits`, which looked like the headline requirement
failing. It was the script: it clicked `Next` twice and skipped straight past the
step that adds the habit, so nothing was ever created. Traced by logging the step
indicator after every click. **A failing assertion that says the most important
requirement is broken deserves a control before a fix.**

### 2026-10-07 — M6 welcome card, and two verification traps that faked a failure

**Shipped:** `src/components/habits/welcome-card.tsx` — heading, warm
one-liner, three pillar rows (Habits / Schedule / Wallpaper), the **M1** trust
badge inline, one CTA opening the existing create modal, and a `×` dismiss. That
fills the onboarding surface the M1 badge comment had explicitly recorded as
"deliberately absent", so **all three** M1 surfaces named at §19 L973 now exist.

**It shares one slot with M2's empty state rather than stacking above it.** Both
are full-size and both carry a "do this" button; two of them compete and the user
has to work out which to obey — the same duplicate-control mistake the M3 pulse
made. `shouldShowWelcomeCard()` picks a winner and the loser is not rendered at
all. Dismissal hands the slot to M2, so dismissing is never a dead end. **The
card never returns once a habit exists.**

**Loading is checked first in that rule, and that is the whole point.** The habit
store starts `loading: true` on purpose, so `habits` is `[]` on the first paint for
*every* user including one with twenty habits. Testing `habits.length === 0`
alone would flash the card at a returning user on **every visit**. This is now the
fourth instance of the same class: `0/0 (0%)` with no habits, `percent: null` in
`habit-progress.ts`, the M3 clean-slate card, and this. **Any new "this is empty"
state on a store that loads must copy `planner-empty-state.ts` and short-circuit
on loading first.**

**Dismissal uses a SEPARATE flag from the landing page's.** `onboarding.ts` had
`odyssey_onboarding_complete`, gating the landing pitch. It looks like the same
fact — "this person has seen the intro" — but sharing a key means dismissing the
card would let the landing page reappear, and finishing the pitch would hide the
card. Two keys, one test asserting the independence.

**localStorage is correct here, and the opposite of ADR 0002.** The reward ledger
had to move into IndexedDB because it protects a balance — losing it pays twice. A
dismissed banner protects nothing; the failure mode of losing the flag is that
someone sees a welcome card once more, which is harmless. Different tier, and the
comment says so so nobody "fixes" it.

**The wallpaper copy is deliberately hedged.** P8-E1 made the wallpaper
default-OFF, so "your plan on your lock screen" would promise a background
service the user has not switched on. It reads *"if you want it there"*. Owner
confirmed: keep it default-off.

**Two verification traps, both of which first read as a broken feature:**

1. **My React-hydration probe was wrong**, reporting `1` hydrated node on a page
   that had **676**. `for (const k in node)` plus an early `return` walked the
   tree wrongly. Correct form is `Object.keys(n).filter(k => k.startsWith("__reactFiber"))`
   over every element. **A broken probe reporting "not hydrated" is
   indistinguishable from a real bug** — that is the M2 trap again, one level up.
2. **Headless Chrome defaults to `prefers-color-scheme: dark`**, so my first
   "light mode" pass rendered dark and I nearly recorded light mode as verified.
   The theme resolves through that media query. Force both the emulation and the
   stored mode; do not trust the run's label. Added to §7.

And a third, cost two debug cycles: **a fixed `z-50` overlay swallows real mouse
clicks.** `AppShell` renders `<AppUpdateModal />` on every route, so on a fresh
profile `page.click` on the dismiss button hit the modal backdrop and the card
looked broken. `page.click` does hit-testing; `el.click()` via `evaluate` does
not. **The M2 lesson again: run a control before concluding your code is
broken.**

Also worth recording: the create-habit modal opens on the **template browse**
view, not the form — a `requestSubmit()` on the form finds nothing until
"Create Custom Habit" is clicked. That is why the retire-on-first-habit check
appeared to fail.

**Found, reported, NOT fixed (out of scope — CONS-2 territory):** at **360px** the
floating Feedback button overlaps the card's primary CTA by ~259px² of 10,584
(2.4%, its top-right corner). A tap there hits the FAB. The FAB is `fixed` and
overlaps content on every screen; the fix is bottom clearance so content clears
it, which belongs to the narrow-screen sweep, not to M6.

No animation on the card at all, so `prefers-reduced-motion` is honoured with no
handling. 156 tests green (M6 adds `welcome-card.test.ts`, 9 tests, and 9 more to
`onboarding.test.ts`).

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
- HEAD at last update: **this commit (BUG-8 category picker stacking) + `a09d66e`** — M19 allocation
  bar, `7dd58eb` (Quick schedule: review toggle and Focus & Title removed, task text wraps),
  `2f9cf5f`
  (BUG-7), `80b10a7` (chest hydration + freeze chip), `d2ee8e9` (Bonus Tier bar),
  `e058567` (CONS-1), `c4f052d` (D2), `837cf7f` (P0-T6), `96881f2` (P0-T3),
  `9cf731f` (BUG-5), `4f41b08` (BUG-4), `d50e112` (P0-T7), `811fea0` (CONS-2/P0-T2).
  **⚠️ A concurrent session is editing `day-schedule/page.tsx` right now** (an inline day-title
  editor: `refocusTitleRef` / `beginTitleEdit` / `commitTitle` / `cancelTitleEdit`). **It is
  deliberately left uncommitted in the working tree.** BUG-8 was committed with `git apply --cached`
  from a patch built against HEAD so that not one byte of that work was staged — see §9 2026-10-16.
  **Do not `git checkout --`, reset, stash or re-save that file while the other session is running.**
- Working tree: **not clean** — the concurrent session's day-title editor, unstaged, on purpose.
- Lint: **0 errors**, 7 warnings in `day-schedule/page.tsx` — **all pre-existing** (`db`,
  `ChevronDown`/`ChevronUp`/`ChevronRight`, `Trash2`, `addDiamonds`, `handleClearBlock`).
  `allocation-bar.ts` and its test are **clean**.
- Tests: **23 suites, 357 tests, all green.** `tsc --noEmit` exit 0. Production build clean.
- **Server hygiene this session:** a `next start` on **port 3000**, started at 16:10:49 by the
  *other* session, was still holding the port when this task finished and **was killed** along with
  this session's own 3100 server. **No listener remains on 3000 / 3001 / 3100.**
- **Two harness traps confirmed in this environment, both worth keeping:**
  - **Seeded IndexedDB persists across runs inside a browser context.** Reuse the context
    and each run appends to the previous one. Use `browser.createBrowserContext()` per
    combination, and assert the field holds exactly the seeded string — otherwise a
    wrapping assertion passes while measuring multiplied text. Details in §9, 2026-10-16.
  - `%TEMP%\opencode\verify\with-server.ps1` killed port 3100 correctly on both runs,
    including when the script exited non-zero. Prefer it over a bare `Start-Process`.
- **The verification scripts for this work** are `check-quicksched.js` (removals + wrapping
  at 360/390/430/768 in both themes) and `check-strikethrough.js` (Enter saves+advances
  without inserting a newline; a block completed on `/planner` still shows struck through
  with no controls). Screenshots in `%TEMP%\opencode\verify\shots-quicksched\`.
- **`P0-T2` — `graphify` IS on PATH**, at
  `%APPDATA%\..\Python\Python311\Scripts\graphify.exe`. The 2026-10-07 session-log entry
  recording the CLI as unavailable is **wrong** and is superseded by this. `graphify update .`
  now completes: 2164 nodes / 3164 edges / 208 communities. It reports the installed *skill*
  (0.9.67) is newer than the *package* (0.9.51) — harmless — and that the two `build.gradle`
  files have syntax errors and extract no symbols, which is a Groovy parser limitation, not a
  build defect.
- **Verify interaction against `next start`, not `next dev`** — see §9, 2026-10-07.
  On this machine a `next dev` page renders but never hydrates, so every click
  silently no-ops.
- **Kill any background server when the task ends, and say so in the report.**
  Now a rule in `AGENTS.md` §Background servers and `FEATURE_WORKFLOW.md`
  §Process traps, not just a note here — see §7 for the start/assert/kill chain.
- **Hydration marker is a React-keyed node count, not `#__next`** — see §9,
  2026-10-07. The old `#__next` check reads `false` on a working production build.
  Count `Object.keys(n).filter(k => k.startsWith("__reactFiber"))` per element;
  a probe built on `for…in` reports 1 on a page with 676 and looks like a real
  hydration failure.
- Puppeteer is **not** a project dependency, and — **corrected 2026-10-16** — `puppeteer-core`
  is **no longer reachable at all**: absent from `odyssey/node_modules`, from global `npm ls`, and
  from the npx cache, so the earlier note that it is "installed outside the repo" is now **wrong**.
  Verify visually with the **system Chrome** (`C:\Program Files\Google\Chrome\Application\chrome.exe`,
  155.0.8059.80) driven directly, **without adding a dependency**: `--headless=old` (not `=new`),
  and write its output through `cmd /c "... > file 2>&1"` because PowerShell captures nothing from it.
  `--window-size` is **ignored** (viewport pinned near 504px), and **IndexedDB never completes under
  `--virtual-time-budget`**, so no data-driven state can be exercised in-browser here. Full detail and
  the self-measuring-fixture method in §9, 2026-10-16.
- `.clinerules` lives at the workspace **parent** (`C:\PROJECTS`), with paths
  prefixed `odyssey/`. It is itself git-ignored.
- `Market Research/` **is** tracked (deliberate; decision recorded in the
  `main_plan.md` changelog 2026-10-05). Only `Apps Videos/` is ignored.

### 2026-10-07 — M4 Perfect Day reward system, and graphify availability

**Shipped (partial):** the reward calculation engine for the perfect-day bonus (`lib/utils/reward-rules.ts`), including `isPerfectDay()`, `computeDayReward()`, `advanceStreakForSettlement()`. Also shipped the `PerfectDayCard` component (`components/habits/perfect-day-card.tsx`) with CSS glow animation.  
**Not yet integrated (corrected later the same day — this is now false):** the component is not mounted in any page; it needs a consumer that calls `isPerfectDay()` and passes the result to `<PerfectDayCard show={...} isToday={...} />`. It **was** mounted in the same M4 build, in `habits/page.tsx`.

**Graph freshness note:** `graphify update .` executed at start of session, but the CLI is not available in this environment (missing from `PATH` and no local bin). The graph at `graphify-out/GRAPH_REPORT.md` is built from `dda4383d` and should be regenerated when graphify is accessible, before using it for impact analysis.

### 2026-10-07 — M5 Creation feedback toast, and M4 integration status

**Shipped:** M5 creation confirmation toast now names the first milestone. Habit creation dialog shows: "Your journey with {Habit Name} begins now. First milestone: 3-day streak." This matches the spec in `MASTER_TODO_REVISED.md` §19.

**M4 integration status (corrected later the same day):** this originally said
`PerfectDayCard` was "unmounted, finding the right consumer location is a
follow-up task". It was mounted during the M4 build itself, on `habits/page.tsx`
above the vault banner. The follow-up task is closed.

### Where the work is right now

| Item | State |
|---|---|
| Phase | **1** — polish, micro-interactions, stabilise |
| Next feature | **None staged.** `CONS-2` and `P0-T2` shipped 2026-10-15. Candidates still open in Phase 1: **`P0-T6`** (the last named exit-gate criterion), `P0-T3`, `P0-T7`, `CONS-1` |
| **Owner-instruction UI removals 2026-10-16** | **Not plan items — no `main_plan.md` id, so no status line exists for them.** `/day-schedule` lost the Tick/Cross/Unreviewed review toggle and the "Day N Focus & Title" card; the hour-row task field became a wrapping auto-growing `<textarea>`. **Two consequences to carry forward:** that card was the app's only writer of `odyssey_day_name_*`, so **day titles can no longer be set by anyone** (existing titles still display; `/journey`'s read of the key is now only satisfiable by pre-existing data), and `/day-schedule` can no longer complete or miss a block — `XP_PER_BLOCK_COMPLETED` is now reachable from `/planner` and `/journey` only. |
| **Exit gate status** | **2 of 4 met.** `CONS-2` ✓ · gates clean ✓ · no uncommitted work ✓ · **`P0-T6` adapter landed ✗** — the adapter exists but is still one 829-line file holding all 34 methods, so D1's god-node half needs a behaviour-preserving split |
| Also open in Phase 1 | `P0-T3` (category type still dual-case: `Category \| (string & {})` at `db.ts:102`/`117` defeats the union; ~50 colour aliases remain), `P0-T7` (`seedInitialData()` is an **empty function** at `src/lib/seed.ts:5` with 3 call sites — `user.ts:24`, `user.ts:54`, `seed.ts:52`), `CONS-1` (colour mapping still defined 4×), `DEBT` (D2 `useUserStore` 33 edges, D5 two data-access styles). ~~The 360px FAB/CTA overlap~~ — closed by `CONS-2`, which found the recorded 2.4% figure was a mid-scroll artifact |
| Newly available | **Performance phase** — `main_plan.md` §6.5, `PERF-0`…`PERF-18`, starts with **`PERF-0`**, a mandatory reconcile (5 of 18 already delivered, 4 figures wrong). Native items need a physical device + release build this machine cannot do (§6.5.4) |
| Next after Phase 1 | Phase 2 — `A1`/`XL14` and `M16` are done. Largest remaining gaps are **A2** animated walkthrough and the `A3`–`A7` onboarding items |
| Staged/approved | Nothing awaiting approval (`FEATURE_WORKFLOW.md` §CURRENTLY STAGED FEATURE is empty) |

---

## 11. RULES — DO / DO NOT (binding; distilled from `AGENTS.md`, `FEATURE_WORKFLOW.md`, `DEVELOPMENT_PLAN.md` §6, `.clinerules`)

**DO**

- Read this file → `main_plan.md` → the cited `src:` spec **in full** → every
  `also:` cross-reference.
- **Update `main_plan.md`, then this file, then commit — in that order, every
  time.** Status that is not written down before the commit did not ship. Code
  plus no docs is the same defect as uncommitted work, only quieter.
- **Sweep the cross-references when you ship an id.** Flipping your own line
  is the minimum; every line mentioning that id must be re-checked too, because
  a stale neighbour reads as authoritative. Write `BUILT` **after** the code is
  in — a status written beforehand describes what you intended, not what
  shipped. `PARTIAL` must name what is missing.
- Get the feature **ID and phase**, brief it in app terms, and get **explicit
  approval** before writing code.
- Work **one feature per commit**; commit it before starting the next.
- Reuse in this order: existing repo code → standard library → installed
  dependency → new package last.
- Prefer line-range reads; **query Graphify before a broad scan**; run an
  impact analysis before editing a shared file.
- Run the cheapest gate that can fail, first.
- **Never leave a background server running.** Chain
  `Start-Process → assert Ready → use → kill by the port's owning PID` into one
  command. `Start-Process` returns while the server keeps running forever, and a
  stale server answers with the **previous** build — a plausible wrong answer.
  **In practice use the wrapper and do not type `Start-Process` at all:**
  `%TEMP%\opencode\verify\with-server.ps1 -Port 3100 -Command node -CommandArgs
  @('script.js')` refuses to start if the port is already held, asserts `Ready`,
  runs the command, and kills **in a `finally` block**, so the port is released even
  if the command throws or the harness crashes. It exits with the command's exit
  code and prints `PORT STILL OPEN - HARD FAILURE` if anything survived. This rule
  was **violated on 2026-10-15** by issuing a bare `Start-Process` whose only
  visible result was `server ready` — the call looked finished, which is the entire
  trap. The wrapper exists so the trap has nowhere left to happen.
- **Measure fixed-overlay interference at full scroll, not at the top.** A
  `position: fixed` button overlays whatever sits at its screen position, so
  measuring at `scrollTop=0` reports mid-page content it merely floats over — true of
  every FAB in every app, and not a defect. The real question is whether a control
  can be scrolled *out* from under it, which means measuring at `scrollHeight`. A
  probe that cannot distinguish a stuck control from a transient reports "no change"
  after a correct fix and costs a whole debug cycle. This exact misreading happened
  on 2026-10-15 and hid a 27.1% button-on-button overlap for one cycle.
- Visually verify at 360/390/430px, in light **and** dark, with reduced motion
  checked — and screenshot rather than assert. Force light mode explicitly;
  headless Chrome defaults to dark.
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
- **Commit without updating `main_plan.md` and this file** — see §11 DO, second rule.
- **Leave a background server running**, or trust a `Start-Process` return as
  "done".
- **Edit markdown with PowerShell `Set-Content`** — it re-encodes the file and
  silently corrupts every non-ASCII character.
- Ship unverified native code (R12).
- Claim tests pass without the counts and exit code.
- Maintain status anywhere but `main_plan.md`.
- Re-ask the owner for context that is written here. If it is missing or
  wrong, that is what §0.2 is for.

---

*If this file disagrees with reality, reality is right — fix this file in the
same commit.*
