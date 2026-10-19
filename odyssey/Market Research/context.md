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
| `/` | **The first-run flow** (`A1`/`XL14`/`A2`): intro → circadian preview → welcome + add habit → your habits → **basics (`A2`: plan an hour / tick the habit)** → Day 1 commitment hold. **Six** steps. One way in; hands off to `/planner` |
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
live in `src/components/onboarding/` (including `step-basics.tsx`, the `A2` scene).
**The step count is read, never typed:** the shell's `n/total` and the intro's
*"N short steps"* both derive from `ONBOARDING_STEPS`, so adding a step cannot
make the copy false the way the literal *"Five short steps"* did.

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
  "PORT STILL OPEN"     # treat this as a hard failure, not a warning
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

Current: **31 suites, 469 tests, all green**.

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
  one run. **`puppeteer-core` IS available** at
  `%TEMP%\opencode\verify\node_modules` (headless Chrome at
  `C:\Program Files\Google\Chrome\Application\chrome.exe`) — an earlier "not
  currently available" note here was wrong and is corrected; see §10 and §9
  2026-10-16 for the two Chrome
  behaviours (`--window-size` ignored, IndexedDB stalled under virtual time) that
  will otherwise be rediscovered the hard way, and §9 `(i)` 2026-10-19 for a
  worked example.

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
opinions. **Compacted 2026-10-19:** the full historical entries (2026-10-04 →
2026-10-18) were distilled into the "Durable lessons from earlier sessions"
section below; today's entries are kept in full.

### 2026-10-19 — today's entries (condensed)

**`PERF-16` (SHIPPED):** 13 dead files deleted (9 orphan `ui/` components +
`planner/inbox-drawer`, `habits/perfect-day-card`, `lib/stores/wallpaper-store`,
`lib/utils.ts` barrel); `tw-animate-css` removed from `package.json`; Android
Gradle `material:1.11.0` + `work-runtime-ktx:2.9.0` removed (zero-ref source
scan, **not compiled**). Bundle unchanged (orphans were never in it); lint 95 →
84 warnings. 16b delivered as audit only (no upgrade; pinned Next 16.3.5 is an
owner decision).

**`PERF-8` (SHIPPED):** habits list row extracted into `habit-list-card.tsx` +
`React.memo` on habit-scoped log slices; `handleToggle` reads pre-toggle state
from store snapshot; handlers stabilised (`useCallback`, `userId` scalar).
Measured (CDP trace, medians): toggle **178.3 → 142.3 ms (−20%)**, editor open
**134.3 → 104.4 ms (−22%)**.

**`PERF-7` (SHIPPED):** 36 of 45 live `backdrop-blur` applications removed or
capped; day-schedule's 24 picker cards kept + marked `data-blur-essential`
(load-bearing stacking mechanism); 7e fallback — `isLowEndDevice()` (7 tests) +
`globals.css` strip clause — verified in-browser (planner 5→**0** layers,
day-schedule keeps 24) and under `prefers-reduced-transparency`.

**`PERF-5` remainder (SHIPPED):** 5d — five zero-import dependencies deleted
(`date-fns`, `recharts`, `dexie-react-hooks`, `react-day-picker`, `shadcn`) +
`ui/calendar.tsx`; 5e — `compiler.removeConsole` verified (not assumed) on
Turbopack 16.3.5. The plan's "next win" (lazy db/sync off header-less screens)
was **measured and rejected** — both lazy variants made 4 routes worse.

**`B25` review pass (SHIPPED):** the 18-hour bar is now one definition (constant
lives in `day-status.ts`); ADR 0005 §2.4 documents the permanence exception
(editing a habit retroactively re-prices history); the visual pass ran (headless
Chrome + puppeteer-core, 390px, light+dark, six surfaces) and caught a real
defect — the per-habit chip drew its flame icon while the label rendered
nothing at zero.

**`BUG-16` (SHIPPED):** the habit edit sheet reset every field to its default.
Root cause: `635182a`'s React-Compiler lint pass converted the modal's on-mount
hydration `useEffect` into a render-phase guard seeded from the prop — a guard
seeded from a prop cannot fire on mount. Fix: seed the sentinel empty
(`useState<Habit | null>(null)`).

**`B25` fixes (SHIPPED, `9b19f96`):** auto-fill sleep blocks stay `pending`
(count toward planned 18h bar, NOT auto-reviewed — reviewed only on explicit
tick/cross); wallpaper page rank reads days done; `habit-store` rebuilds the
days-done map for the one habit that changed; avoid chip no longer dangles
" clean"; `daysComplied` filtered by `userId`. **Also carries `BUG-16`** (shared
checkout hazard — stage explicit paths).

**`B25` (SHIPPED, `abbc6ac`):** the streak becomes two cumulative, derived
counters — per habit (`habit-store.daysDoneByHabit`: scheduled days that are
`isHabitComplete`) and app-wide (`user-store.daysComplied`: ≥18 planned hours +
100% reviewed). Both derived, never incremented → `BUG-15` closed on the web by
construction. `day-status.ts`'s `fully_completed` now requires `isCompletelyDone`
(was accepting full review alone). Streak Freeze Shield retired. **No schema
change** — the brief's `profiles.daysComplied` cache was dropped (a stored copy
can only go stale). Native/Kotlin deliberately untouched (phone still shows
streak; `BUG-15` still live there).

**`S9` (SHIPPED, `2dc684e`):** quit habits get a violation state — clean/slip
controls, a slip stored as `HabitLog.value = 1`, `isHabitSlipped`,
`markHabitSlip`. A slip rides `value` (not a new boolean) so it survives a cold
load. The list view previously couldn't log a quit habit at all.

**`PERF-5` (SHIPPED, `8700852`):** the shared bundle was the cost. Measured
(`npm run measure-routes`): every route paid 261.4 KB gzip of shared code.
Fixes: permission panel animates with house keyframes (not framer-motion);
profile sheet loads on first open; rank-up dialog mounts when profile loads;
evening reminder + update notice mount after first paint. Result: shared set
**261.4 → 178.4 KB**, `/planner` first load **263.0 → 178.8 KB (−32%)**. Build
total went UP (431.9 → 476.7 KB) — deferring copies a dependency into each chunk;
per-route first load is the number to watch.

**Habit types committed (`b4d9eff`):** counted stepper + quit surface, finally
committed after sitting uncommitted. `historyValues` in the store, `avoid` type,
"Quit a Habit" flow, red "N clean" card styling, habit colour override,
completion confetti, `BUG-15` streak fix.

**C2 round two + polish:** the displaced block is now held, not swapped (ADR
0004); hand-off flight animation (decoration over real state, cancelled by timer
not `animationend`); landing ring got its own class (sharing `ring-2 ring-primary`
with the current-hour marker was a real bug); one hit test for both drags; edge
auto-scroll is a rAF loop keyed on drag state; drop-to-delete follows the same
write order; the cross is `pointer-events: none` and measured.

### Durable lessons from earlier sessions (2026-10-04 → 2026-10-18)

- **A confident zero needs a null state.** `percent: null` (habit-progress) and
  "Nothing scheduled yet" are the same idea — when a denominator does not exist,
  say so. The day readout printed `0/0 (0%)` with no habits.
- **Derived animation keys must be namespaced** (`icon:` vs `label:`), not bare
  state strings — a rest day produced a duplicate key inside one shared
  `AnimatePresence` and React threw.
- **A "cache" of a derived number is a staleness bug with extra steps.** If a
  value can be recomputed from rows, recompute it at the read boundary.
- **Changing a metric means auditing every *reader*, not every *writer*.** 187
  matches for `streak`; the decision per surface is the design work.
- **A type doc that states the rule the code does not implement is a defect in
  the code.** `day-status.ts` documented the 18-hour bar while accepting full
  review alone.
- **The render-phase "adjust state on prop change" pattern is only safe when the
  sentinel cannot equal the first prop.** `useEffect` ran on mount for free; a
  guard seeded from a prop does not (BUG-16).
- **A drag marker that shares a class with a persistent state cannot be asserted
  on — and can clear it.** The landing ring reusing `ring-2 ring-primary` cleared
  the current-hour marker.
- **An orphan-candidate list is an input to verification, never a deletion
  list.** Resolve relative imports, verify each candidate by grep, keep `git rm`
  (revertable).
- **Package-usage scans must allow subpath imports** before a zero-count is
  believed (`@base-ui/react/<subpath>`).
- **For "unused" claims, grep the resource/manifest layer too** — Android
  dependencies can be consumed by XML themes with zero code references.
- **A memo contract that survives data writes depends on the *store's* update
  shape, not React** — check the spread structure before quoting the win.
- **"React.memo the rows" is a hypothesis until the profiler says which rows.**
- **A shorter timer is not automatically a cheaper timer.** Capping a re-check
  delay at 90s can make the daytime case fire *more* often than the interval it
  replaced.
- **A read→edit round-trip can silently rewrite hyphens as em dashes** in
  comment text that was never targeted. Read the diff before committing.
- **A React 19 ref callback re-runs on every render**, so `el.select()` inside one
  re-selects the field after each keystroke. Put select/focus in an effect.
- **Seeded IndexedDB persists across runs inside a browser context.** Use
  `browser.createBrowserContext()` per combination.
- **Never sample a transient state once after a fixed wait.** Poll for the state
  instead. CPU throttling is two-sided.
- **A read-on-open `prevIsOpen` transition guard does NOT survive being nested.**
  Use a lazy `useState` initialiser when the component mounts when it becomes
  visible.
- **`readString` returns `""` for an unset key — never `null`.** Use `has(K)` to
  test for "unset".
- **A press-and-hold must be tested with a real `page.mouse.down()`, never
  `el.click()`.** If a check cannot distinguish a working gesture from a dead one,
  it is the `#__next` probe.
- **`page.evaluate(el.click())` does not move focus, so no `blur` fires.** Use
  `document.activeElement.blur()` or a real mouse click.
- **Tapping a goal tag during onboarding leaves the create-habit modal open.**
  Close it before any pointer-driven check.
- **`protocol` (Day 1 commitment) was a dead end until a "Skip for now" control
  was added.** A comment stating an intentional design decision is not evidence
  the decision is still correct.
- **The agent does NOT push.** Owner instruction: commit only — the owner pushes.
- **This checkout is shared.** A `git commit` without explicit paths picks up
  another session's uncommitted work. Stage explicit paths.

---

## 10. GIT + WORKING TREE + LIVE TASK STATE

**Update this section every session.** It is the fastest way for the next agent
to know where things stand.

- Remote `origin`: `https://github.com/harmansingh671671-ops/Tracker.git`,
  branch `main`.
- HEAD at last update: **this commit** — **`PERF-7` (`SHIPPED`)**: 36 of 45 live
  `backdrop-blur` applications removed or capped; 7e low-end fallback verified.
  Committed on `main`; **the agent does not push**. Before it: **`1b9cb28`**
  (`PERF-5` 5d+5e), **`77b55a1`** (`B25` review pass), `d0c8dc8`, `fe8202d`,
  `9b19f96`, `abbc6ac` (`B25`), `2dc684e` (`S9`), `8700852` (`PERF-5` 5a+b),
  `b4d9eff`, `e67dc01`, and earlier C2 rounds. **Everything up to and including
  `e67dc01` is on `origin/main`** — the owner pushed; `8700852` onward are **not**.
- **Working tree (2026-10-19, `PERF-7`):** clean after that commit.
- **Next: the pre-approved queue is complete** (PERF-5 remainder, PERF-7, PERF-8,
  PERF-16 all `SHIPPED`) — **pause for the owner.** Remaining perf-phase items are not
  queued: PERF-17 is ⚪ optional skip-unless-measured, PERF-18's open halves are blocked
  on CI, and the native verification items (PERF-1/2/3/11/13/14) are gated by §6.5.4's
  honest measurement boundary.
- **Pending, named: the native/Kotlin label.** The phone still renders a *streak* from
  `profiles.streak` / `habits.currentStreak`. Migrating them to days done is a Kotlin
  change; it cannot be compiled on this machine (no `gradlew`, JBR 25 vs Kotlin 1.9.22).
  **`BUG-15` is therefore fixed on the web and still live on the phone.**
- **The wallpaper studio web preview's *rank* now reads days done** (`9b19f96`). What
  is still streak-shaped there is the **payload itself** — the value the phone renders.
- **`src/lib/db.ts` is free again** — ADR 0004's `OdysseyFloatingBlocks` can be folded
  into `OdysseyDB` as an additive store + version bump. **Not done here**: a schema
  change belongs in its own change with its own verification.
- **`S9`'s violation state does not reach the history-only surfaces.** The date strip,
  month calendar and heatmaps read `completed`, not `isHabitSlipped`. Named, not hidden.
- **Lint:** `npx eslint src` exits 0 — **0 errors, 84 warnings** (after PERF-16).
- **Tests:** **31 suites, 469 tests green**. `tsc --noEmit` exit 0. Production build
  clean, 13 static routes.
- Ports 3001/3100 clear; **no background server of mine is running**. Port **3000
  carries the owner's live `next dev`** (pid 2412) and was **deliberately left
  running** — a dev server recompiles on request, so it cannot serve the stale build.
- **Server hygiene:** port 3000 has carried a **live `next dev`** for most of this
  session — **deliberately left running**. A *stale* `next start` from 18:03 was found on
  the same port and killed. 3001 and 3100 clear.
- **⚠️ `with-server.ps1` used to REPORT SUCCESS WHILE LEAVING THE SERVER RUNNING.**
  It printed `server killed, port 3100 closed` and left a live listener. **Fixed**: it
  now kills the launcher **tree** (`-PassThru` + `taskkill /T`) and then sweeps the port
  repeatedly until it stays clear. **Still check the port yourself rather than trusting
  its success line.**
- **Planner verification trap (2026-10-18):** a headless browser must load the dev
  server over **`localhost`**, not `127.0.0.1`. Next 16 blocks "cross-origin" dev
  resources, and the only visible symptom is a failing `/_next/hmr` WebSocket plus the
  `dynamic(..., { ssr: false })` planner chunk never mounting — **no console error**.
- **`PERF-5` measurement traps.** (1) **`next experimental-analyze` does not build
  anything** — it reports the *previous* build's numbers. `npm run measure-routes`
  builds first. (2) **What a screen loads and what the build totals are different
  numbers that move in opposite directions.** (3) **Source size is not transfer
  size** — the five "huge" screen files contribute 0.4–1.6 KB gzipped each.
- **A fixed `z-50` overlay swallows real mouse clicks.** Use a DOM click instead
  (`el.click()` via `evaluate`). **Always run a control** before believing an
  interaction is broken.
- **Hydration marker is a React-keyed node count, not `#__next`.** Count
  `Object.keys(n).filter(k => k.startsWith("__reactFiber"))` per element.
- **Puppeteer is **not** a project dependency, and `puppeteer-core` is **not** in
  `odyssey/node_modules`.** It **is** installed at **`%TEMP%\opencode\verify\node_modules`**.
  `page.setViewport()` works, `headless: 'new'` works, and **IndexedDB works**. The
  genuine raw-Chrome-CLI limits still stand: `--window-size` is ignored, and IndexedDB
  never completes under `--virtual-time-budget`.
- **`.clinerules` lives at the workspace **parent** (`C:\PROJECTS`), with paths
  prefixed `odyssey/`. It is itself git-ignored.
- **`P0-T2` — `graphify` IS on PATH**, at
  `%APPDATA%\..\Python\Python311\Scripts\graphify.exe`. `graphify update .` completes:
  2164 nodes / 3164 edges / 208 communities.
- **Verify interaction against `next start`, not `next dev`** — a `next dev` page
  renders but never hydrates, so every click silently no-ops.
- **Kill any background server when the task ends, and say so in the report.**
- **A React 19 ref callback re-runs on every render**, so `el.select()` inside one
  re-selects the field after each keystroke. Put select/focus in an effect keyed on
  the state that opens the editor, never in a ref callback.
- **Seeded IndexedDB persists across runs inside a browser context.** Use
  `browser.createBrowserContext()` per combination, and assert the field holds
  exactly the seeded string.
- **Never sample a transient state once after a fixed wait.** Poll for the state
  instead. CPU throttling is two-sided.
- **A read-on-open `prevIsOpen` transition guard does NOT survive being nested.**
  Use a lazy `useState` initialiser when the component mounts when it becomes
  visible.
- **`readString` returns `""` for an unset key — never `null`.** Use `has(K)` to
  test for "unset", and never test a storage helper's return against `null`.
- **`sendTestNotificationToAndroid` is async and returns an `outcome`, not a
  boolean.** It used to return `true` the moment it *requested* permission.
- **`A6`'s `LoadingIndicator` lives in `src/components/common/loading-indicator.tsx`**
  and is the app's single loading treatment. **Three loading states are deliberately
  NOT it**: the planner header skeleton and the two date strips' grey bars are
  *inline shape reservations* sized to prevent layout shift.
- **Run `npx eslint src` (the WHOLE project), not just the files you touched.**
  Per-file lint finds only what you broke; a gate is only a gate if it runs over
  everything.
- **`A5`'s quote is set in code, in one place:** `IDENTITY_QUOTE` and
  `IDENTITY_ATTRIBUTION` in `src/lib/utils/identity-line.ts`. There is **no edit
  control in the UI**.
- **Verification scripts** live in `%TEMP%\opencode\verify`, driven through
  `with-server.ps1`: `check-a2.js`, `check-a2b.js`, `check-hold.js`, `check-quicksched.js`,
  `check-strikethrough.js`, `check-title.js`, `check-noring.js`, `check-category.js`,
  plus `diag-*.js` diagnostics. **Two harness lessons:** a `waitForFunction` given a
  **clicking** expression will click again when you follow it with `evaluate`; and
  **`CreateHabitModal` opens on the TEMPLATE LIBRARY**, not the name form.
- **The agent does NOT push.** Owner instruction: **commit only — the owner pushes.**

### Where the work is right now

| Item | State |
|---|---|
| Phase | **Performance phase (§6.5)** — Phases 1–2 are closed. Phase 1's gate is met; Phase 2's onboarding and polish items are done. |
| Next feature | **Pause for the owner.** The pre-approved queue (PERF-5 remainder, PERF-7, PERF-8, PERF-16) is complete. Remaining perf items are not queued. |
| Exit gate status | **Phase 1's gate is MET.** **`PERF-0` is `PARTIAL`**: reconcile done, baselines recorded, Android half blocked (no `gradlew`, no device). |
| Also open | **`DEBT` (`D2`, `D5`) remains.** `D5`'s "29 files import `@/lib/db` directly" is **wrong — it is 38**. |
| Staged/approved | Nothing awaiting approval |

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
- **`npm run build` after any CSS change, before `with-server.ps1`.** `next start` serves
  the last **production** build, so a browser check after editing a stylesheet verifies
  the *previous* build.
- **When the cascade says your rule must win and the browser says it did not, suspect
  the build before the cascade.** Read the CSS, do not reason harder about specificity.
- **Assert the fix in BOTH directions.** "Nothing animates under reduce" is also satisfied
  by a rule that silences animations unconditionally. Use `document.getAnimations()`.
- **When a global change incidentally touches an excluded area, say so — do not carve it
  out silently.**
- **Before asserting a component "did not appear", confirm it is mounted on the page you
  loaded.** `grep` for the mount site first; it is one call and it is decisive. **Never
  call a defect user-facing before you have seen the component rendered.**
- **Assert the side effect that proves your code ran.** A green check can be vacuous.
- **Drive edit forms with real input.** Use `page.focus()` + `page.keyboard`, and read
  `input.value`, not `innerText`.
- **Puppeteer + IndexedDB traps on this app:** the database is **`OdysseyDB`** (capital O).
  Every screen **filters blocks by the current user's real id**, so seed *after* a
  profile exists.
- **A shorter timer is not automatically a cheaper timer.** When the worry is a tab that
  slept through its boundary, the answer is a `visibilitychange` re-check, not a smaller
  number.
- **When a harness stub causes an error, prove it before filtering it.**
- **Never leave a background server running.** Chain
  `Start-Process → assert Ready → use → kill by the port's owning PID` into one
  command. **In practice use the wrapper and do not type `Start-Process` at all:**
  `%TEMP%\opencode\verify\with-server.ps1 -Port 3100 -Command node -CommandArgs
  @('script.js')` refuses to start if the port is already held, asserts `Ready`,
  runs the command, and kills **in a `finally` block**.
- **Measure fixed-overlay interference at full scroll, not at the top.** A
  `position: fixed` button overlays whatever sits at its screen position.
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
