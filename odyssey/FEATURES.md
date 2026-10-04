# ODYSSEY — FEATURE REGISTER (canonical status of record)

> **Purpose:** one scannable answer to *what is built, what is next, and what is blocked* — without
> reading code or digging through 126 KB of research.
>
> **This file owns STATUS.** `DEVELOPMENT_PLAN.md` owns **direction and reasoning**.
> `Market Research/MASTER_TODO_REVISED.md` owns **feature *specification*** — but note it is
> **git-ignored** (see Warning below), which is exactly why this file exists.
>
> **Rule:** every shipped feature updates its row here in the same commit that ships it. A feature
> that is not in this file is not tracked; a feature listed as `PLANNED` does not exist yet.

---

## ⚠️ WHY THIS FILE EXISTS

`Market Research/` is in `.gitignore`. The real feature backlog — `MASTER_TODO_REVISED.md`, **126 KB**
— is **not in version control**. On 2026-10-03 this was logged as risk R7 ("research is git-ignored,
so decisions can be lost"). That risk has now materialised: the source-of-truth feature list would
not survive losing this machine, and is invisible to anyone who clones the repo.

**Mitigation:** this register is git-tracked and self-contained. Feature IDs are stable and resolve
against the research corpus when it is available, but the register never *requires* it.

---

## NEXT UP

| # | ID | What | Why it is next |
|---|---|---|---|
| 1 | **P0-T2** | Refresh the knowledge graph | 5+ commits behind. Every impact analysis is currently guessing (R10). ~5 min. |
| 2 | **P0-T6** | Native bridge adapter layer | 34 methods, ~1000 lines, dual `window.OdysseyAndroid \|\| window.Android` checked inline at call sites. Highest god-node (D1, R3). |
| 3 | **P0-T3** | Category normalisation | Two divergent unions live side by side; every new category feature inherits it (D3). |

**First user-facing feature once P0 closes: `XL14` — interactive onboarding.** No `/onboarding`
route exists today; `/` is a marketing dial, not a first-run flow. Largest gap between the app and
its own research, and P1's highest-ROI item.

---

## STATUS LEGEND

| Status | Meaning |
|---|---|
| `SHIPPED` | Built, verified, committed |
| `IN PROGRESS` | Started, not committed |
| `READY` | Fully specified, not started — eligible to brief |
| `PLANNED` | Decided in principle, not specified |
| `BLOCKED` | Cannot start, waiting on something |
| `GATED` | Deliberately held back. Do not build without un-gating it |

---

## 1. SHIPPED

Verified by building, compiling, and (where possible) running it.

| ID | Feature | Phase | Notes |
|---|---|---|---|
| — | Planner: 24h inline blocks, NOW/NEXT, 3-state review | P0 | |
| — | Planner: infinite date strip, inbox drawer, distribution modal | P0 | |
| — | Day schedule: vertical timeline, inline creator, sleep auto-fill | P0 | |
| — | Habits: list/grid/heatmap, 10-col heatmap, modals, streaks | P0 | |
| — | Journey: scrollable day map, SVG bezier curves | P0 | |
| — | Stats: calendar heatmap, tap-for-24h-overview, hold-to-planner | P0 | |
| — | Shop: diamonds, streak-freeze, XP boost, daily chest | P0 | |
| — | Gamification: XP, levels, 9 ranks, streak, Temporary Wallet | P0 | |
| — | Data: Dexie `OdysseyDB`, 6 tables, UTC timestamps | P0 | |
| — | Native: Kotlin bridge, live wallpaper service, workers | P0 | |
| — | In-place APK updater via FileProvider + OTA manifest | P6 | v1.3.5 live |
| **P0-T1** | **Theme system** — light/dark/system, anti-FOUC | P0 | Also fixed D4 leak |
| **P0-T4** | **Reward-economy spec** | P0 | `docs/adr/0001` |
| **P0-T5** | **Test harness** — Vitest, 8 suites | P0 | Also closed D7 |
| **P0-T7** | **Dead code removal** | P0 | Also closed D8 |
| **P8-E1** | **Wallpaper master switch** — default-off, fail-closed | P8 | Native authoritative |
| **P8-E2** | **Static wallpaper** — 1 render/min, none if alternate set | P8 | Closed 2.1 |
| **P8-E3** | **Power-claim honesty** — comments match behaviour | P8 | |
| — | **Build tooling** — JDK 25 daemon unblock (R14) | P8 | `gradle.properties` |

## 2. IN PROGRESS

*(none — working tree is clean)*

## 3. READY — fully specified, eligible to brief

| ID | Feature | Phase | Why it matters |
|---|---|---|---|
| **XL14** | Interactive onboarding flow | P1 | Highest-ROI polish. No route exists. |
| **M1–M3, M6** | Local-first trust badge, empty states, welcome banner | P1 | Zero matches in code today |
| **M4–M5** | All-done celebration, creation-confirmation toast | P1 | Small, high delight |
| **HD13–HD15** | Pomodoro, soundscapes, breathing pacer | P2 | **There is no focus timer at all** |
| **HD21–HD24** | 52-week heatmap, deep-work accumulator, time-of-day graph, best/worst day | P2 | Analytics depth |
| **HD11–HD12** | Morning planning / evening shutdown rituals | P2 | Evening nudge exists; ritual does not |

## 4. PLANNED — decided, not specified

| ID | Feature | Phase |
|---|---|---|
| M7–M12 | Last-done, capacity indicator, completion fraction, up-next ticker, period colours, wallpaper gauge | P1 |
| HD17–HD19 | Flexible rollover, vacation/freeze, auto-archive | P2 |
| S4–S6, HD29–HD30 | Cue/why/identity fields, daily highlight, "frog" | P2 |
| XL1–XL4 | Avatar world, furniture sync, room themes, nudge engine | P3 |
| XL12–XL13 | Home-screen widgets, notification-shade HUD | P3 |
| AI-1–AI-23 | AI — Tier A/B are local deterministic math, no LLM | P4 |
| SC1–SC10 | Social + expansion | P5 |

## 5. BLOCKED

| ID | Item | Blocked on |
|---|---|---|
| **P0-T3** | Category normalisation | Two divergent unions in `db.ts` (line 44 vs line 59). Needs a written decision on the canonical set. |
| **D9** | Dual XP accounting — profile XP vs Temporary Wallet XP | **Must be specified before any P3 reward work.** Reward-inflation / double-claim risk. |

## 6. GATED — do not build

| ID | Feature | Gate |
|---|---|---|
| **XL5–XL7** | App blocker, task-unlock gate, hardcore damage | **Risk R1.** Needs an `AccessibilityService`. Google Play requires separate disclosure and policy review; approval **not guaranteed**, and a rejection can block release. Keep out of the first release. |
| — | Real-money cash-out / charity rewards | Exploratory only. Not approved. Needs funding + payment review. |
| — | Tier C LLM features | Needs gateway, server-side keys, credit meter, opt-in cloud context. |

---

## TECHNICAL DEBT

| ID | Debt | Status |
|---|---|---|
| D1 | `android-bridge.ts` ~1000 lines, 34 methods, dual-namespace inline checks | **OPEN** — highest god-node. P0-T6 addresses it |
| D2 | `useUserStore` 33 edges — profile + wallet + shop + rank in one store | **OPEN** — split in P3 |
| D3 | Category union drift, ~50 colour aliases | **OPEN** — P0-T3 |
| D4 | `theme-store` `matchMedia` listener leak | **CLOSED** (P0-T1) |
| D5 | Planner/journey/stats bypass Zustand, read `db` directly | **OPEN** — two data-access styles |
| D6 | Knowledge graph stale | **OPEN** — P0-T2 |
| D7 | No test suite | **CLOSED** — 8 suites (P0-T5) |
| D8 | `seedInitialData()` empty with 2 call sites | **CLOSED** (P0-T7) |
| D9 | Dual XP accounting | **OPEN — HIGH**, blocks P3 |

## ACTIVE RISKS

| ID | Risk | Severity |
|---|---|---|
| R1 | `AccessibilityService` Play policy | CRITICAL |
| R11 | Half-finished work left uncommitted | High |
| R12 | Unverified native code (no `gradlew` in repo) | High |
| R13 | Background battery burn | High — **mitigated by P8-E1/E2** |
| R14 | JDK drift breaks all Android builds | High — **fixed; recurs on Studio update** |

---

## MAINTENANCE

- **Update this file in the same commit as any shipped feature.** That is the whole contract.
- **Reconcile against code before trusting a row.** Section 1 was re-verified against source on
  2026-10-04. Sections 3–6 come from `DEVELOPMENT_PLAN.md` §3.2 and need the same treatment before
  they are briefed — do not trust them blindly.
- **Open decisions** belong in `docs/adr/`, not here. This file records status, not reasoning.

---
*End. If this disagrees with reality, reality is right — fix this file in the same PR.*