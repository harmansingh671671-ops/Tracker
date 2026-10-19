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

**`C2` grab-to-drag — a finger must hold before a block moves (SHIPPED):** the Schedule screen's blocks were dragging on a casual scroll. The card carried `touch-action: none` and 10 px of travel started the move, so the page could not scroll from any finger that landed on a block — on a full day that is most of the rail — and the block went to whatever hour the thumb passed. A finger now has to **rest on a block for 450 ms** (`HOLD_TO_DRAG_MS`); only then does the block lift (`opacity-50 scale-95`, the look the drag already used) and follow. The card is `touch-pan-y` again, and the page's scroll is cancelled **only after the grab is armed**, from a **non-passive `touchmove` listener on the card**. That listener is the whole trick: React attaches `touchstart`/`touchmove` at the app root **passively**, so Chrome never waits for the main thread, gives the gesture to the compositor, and marks later moves `cancelable: false` — a veto from a passive handler is ignored ("Ignored attempt to cancel a touchmove event"). With a non-passive listener the touch is "blocking", the first move is cancelable, and `preventDefault()` after arming holds the gesture. `touch-action` is fixed at touchstart, so it **cannot** be switched mid-gesture — that is why the veto is a listener and not a class toggle; `pan-y` is also what lets a passing finger still scroll natively. The 10 px slop now only splits drag (vertical) from swipe-to-edit (horizontal) **after** the grab, so a held swipe still opens the editor and an un-held one cannot. Mouse is untouched (`pointerType === "mouse"` arms at pointerdown) — a desktop has no scroll to fight. A press that starts on the card's own buttons (tick, cross, sleep chevron) never arms; before this, a drag from the chevron moved the block. **No haptic:** `navigator.vibrate` needs `VIBRATE`, which the manifest deliberately does not hold, so the lift is the only signal. Verified with real `Input.dispatchTouchEvent` on a 390-wide page: quick flick over a block → no move, `defaultPrevented: false`, later moves non-cancelable (the browser took it as a scroll); hold+drag → the block moves and saves; hold+swipe → the editor opens; hold+release → inert, no ghost; tap → inert; button-drag → inert; mouse drag → unchanged; light and dark, 360/390/430. **Caveat:** headless Chrome never changed `scrollY`, so the scroll motion itself still needs a finger on the phone. Artifacts: `verify-c2-hold.js`, `verify-c2-hold-visual.js`, `verify-c2-hold-widths.js`.

**`**Battery/Perf fixes** (SHIPPED web / PENDING native): consolidated 7+ scattered `setInterval` timers (1 s / 3 s / 4 s / 5 s / 15 s / 30 ms / 4.2 s) into **one shared minute-boundary clock** (`src/lib/utils/shared-clock.ts`, `useSharedClock` backed by `useSyncExternalStore`); replaced 3 s day-change detectors on habits/planner, removed planner 4 s carousel auto-scroll, converted `habit-date-strip`/`infinite-date-strip` 30 ms mount-only fallbacks to `requestAnimationFrame`, paused onboarding `step-circadian` 4.2 s autoplay when hidden. **Reduced `backdrop-blur` layers from 41 to 11** (36 removed, 4 essential `-xl` remain on day-schedule picker cards with `data-blur-essential`; 7 `-md` on header/bottom-nav/onboarding/wallpaper-preview/habit-template remain). **All 10 `SharedPreferences.commit()` -> `apply()`** (9 in `OdysseyWallpaperBridge.kt`, 1 in `MainActivity.kt`). **PERF-4 SHIPPED**, `PERF-7` SHIPPED, `PERF-12` SHIPPED (unverified native). Native items (`OdysseyCadenceNotificationWorker` WorkManager migration, WorkManager for hourly wallpaper) **written but unverified** -- Kotlin cannot be compiled on this machine (no `gradlew`, JBR 25 vs Kotlin 1.9.22). Gates: `tsc` 0, `lint` 0 errors (83 warnings), 470 tests, build clean.

**`B16` (SHIPPED):** a counted habit's **emergency minimum** now counts toward its days-done total (owner rule). The emergency version is the *floor* -- only doing the two-minute version still earns the day. **Counter-only on purpose:** `isHabitComplete` is untouched, so the heatmap/date strip/confetti/reward vault still render a floor day as unfilled; the counter and those surfaces disagree by design and were accepted as such. **No schema change** -- the existing `Habit.emergencyVersion` is reused and is now a **number** input for counted habits; unparsable text means *no floor*, so a legacy "Read 1 page" behaves exactly as before. New `emergencyMinimum()` export in `compliance.ts`; ADR 0005 §2.1.1 records the rule and the tolerance for the disagreement; 9 new tests.

**Date strip NaN fix (SHIPPED):** `planner-content.tsx` passed `localTimeStr(now)` (an `HH:MM` string like `"13:53"`) as `todayStr` to `InfiniteDateStrip`, which expects `YYYY-MM-DD`. The strip split `todayStr` on `"-"`, yielding `NaN` for `item.dayNum` and `item.dateStr`, surfacing as "Received NaN for the 'children' attribute" on both the date `<span>` and the day `<button>`. Changed the import and call to `localDateStr(now)` (`YYYY-MM-DD`), matching `habit-date-strip.tsx` which already uses it correctly. Verified: `tsc` 0, `lint` 0 errors, 470 tests green.

**Planner rail-card tweak, then full reversal (SHIPPED):** owner asked to de-head the planner's "Daily Schedule Rail" card (Clock icon + label gone, arrow kept); misread it first as the day-schedule page (committed `b170732`, reverted same session as `6e1d80e`), then did the planner version (`a0e74fb`, `9621457` padded card, arrow overlaid). Owner then reversed the whole thing — reverts restored the original card. Lesson: for screenshot-driven UI tweaks, confirm which screen is in the image before touching code — two wrong-target commits this session.

**M22 (SHIPPED):** planner's **Daily Schedule Rail bar card removed** entirely on owner instruction, replaced by the behaviour the card used to be the shortcut for: **tapping a date in the date strip opens the Schedule Distribution pop-up for that tapped day.** New optional `onDateSelected` prop on `infinite-date-strip.tsx`, fired after the selection commits from BOTH the date pills and the sticky Today pill (strip stays a generic component — other consumers' behaviour unchanged). The pop-up already took `dateStr={selectedDate}`, so no extra state was needed. Removed: the card's tap target, its Clock-icon + label header, the 24-slice allocation bar, and the planner's `buildAllocationSlices`/`allocationCategory` imports. `categoryStats` and `isPlannedHour` stay — `categoryStats` now has exactly one planner consumer, the pop-up. **Partially supersedes M19**: the bar now lives only on `/day-schedule`. Verified after dismissing the evening-plan popup, light + dark: rail card gone, tap → Distribution pop-up for the selected date, 0 console errors. Gates: tsc 0, lint 0 errors (83 warnings), 470 tests, build clean.

**M23 (SHIPPED):** Schedule Distribution pop-up decluttered on owner instruction: header subtitle ("Breakdown of planned hours and activities"), "Planned Total" label, "% Planned" pill and "X Hours planned / Y Hours free" row all removed, **followed within minutes by the clock icon + "X / 24 Hours" count — the overview banner is now only the colour strip.** Per-category cards: the duplicate subtitle ("Deep Work", "Health & Habits", etc.) deleted — one bold heading only; the space under "X% of day" now filled by a share-of-day track bar in the category's solid colour (honest small fills for ~4%). Verified seeded-7h-day + zero-day pop-up, light + dark, 0 console errors. Lesson reinforced: `next start` serves the LAST built bundle — after editing, rebuild before visual checks or you screenshot the old UI.

## §10 Git + task state (re-created after condensation; as of 2026-10-19)

- **HEAD:** M22 commit (planner rail card removed; date-tap opens the Distribution pop-up) on top of `653c565` (C2 grab-to-drag by the other agent) and `f1a4cbf` (owner's revert restoring the rail card before M22 removed it). Unpushed commit count: run `git log --oneline origin/main..HEAD` when needed — several.
- **Push state:** owner pushes; `push` is never run by this agent.
- **Verify artifacts:** `%TEMP%\opencode\verify\` (`perf16-smoke.js` 6-route smoke, `rail-check.js` planner tap→pop-up check, `verify-perf5.js`, `verify-c2-hold*.js`); Chrome path and seed keys as recorded above.
