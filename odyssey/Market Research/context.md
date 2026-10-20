# CONTEXT.md Ã¢â‚¬â€ odyssey (Habit Tracker): everything an agent needs

> **Read this file FIRST, before `main_plan.md`, before any code.**
> This is the onboarding brain-dump: product, stack, repo layout, governing
> docs, data model, engineering rules, workflow, environment, people, history,
> gotchas, and the live task state.
>
> It exists so a new agent (or a new session) never has to be prompted for
> context and never has to rediscover it. Section **Ã‚Â§0** is the protocol that
> makes it self-maintaining.
>
> **Precedence:** if this file disagrees with the code, **the code is right** Ã¢â‚¬â€
> fix this file in the same commit. If it disagrees with `main_plan.md` on
> feature order or status, `main_plan.md` wins. This file never holds feature
> status; it points at it.

---

## 0. HOW TO USE THIS FILE (the mechanism)

### 0.1 At the start of every session Ã¢â‚¬â€ read, don't ask

```
1. context.md          <- this file. Everything below follows from it.
2. main_plan.md        <- feature order, phase, STATUS (authoritative)
3. the cited src: spec <- read the full paragraph before coding
```

Read Ã‚Â§11 (Rules) before you write anything. It is short and it is binding.

**Do not ask the owner to repeat what is written here.** If something is
missing, that is a bug in this file Ã¢â‚¬â€ add it, do not request it again.

### 0.2 At the end of every session Ã¢â‚¬â€ write back before you commit

`context.md` is only worth reading if it is kept true. Before your commit:

| What changed | Update here |
|---|---|
| Shipped a feature | Ã‚Â§9 Session Log (new entry) + Ã‚Â§1 if user-visible |
| Learned a non-obvious constraint / bug + real fix | Ã‚Â§9 Session Log, and Ã‚Â§11 if it is a permanent rule |
| A fact below is wrong | Fix it in place, same commit. Never leave a known-wrong line |
| Working tree state, HEAD, next feature | Ã‚Â§10 Git + task state |
| Env/tooling surprise (shell, ports, gates) | Ã‚Â§7 Environment |

Rules for the write-back:

- **Update in the same commit as the code.** Context is not a follow-up task.
- **Facts only, no narration.** "The Kotlin daemon cannot start on JDK 25 Ã¢â‚¬â€ compile
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
| Feature status | **Never** Ã¢â‚¬â€ points at `main_plan.md` | Canonical |

Status lives in `main_plan.md` and nowhere else (rule C10).

---

## 1. PRODUCT IDENTITY

**odyssey** is a mobile-first habit, schedule, focus, and personal-progress app
built around a **live Android wallpaper** Ã¢â‚¬â€ the phone wallpaper surfaces the
user's plan and progress on every unlock, while the app remains the place to
plan, edit, and review. Combines: day planner, habit formation/tracking,
gamified progression (XP, ranks, shop, avatar, optional social), and focus
tools. Strongest market position per research: schedule + habits + focus + RPG
progression + live wallpaper, where competitors cover only one or two.

**Product promise:** "Help me see what matters now, make starting easy, and
recover kindly when the day does not go to plan."

**Product/UI principles** (MASTER_TODO_REVISED Ã‚Â§1): glanceability first; one
simple default with depth on demand; warm and respectful, never shaming missed
days (strict accountability is opt-in); tangible progress; mobile-first narrow
layouts; user control over AI (recommends, explains; never silently alters);
explain local-first privacy clearly.

**Positioning note** (`video_analysis_shuomi`): the owner explicitly does not
want Notion/Obsidian complexity Ã¢â‚¬â€ a focused, non-overwhelming tool.

**Release state:** v1.3.6, `versionCode` 11 (`odyssey/version.json` Ã¢â‚¬â€ the
single source; `android/app/build.gradle` parses it, do not hardcode a version
there). Live on Vercel, APK at `/downloads/odyssey-latest.apk`.

---

## 2. TECH STACK (from `odyssey/package.json` Ã¢â‚¬â€ exact)

| Layer | Choice |
|---|---|
| Framework | Next.js **16.3.5** (NOT 14 Ã¢â‚¬â€ `PHASE_0_AUDIT_REPORT.md` says 14; that is a documented factual error), App Router, React 19.2.8 |
| UI | Tailwind CSS v4 via `@tailwindcss/postcss`; `lucide-react`, `framer-motion` 13.2.0, `tw-animate-css`, `@base-ui/react`, `shadcn` 4.21 |
| State | Zustand 5 Ã¢â‚¬â€ **6** stores, see Ã‚Â§5 |
| Data | Dexie 4 (`dexie-react-hooks`) `OdysseyDB`, **7 tables** (Dexie `version(2)`), compound indexes, UTC timestamps; `fake-indexeddb` in tests |
| Dates | `date-fns` 4; `react-day-picker` 10. Habit dates are `YYYY-MM-DD` **local** strings |
| Charts | recharts 3 |
| IDs | `uuid` 14 |
| Native | Kotlin (6 `.kt` files), Live Wallpaper Service, hourly + boot workers, cadence notifications, in-place APK updater via FileProvider, **34 bridge methods** |
| Tests | Vitest 3 (`environment: "node"`, no jsdom Ã¢â‚¬â€ Ã‚Â§7), coverage-v8 |
| Lint | ESLint 9 + eslint-config-next 16.3.5, plus 6 custom odyssey guard rails (Ã‚Â§7) |
| TS | TypeScript 5, `tsc --noEmit` |
| Scripts | `dev` / `build` / `start` / `lint` / `typecheck` / `test`=`vitest run` / `test:watch` |

**Never add a dependency without checking this table first.** The reuse order
is: existing repo code Ã¢â€ â€™ standard library Ã¢â€ â€™ already-installed dependency Ã¢â€ â€™
new package last (Ponytail rule, `.clinerules` Ã‚Â§2).

### Where to run commands

The app is `odyssey/`. **`npm run dev` from the workspace root (`C:\PROJECTS`)
works** Ã¢â‚¬â€ a root `package.json` delegates every script into `odyssey/` via
`npm --prefix odyssey run <script>`. It installs nothing and has no
`node_modules`, so there is no second install to drift out of sync.

Run scripts from either location; both work. Prefer `odyssey/` when you need
`node_modules` resolution or relative paths to resolve naturally. Do **not** add
a `workspaces` field to the root `package.json` Ã¢â‚¬â€ the app is not set up for
workspace hoisting, and declaring one would move dependency resolution out of
`odyssey/node_modules` and break the install.

---

## 3. ROUTES (9, all shipped Ã¢â‚¬â€ `main_plan.md` Ã‚Â§2.1)

| Route | Purpose |
|---|---|
| `/` | **The first-run flow** (`A1`/`XL14`/`A2`): intro Ã¢â€ â€™ circadian preview Ã¢â€ â€™ welcome + add habit Ã¢â€ â€™ your habits Ã¢â€ â€™ **basics (`A2`: plan an hour / tick the habit)** Ã¢â€ â€™ Day 1 commitment hold. **Six** steps. One way in; hands off to `/planner` |
| `/habits` | Habit CRUD, categories, streaks, per-habit flame, completion toggle; create/edit modals; date strip, month calendar, heatmaps |
| `/planner` | 24h visual timeline, duration distribution, drag/reschedule, edit-hour modal, live hour marker, infinite date strip, completion-fraction header, clean-slate empty state |
| `/journey` | Scrollable day map, SVG bÃƒÂ©zier curves, dynamic past/future counts, today-in-view, 9 ranks |
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
  the flag is re-onboarded and would meet their own habits again on step 3 Ã¢â‚¬â€
  which is why that step tracks the ids *this flow* created instead of reading
  the store.
- **`addHabit` needs a `userId`.** The flow awaits `getOrCreateUser()` on mount.
  Without it the first habit fails to write silently and step 3 looks empty for
  no visible reason.

`/profile` is correctly excluded from bottom-nav as a dead route (CONS-3
SHIPPED).

---

## 4. DATA MODEL Ã¢â‚¬â€ `src/lib/db.ts` IS THE CANONICAL SCHEMA

Rule (AGENTS.md #2, `main_plan.md` C9): the live `db.ts` is the schema.
`MASTER_TODO_REVISED.md Ã‚Â§20.1` proposes a *different* `Habit` shape (`title`
vs `name`, `streakCurrent` vs `currentStreak`) Ã¢â‚¬â€ an **unapproved** proposal.
Never adopt it wholesale. New fields are additive migrations; deviations need
an ADR in `docs/adr/`.

Dexie `OdysseyDB`, **`version(2)`**, **7 tables** Ã¢â‚¬â€ `profiles`, `scheduleBlocks`, `habits`, `habitLogs`, `weeklyReports`, `inboxItems`, and `rewardSettlements`:

| Table | Fields |
|---|---|
| `profiles` | identity + `xp`/`level`/`diamonds`/`streak`/`highestStreak`/`militaryRank`/`integrityScore`/`unlockedBadges`/`equippedItems`/`equippedTheme`/`equippedMascot`/`equippedSound`/`notificationsEnabled` |
| `scheduleBlocks` | `date` (`YYYY-MM-DD`), `startTime`/`endTime` (`HH:mm`), `title`, canonical `category`, `energyLevel?` (`high`/`medium`/`low`), `status` (`pending`/`completed`/`missed`/`pivoted`), `missReason?`, `completedAt?`, `isCommitted` |
| `habits` | `name`, `icon`, `category`, `period?` (morning/afternoon/evening), `timeOfDay?`, `frequency` (daily/weekly), `targetDaysPerWeek?`, `targetDays?` (1=Mon..7=Sun), `currentStreak`, `longestStreak`, `totalCompletions`, `archivedAt?` |
| `habitLogs` | `habitId` + `date` + `completed` (compound) |
| `weeklyReports` | `weekStart`/`weekEnd`, `totalScheduledHours`/`totalCompletedHours`, `completionRate`, `topCategory`, `mostProductiveHour`, `streakAtWeekEnd`, `diamondsEarned`, `xpEarned`, `categoryBreakdown` |
| `inboxItems` | `title`, `timeHorizon` (`today`/`this_week`/`someday`), `estimatedMinutes?`, `priority?`, `category?` |

Indexes are declared in the same `.stores({...})` block (`db.ts:206`) Ã¢â‚¬â€ several are
compound, e.g. `profiles: 'id, userId, Ã¢â‚¬Â¦'`, `habitLogs: 'habitId, date, [habitId+date]'`,
`weeklyReports: 'id, userId, weekStart, [userId+weekStart]'`.

Canonical categories are **Title Case** (`SCHEDULE_CATEGORIES`, `HABIT_CATEGORIES`
const arrays in `db.ts:48`/`db.ts:67`):

- Schedule: Work / Study / Health / Sleep / Leisure / Admin / Habits / Buffer
- Habits: Health / Mindfulness / Learning / Productivity / Social / Growth

`normalizeCategory()` (`db.ts:85`) maps any legacy spelling onto the canonical
one, case-insensitively, and **preserves unrecognised values** rather than
dropping them. Colour mapping is still defined **4Ãƒâ€”** across the app Ã¢â‚¬â€ that is
BUG-1 / CONS-1, tracked in Phase 5 Ã‚Â§7.2.

**P0-T3 remains `PARTIAL`**: the helper is shared, but the type union is still
dual-case Ã¢â‚¬â€ `ScheduleBlock.category:102` and `Habit.category:117` are both
`Category | (string & {})`, which accepts any string and so defeats the point of
the union Ã¢â‚¬â€ and `habit-colors.ts` still carries ~50 colour aliases.

**The `version(1)` `.stores({...})` map is at `db.ts:206`, and `version(2)` adds `rewardSettlements` at `db.ts:220`** (ADR 0002 Ã¢â‚¬â€ a new table only, no existing table modified, so `up()` has nothing to do).

---

## 5. STORES (Zustand) AND STATE FLOW

```
db.ts (Dexie/IndexedDB) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€“Âº stores (Zustand) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€“Âº components Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€“Âº UI
                Ã¢â€“Â²                        Ã¢â€â€š
                Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ habit-cache.ts Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ (localStorage mirror, last-known-good)
```

Stores live in `src/lib/stores/` (**6** stores Ã¢â‚¬â€ the 7th file there is `wallpaper-toggle-store.test.ts`):

| Store | Role |
|---|---|
| `habit-store.ts` | `habits[]`, `todayLogs` (habitIdÃ¢â€ â€™HabitLog), `historyLogs` (habitIdÃ¢â€ â€™dateÃ¢â€ â€™bool), `todayLogsDate`, `loadedUserId`, **`loading` starts TRUE**, `temporaryWallet`. Actions: `hydrateFromCache`, `fetchHabits`, `fetchTemporaryWallet`, `claimTemporaryWallet`, `add/update/toggle/deleteHabit`, `clearAllHabits`. `XP_PER_COMPLETION = 15` (line 13), `DIAMONDS_PER_COMPLETION` Ã¢â‚¬â€ **named constants per ADR 0001 Ã‚Â§7, never inline** |
| `user-store.ts` | profile + wallet + shop + rank in **one** store (33 edges Ã¢â‚¬â€ debt **D2 OPEN**, split is ECON-1, Phase 3) |
| `schedule-store.ts` | schedule blocks |
| `theme-store.ts` | light/dark/system + anti-FOUC inline script in `layout.tsx`, reads `odyssey_theme_mode` |
| `wallpaper-store.ts` | wallpaper state |
| `wallpaper-toggle-store.ts` | **answers the battery question in code**: sets native `wallpaper_enabled=false`, stops the 30 FPS loop, cancels the hourly alarm |

**Enforced boundaries** (`eslint.config.mjs`) Ã¢â‚¬â€ bypassing these is a lint error,
not a style preference:

- `odyssey/storage-boundary` Ã¢â‚¬â€ all `localStorage` access goes through
  `src/lib/utils/logger.ts` (`readString`/`readJson`/`readBool`/`readNumber`/
  `writeString`/`writeJson`/`remove`/`has`, plus `logWarn`/`logError`). 85
  direct call sites were removed in P8.
- `odyssey/bridge-boundary` Ã¢â‚¬â€ all native access goes through
  `src/lib/utils/android-bridge.ts` (`nativeBridge()`/`hasNative()`/
  `callNative()`/`callNativeBool()`). Never touch `window.OdysseyAndroid`,
  `window.Android` or `window.AndroidWallpaper` directly Ã¢â‚¬â€ 59 duplicated
  blocks were removed in P8.

**Known wart (D5 OPEN):** planner/journey/stats bypass Zustand and read `db`
directly. Two data-access styles coexist. Not to be fixed opportunistically.

### Reward economy (ADR 0001, Accepted 2026-10-03 Ã¢â‚¬â€ READ BEFORE TOUCHING REWARDS)

Two balances: the **Temporary Wallet** (pending, derived, recomputed from
`habitLogs` on every fetch Ã¢â‚¬â€ never stored) and **Profile XP** (`user.xp`,
mutable only via an explicit claim).

Lifecycle: a habit completed on day D Ã¢â€ â€™ if D is today it shows as
accrued-today and is **not** claimable Ã¢â€ â€™ once D is past, unclaimed, and the
habit was due on D, it sits in `unclaimedDays` at `completions Ãƒâ€” 15` XP Ã¢â€ â€™ the
user taps Claim Ã¢â€ â€™ XP + diamonds move to the profile and D is marked claimed.

**EARN rule:** a habit must be **scheduled for D AND completed on D** Ã¢â‚¬â€ neither
alone suffices. Fixed in `67c8c5b`, uses `isHabitScheduledOnDate()` from
`habit-colors.ts`.

Open defects: claim record lives in localStorage not the DB (7.1); payout is
written before the claim record (7.2); streak inflated by days claimed (7.4);
`Math.max(1, Ã¢â‚¬Â¦)` advances the streak on an empty claim (7.5). `calculateRank()`
derives rank purely from streak and ignores its `efficiency` param. Level curve
is flat: `floor(xp / 500) + 1`; the researched `100 Ãƒâ€” L^1.5` curve is **DEFERRED**
to v2.0 (ECON-2, contradiction C3).

### Pure-logic modules Ã¢â‚¬â€ the only unit-testable surface

- `src/lib/utils/habit-progress.ts` Ã¢â‚¬â€ `getDayHabitProgress()` (scheduled/
  completed/eligible counts; the denominator falls back to `eligible` on rest
  days; `percent` is **null, not 0**, on an empty day so the UI can say
  "nothing scheduled" instead of a confident false 0%; `isAllCompleted` requires
  a non-empty day), `isHabitCompletedOnDate()` (today read from **both**
  `todayLogs` and `historyLogs` so pre-midnight completions survive rollover),
  `getHeaderSlotKeys()` (namespaced `icon:`/`label:` keys Ã¢â‚¬â€ see Ã‚Â§9).
- `src/lib/utils/habit-colors.ts` Ã¢â‚¬â€ `getHabitScheduledDays()`,
  `isHabitScheduledOnDate()`, `getHabitColor()`, `getLocalTodayStr()`.
  ~50 colour aliases remain (10.11).
- `src/lib/utils/gamification.ts` Ã¢â‚¬â€ `calculateRank()`, `getRankInfo()`,
  `getNextRank()`; 9 ranks, Beginner Ã¢â€ â€™ Legend.
- `src/lib/utils/planner-empty-state.ts` Ã¢â‚¬â€ `shouldShowPlannerEmptyState()`
  (M3): loading is checked first and short-circuits, so a screen that reads the
  DB directly can never assert "this day is blank" during the read window.
- `src/lib/utils/day-status.ts` Ã¢â‚¬â€ 18-hour fully-filled-day rule for block `status`.
- `src/lib/utils/journey.ts` Ã¢â‚¬â€ `getJourneyDayNumber()`, `getDateForJourneyDay()`.
- `src/lib/utils/wallpaper-generator.ts` Ã¢â‚¬â€ canvas render + `build24HourlyBlocks()`.
- `src/lib/utils/confetti.ts` Ã¢â‚¬â€ `triggerStreaksConfetti()`.
- `src/lib/habit-cache.ts` Ã¢â‚¬â€ localStorage mirror (read/write/clear per user).
- `src/lib/seed.ts` Ã¢â‚¬â€ `resetAllDataToZero()` only. **`seedInitialData()` was removed 2026-10-15** (`P0-T7`, debt **D8** closed): it was an empty function awaited from 3 call sites, so removing it changed nothing observable but took the codebase off a file that exported a no-op as if it did work.
- Category helpers live in `db.ts` itself (`normalizeCategory`, `SCHEDULE_CATEGORIES`,
  `HABIT_CATEGORIES`) and are tested by `src/lib/categories.test.ts`. **There is no
  `src/lib/categories.ts`** Ã¢â‚¬â€ an earlier version of this file listed one; the test imports
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

- **`main_plan.md`** (~824 lines): Ã‚Â§0 how-to-use + status legend
  (SHIPPED/PARTIAL/NOT BUILT/BLOCKED/GATED/DEFERRED/NOT APPROVED); Ã‚Â§1 binding
  10-step agent workflow (Step 9b adds the `context.md` write-back) +
  Definition of Done; Ã‚Â§2 verified baseline (Ã‚Â§2.1
  shipped table, Ã‚Â§2.2 debt register D1Ã¢â‚¬â€œD9 Ã¢â‚¬â€ D4 and D7 marked **Fixed**);
  Ã‚Â§Ã‚Â§3Ã¢â‚¬â€œ9 the 7 phases with `src:`
  citations and `also:` cross-refs on every line; Ã‚Â§10 contradictions C1Ã¢â‚¬â€œC10;
  Ã‚Â§11 source index; Ã‚Â§12 changelog.
- **`DEVELOPMENT_PLAN.md`**: Ã‚Â§0 why it exists (Market Research is ~300 KB of
  overlapping, contradictory passes Ã¢â‚¬â€ this doc is the decision layer); Ã‚Â§1
  authority map; Ã‚Â§2 conflict answer key (ID collisions; `MASTER_TODO_REVISED`
  wins; schema conflict; phase-order conflict); Ã‚Â§3 baseline reconciliation;
  Ã‚Â§4 P0Ã¢â‚¬â€œP8 with machine-verifiable exit gates; Ã‚Â§5 UI/UX rules; Ã‚Â§6 workflow
  rules (6.1 one-feature-per-commit, 6.2 no half-finished uncommitted work,
  6.6 the 7-step change protocol); Ã‚Â§7 risk register R1Ã¢â‚¬â€œR12.
- **`AGENTS.md`** (repo `odyssey/`): the Next.js-16 agent-rules block
  (auto-regenerated by `next dev` Ã¢â‚¬â€ committing it keeps the tree clean) + the
  10 non-negotiables + FEATURE_WORKFLOW pointer + Hindsight memory rules.
  This is the file every agent auto-loads; it now points at this file.
- **`CLAUDE.md`**: a one-line `@AGENTS.md` include.
- **`FEATURE_WORKFLOW.md`**: BEFORE (brief in app terms, no code/jargon, 7
  sections, approval gate) Ã¢â€ â€™ DURING (one feature, verification matrix) Ã¢â€ â€™ AFTER
  (plain-language report, honest about visibility, commit, STOP).
- **`.clinerules`** (workspace **parent**, `C:\PROJECTS`): Ã‚Â§0 source of truth,
  Ã‚Â§1 Graphify-first search, Ã‚Â§2 Ponytail reuse hierarchy, Ã‚Â§3 plan-first surgical
  execution, Ã‚Â§4 UI standards, Ã‚Â§5 pre-commit review.
- **`docs/adr/0001-reward-economy.md`**: the reward spec (see Ã‚Â§5).
- **`docs/HINDSIGHT.md`** (repo parent `C:\PROJECTS`): Hindsight server setup.
- **`FEATURES.md`**: supplementary register. **Status has MOVED to
  `main_plan.md`** (C10). Its NEXT UP table and the P8 cleanup-campaign record
  are still useful; its status columns are not.
- **`inefficiencies.md`** (repo `odyssey/`): the audit whose findings became the
  P8 guard rails.

### The phases (`main_plan.md` order Ã¢â‚¬â€ overrides all other phase numbering, C1)

1. **Small things, polish, micro-interactions, stabilise** Ã¢â‚¬â€ M1Ã¢â‚¬â€œM18 micro,
   S1Ã¢â‚¬â€œS25 tier-2, CONS-1Ã¢â‚¬â€œ3 cross-surface, P0-T2/T3/T6/T7 stabilise. Exit gate:
   gates clean, P0-T6 adapter landed, CONS-2 narrow-screen sweep, no uncommitted
   work.
2. **Real feature work added to the app** Ã¢â‚¬â€ onboarding A1Ã¢â‚¬â€œA8, habits B1Ã¢â‚¬â€œB14,
   schedule C1Ã¢â‚¬â€œC8, focus HD1Ã¢â‚¬â€œHD30, stats E1Ã¢â‚¬â€œE13, reminders G/N, reflection J.
3. **Avatar, customisation, shop** Ã¢â‚¬â€ F1Ã¢â‚¬â€œF11, XL1Ã¢â‚¬â€œXL4. Economy correctness first:
   D9 specified (ADR 0001), ECON-1 store split, ECON-2 deferred.
4. **Social tab** Ã¢â‚¬â€ H1Ã¢â‚¬â€œH7, SC1Ã¢â‚¬â€œSC10, XL8Ã¢â‚¬â€œXL11. **The first phase that breaks
   local-first**: needs backend + accounts + UGC moderation + Play Families
   compliance **before any user publishes** (GATE-1..4). Social-before-AI is
   owner-chosen but an OPEN dispute (**C1**) Ã¢â‚¬â€ confirm before starting Phase 4.
4.5. **Performance** Ã¢â‚¬â€ `PERF-0`Ã¢â‚¬Â¦`PERF-18` in `main_plan.md` **Ã‚Â§6.5**, spec in
   `MASTER_TODO_REVISED.md` Ã‚Â§23, **authority `inefficiencies.md` Ã‚Â§11** (the 18-item
   master prompt was deleted and imported there verbatim, so there is one source, not
   two plus an anti-drift rule). **Unnumbered on purpose** (Ã‚Â§6 is already Phase 4; a
   second "Phase 4" would duplicate it) and **no phase renumbering** Ã¢â‚¬â€ Ã‚Â§7Ã¢â‚¬â€œÃ‚Â§12 carry 33
   cross-references in `main_plan.md` alone. Adds no features. Absorbs **`POL-1`** from
   Phase 6 (C12). **Starts with `PERF-0`, a mandatory reconcile**: 5 of the 18 items are
   already delivered and 4 of the audit's figures are wrong, so implementing the list as
   written would optimise a 30 FPS loop that `P8-E2` removed.
5. **Wallpaper + widgets** Ã¢â‚¬â€ G1Ã¢â‚¬â€œG12+, BUG-1/BUG-2 live here (Ã‚Â§7.2). The core
   differentiator; the engine ships, this phase deepens it.
6. **Polish, non-AI Pro features, third-party integrations** Ã¢â‚¬â€ SC7/SC9/SC10/F9.
7. **AI, in three tiers** Ã¢â‚¬â€ A local deterministic rules AI-1Ã¢â‚¬â€œAI-11 (zero cost,
   offline) Ã¢â€ â€™ B statistical ML AI-12Ã¢â‚¬â€œAI-16 Ã¢â€ â€™ C LLM coaching AI-17Ã¢â‚¬â€œAI-23 + I21
   (cloud, opt-in, gated). Non-negotiable AI rules: sufficient history, explain
   the evidence, dismissable/correctable, **never** auto-change, **never** block
   saving, **never** diagnose, correlation not causation.

---

## 7. ENVIRONMENT, TOOLCHAIN, TESTING

### Shell Ã¢â‚¬â€ Windows / PowerShell 5.1

- Commands run from the working directory; use the tool's `workdir` parameter
  rather than `cd`. Default to `workdir: C:\PROJECTS\odyssey` Ã¢â‚¬â€ the app root.
  Quote paths containing spaces (`'Market Research'`).
- **Not available:** `head`, `wc`, `chmod`, heredocs (`<<EOF`), `cat -n`.
  Use `Get-Content`, `Select-Object`, `Set-Content`.
- Dependent commands: `cmd1; if ($?) { cmd2 }`. `&&` does not work in PS 5.1.
- File reads/edits go through the dedicated file tools, not shell cmdlets.

### Dev server

`Start-Process npx next dev -WindowStyle Hidden`, then poll. Port 3000 is
sometimes taken and the server has come up on **3001** Ã¢â‚¬â€ always verify with
`Get-NetTCPConnection -LocalPort 3000,3001` rather than assuming.

**`Start-Process` NEVER terminates.** It returns as soon as the process spawns and
then leaves the server running **forever**, holding its port. The tool call looks
finished, which is exactly the trap Ã¢â‚¬â€ an agent that treats the call's return as
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

# Ã¢â‚¬Â¦after the verification, in the SAME commandÃ¢â‚¬Â¦
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

**Why assert `Ready`:** a server that failed to bind still answers requests Ã¢â‚¬â€
with the **previous** build. "The page loaded" is therefore not evidence that
what you are testing is what you changed. `EADDRINUSE` in the error log means
you are reading stale output.

Kill **every** listener on 3000 / 3001 / 3100 before finishing, and say so in
the report. A server left running is the one mistake that silently corrupts the
*next* task rather than the current one.

**Headless Chrome defaults to `prefers-color-scheme: dark`.** The theme resolves
through that media query (`theme-store.ts` + the anti-FOUC script in
`layout.tsx`), so a "light mode" screenshot pass that only leaves the mode on
`system` silently renders **dark** Ã¢â‚¬â€ light mode looks verified when it was never
loaded. Force both: `page.emulateMediaFeatures([{name:"prefers-color-scheme",
value:"light"}])` **and** set `odyssey_theme_mode` in `evaluateOnNewDocument`.
Assert the rendered background rather than trusting the run name.

**Assert the theme by reading `--background`, not `backgroundColor`.** Light mode
paints a *gradient* (`--body-bg: linear-gradient(...)`), so
`getComputedStyle(document.body).backgroundColor` returns `rgba(0, 0, 0, 0)` for
light Ã¢â‚¬â€ which reads as "no background", not "light", and a pass built on it cannot
distinguish a working light pass from a silently-dark one. Read
`getComputedStyle(document.documentElement).getPropertyValue('--background')`:
`#f8f5fb` light, `#0b1326` dark. The same class of bug as the `#__next` probe Ã¢â‚¬â€ a
check that cannot fail is not a check.

**A fixed `z-50` overlay swallows real mouse clicks.** `AppShell` renders
`<AppUpdateModal />` on every route, and it appears on a fresh profile. Use
`page.click` Ã¢â€ â€™ nothing happens, because the click lands on the backdrop and the
target reads as broken. Use a DOM click instead (`el.click()` via `evaluate`),
which bypasses hit-testing. **Always run a control** before believing an
interaction is broken: M6's dismiss button looked dead for two debug cycles
because of this overlay, not because of the button.

**Never edit markdown with PowerShell `Set-Content`.** It re-encodes the whole
file Ã¢â‚¬â€ BOM added, UTF-8 em-dashes become mojibake Ã¢â‚¬â€ and silently corrupts
hundreds of lines. It did exactly this to this file once (318 insertions / 227
deletions of encoding noise). Fix: `git checkout --` the file and redo the edits
with the file tools. `context.md` Ã‚Â§7 already said to use the file tools; that line
now has a scar on it.

### Gates Ã¢â‚¬â€ cheapest that can fail, first

```
npx tsc --noEmit  Ã¢â€ â€™  npx eslint <files>  Ã¢â€ â€™  npx vitest run  Ã¢â€ â€™  npm run build  Ã¢â€ â€™  Kotlin
```

`tsc` does **not** read Kotlin. If Kotlin changed, it must be compiled.

**The Kotlin build has no `gradlew` in the repo** (only `gradle/` config), and
the Kotlin daemon cannot start on this machine's JDK Ã¢â‚¬â€ Android Studio bundles
JBR 25.0.3, but the project is pinned to Kotlin 1.9.22 / AGP 8.2.2 / Gradle 8.4
(2023-era) and the daemon dies with `IllegalArgumentException: 25.0.3`. So the
in-process Kotlin compiler is used. **Treat any Kotlin change as unverified
until `:app:assembleDebug` has actually run** (risk R12) Ã¢â‚¬â€ say so honestly
rather than implying it passed.

### Tests

`vitest.config.ts`: `environment: "node"`, `include: ["src/**/*.test.ts"]`,
`@` Ã¢â€ â€™ `./src`. **No jsdom by design** (P0-T5) Ã¢â‚¬â€ every target is a pure function
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
`no-empty` (empty catch is an **error** Ã¢â‚¬â€ this is how 77 silent failures
happened), `no-console` (warn; `warn`/`error` allowed),
`@typescript-eslint/no-explicit-any` (error Ã¢â‚¬â€ zero remain), `eqeqeq` smart,
`prefer-const`, plus the two boundary rules in Ã‚Â§5.

### Definition of Done (`main_plan.md` Ã‚Â§1 + `DEVELOPMENT_PLAN.md` Ã‚Â§6.5)

Acceptance criteria met **and manually verified**; `tsc`/lint/build/test clean
(+ Kotlin compiled if Kotlin changed); light **and** dark at 390px and two wider
widths; reduced-motion honoured; empty/loading/error/long-content states
handled; **offline works** (local-first is a product promise); zero analytics or
telemetry; any new schema field documented in `db.ts` with a migration note;
`main_plan.md` updated in the same commit; **this file updated** (Ã‚Â§0.2);
**committed** Ã¢â‚¬â€ uncommitted work is in progress, not done.

### Design system

- `src/app/globals.css` owns **all** colour. `:root, .light` (line 4) and
  `.dark` (line 60). Light: bg `#F8F5FB`, primary `#6C00FF` violet. Dark: bg
  `#0b1326`, primary `#5af0b3` mint. Journey tokens: `--journey-completed`,
  `--journey-upcoming`, node bg/text/border.
- **Never raw hex in components** Ã¢â‚¬â€ CSS-var Tailwind tokens only
  (`bg-surface-container`, `text-on-surface-variant`, `border-outline/10`).
- Motion: framer-motion `AnimatePresence` + `motion`; keyframes in `globals.css`
  (`modalBackdropFadeIn/Out`, `modalSheetSlideUp/Down`, `floatSlow`,
  `radarWave`, `pulseGlow`, `shimmerGlow`, `pageFadeIn`, `viewSlideIn`) plus
  `twFadeIn`/`twSlideInFromBottom`/`twZoomIn` compat utilities. Decorative
  animations (`date-ring-pulse`, `keystonePulse` M2, `slateSweep`/`slateTapPulse`
  M3) put their keyframes inside `@media (prefers-reduced-motion: no-preference)`
  and set `animation: none` under `reduce` Ã¢â‚¬â€ no JS, no hydration-time flash.
- Layout: mobile-first flexbox, `sm:/md:/lg:` only, **no hardcoded pixel
  widths** (`w-full max-w-md`, layout `max-w-xl sm:max-w-2xl`).
- Every interactive element needs explicit hover/focus/active/loading/disabled
  states, must be keyboard reachable with a visible focus ring, and must honour
  reduced motion.
- **Visual verification:** system Chrome at phone width (390px Ã¢â‚¬â€ also 360 and 430),
  before/after screenshots, light **and** dark.
  *Do not assert a visual change works Ã¢â‚¬â€ screenshot it or measure it.*
  Screenshots catch things assertions miss: the M3 pulse rendered two (+)
  marks side by side while every scripted assertion passed.
  **Prefer a page that measures itself** (it writes its own
  `getBoundingClientRect()` results into the DOM and `--dump-dom` reads them
  out) over a pixel scan. A scan measured the wrong viewport and reported two
  defects that did not exist; a self-measuring page settles the same question in
  one run. **`puppeteer-core` IS available** at
  `%TEMP%\opencode\verify\node_modules` (headless Chrome at
  `C:\Program Files\Google\Chrome\Application\chrome.exe`) Ã¢â‚¬â€ an earlier "not
  currently available" note here was wrong and is corrected; see Ã‚Â§10 and Ã‚Â§9
  2026-10-16 for the two Chrome
  behaviours (`--window-size` ignored, IndexedDB stalled under virtual time) that
  will otherwise be rediscovered the hard way, and Ã‚Â§9 `(i)` 2026-10-19 for a
  worked example.

---

## 8. PEOPLE, MEMORY, RESEARCH LANDSCAPE

- **Owner:** project owner. Sets goals, approves plans and briefings, and
  decides phase order. Wants work done with verification and dislikes chatter.
  Treat any phase-gate or scope question as theirs alone to answer.
- **Agents:** any AI or human picking up work follows Ã‚Â§0 Ã¢â€ â€™ `main_plan.md` Ã‚Â§1 Ã¢â€ â€™
  `FEATURE_WORKFLOW.md`. Architect + implementer in one: read the cited spec,
  state the plan, execute surgically, verify with evidence, report honestly,
  commit, stop.
- **Hindsight memory:** persistent cross-session memory via a local
  `hindsight-api` on `http://127.0.0.1:8888` (Dahl LLM endpoint). Retain
  architecture decisions, non-obvious constraints and bug fixes **with full
  context** Ã¢â‚¬â€ it extracts the facts itself, so do not pre-summarise. Recall
  before non-trivial work in an unfamiliar area.
  - On Windows the `uvx hindsight-embed memory Ã¢â‚¬Â¦` subcommand **does not work**
    (it shells out to `/bin/bash` and needs WSL). Use the REST API instead Ã¢â‚¬â€
    see `C:\PROJECTS\docs\HINDSIGHT.md`.
  - **Never** store secrets, API keys or user PII.
  - Config lives in `C:\PROJECTS\.env` (git-ignored). Verify with
    `.\.venv\Scripts\python.exe test_hindsight.py`.
- **Graphify:** `graphify-out/GRAPH_REPORT.md` + `graph.json`, plus an MCP
  server (`query_graph`/`get_node`/`get_neighbors`/`god_nodes`/`shortest_path`/
  `list_prs`). **`.clinerules` Ã‚Â§1 makes this the first search tool** Ã¢â‚¬â€ query the
  graph before a broad filesystem scan. `graphify update .` refreshes it; the
  CLI is on PATH via the Python 3.11 Scripts folder (it warns that the installed
  skill is newer than the package Ã¢â‚¬â€ harmless).

### Research corpus (`Market Research/`, tracked in git except `Apps Videos/`)

- **`MASTER_TODO_REVISED.md`** (~1320 lines) Ã¢â‚¬â€ canonical IDs. Ã‚Â§1 product
  definition, Ã‚Â§6 habit science + templates, Ã‚Â§7 schedule synthesis, the
  140-item catalogue, Ã‚Â§19 phase matrix, Ã‚Â§20 schema proposal (**unapproved**).
- `PRODUCTION_PLAN.md` Ã¢â‚¬â€ Phase 0Ã¢â‚¬â€œ7 framing and exit gates (superseded on conflict).
- `PHASE_0_AUDIT_REPORT.md` Ã¢â‚¬â€ verified-vs-assumed; **one known factual error**
  (says Next.js 14; the app is 16.3.5).
- `TODO.md`, `AI_TODO.md`, `MASTER_TODO.md` Ã¢â‚¬â€ **SUPERSEDED archives**. Their
  `AI-n`/`XL-n`/`M-n`/`S-n` IDs collide with the canonical ones. Never cite an
  ID without the `MASTER_TODO_REVISED.md` definition attached (C7/C8).
- `App_Reviews.md`, `Review_Analysis.md`, `UI_UX_review.md` Ã¢â‚¬â€ competitor
  teardowns (Structured, Sunsama, Motion, Reclaim, TimeStripe, Fabulous, Finch).
- `Habit Research/` Ã¢â‚¬â€ `integration_roadmap.md` (Tiers M/S; the research home of
  M9), `feature_lists.md`, `books_brainstorm_and_habits.md`.
- `Schedule Research/` Ã¢â‚¬â€ `competitor_analysis.md`, `feature_lists.md`.
- `Apps Videos/` Ã¢â‚¬â€ 15 competitor `.mp4`s, 265 MB, **git-ignored**, local only.

---

## 9. SESSION LOG Ã¢â‚¬â€ durable learnings

Newest first. One entry per shipped feature or hard-won lesson. Facts, not
opinions. **Compacted 2026-10-19:** the full historical entries (2026-10-04 Ã¢â€ â€™
2026-10-18) were distilled into the "Durable lessons from earlier sessions"
section below; today's entries are kept in full.

### 2026-10-20 Ã¢â‚¬â€ today's entries

**`B4` swipe & hold on habit cards (SHIPPED):** habit cards are now mounted in
`HabitGestureCard` with three gestures replacing the old hold-to-edit: **hold
(400 ms) marks the habit FULLY done** (counted fills to target through the same
`setHabitLogValue` store path as the existing fill-to-target gestures Ã¢â‚¬â€ streak,
counters and confetti move inside the store, not the handler; simple goes through
`handleToggle`; a repeat never undoes Ã¢â‚¬â€ undo stays on the ring tap); **swipe right
marks a simple habit done, or by owner decision reveals three small rectangles on a
counted habit** (`All Done` / `+X` where X is half the target **rounded down** /
`+1`, capped at the target); **swipe left opens the edit sheet**. Vertical drags are
inert (axis-ratio 1.2) so list scrolling is untouched. **The shell deliberately uses
the legacy `onTouchStart`/`onMouseDown` events, NOT Pointer Events:** every
interactive child (ring, counted progress bar, avoid control) already stops those
legacy events, and that is the only thing keeping a press on them from starting a
card hold Ã¢â‚¬â€ a hold on the ring, followed by the ring's own click, would have undone
the hold's completion. Pointer events would bubble past those child guards. The
click-synthesis suppression after a gesture moved off `isLongPressRef` into the shell
(`suppressClickRef`). **Grid view removed per owner** ("make the grid card in the
list format", then chose merge): the switcher is List + Heatmap, `GridHabitCard`
(382 lines) is deleted orphan with no remaining importers, and a saved `grid`
preference falls back to List on restore. Heatmap rows deliberately get **no**
hold/swipe (a swipe there fights the matrix's own horizontal scroll, and holding a
matrix cell would misfire) Ã¢â‚¬â€ they gained an explicit pencil button because mobile
users in heatmap view would otherwise lose edit access entirely; desktop keeps
right-click. **No haptic, known parity gap:** the hold calls `navigator.vibrate(50)`
exactly where the old hold-to-edit did, but that is a silent no-op on Android Ã¢â‚¬â€ the
manifest deliberately lacks `VIBRATE` (see the C2 entry below); feedback is visual
only. **Gesture thresholds are pure helpers** (`swipeDirection`, `halfTargetFloor`,
8 tests) because there is no component harness; the gestures themselves were not
seen on a device Ã¢â‚¬â€ verified by tsc 0, lint 0 errors, 31 suites / 478 tests green,
build clean, 13 routes. **Concurrency:** the other session committed `9a747d0`Ã¢â‚¬Â¦
`aa1c36f` (C2 grab-to-drag, M22/M23) **while this feature was in flight**; edits were
applied on their committed tree and their habits-screen shared-clock change survived
intact Ã¢â‚¬â€ no intermingling.

**`B4` round 2 Ã¢â‚¬â€ direct swipes, heatmap gestures (SHIPPED):** owner feedback on the first build: swipes registered only via a deliberate hold-then-drag. Root cause class: the first commit re-checked horizontal-vs-vertical on the FULL drag (`|dx| > |dy|` at release), so a casual touch swipe Ã¢â‚¬â€ which always drifts vertically in its first pixels and may engage a list scroll Ã¢â‚¬â€ was reclassified dead at release. Fix: the axis is decided ONCE at the first 8px of travel (`decideGestureAxis`, the C2 grab-to-drag 8px-slop lesson) and locked; a locked-horizontal swipe commits at 40px (down from 56) however the finger drifts afterwards, and a locked-vertical drag is inert to the end. The shell still never calls `preventDefault`, so the list scroll keeps working. **The three gestures moved onto the heatmap view's cards too** (hold = fully done, swipe-left = edit, swipe-right = done / three rectangles): the matrix is a horizontal-pan surface, so it is wrapped in a spacer that stops the legacy `mousedown`/`touchstart` at the source Ã¢â‚¬â€ a touch panning the heatmap weeks never arms a card hold or commits a card swipe, but swiping from the card's header area does. The round-1 pencil button was removed per owner (edit access on mobile heatmap restores via swipe-left). Pure helpers grew 8 Ã¢â€ â€™ 12 tests. Gates: tsc 0, lint 0 errors, 31 suites / 482 tests green, build clean. Still not visually verified (no device/harness here).

### 2026-10-20 â€” today's entries (condensed)

**C2 drag/swipe reliability (SHIPPED):** fixed mobile drag-and-drop reliability and added swipe-to-edit for empty slots. Root cause: the 250 ms hold timer was too long for real fingers (tiny drift killed it before arming), the drift veto was tighter (8 px) than the browser's scroll slop (~10 px), and the code cancelled the hold on drift instead of waiting. Fixed by: (1) shortening hold to 150 ms, (2) raising drift veto to 12 px (covers browser slop), (3) making onPointerMove wait for arming instead of cancelling. Also added swipe-to-edit to empty slots (right-to-left swipe opens the hour editor) by giving them the same pointer handlers as filled blocks. Verified: tsc 0, lint 0 errors, 482 tests, build clean, all gesture scenarios (quick flick, hold+drag, hold+swipe, hold+release, tap, button-drag, mouse drag, empty-slot swipe) pass in headless Chrome; light/dark/360/390/430.

**`C2` grab-to-drag Ã¢â‚¬â€ a finger must hold before a block moves (SHIPPED):** the Schedule screen's blocks were dragging on a casual scroll. The card carried `touch-action: none` and 10 px of travel started the move, so the page could not scroll from any finger that landed on a block Ã¢â‚¬â€ on a full day that is most of the rail Ã¢â‚¬â€ and the block went to whatever hour the thumb passed. A finger now has to **rest on a block for 250 ms** (`HOLD_TO_DRAG_MS`); only then does the block lift (`opacity-50 scale-95`, the look the drag already used) and follow. The card is `touch-pan-y` again, and the page's scroll is cancelled **only after the grab is armed**, from a **non-passive `touchmove` listener on the card**. That listener is the whole trick: React attaches `touchstart`/`touchmove` at the app root **passively**, so Chrome never waits for the main thread, gives the gesture to the compositor, and marks later moves `cancelable: false` Ã¢â‚¬â€ a veto from a passive handler is ignored ("Ignored attempt to cancel a touchmove event"). With a non-passive listener the touch is "blocking", the first move is cancelable, and `preventDefault()` after arming holds the gesture. `touch-action` is fixed at touchstart, so it **cannot** be switched mid-gesture Ã¢â‚¬â€ that is why the veto is a listener and not a class toggle; `pan-y` is also what lets a passing finger still scroll natively. The 10 px slop now only splits drag (vertical) from swipe-to-edit (horizontal) **after** the grab, so a held swipe still opens the editor and an un-held one cannot. Mouse is untouched (`pointerType === "mouse"` arms at pointerdown) Ã¢â‚¬â€ a desktop has no scroll to fight. A press that starts on the card's own buttons (tick, cross, sleep chevron) never arms; before this, a drag from the chevron moved the block. **No haptic:** `navigator.vibrate` needs `VIBRATE`, which the manifest deliberately does not hold, so the lift is the only signal. Verified with real `Input.dispatchTouchEvent` on a 390-wide page: quick flick over a block Ã¢â€ â€™ no move, `defaultPrevented: false`, later moves non-cancelable (the browser took it as a scroll); hold+drag Ã¢â€ â€™ the block moves and saves; hold+swipe Ã¢â€ â€™ the editor opens; hold+release Ã¢â€ â€™ inert, no ghost; tap Ã¢â€ â€™ inert; button-drag Ã¢â€ â€™ inert; mouse drag Ã¢â€ â€™ unchanged; light and dark, 360/390/430. **Caveat:** headless Chrome never changed `scrollY`, so the scroll motion itself still needs a finger on the phone. Artifacts: `verify-c2-hold.js`, `verify-c2-hold-visual.js`, `verify-c2-hold-widths.js. **Mobile follow-up (same commit):** the first build did not work on a phone -- a resting finger's tiny drift started a scroll that fired `pointercancel` and killed the 250 ms timer before it could arm, so neither drag nor swipe ever started. Fixed by vetoing `touchmove` while cumulative movement is under 8 px (below the browser's scroll slop, so a real scroll still starts) and adding `-webkit-touch-callout: none`; the hold was shortened from 450 ms to 250 ms to clear the OS long-press threshold. A sideways swipe now needs **no hold** -- it never fought the page's scroll, so gating it behind the hold was both wrong and the reason the owner could not open the editor on a phone. Verified again: tsc 0, lint 0 errors, 470 tests, build clean, full gesture suite green.

**`**Battery/Perf fixes** (SHIPPED web / PENDING native): consolidated 7+ scattered `setInterval` timers (1 s / 3 s / 4 s / 5 s / 15 s / 30 ms / 4.2 s) into **one shared minute-boundary clock** (`src/lib/utils/shared-clock.ts`, `useSharedClock` backed by `useSyncExternalStore`); replaced 3 s day-change detectors on habits/planner, removed planner 4 s carousel auto-scroll, converted `habit-date-strip`/`infinite-date-strip` 30 ms mount-only fallbacks to `requestAnimationFrame`, paused onboarding `step-circadian` 4.2 s autoplay when hidden. **Reduced `backdrop-blur` layers from 41 to 11** (36 removed, 4 essential `-xl` remain on day-schedule picker cards with `data-blur-essential`; 7 `-md` on header/bottom-nav/onboarding/wallpaper-preview/habit-template remain). **All 10 `SharedPreferences.commit()` -> `apply()`** (9 in `OdysseyWallpaperBridge.kt`, 1 in `MainActivity.kt`). **PERF-4 SHIPPED**, `PERF-7` SHIPPED, `PERF-12` SHIPPED (unverified native). Native items (`OdysseyCadenceNotificationWorker` WorkManager migration, WorkManager for hourly wallpaper) **written but unverified** -- Kotlin cannot be compiled on this machine (no `gradlew`, JBR 25 vs Kotlin 1.9.22). Gates: `tsc` 0, `lint` 0 errors (83 warnings), 470 tests, build clean.

**`B16` (SHIPPED):** a counted habit's **emergency minimum** now counts toward its days-done total (owner rule). The emergency version is the *floor* -- only doing the two-minute version still earns the day. **Counter-only on purpose:** `isHabitComplete` is untouched, so the heatmap/date strip/confetti/reward vault still render a floor day as unfilled; the counter and those surfaces disagree by design and were accepted as such. **No schema change** -- the existing `Habit.emergencyVersion` is reused and is now a **number** input for counted habits; unparsable text means *no floor*, so a legacy "Read 1 page" behaves exactly as before. New `emergencyMinimum()` export in `compliance.ts`; ADR 0005 Ã‚Â§2.1.1 records the rule and the tolerance for the disagreement; 9 new tests.

**Date strip NaN fix (SHIPPED):** `planner-content.tsx` passed `localTimeStr(now)` (an `HH:MM` string like `"13:53"`) as `todayStr` to `InfiniteDateStrip`, which expects `YYYY-MM-DD`. The strip split `todayStr` on `"-"`, yielding `NaN` for `item.dayNum` and `item.dateStr`, surfacing as "Received NaN for the 'children' attribute" on both the date `<span>` and the day `<button>`. Changed the import and call to `localDateStr(now)` (`YYYY-MM-DD`), matching `habit-date-strip.tsx` which already uses it correctly. Verified: `tsc` 0, `lint` 0 errors, 470 tests green.

**Planner rail-card tweak, then full reversal (SHIPPED):** owner asked to de-head the planner's "Daily Schedule Rail" card (Clock icon + label gone, arrow kept); misread it first as the day-schedule page (committed `b170732`, reverted same session as `6e1d80e`), then did the planner version (`a0e74fb`, `9621457` padded card, arrow overlaid). Owner then reversed the whole thing Ã¢â‚¬â€ reverts restored the original card. Lesson: for screenshot-driven UI tweaks, confirm which screen is in the image before touching code Ã¢â‚¬â€ two wrong-target commits this session.

**M22 (SHIPPED):** planner's **Daily Schedule Rail bar card removed** entirely on owner instruction, replaced by the behaviour the card used to be the shortcut for: **tapping a date in the date strip opens the Schedule Distribution pop-up for that tapped day.** New optional `onDateSelected` prop on `infinite-date-strip.tsx`, fired after the selection commits from BOTH the date pills and the sticky Today pill (strip stays a generic component Ã¢â‚¬â€ other consumers' behaviour unchanged). The pop-up already took `dateStr={selectedDate}`, so no extra state was needed. Removed: the card's tap target, its Clock-icon + label header, the 24-slice allocation bar, and the planner's `buildAllocationSlices`/`allocationCategory` imports. `categoryStats` and `isPlannedHour` stay Ã¢â‚¬â€ `categoryStats` now has exactly one planner consumer, the pop-up. **Partially supersedes M19**: the bar now lives only on `/day-schedule`. Verified after dismissing the evening-plan popup, light + dark: rail card gone, tap Ã¢â€ â€™ Distribution pop-up for the selected date, 0 console errors. Gates: tsc 0, lint 0 errors (83 warnings), 470 tests, build clean.

**M23 (SHIPPED):** Schedule Distribution pop-up decluttered on owner instruction: header subtitle ("Breakdown of planned hours and activities"), "Planned Total" label, "% Planned" pill and "X Hours planned / Y Hours free" row all removed, **followed within minutes by the clock icon + "X / 24 Hours" count Ã¢â‚¬â€ the overview banner is now only the colour strip, with its segments abutting gapless (`gap-0.5` removed; the gaps misread as unscheduled time on the day).** Per-category cards: the duplicate subtitle ("Deep Work", "Health & Habits", etc.) deleted Ã¢â‚¬â€ one bold heading only; the space under "X% of day" now filled by a share-of-day track bar in the category's solid colour (honest small fills for ~4%). Verified seeded-7h-day + zero-day pop-up, light + dark, 0 console errors. Lesson reinforced: `next start` serves the LAST built bundle Ã¢â‚¬â€ after editing, rebuild before visual checks or you screenshot the old UI.

**BUG-10 (RESOLVED - BY DESIGN):** owner decision 2026-10-20: the 20:00 evening "plan tomorrow" reminder stays a sub-screen prompt only. `AppShell`'s early-return for `pathname === "/"` and `"/day-schedule"` (mounting only `AppUpdateModal`, never `EveningReminderModal`) is intended, not a defect, so the home screen and quick-schedule page stay free of the modal and the OS notification it fires. Original finding (reminder never appears on `/`) was correct but, on owner decision, not a defect. Do not re-open without a product reason. src: `src/components/layout/app-shell.tsx:35`.

## Ã‚Â§10 Git + task state (as of 2026-10-20)

- **HEAD:** the C2 drag/swipe reliability commit on top of B4 round 2. Working tree clean.
  same hold/swipe set on heatmap cards, pencil removed. Round 1 is `13af9b5`. On
  top of the other session's `aa2865b` (docs) and `f8fb417` (BUG-10 resolved by
  design: the evening reminder stays sub-screen only Ã¢â‚¬â€ owner decision). Committed
  on `main`; **the agent never pushes Ã¢â‚¬â€ the owner pushes.** Earlier: `352155a`
  (context for C2), `aa1c36f`/`05bedee` (C2 swipe/drag: feature itself `653c565`),
  `dd31a4c` (`S10` docs), `f516a8b` (`B6`), `956cb5d` (`B17`), `993a2c9` (`B16`).
  Everything through `e67dc01` is on `origin/main`; `8700852` onward are
  **unpushed**.
- **Working tree (2026-10-20):** my round-2 files were all committed; one file sat
  **uncommitted from the other session** at commit time Ã¢â‚¬â€
  `src/components/planner/timeline-hour-slot.tsx` Ã¢â‚¬â€ deliberately NOT staged;
  expect it in their next commit.
- **Gates (B4 round 2):** tsc 0; eslint 0 errors; **31 suites / 482 tests** green
  (486 at `dd31a4c` Ã¢â€ â€™ 470 from the other session's commits this window, +12 from
  `B4` rounds 1+2 combined); production build clean, 13 routes.
- **Next:** no pre-approved queue. Candidates in plan order when the owner picks:
  `B13` (pause/archive + the 14-day inactive prompt), `B1` (searchable template
  library), finishing `B2`'s missing form fields. Wallpaper / `B5` stays on
  Phase-5 hold.
- **Verify artifacts:** `%TEMP%\opencode\verify\` (`perf16-smoke.js`,
  `rail-check.js`, `verify-perf5.js`, `verify-c2-hold*.js`); Chrome path and seed
  keys as recorded above.
