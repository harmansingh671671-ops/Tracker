# Graph Report - odyssey  (2026-10-04)

## Corpus Check
- 105 files · ~420,163 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 854 nodes · 1454 edges · 59 communities (50 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dda4383d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- user-store.ts
- OdysseyWallpaperEngine
- android-bridge.ts
- MainActivity.kt
- OdysseyWallpaperBridge
- dependencies
- profile-settings-sheet.tsx
- dialog.tsx
- devDependencies
- planner/page.tsx
- compilerOptions
- components.json
- manifest.json
- route.ts
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- app/page.tsx
- 2. BATTERY AUDIT
- useUserStore
- ODYSSEY - DEVELOPMENT PLAN (CANONICAL)
- ODYSSEY - FEATURE WORKFLOW
- create-habit-modal.tsx
- OdysseyCadenceNotificationWorker
- Odyssey Android APK Real-Time Lockscreen Engine
- AGENTS.md
- shop/page.tsx
- tabs.tsx
- wallpaper-store.ts
- README.md
- badge.tsx
- tailwind.config.ts
- Hindsight Memory (Odyssey)
- OdysseyLiveWallpaperService.kt
- ADR 0001 — Reward economy
- ODYSSEY — FEATURE REGISTER (canonical status of record)
- OdysseyHourlyWallpaperWorker
- OdysseyWallpaperBridge.kt
- 4. PHASE PLAN
- 5. ENGINEERING CONVENTIONS (binding on all code)
- 2. CONFLICT RESOLUTIONS -- THE ANSWER KEY
- BroadcastReceiver
- 6. HOW WORK MOVES
- 3. VERIFIED BASELINE -- WHAT ACTUALLY EXISTS
- sin
- systemclock

## God Nodes (most connected - your core abstractions)
1. `useUserStore` - 39 edges
2. `OdysseyWallpaperBridge` - 36 edges
3. `useHabitStore` - 25 edges
4. `ScheduleBlock` - 21 edges
5. `Habit` - 18 edges
6. `WallpaperPage()` - 17 edges
7. `compilerOptions` - 16 edges
8. `db` - 15 edges
9. `getHabitColor()` - 15 edges
10. `getLocalTodayStr()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `ShopPage()` --calls--> `useUserStore`  [EXTRACTED]
  src/app/shop/page.tsx → src/lib/stores/user-store.ts
- `OdysseyCadenceNotificationWorker` --inherits--> `BroadcastReceiver`  [EXTRACTED]
  android/app/src/main/java/com/odyssey/tracker/OdysseyCadenceNotificationWorker.kt → android/app/src/main/java/com/odyssey/tracker/OdysseyWallpaperBridge.kt
- `OdysseyHourlyWallpaperWorker` --inherits--> `BroadcastReceiver`  [EXTRACTED]
  android/app/src/main/java/com/odyssey/tracker/OdysseyHourlyWallpaperWorker.kt → android/app/src/main/java/com/odyssey/tracker/OdysseyWallpaperBridge.kt
- `DayScheduleContent()` --calls--> `useUserStore`  [EXTRACTED]
  src/app/day-schedule/page.tsx → src/lib/stores/user-store.ts
- `DayScheduleContent()` --calls--> `triggerStreaksConfetti()`  [EXTRACTED]
  src/app/day-schedule/page.tsx → src/lib/utils/confetti.ts

## Import Cycles
- None detected.

## Communities (59 total, 9 thin omitted)

### Community 0 - "user-store.ts"
Cohesion: 0.09
Nodes (37): JourneyPage(), ProfilePage(), MONTH_NAMES, StatsPage(), WEEKDAY_NAMES, EveningReminderModal(), Switch(), db (+29 more)

### Community 1 - "OdysseyWallpaperEngine"
Cohesion: 0.13
Nodes (11): CachedSchedule, HobbyItem, android, Canvas, OdysseyLiveWallpaperService, OdysseyWallpaperEngine, ScheduleBlockItem, WallpaperCategoryBadge (+3 more)

### Community 2 - "android-bridge.ts"
Cohesion: 0.09
Nodes (35): WallpaperPage(), WallpaperPreview(), WallpaperPreviewProps, applyNativeAlternateWallpaper(), applyNativeCustomWallpaper(), buildNativeSchedulePayload(), clearNativeAlternateWallpaper(), clearNativeCustomWallpaper() (+27 more)

### Community 3 - "MainActivity.kt"
Cohesion: 0.11
Nodes (19): android, Intent, MainActivity, OnBackPressedCallback, WebChromeClient, WebViewClient, AppCompatActivity, bitmap (+11 more)

### Community 4 - "OdysseyWallpaperBridge"
Cohesion: 0.08
Nodes (3): Intent, OdysseyWallpaperBridge, WallpaperManager

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (35): @base-ui/react, class-variance-authority, cn, date-fns, dexie, dexie-react-hooks, framer-motion, lucide-react (+27 more)

### Community 6 - "profile-settings-sheet.tsx"
Cohesion: 0.08
Nodes (30): src_app_globals, inter, metadata, playfairDisplay, AppUpdateModal(), checkOnceOnLaunch(), FeedbackModalProps, FloatingFeedbackButton() (+22 more)

### Community 7 - "dialog.tsx"
Cohesion: 0.15
Nodes (3): Button(), buttonVariants, Calendar()

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (34): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+26 more)

### Community 9 - "planner/page.tsx"
Cohesion: 0.07
Nodes (43): CATEGORY_OPTIONS, CategoryKey, DayScheduleContent(), formatDateDisplay(), formatHour(), getCatStyle(), getTodayStr(), normalizeCategory() (+35 more)

### Community 10 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 11 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 14 - "manifest.json"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 22 - "app/page.tsx"
Cohesion: 0.50
Nodes (5): LandingPage(), TIME_SLICES, hasCompletedOnboarding(), markOnboardingComplete(), ONBOARDING_STORAGE_KEY

### Community 24 - "2. BATTERY AUDIT"
Cohesion: 0.06
Nodes (35): 1. EXECUTIVE SUMMARY, 2.10 SUMMARY — BATTERY, 2.1 CRITICAL — Live wallpaper re-renders the whole scene 30× per second, 2.2 HIGH — Inaccurate power claim in the source, 2.3 HIGH — Two device-waking alarms per hour, 2.4 MEDIUM — Unused `WAKE_LOCK` permission, 2.5 MEDIUM — Hourly worker allocates a ~10 MB bitmap, 2.6 MEDIUM — WebView: preview clock ticks 60× faster than it displays (+27 more)

### Community 30 - "useUserStore"
Cohesion: 0.08
Nodes (58): ADR-0001, HabitsPage(), HabitViewMode, DOMAINS, EditHabitModal(), EditHabitModalProps, EMOJIS, WEEKDAYS (+50 more)

### Community 31 - "ODYSSEY - DEVELOPMENT PLAN (CANONICAL)"
Cohesion: 0.20
Nodes (9): 0. WHY THIS DOCUMENT EXISTS, 10. QUICK REFERENCE, 1.1 Market Research is git-ignored, 1. DOCUMENT AUTHORITY MAP, 7. RISK REGISTER, 8.1 Deferred backlog (explicitly not forgotten), 8. IMMEDIATE NEXT ACTIONS, 9. CHANGELOG (+1 more)

### Community 32 - "ODYSSEY - FEATURE WORKFLOW"
Cohesion: 0.17
Nodes (11): BLOCKING DECISIONS, CURRENTLY STAGED FEATURE, ODYSSEY - FEATURE WORKFLOW, Rules, STAGE 1 -- BEFORE (briefing and approval gate), STAGE 2 -- DURING (the work), STAGE 3 -- AFTER (completion report), SUMMARY (+3 more)

### Community 33 - "create-habit-modal.tsx"
Cohesion: 0.20
Nodes (10): CreateHabitModal(), CreateHabitModalProps, DOMAINS, EMOJIS, WEEKDAYS, HABIT_TEMPLATES, HabitTemplate, HabitTemplateLibrary() (+2 more)

### Community 34 - "OdysseyCadenceNotificationWorker"
Cohesion: 0.45
Nodes (3): Context, Intent, OdysseyCadenceNotificationWorker

### Community 35 - "Odyssey Android APK Real-Time Lockscreen Engine"
Cohesion: 0.18
Nodes (10): 1. Direct 1-Tap Lockscreen Update (Instant), 2. Native Live Wallpaper Service (Real-Time Automatic Updates), 🛠️ How to Build the APK, How You Leverage Vercel with the Native APK (Zero APK Rebuilds), 🚀 Hybrid Architecture: Live Vercel Pushes + Native Superpowers, Odyssey Android APK Real-Time Lockscreen Engine, Option A: Using Android Studio (Visual & 1-Click), Option B: Using GitHub Actions (Automated Cloud APK Build) (+2 more)

### Community 36 - "AGENTS.md"
Cohesion: 0.25
Nodes (7): Before you finish, ⚠️ MANDATORY: Read `DEVELOPMENT_PLAN.md` BEFORE writing any code, MANDATORY: Read `FEATURE_WORKFLOW.md` before starting any feature, Non-negotiables, Non-negotiables, Project memory (Hindsight), This is NOT the Next.js you know

### Community 37 - "shop/page.tsx"
Cohesion: 0.40
Nodes (4): ShopItem, ShopPage(), RewardCelebrationModal(), RewardCelebrationModalProps

### Community 39 - "wallpaper-store.ts"
Cohesion: 0.53
Nodes (5): loadSavedSettings(), saveSettings(), useWallpaperStore, WallpaperSettings, WallpaperStoreState

### Community 40 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 44 - "Hindsight Memory (Odyssey)"
Cohesion: 0.11
Nodes (18): 1. Prerequisites, 2.1 OmniRoute setup (this project), 2.2 Start the daemon, 2.5 Keeping both services running automatically, 2. One-time setup, 3. Windows: the `memory` subcommand does not work, 4. Daily use on Windows (REST API), 5. What to store, and when (+10 more)

### Community 45 - "OdysseyLiveWallpaperService.kt"
Cohesion: 0.18
Nodes (15): alarmmanager, broadcastreceiver, calendar, contextcompat, handler, intent, jsonobject, locale (+7 more)

### Community 46 - "ADR 0001 — Reward economy"
Cohesion: 0.13
Nodes (14): 10. Summary, 1. Why this document exists, 2. The two balances, 3. The reward lifecycle, 4. Decision 1 — The claim record belongs in the database, 5. Decision 2 — Streak must not jump on bulk claim, 6.1 The delay is kept, 6.2 A reward is earned only if the habit was *due* that day (+6 more)

### Community 47 - "ODYSSEY — FEATURE REGISTER (canonical status of record)"
Cohesion: 0.14
Nodes (13): 1. SHIPPED, 2. IN PROGRESS, 3. READY — fully specified, eligible to brief, 4. PLANNED — decided, not specified, 5. BLOCKED, 6. GATED — do not build, ACTIVE RISKS, MAINTENANCE (+5 more)

### Community 48 - "OdysseyHourlyWallpaperWorker"
Cohesion: 0.33
Nodes (4): Canvas, Context, Intent, OdysseyHourlyWallpaperWorker

### Community 49 - "OdysseyWallpaperBridge.kt"
Cohesion: 0.17
Nodes (10): Context, base64, bitmapdrawable, build, componentname, file, fileoutputstream, intentfilter (+2 more)

### Community 50 - "4. PHASE PLAN"
Cohesion: 0.20
Nodes (10): 4. PHASE PLAN, PHASE 0 -- STABILISE (current phase), PHASE 1 -- DAILY CLARITY, PHASE 2 -- ROUTINES, PHASE 3 -- PROGRESSION & AMBIENT, PHASE 4 -- AI (LOCAL / DETERMINISTIC), PHASE 5 -- SOCIAL (GATED), PHASE 6 -- LAUNCH (+2 more)

### Community 51 - "5. ENGINEERING CONVENTIONS (binding on all code)"
Cohesion: 0.20
Nodes (10): 5.1 Stack (verified -- do not substitute), 5.2 Mandatory pre-flight for any Next.js work, 5.3 Architecture rules, 5.4 Styling rules, 5.5 Data rules, 5.6 State rules, 5.7 Android / native rules, 5.8 Accessibility and performance floors (+2 more)

### Community 52 - "2. CONFLICT RESOLUTIONS -- THE ANSWER KEY"
Cohesion: 0.22
Nodes (9): 2.1 Feature-ID collision -- CRITICAL, 2.2 Phase-numbering collision, 2.3 Social vs AI ordering -- deliberate deviation, 2.4 Schema conflict -- CRITICAL, decision required before P2, 2.5 Existing category-union drift -- real bug, 2.6 Framework version -- factual error in PHASE_0_AUDIT_REPORT.md, 2.7 XP curve conflict, 2.8 Plan vs reality -- "checked" does not mean done (+1 more)

### Community 53 - "BroadcastReceiver"
Cohesion: 0.48
Nodes (5): Context, Intent, OdysseyNotificationActionReceiver, BroadcastReceiver, notificationmanager

### Community 54 - "6. HOW WORK MOVES"
Cohesion: 0.29
Nodes (7): 6.1 One feature at a time (non-negotiable), 6.2 Branching, 6.3 Commit format, 6.4 Commit hygiene, 6.5 Definition of Done, 6.6 Efficiency-first agent workflow (binding, from P8 onward), 6. HOW WORK MOVES

### Community 55 - "3. VERIFIED BASELINE -- WHAT ACTUALLY EXISTS"
Cohesion: 0.50
Nodes (4): 3.1 Working, shipped, verified, 3.2 Not built (researched and planned, zero code), 3.3 Technical debt register, 3. VERIFIED BASELINE -- WHAT ACTUALLY EXISTS

## Knowledge Gaps
- **291 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+286 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useUserStore` connect `useUserStore` to `user-store.ts`, `android-bridge.ts`, `shop/page.tsx`, `profile-settings-sheet.tsx`, `planner/page.tsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `OdysseyWallpaperBridge` connect `OdysseyWallpaperBridge` to `OdysseyWallpaperBridge.kt`, `MainActivity.kt`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `BroadcastReceiver` connect `BroadcastReceiver` to `OdysseyCadenceNotificationWorker`, `OdysseyWallpaperBridge`, `OdysseyLiveWallpaperService.kt`, `OdysseyHourlyWallpaperWorker`, `OdysseyWallpaperBridge.kt`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _291 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `user-store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `OdysseyWallpaperEngine` be split into smaller, more focused modules?**
  _Cohesion score 0.12554112554112554 - nodes in this community are weakly interconnected._
- **Should `android-bridge.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09042553191489362 - nodes in this community are weakly interconnected._