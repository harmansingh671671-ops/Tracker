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
| **Data** | Dexie `OdysseyDB`, **7 tables** (`version(2)` — `rewardSettlements` added by ADR 0002), compound indexes, UTC timestamps |
| **Native** | Kotlin bridge (34 methods), Live Wallpaper Service, hourly + boot workers, cadence notifications, in-place APK updater via FileProvider |
| **Theming** | `theme-store` / `theme-provider` / `theme-switcher`, anti-FOUC script, light/dark/system |
| **Tests** | Vitest + fake-indexeddb, **19 suites / 283 tests**, all green (exceeds the P0-T5 target of 5) |
| **Release** | v1.3.6, `versionCode` 11, live on Vercel with APK at `/downloads/odyssey-latest.apk` |

### 2.2 Technical debt register

| ID | Debt | Impact | Priority |
|---|---|---|---|
| **D1** | ~~`android-bridge.ts` ~1000 lines, 34 methods, 3 namespace aliases~~ Highest god-node (34 edges); any change risks 16 wallpaper controls | **CLOSED 2026-10-15** — one resolver already existed; the god-node half closed by `P0-T6`, split into `android-bridge/{core,schedule,wallpaper,notifications,app-update,index}` | ~~High~~ |
| ~~**D2**~~ | ~~`useUserStore` 33 edges — mixes profile, wallet, shop, rank~~ | **CLOSED 2026-10-15 without splitting.** One row, one concern: every member reads and writes the **same** `profiles` row, so splitting would make it *worse* (two sources of truth, wider race). The real gap — untested purchase rules — was fixed instead (`lib/utils/economy.ts`, 26 tests) · ~~High~~ |
| **D3** | Category union drift + ~50 colour aliases | Every new category feature inherits the mess | High |
| **D4** | `theme-store.initTheme()` added a `matchMedia` listener with no cleanup | Leak; multiplies if called more than once | **Fixed** |
| **D5** | **29 files** import `db` directly — 10 screens, every planner modal, the wallpaper page, several utils. The recorded "planner/journey/stats" understated it by ~10x | **DEFERRED to Phase 3.** Multi-day architectural change; `context.md` says "not to be fixed opportunistically". Do not half-do it | Medium |
| ~~**D6**~~ | ~~Knowledge graph stale — built from `efa7dc9a`~~ | **CLOSED 2026-10-15** by `P0-T2` — rebuilt from HEAD, 2164 nodes / 3164 edges / 208 communities | ~~Medium~~ |
| **D7** | No test suite | **Fixed** — **19 suites / 283 tests** now exist | ~~High~~ |
| **D8** | `seedInitialData()` empty function, 3 call sites | Dead code — **CLOSED** by P0-T7 (2026-10-15) | Low |
| **D9** | Dual XP accounting: profile XP vs Temporary Wallet XP | Double-claim risk — specified in `docs/adr/0001-reward-economy.md` | High |

---
## 3. PHASE 1 — Small things, polish, micro-interactions, stabilise

Everything here is small (30 min – 4 hrs each) and ships independently. Do these
first: cheap, de-risks later phases, and several are correctness bugs.

### 3.1 Stabilise tasks (carry-over from the old Phase 0)

- [x] **P0-T1** — Land in-flight theme work + fix `matchMedia` leak. `SHIPPED` · src: `DEVELOPMENT_PLAN.md §4 L272`
- [x] **P0-T2** — Refresh knowledge graph (`graphify update .`). `SHIPPED` — rebuilt from HEAD, not the stale 2026-10-04 snapshot: **2164 nodes / 3164 edges / 208 communities**. `graphify` **is** on PATH at `%APPDATA%\..\Python\Python311\Scripts\graphify.exe`, contradicting the 2026-10-07 session-log note that the CLI was unavailable — that note was wrong and is corrected. Two `build.gradle` files report syntax errors and extract no symbols; that is a Groovy-vs-AST-parser limitation, not a build defect · src: `DEVELOPMENT_PLAN.md §4 L273`
- [x] **P0-T3** — Category normalisation: promote `normalizeCategory()` to a shared util, narrow the union, document alias retirement. `SHIPPED` — **the escape hatch `Category | (string & {})` was load-bearing, and removing it exposed the real defect: three competing vocabularies.** (1) The schema declared 6 habit categories that **no screen ever offered**; the create/edit form offers **4 DOMAINS**; the colour lookup had a **third set of 7**. So every habit the app actually created carried a category the schema did not declare, and the union that "accepts any string" existed to hide exactly that. **Owner decision 2026-10-15: the form's 4 are canonical**, since they are the only values a user can pick. `Habit.category` is now a closed `HabitCategory` — a value outside the four is a **compile error**, and narrowing it immediately caught **8 real violations** at 8 sites (`app/page.tsx`, `habits/page.tsx`, both habit modals, `goal-tags`, `habit-template-library`, `wallpaper-generator`, 2 test fixtures). `DOMAINS` in both modals and `domainLabel` in the template library are now typed `HabitCategory`, so a rename breaks at the source instead of producing an unwriteable category. (2) **`normalizeCategory` was split in two**, because 'health' and 'sleep' exist in *both* vocabularies and the schedule list was consulted first — so a habit saved as `"sleep"` resolved to the schedule's `"Sleep"` and never reached a domain. `normalizeCategory` is now schedule-only (existing contract and tests unchanged) and `normalizeHabitCategory` handles habits. (3) **`LEGACY_HABIT_CATEGORY_MAP`** retires the old aliases in one place, and a `version(2).upgrade()` rewrites any existing rows — **no live write path ever produced one** (`create-habit-modal` writes `tpl.domainLabel`, not `tpl.category`, and the habit store never touches `category`), so it is a safety net, not a lossy conversion. 'Social' and 'Growth' have no fourth-domain equivalent and are mapped to the nearest rather than dropped. (4) **The colour map went from 70 keys to 4.** `getHabitColor` compared `key.toLowerCase() === category.toLowerCase()`, so **26 of the 70 keys could never match** — every lowercase duplicate sat behind a Title Case twin. The seven keyword-heuristic branches are gone; `normalizeHabitCategory` already owned that vocabulary. **All four domain colours are unchanged**, asserted as literal hexes, so no habit is repainted · also: `CONS-1` · src: `src/lib/db.ts`, `src/lib/categories.test.ts`, `src/lib/utils/habit-colors.test.ts`
- [x] **P0-T4** — Specify reward economy (closes D9). `SHIPPED` · src: `docs/adr/0001-reward-economy.md`
- [x] **P0-T5** — First tests. `SHIPPED` — **19 suites / 283 tests** (this line read "8 suites"; it was never updated after the P8 and M-series work) · src: `DEVELOPMENT_PLAN.md §4 L276`
- [x] **P0-T6** — Native bridge adapter pattern (closes D1). `SHIPPED` — the `nativeBridge()` adapter landed earlier; this closes the **god-node** half. **One 855-line module became six, split by concern:** `core` (the only module permitted to touch `window.*`), `schedule` (IndexedDB → payload, push, verify), `wallpaper` (applying/storing lock and home images), `notifications` (the XX:57 cadence), `app-update` (the only part that touches the network or mutates the installed app), and an `index` barrel. **`index` re-exports everything, so every existing import path is unchanged — not one of the 8 consumers was edited**, which is the point of keeping the surface flat: a refactor needing 8 files changed in step is a refactor that can be half-applied. Export sets diffed mechanically: **41 → 43, nothing lost**; the two additions are `errText` and `trueStreak`, previously module-private and now shared. `BRIDGE_OWNER` moved from the file to `android-bridge/core.ts`, so the lint exemption follows the code rather than a path that no longer exists. **The split exposed that `odyssey/bridge-boundary` had been half-dead since it was written:** its selector required `object.object.name='window'`, which matches only the **two-level** form `window.OdysseyAndroid?.syncSchedule(x)`, while the common form `window.OdysseyAndroid` is **one level** and passed silently. Proven by probe (one-level exited 0, two-level errored), fixed to match both, and the fixed rule immediately caught **2 real violations in `wallpaper-toggle-store.ts`** that had been shipping the whole time. **Rerouting those two exposed a battery bug I was about to introduce:** `callNativeBool` collapses "the bridge said no" and "the bridge could not be reached" into one `false`, after which the existing `enabled: !enabled` flip would **switch the wallpaper back ON** for a user who had just switched it off, because the bridge threw. Now the unreachable case settles **off in both directions** and is covered by two tests, one of which is a control that the same call still succeeds against a working bridge. Two of my own tests were wrong first: one asserted a refusal the mock cannot simulate, one set up the stored flag without the native one and so failed for its own reasons · also: `BUG-5` · src: `src/lib/utils/android-bridge/`, `eslint.config.mjs`
- [x] **P0-T7** — Remove dead code `seedInitialData()` (D8). `SHIPPED` — the function's body was **two comments and nothing else**, and it was `await`ed from **3** call sites (`user.ts` x2, `seed.ts` x1). All five references gone; `resetAllDataToZero()` — which does real work — is untouched. `FEATURES.md` had recorded D8 `CLOSED` while this line said `NOT BUILT`; the two now agree. Closes **D8** · src: `DEVELOPMENT_PLAN.md §4 L278`
- [x] **DEBT** — D2 split `useUserStore`; D5 unify data access; D6 refresh graph. `SHIPPED` as a decision, not as a refactor. **D6 closed by `P0-T2`** (graph rebuilt: 2164 nodes / 3164 edges). **D2 closed WITHOUT splitting — the split would have made the code worse.** Reading the store first changed the recommendation: every member operates on the **same single `profiles` row**. `buyItem` reads `diamonds`, `equippedItems` and `streakFreezeCount`, then writes `diamonds`, `equippedItems`, `streakFreeze*`, `xp` and `level`; `addXp` reads and writes `xp`/`level`; `resetToZero` rewrites the whole row. Splitting "profile / wallet / shop" would therefore create **two sources of truth for one row** and turn a same-store read-modify-write into a cross-store one with a **wider race window** — on a store with exactly one concern. The "33 edges" that motivated D2 are just "many screens read the profile", which is not god-node-ness; D1 deserved splitting because it mixed five unrelated concerns and this mixes none. **The effort went to the real gap instead:** `buyItem`'s rules had **zero tests** — the insufficient-funds, streak-freeze and instant-XP branches only ever ran during a real purchase — so they are now pure functions in `src/lib/utils/economy.ts` with **26 tests**, and the level curve is a named constant (`XP_PER_LEVEL`) per ADR 0001 §7 rather than `Math.floor(xp / 500) + 1` written out in 5 places. **Extracting the rules surfaced a live economy bug:** `buyItem` is called with the item **`id`**, and the 2x XP Chrono Boost's id is `"xp-boost"` — which the original `includes("xp")` test matched, so **every boost purchase also silently paid out 100 instant XP**. Verified in-browser (600 XP went to 700 on a boost), then fixed by matching `instant` before any bare `xp` and giving the boost its own explicit branch, with a test per real shop id so a rename fails loudly. **D5 is DEFERRED, and the recorded scope was wrong:** it claims "planner/journey/stats bypass the store", but **29 files** import `db` directly — 10 screens, every planner modal, the wallpaper page and several utilities. "Unify data access" at that size is a multi-day architectural change, not a Phase 1 stabilise task, and `context.md` already says "not to be fixed opportunistically". Left for Phase 3 with the measured number attached · src: `src/lib/utils/economy.ts`, `src/lib/utils/economy.test.ts`, `DEVELOPMENT_PLAN.md §3.3 L217`

### 3.2 Known defects found by audit

Three of the defects catalogued here proved to be **wallpaper** defects and were moved to
Phase 5 §7.2, which is where wallpaper correctness is collected: `BUG-1`, `BUG-2`, and
**`BUG-7`** (moved 2026-10-16 on owner instruction — it is native master-switch behaviour
whose fix is written but uncompiled, so it belongs with the phase that already holds the
unverified native work rather than sitting in a phase whose gate it cannot help close).

- [x] **BUG-3** — `initTheme()` `matchMedia` listener without cleanup. `SHIPPED` · src: `DEVELOPMENT_PLAN.md §3.3 L224`
- [x] **BUG-4** — Mojibake in shipped user-facing text. `SHIPPED` — **found 2026-10-15 while reading `android-bridge.ts` for P0-T6, not on the plan.** **5 sequences across 2 files**, all the signature of the documented PowerShell `Set-Content` incident (`context.md` §7), and all in text the user sees: the **notification title** rendered `Odyssey â€¢ XX:57 Heads-Up` instead of `•`, the **habits date strip** rendered `Completed âœ“` instead of `✓`, and the two **fallback habit icons** sent to the wallpaper were `ðŸ§˜`/`ðŸ'§` instead of 🧘/💧. They shipped because **no test asserted on any of those strings**, so the only detection path was a human reading them. Repaired by explicit codepoint replacement with a UTF-8 no-BOM write, then **guarded**: `src/lib/utils/encoding.test.ts` walks every `.ts`/`.tsx`/`.css` under `src/` on every suite and fails on any mojibake marker or BOM. The guard **caught itself twice** while being written — its own explanatory comments contained the bad bytes — which is the cheapest available proof that it can actually fail, the same lesson as the old `#__next` probe. `Market Research/` and the Kotlin sources are not yet covered and are the obvious next place to extend it · src: `context.md` §7, `src/lib/utils/encoding.test.ts`
- [x] **BUG-5** — A streak of 0 was reported to the user as 1. `SHIPPED` — **found 2026-10-15 while reading `android-bridge.ts` for P0-T6, not on the plan, and the same class M13 fixed on the web side.** `currentStreak || 1` turned every genuine zero into 1, and the native wallpaper renders that number inside an **amber achievement pill** — so a habit with no streak at all arrived on the lock screen wearing a trophy, while the app said *"No streak yet"* on screen. **The idiom had been left live in 9 places across 3 files**, including **user-visible text**: `/journey`'s header rendered *"{streak}1d Streak"* next to a flame in amber, the wallpaper header fell back to `data.activeDay` (the **journey day**, not a streak) next to the label *"DAYS STREAK"*, and the two placeholder habits shown to a user with **no habits at all** inherited the user's real streak. Every one now sends the **true** value through `trueStreak()`, which coerces anything non-positive or non-finite to 0 and floors fractions. **The Journey header now reuses `getStreakLabel`/`isStreakActive` from M13** rather than a fourth streak idiom, so a zero streak reads *"No streak yet"* in the muted colour. **`buildNativeSchedulePayload` had zero tests**, which is why this survived — `tsc`, lint and 283 tests were all green. Now 14 tests, including the case that would reintroduce it. **Deliberately NOT done:** (a) the Kotlin side reads `optInt("currentStreak", 1)`, so an absent key still becomes 1 — fixing it needs a native change, and **this machine cannot compile Kotlin** (no `gradlew`, JBR 25 cannot start the 1.9.22 daemon), so it stays recorded and unverified rather than shipped blind (R12); (b) hiding the amber pill entirely at 0 needs canvas **and** native layout work, since both derive the card's text width from the pill's position · also: `B15` · src: `src/lib/utils/android-bridge.test.ts`, `src/lib/utils/warm-copy.ts`
- [ ] **BUG-6** — `getOrCreateUser()` returns `users[0]` from an unordered `toArray()`. `NOT BUILT` — **found 2026-10-15 as a by-product of BUG-5's browser verification, NOT confirmed as a product defect.** A test profile left in the database alongside the app's own caused the page to render a *different* profile's streak than the one seeded. With more than one row, the app picks by **primary-key order**, which has nothing to do with which profile is current — so the wrong streak, XP, diamonds and rank could all be shown. **Mechanism is a hypothesis, not a finding:** two concurrent `getOrCreateUser()` calls can each observe zero rows and each insert, and `resetAllDataToZero()` creates a fresh id. Needs a control run to confirm before anything is built — a single-profile invariant is a schema-level decision and needs an ADR, not a patch · src: `src/lib/user.ts:10`
- [x] **BUG-8** — The category picker opened *behind* the hour rows below it. `SHIPPED` — **reported 2026-10-16 from a screenshot**, and **one root cause produced two separate symptoms that looked unrelated.** Every hour card carries `backdrop-blur-xl`, and `backdrop-filter` makes an element **both a stacking context and a containing block for fixed-position descendants**. So (a) the dropdown's own `z-50` resolved only *inside its own card* and could never lift it past the next card — measured before the fix, the topmost element over the middle of an open dropdown was the **08:00 card**, not the dropdown; and (b) the `fixed inset-0` "tap outside to close" scrim **collapsed onto the tapped card's own box** instead of the viewport — measured **725x62px, the card, inside a 762x484 viewport** — so it dimmed the row you tapped and nothing else. **Neither was fixable by raising the dropdown.** The fix is two lines of structure: the card that owns an open picker is raised (`stackClass`, `z-50`, and it deliberately **outranks** the "current hour"/"saved" highlight — the thing you just opened must never be the thing hidden), and the scrim moved out of the cards to the list wrapper, which has no `backdrop-filter`, so `fixed inset-0` covers the screen again. Re-measured after: the topmost element over the dropdown **is** the dropdown, and the scrim is **viewport-sized**. A third, related latent bug was left alone as out of scope: **the picker still opens downward on the last hours**, so near midnight it runs off the bottom of the screen · src: `src/app/day-schedule/page.tsx`
- [x] **BUG-9** — Planner cold load hydration mismatch crash. `SHIPPED` — **reported 2026-10-16 from error overlay screenshot (`src/app/planner/page.tsx:1052`)**. `blocks` was seeded from synchronous local cache (`getCachedBlocks`) inside `useState`, while `getCachedBlocks` returned `[]` on the server (`typeof window === 'undefined'`). During Next.js SSR / static generation, the daily allocation bar rendered empty `<div />`, while on client hydration it rendered populated hour slices `<div style={{left: "0%"...}} />`, causing React 19's Recoverable Hydration Error. Resolved by extracting client-only view to `src/components/planner/planner-content.tsx` and dynamically importing it in `src/app/planner/page.tsx` with `dynamic(..., { ssr: false })`. Follows PERF-5 webview guideline and preserves instant Frame-0 local cache rendering with 0 hydration errors. Also extracted `TimelineHourSlot` (`src/components/planner/timeline-hour-slot.tsx`) to eliminate the ~280-line inline `renderHourSlot` function anti-pattern and extracted pure styling engine (`src/lib/utils/planner-category-style.ts`), shrinking `planner-content.tsx` · src: `src/app/planner/page.tsx`, `src/components/planner/planner-content.tsx`, `src/components/planner/timeline-hour-slot.tsx`, `src/lib/utils/planner-category-style.ts`
- **BUG-1, BUG-2, BUG-7** → **Phase 5** (`§7.2 Wallpaper correctness`), where all three now live. BUG-2 is also tracked there as `G12`.

### 3.3 Micro polish — Tier 1 (30 min – 2 hrs each)

src for all: `MASTER_TODO_REVISED.md §19 L959–977`

- [x] **M1** — Local-data trust badge. `BUILT` — copy is owner-set: *"Your data will not leave your device without your consent."* (supersedes both research drafts); `LocalDataTrustBadge` renders on **Profile** and inside Settings' **Local Vault** card. **Onboarding surface not built — there is no `/onboarding` route, see `A1`** · also: `A8`
- [x] **M2** — Habits page empty state. `BUILT` — `HabitsEmptyState` component: keystone-block illustration drawn with CSS-var tokens (re-themes light/dark), pulsing (+) ring on a new `keystonePulse` keyframe gated on `prefers-reduced-motion` in `globals.css`, copy "Your journey begins with one keystone habit" + "Pick the one habit that holds the rest up", CTA "Add your keystone habit" opens the existing create modal. Also removed a **false zero** on this screen: the day readout printed `0/0 (0%)` with no habits at all, which is the same confident-false-zero class the M9 header placeholder exists to prevent — it now reads "Nothing scheduled yet" · also: `A8`
- [x] **M3** — Planner empty state "clean slate". `BUILT` — `PlannerEmptyState` sits above the rail and points at the gesture that already works (tap any hour), so it adds no new button and no new path. Illustration is the planner's own rail spine with one highlighted hour, drawn with CSS-var tokens and animated by `slateSweep` + `slateTapPulse`, both gated on `prefers-reduced-motion` in `globals.css` the way `keystonePulse` is. **Spec copy changed with owner approval:** the researched line *"Tap + or import a routine template"* promised two things that do not exist — there is no + button and no template import (`B1`/`HD29`, still Phase 2) — so it now reads *"Tap any empty hour to schedule your first block."* A day in the past that was left blank was not a choice, so it gets different copy (*"Nothing was scheduled on this day"*) rather than being called a clean slate. Visibility is gated on a new `blocksLoading` flag, because the planner reads `db` directly (D5) and `blocks` is `[]` on first paint for **every** day — without it, a full day would flash "clean slate" before the read resolved · also: `A8`
- [x] **M4** — All-habits-done celebration card (+50 XP). `BUILT` — `PerfectDayCard` **is mounted**, on the **Habits** screen above the vault banner; this line previously read "no page mounts the component yet", which stopped being true in the very commit that built it. The reward work was the larger half: the vault is now the **only** route for habit rewards, so the double-count closed. Ticking a habit no longer credits the profile directly — it accrues, and the whole vault pays in at the day boundary and empties. The claim record moved out of `localStorage` into a new `rewardSettlements` table (defects 7.1/7.2, ADR 0002), so clearing site data can no longer make the app re-pay the same days, and the streak no longer jumps by the number of days skipped (defects 7.4/7.5, ADR 0001 §5). Rates are named constants per ADR 0001 §7 · also: `FD1`, `F3`, `B15`
- [x] **M5** — Creation confirmation toast naming first milestone. `BUILT` — habit creation toast reads *"Your journey with {Habit Name} begins now. First milestone: 3-day streak."* · also: `B15`
- [x] **M6** — First-open welcome banner (3 pillars). `BUILT`, then **relocated into the onboarding flow** when **A1** shipped (§10 C11) — the three pillars and the **M1** trust badge are now step 2 of `/`, not a card on the Habits tab. `WelcomeCard` and its `shouldShowWelcomeCard` visibility rule were **deleted** rather than left in two places: a dismissible banner makes no sense inside a guided flow, and its copy described itself in terms of a screen it no longer lived on. The rule it was built for survives as `lib/utils/onboarding-flow.ts`: any state that asserts "this is empty" must check loading first, because a store that loads starts empty for *every* user. Zero-habit users on `/habits` fall back to the **M2** keystone empty state. Wallpaper copy stays hedged — "if you want it there" — because P8-E1 made the wallpaper default-OFF · also: `A8`
- [x] **M7** — "Last done: Today at 8:15 AM" subtitle. `BUILT` — a line under the habit name on every **list** card, reading *"Last done: Today at 8:15 AM"* / *"Yesterday"* / *"N days ago"*, collapsing to *"Last week"* at 7–13 days and *"N weeks ago"* beyond. A habit **never** completed renders **no line at all** — `formatLastDone` returns `null` rather than printing "never", because the honest answer there is that we do not know. **The timestamp cannot come from the store:** when `todayLogs` is rebuilt from `historyLogs` after a date rollover it fabricates `loggedAt` as *now*, so a clock time read from it would say "Today at 2:04 AM" for something completed at 8:15. `lastCompletedAt` is instead folded out of `allUserLogs` in `fetchHabits` — the row set already in hand, so **no extra query** — and is user-scoped and date-independent, so the date-change early-returns deliberately leave it alone. **Anchored to today, not the selected date:** it describes the habit, so browsing to a past date still answers "when did I last do this" truthfully. 12-hour clock per the spec, though the schedule UI is 24-hour. Pure fn + 13 tests in `lib/utils/last-done.ts`, covering UTC-vs-local classification of an evening completion, month and **leap-day** boundaries, and clock-skew (a future timestamp yields no line rather than "yesterday"). Grid and heatmap cells excluded — too small for a sentence · also: `B15`
- [x] **M8** — Daily capacity indicator. `BUILT` — a badge in the planner header reading **"Light Day · N habits"** / **"Balanced · N habits"** / **"Heavy Day · …"**. Implemented as **a third `HeaderSlot`**, which is the extension point M9 was built with: no other part of `CompletionFractionHeader` changed. Keyed on the **level** rather than the label, so it cross-fades when a day's load changes category and stays put while a habit is merely ticked. **Thresholds are named constants** (`CAPACITY_LIGHT_MAX_HABITS` 3, `CAPACITY_HEAVY_MIN_HABITS` 8, `CAPACITY_HEAVY_MIN_HOURS` 6) because §22.3 calls them *"starting hypotheses, not validated limits"*. **Both signals are used, not just the count** — §21 L811 is explicit that a warning must compare planned hours to the available window, and eight 5-minute habits is not a heavy day. The planner's existing `categoryStats.plannedTotal` is passed in rather than recomputed, so the badge and the balance bar cannot disagree about the same day. **A rest day renders no badge at all** (`null`, not "Light Day · 0 habits") and it is suppressed while the habit store loads, since `habits` is empty before the read resolves. **Read-only by construction:** nothing in the returned shape can block, hide, or refuse — the heavy state says *"Consider doing less"*, and `MASTER_TODO_REVISED.md` I2 requires "never block". Level is always in words, never colour alone. 19 tests covering the §19/§21 gap (6–7 habits by count are Balanced), hours-only heaviness, and the exact returned keys as an anti-action guarantee · **BADGE REMOVED 2026-10-16 on owner instruction** (screenshot: *"Remove the heavy tag"*). It was the only slot stating a **judgement** about the day rather than a fact about it, and it contradicted the fraction beside it: a fully-planned day read **"Heavy Day · 24h planned"** while the completion bar next to it read **full**. `getDayCapacity()` and its **19 tests are KEPT** in `lib/utils/day-capacity.ts` — the rules are sound and tested, only the readout was unwanted; restoring it is one object appended to the header's slots array, which is what that array exists for. `plannedHours` is off the header's props again · also: `C5`
- [x] **M9** — Completion fraction header. `BUILT` — `CompletionFractionHeader` sits above the date strip (in-flow, not pinned); animated, built from swappable slots so further readouts can be added later; arithmetic lives in `lib/utils/habit-progress.ts` (unit-tested, no NaN on empty days). Slot keys are namespaced by slot id (`getHeaderSlotKeys`, regression-tested) — bare keys made the icon and label both `"rest"` on an empty day and threw React's duplicate-key error · also: `C4`
- **M10** — Wallpaper completion gauge → **Phase 5** (`§7.5`). `PARTIAL` — `G2` already ships the fraction; the gauge render on the wallpaper does not exist · also: `G2`
- [x] **M11** — Time-period colour accents. `BUILT` — a small chip beside each habit's name reading **Morning** / **Afternoon** / **Evening**, tinted amber / blue / purple. **This is the field's first reader.** `Habit.period` was in the schema from the start and written by the create form ever since, but nothing in the app ever displayed it — dead data on every habit. **The spec's four hex values are deliberately not used.** They were picked without reference to this app's surfaces, and a raw hex in a component is banned outright by `DEVELOPMENT_PLAN.md` §5.4; the hues are kept and the values are tuned **per theme** so text still clears 4.5:1 (`--period-morning` is `#B45309` light / `#FBBF24` dark). **The word is rendered, not just the colour** — accessibility rule 5.3 #3, so a user who cannot tell amber from purple still reads the period; colour reinforces and never carries the meaning alone. **There is no Night.** The schema union is three members and the create flow offers no night option, so a night token would be selectable by nothing; the spec's fourth period is recorded as an open gap instead of being invented. An unknown stored value (`"night"`, written by an older build) renders no chip rather than an undefined class. 11 tests · also: `C1`
- [x] **M12** — "Up next in 35 min" ticker. **`RETRACTED` on owner instruction 2026-10-16 — the line is GONE from the planner header, and it was not a styling tweak.** Owner instruction from a screenshot of the "Now · <title> (1h)" line. **Deleted with it:** `lib/utils/up-next.ts` and its **26 tests**, because the planner was the module's **only** consumer — leaving it would have left unreachable code whose green test run reads as coverage while proving nothing. **One more thing died with it that is easy to miss:** `nowMinutes` had no reader left, so the planner's **15s interval was writing state every tick that nothing read.** That write is deleted; the interval **stays** because its other two writes (`currentHour`, `todayStr`) are still read by the rail's past/current/future-hour logic. This is one of the items `PERF-4` counts when it says the planner ticks every 15 s. **Retracted, not completed** — the behaviour described below was correct when built and is simply gone now: a line under the planner header reading **"Up next in 35 min · Deep Work Session (2h)"**, with a running block reading **"Now"** rather than "in -15 min"; nothing at all once the day's blocks were behind us; today only; skipping `completed`/`missed` blocks; the gap rounding **up** so a block 20 seconds away reads "1 min" not a false "0 min"; and midnight handled so a 22:00→01:00 block is 3 hours, not minus twenty-one. **Reinstating it means reinstating `up-next.ts`, not writing a countdown inline** — those four edge cases were the whole reason it was a tested module · also: `C4`
- [x] **M13** — Warm microcopy across toasts/counters. `BUILT` — **XP toasts** and **streak counters**, with the copy living in a tested module (`warm-copy.ts`) rather than inline in JSX. **Two rules shaped every string, both from the failure this repo keeps auditing for — a confident line that is not true.** *Warmth never outruns the event:* completing a habit that was **not scheduled today** now says *"Not scheduled today, done anyway"* rather than *"Rest-day completion registered!"*, which read like a scheduled routine had been ticked off; and undoing a completion is not an achievement, so *"Completion undone."* carries no XP and no praise. **"Pending" survives** — an earlier pass at warm copy turned these into "XP earned", a nicer sentence about money the user does not have until the day's rewards settle. **The streak counter's real finding is a false number:** it rendered `{h.currentStreak || 1}d`, printing **`1d` on a habit with no streak at all**, on the habit card, next to a completion count — while `edit-habit-modal.tsx` and `wallpaper-preview.tsx` already read the same value honestly with `|| 0`, so both idioms were live in one codebase and the warm one was the liar. A real zero now reads **"No streak yet"** and drops out of the achievement amber into the muted colour, since a zero streak is not a failure state. **The empty states were audited and deliberately left alone** — the Habits keystone, the Planner clean slate, the template library and the vault all already read like a person wrote them. Rewriting warm copy to show motion would be the same instinct that produces generic copy in the first place, so that is recorded as a finding, not a gap. 18 tests · also: `B15`
- [x] **M14** — Unique rank level-up dialogs (9 ranks). `BUILT` — a dialog carrying the newly earned rank's badge, division, milestone line and **a unique piece of lore**, shown once per promotion and mounted in the header so it appears wherever the user happens to be when the streak moves. **Lore is keyed by rank name, not index**, so reordering the ladder cannot silently attach the wrong story to a rank. **The hard part of this feature is refusing to fire.** `getRankUpCelebration` returns `null` — not a degraded object — for a first launch (nothing was earned by opening the app), for the same rank (a refresh must not re-congratulate), and for a **demotion**: losing days moves a user down the ladder, and dressing that up as *"you reached Master!"* would be the worst lie available in this app. Only a move to a **higher** index counts. The previous rank is remembered in `localStorage` because the rank is derived inside a store the component never sees; a demotion updates that stored value **silently**, so a broken streak cannot leave a stale high-water mark that fires a false promotion days later. **The Legend lore deliberately honours the missed days** — *"Not one perfect year — a real one, with the missed days included"* — because the app counts real adherence and a perfectionist claim there would be false for nearly every user who gets there. **A test caught a real version of this bug**: `getRankLore` resolved names through `getRankInfo`, which silently falls back to Beginner, so `" legend "` and any unknown rank were handed **the Beginner's story**. It now resolves against the ladder directly and returns `null` rather than the wrong line. 16 tests · also: `F1`
- [ ] **M15** — Achievement unlock micro-narratives. `NOT BUILT`
- [x] **M16** — Onboarding goal category tags. `BUILT` — the five labels from `MASTER_TODO_REVISED.md` L988/L902, verbatim: **Academic Excellence, Peak Health, Deep Focus, Mindfulness, Digital Detox**, as tappable chips on the onboarding habits step. **A tag that changes nothing is just a label**, so each chip carries a suggested habit (name, icon, category) and opens the add-habit form already filled in. **Supplying `defaults` also opens the modal's custom view**, because the name/icon/domain fields only exist there — a pre-filled form hidden behind the template grid is a tag that appears to do nothing, which the browser run caught: the first attempt reported `prefilled name: ""` twice, once from `useState` initialising while the modal was closed and once from the form not being on screen at all. **The categories are the modal's four real `DOMAINS`**, asserted as a literal so a rename breaks the test rather than the feature; two tags share `Mindful Focus` because four domains cannot cover five tags distinctly, and that collision is recorded rather than papered over. **Two lists in the source disagree** — `A1` L199 describes the goal question as Focus/Health/Sleep/Balance/Digital Detox/Custom, while M16 names five different labels. M16's five are implemented verbatim and **A1's wording is recorded, not silently unioned in**: quietly blending two conflicting lists is how a spec stops meaning anything. Blurbs carry the meaning so the chips are not five labels left to interpret, and a test asserts M16's list has *not* absorbed A1's · also: `A1`, `XL14`
- [ ] **M17** — AI processing orbital loader. `NOT BUILT` · also: `A6`
- [ ] **M18** — Tip jar / coffee button. `NOT BUILT` · → **Phase 3** · also: `F11`
- [x] **M19** — Daily Allocation bar reads as a timeline, not five buckets. `SHIPPED` — owner instruction from a screenshot: *"make it like the 1st hour on the left then 2nd hour to its right, and make sure it covers the semicircle on both ends."* **The old bar could not be read as a day.** It was five flex children sized as a share of 24 — all Focus, then all Vitality, then Sync, Renewal, Rest — so a day running Sleep → Vitality → Sleep → Work → Sleep rendered as one indigo block beside one violet block **with the order of the day thrown away**. It is now **24 one-hour slices, left to right = 00:00 → 23:00**, each coloured by that hour's own category, so adjacent same-category hours merge into one band (which is what the shape of a day looks like) and the strip reads as the day. **Both screens changed together** (`day-schedule` and `planner`) — they carry deliberate duplicates of each other, and changing one would have left the same day looking different on two screens. **The old layout was also quietly wrong:** a flex row of 24 children whose widths already summed to 100% **plus a 2px `gap` between each** over-constrained the row, so flexbox silently shrank all 24 to make room — the 23 gaps ate ~15% of every slice. Slices are now absolutely positioned (slice *h* starts at *h*/24, is exactly 1/24 wide), which tiles the capsule with no seam. **The rounded ends are covered because slice 0 starts at 0% and slice 23 ends at 100%** inside the `rounded-full overflow-hidden` track — measured in-browser at a 328px track: first-slice left offset **0.00px**, last-slice right offset **0.01px**. Geometry and category colours live in `lib/utils/allocation-bar.ts` (**11 tests**) because the two pages' `getCatStyle` maps differ (the planner's has no `dotClass`), and reusing them would have meant a third and fourth spelling of the same five colours. **The "is this hour planned" predicate is now named** (`isPlannedHour`) and shared by the bar and the legend on each screen, per M8's lesson that a bar and its own caption must not be two derivations of the same fact — the two screens still count differently **on purpose** (Day Schedule accepts a typed title, Planner reads only saved blocks) and that difference is now stated in a comment rather than left to be discovered · src: `src/lib/utils/allocation-bar.ts`, `src/app/day-schedule/page.tsx`, `src/app/planner/page.tsx`
- [x] **M20** — Remove the redundant per-row status chips. `SHIPPED` — three owner instructions from screenshots in one pass: *"remove the saved icon"*, *"Remove the live thing from the quick schedule page"*, and M8's capacity badge above. **Three chips removed across both schedule screens: the `SAVED` flash, the `LIVE` pill (which existed in two variants on the Planner), and the header's `Heavy Day · 24h planned` tag.** They were each a *third* signal for something the row already said — the ring-and-glow highlight marks the current hour, the violet clock and its pulsing halo mark it again, and the flash marks a save that the row's own glow already marks. **The failure mode is the same one this repo keeps auditing: a confident line that adds nothing.** None of it was decorative either — `SAVED` and `LIVE` were `animate-pulse` / `animate-ping`, i.e. three permanently animating elements on a 24-row list, which is real battery and motion cost for a redundant label. **Removed as pairs, not singly**, so neither screen is left with one orphan chip: the Planner had **two** separate row variants (a regular hour and a minimised sleep group), each carrying its own `LIVE`, and the group variant had a `LIVE` with no `SAVED` at all — removing one and not the other would have left the screens disagreeing. The time column keeps its two lines and simply centres them. `getDayCapacity()` and its 19 tests are **kept** — only the readout went, not the rules · src: `src/app/planner/page.tsx`, `src/app/day-schedule/page.tsx`, `src/components/planner/completion-fraction-header.tsx` · also: `M8`
- [x] **M21** — The XP bar read backwards: the empty part was the loudest thing on it. `SHIPPED` — owner instruction from a screenshot of the Journey header: *"Make the horizontal bar cover the white area width wise, the colors distribution in horizontal bar are opposite to what should be their."* **Two token choices, both producing the same illusion: progress was the invisible part of its own bar.** The track was `surface-container-lowest`, which is **`#FFFFFF` in light mode** — a pure-white bar punched across a `#F5F0F8` lavender card, so the XP you had *not* earned was the highest-contrast element on screen. And the fill was `from-primary to-primary-container`, i.e. **`#6C00FF` fading to `#EBDDFF`** — a hair away from that same white track — so at 70% the earned 70% dissolved into the empty 30% it was supposed to be measured against. **Measured, not eyeballed:** the old track computes to `rgb(255,255,255)` and the old fill to a `linear-gradient`; after, the track is `rgb(238,232,243)` and the fill **solid** `rgb(108,0,255)`. Fill is now one solid `primary` and the track is the recessive `surface-container-high`, so **the only saturated thing on the bar is what has actually been earned**. The track's `p-0.5` also went: it inset the fill 2px and left a sliver of track colour between the fill and the track's own edge. **Both identical bars fixed together** — the settings sheet's XP bar was byte-for-byte the same markup with the same fade-to-nothing, and fixing one while leaving its twin would have been a fresh inconsistency. **Deliberately NOT changed:** the Profile page's bar, which fades `primary → secondary` (`#6C00FF → #7751A6`) — two *saturated* violets, a deliberate two-brand-colour gradient that does not dissolve into its track, so it is a different design and not this bug · src: `src/app/journey/page.tsx`, `src/components/layout/profile-settings-sheet.tsx`

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
- [x] **S14** — Tap-and-hold commitment ritual. `SHIPPED` — **this line read `NOT BUILT` while the ritual had been live since `A1`; corrected 2026-10-16.** The Day 1 Protocol at the end of `/` is the Fabulous-style circular hold-to-commit: a 112px round button, press-and-hold, and a circle that spreads from it until it covers the screen. `SPREAD_HOLD_MS` 2500 + `SPREAD_SETTLE_MS` 1000, driven by wall-clock elapsed time through a rAF loop rather than a frame count, so a dropped frame or a backgrounded tab cannot shorten the commitment. Releasing early cancels and shrinks back. Keyboard parity is Space/Enter. Reduced motion commits immediately rather than animating. **Origin bug fixed 2026-10-16 (owner instruction):** the circle was pinned to `50% 50%` — the viewport centre — while the button sits 103px (360×780) to 180px (430×932) **above** it, so the spread began up to 180px from the finger pressing it while the code comments claimed it "starts exactly on the button". It now measures the button's real centre and centres on that, **0.00px offset verified at 360/390/430 in both themes**. Coverage is computed from that origin (`coverRadiusFromPx`), because a half-diagonal is only correct from the centre — from an off-centre origin it left the bottom corners bare. **Also added:** an animated rim — a radial-gradient band riding the exact clip boundary, breathing 0.55↔1 opacity on a 1.5s cycle, gated on `prefers-reduced-motion` in `globals.css`. Purely visual; it cannot affect when the hold completes · src: `src/components/onboarding/step-protocol.tsx`, `src/lib/utils/onboarding-flow.ts` · also: `A5`, `A1`
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

- [x] **CONS-1** — Habit colour + period must match across card, date strip, planner and wallpaper. `SHIPPED` for the Phase 1 scope (card / strip / planner); **the wallpaper half stays in Phase 5** as `BUG-1`. **The recorded claim — "colour mapping still defined 4×" — was stale: `P0-T3` left exactly ONE map**, and all six colour-bearing surfaces (`habits/page`, `edit-habit-modal`, `habit-date-strip`, `habit-heatmap`, `habit-github-heatmap`, `habit-month-calendar`, plus the planner's `infinite-date-strip`) already call the same `getHabitColor` and pass it through `style={{ color: habitColor }}`. Verified by grep that **no surface holds a raw hex or a second map**. **The real remaining defect was in the LABELS, not the colours:** three sites each invented their own fallback — `"Routine"` twice and `"General"` once — and **neither is a canonical domain**; they are retired vocabulary. Because they are strings rather than typed values they did not fail to compile, so the app could display a category that exists nowhere in the schema. Worse, **the same missing category produced two different colours on two screens**: `"General"` was in the legacy map (painted Craft & Skill blue) while `"Routine"` was not (fell through to the name hash). Replaced by one shared `habitCategoryLabel()`, which **also normalises**, so label and colour cannot disagree — an un-migrated row holding `"health"` would otherwise be labelled `health` while painted emerald. An uncategorised habit now reads **"Uncategorised"** rather than being given a category name it does not have, and a user's own unrecognised label is preserved verbatim. `"routine"` added to `LEGACY_HABIT_CATEGORY_MAP` so a legacy row of that name resolves to a real domain. **Period accents were already consistent** — `getTimePeriodAccent` has a single consumer and no competing fallback · also: `P0-T3` · src: `src/lib/utils/habit-colors.ts`, `src/lib/utils/habit-colors.test.ts`, `MASTER_TODO_REVISED.md §8 L510`
- [x] **CONS-2** — Narrow-screen sweep across all 5 main surfaces. `SHIPPED` — **the defect was not the narrow screen, and the recorded one was not the real one.** Swept all 5 main surfaces plus Profile and Wallpaper at **360 / 390 / 430** in **light and dark** (42 combinations) with a geometric probe rather than by eye. **Fixed: `/journey`'s "Go to Today" quick-return pill and the Feedback button were BOTH `fixed bottom-20 right-*` — two floating buttons in one corner, covering each other by 27.1% at every width in both themes.** They now stack (`--app-stack-offset`), both reachable. **The defect this line previously recorded — the Feedback button over a screen's primary CTA at 360px, 2.4% — was measured mid-scroll, where a fixed button inevitably floats over whatever happens to sit at that screen position.** At full scroll it never appeared, because it is not a narrow-screen fault and the extra 28px of clearance is insurance, not the fix. **Two claims on this line were measured and did not reproduce:** document horizontal scroll is **0** and off-screen elements are **0** at every width, so the *"4 fixed pixel widths remain"* cause no defect — the arbitrary values that remain are `w-full max-w-[Npx]` caps (which adapt) or genuinely fixed decorative controls (the toggle switch, the onboarding step dots); and *"no `md:`"* is a stylistic observation with no measured consequence, so no breakpoint was invented for its own sake. **What did change is that the two magic numbers are gone:** nav height, feedback offset, feedback height and the reserved content space are now four tokens in `globals.css`, with `<main>`'s padding *derived* from them, so the layout and the floating button cannot drift apart again — and the `sm:` shift is a token override rather than a Tailwind variant, so the reservation follows it automatically. Clearance is now 10px at 360 and 10px at 700, and `--app-content-bottom` includes `env(safe-area-inset-bottom)`, which the old flat `pb-24` ignored · src: `MASTER_TODO_REVISED.md §8 L510`
- [x] **CONS-3** — Navigation reachability. `SHIPPED` — all 5 nav destinations resolve; `/profile` correctly excluded as a dead route

**Phase 1 exit gate:** `tsc`/`lint`/`test`/`build` clean; P0-T6 adapter landed; CONS-2 narrow-screen sweep done; no uncommitted work. **BUG-1/BUG-2 no longer gate this phase** — they moved to Phase 5 §7.2. **All four criteria were met on 2026-10-15:** `CONS-2` ✓ · `P0-T6` ✓ · gates clean ✓ · no uncommitted work ✓. **⚠️ "gates clean" was silently untrue from `3970e90` until 2026-10-17.** The planner extraction and the BUG-9 trim both left `react-hooks/preserve-manual-memoization` errors in `planner-content.tsx`, which made **React Compiler skip optimising the entire planner screen**. Nothing blocked on it because **full-project `eslint` was never run as a gate** — `tsc`, the build and 361 tests all stayed green over a red lint count. Fixed by listing the React setters in the two affected dependency arrays; the code is original and had been carried through two extractions. **Phase 1 has no named gate criterion outstanding, and `npm run lint` now exits 0 for the first time.** Still open in the phase but *not* gate criteria: `P0-T3` ✓ done, `P0-T7` ✓ done, and the `DEBT` line (`D2`, `D5`).

---
## 4. PHASE 2 — Real feature work added to the app

The core product. Habits, schedule, focus, stats, reminders. Most of the research
catalogue lands here.

### 4.1 Onboarding & first run — `MASTER_TODO_REVISED.md §5 A L184–200`

- [x] **A1** — Short goal-based first run. `BUILT` — **shipped in Phase 1 as a phase-order exception, see §10 C11.** `/` is now a **six**-step flow (`intro → circadian → welcome → habits → basics → protocol`) rather than a scrolling pitch — **`basics` was added by `A2`.** **Habits created during the flow are real**: step 2 reuses `CreateHabitModal` and writes through the habit store, so they are already on the Habits tab when the flow ends (verified end to end — created in step 2, present on `/habits` after commit). The flow tracks the ids *it* created, so step 3 can never present a returning user's pre-existing habits as "the ones you added". Profile bootstrap is awaited before any save, because `addHabit` needs a `userId` and would otherwise fail silently. Step 3 is **removable** (A1's "editable final preview") and **allows zero habits** — blocking there turns an introduction into a gate · also: `XL14`, `M16` **The goal question `M16` cross-referenced here now ships:** the habits step carries the five goal tags, each opening the add-habit form pre-filled. Note the source lists **disagree** — L199 (`A1`) names Focus/Health/Sleep/Balance/Digital Detox/Custom while `M16` names Academic Excellence/Peak Health/Deep Focus/Mindfulness/Digital Detox; `M16`'s five are implemented verbatim and `A1`'s are recorded rather than merged
- [x] **A2** — Animated walkthrough, one concept per scene, contextual not exhaustive. `BUILT` — **the researched version was cut on owner instruction** from *"explain wallpaper, habits, schedule and rewards through scenes"* to **"only what is required to use the app for basic tasks"**, which leaves exactly two actions a first-time user cannot discover by looking: **plan your day** (tap an empty hour, type what you're doing) and **mark it done** (tap the habit). The source line pulls in two directions — it asks for four scenes *and* says to keep optional features "contextual instead of dumping all navigation into onboarding" — and the app's own competitor research records users bouncing off long walkthroughs, so **one scene carries both actions** rather than extending the flow by four. `basics` sits between `habits` and `protocol`, so by the time it runs the user has a real habit and "mark it done" is concrete. **Every exclusion has a reason, not a preference:** habits are already taught by *doing* them (steps 2–3 create and review a real one, so a third explanation repeats two working screens); rewards and XP need no action and a scene selling them would describe something the user never operates; the **wallpaper is off by default and costs battery** (`P8-E1`), so walking someone through an opt-in they have not taken is the wrong first impression; journey and stats are reflection, not a basic task. **The habit shown is the one this flow created**, passed down from the habit step, falling back to a neutral placeholder when the user skipped habits — an invented "Drink water" was the first version and is exactly the confident-display-of-a-fact-the-user-lacks failure this repo audits for. **No streak number is shown** for the same reason. Motion is framer-motion gated on `useReducedMotion()` and plays **once on mount — no interval**, because a looping decorative timer on a screen seen for seconds is timer sprawl. The step counter, the dots and the intro's step count all derive from `ONBOARDING_STEPS`, so *"Five short steps"* was a literal that this feature made false the moment it landed; it now reads `totalSteps()` and cannot rot again · src: `MASTER_TODO_REVISED.md §5 L201` · also: `A8`, `P8-E1`
- [x] **A3** — Optional interests/profession, skip-able, never used to obscure price. `BUILT` — **the paywall half is dropped, not deferred, and that is the decision on this line.** The spec ends *"Do not use profession to obscure or discriminate on price"*, while its own cross-reference **`HD25`** asks for profession-driven **paywall copy and discount codes** (`STUDENTFOCUS40`). Those two are the same idea: **ask the job, show a different price.** `HD25` is therefore the thing `A3`'s guardrail forbids, and it is also unbuildable here — this app is local-first with **no accounts and no payments**, so there is nothing to charge, and a paywall would be the first thing to break that promise. The research this line was copied from records how that ended: a reviewer found **no way to use the app without paying**. **What ships instead is the half that needs no paywall: the goal already chosen in onboarding now reorders the starter library.** Deep Focus leads with Eat The Frog / 90-Min Deep Work Sprint / Workday Shutdown / Zero Social Feeds; Peak Health leads with hydration, mobility, Zone 2 and steps. **No new question and no new screen** — the interest question is `M16`'s five goal tags, already asked, so asking again would have contradicted the owner instruction that cut `A2` down for being question-heavy. **The goal id is now persisted** (`odyssey_primary_goal`) — it previously existed only as a transient suggestion shape inside the onboarding page and could never reach the library, which is opened from `/habits` long after the flow ends. Ordered on **`domainLabel`** and nothing else: `HABIT_TEMPLATES` also carries a legacy `category` that is documented dead metadata, and adding a second "what is this habit about" field would have given two things able to disagree — the `CONS-1` / P0-T3 normaliser-collision class. **A stable partition, deliberately:** relative order is preserved *within* both the matched and unmatched groups, so applying a goal never reshuffles the other ten habits. **Recorded limitation, not hidden:** `Deep Focus` and `Mindfulness` both resolve to the `Mindful Focus` domain — four domains cannot cover five goals, a collision `goal-tags.ts` already documents — so they produce the **same** order, and Mindfulness surfaces the deep-work habits. Fixing it is a product decision (a fifth domain, or an explicit goal mapping that accepts the duplication), not something invented here. 19 tests · src: `MASTER_TODO_REVISED.md §5 L203` · also: `M16`, `HD25`
- [x] **A5** — Commitment moment (identity line + hold-to-commit). `BUILT` — all four of the spec's requirements ship (L207: *"a motivational line/identity and optional press-and-hold animated circle. Short, skippable and celebratory"*). **The line is a single quote set in code, not a per-goal line and not user-editable** (owner instruction 2026-10-17: *"remove the change icon from there, keep it like i can change the quote in the code to anything"*). `IDENTITY_QUOTE` and `IDENTITY_ATTRIBUTION` in `lib/utils/identity-line.ts` are the only place either can change, and the attribution is a **separate constant beside the text** so repointing the quote cannot leave a stale name under it. **This retired a version that shipped the same day** and had a per-goal line with an inline edit control: a textarea, auto-sizing, focus/select-on-open, Escape/blur, and a `odyssey_identity_line` storage key, with 11 tests. All removed, and nothing writes that key any more — asserted. The cost of the editor was not incidental: **it made the app store a sentence it had written itself and then carry a rule that it must never claim the user wrote it.** A constant cannot be wrong about who said something. "Celebratory" is the "✓ Day 1 initiated" wording and **not confetti** — a judgement, recorded, since the screen navigates straight into the planner. Skip ships (2026-10-16); the hold circle has shipped since `A1` — see **`S14`** · src: `MASTER_TODO_REVISED.md §5 L207` · also: `S14`
- [ ] **A6** — Loading/processing animation instead of blank screens. `NOT BUILT` · also: `M17`
- [ ] **A7** — Just-in-time permission education with animated preview. `NOT BUILT` · also: `D6`
- [ ] **A8** — Welcome / empty states / local-data trust. `PARTIAL` — both empty states ship (**M2** habits, **M3** planner); the welcome content ships as step 2 of the onboarding flow (**A1**, carrying **M6**'s pillars), and the **goal labels now ship with `M16`** (the five goal tags on the habits step, each pre-filling the add-habit form), which closes the "goal labels" half this line previously deferred to a later phase · also: `M2`, `M3`, `A1`, `M6`, `M16`
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
- [x] **B15** — Completion labels (creation confirm, last-done, own streak). `SHIPPED` — all three halves have a home: **creation confirm** shipped (`M5`), **last-done** shipped (`M7`), **own streak** rendered on the card with `M4` and given honest copy by `M13`. **The false value recorded here is gone.** This line previously flagged that the streak rendered `{h.currentStreak || 1}d`, printing `1d` for a genuine zero-day streak, and deferred it as a separate fix to avoid scope creep inside `M7`. `M13` is that fix: the streak label moved into `warm-copy.ts`, takes the **true** `currentStreak`, and renders **"No streak yet"** for a zero, so the fabricated day no longer appears at any of the four sites that shared the bug. The deferral was correct and the bug was real — it is closed, not quietly absorbed · also: `M5`, `M7`, `M4`, `M13`

### 4.3 Schedule & planner — `§5 C L234–254`

- [ ] **C1** — Single-day visual timeline, current-time line, period colours. `PARTIAL` — timeline + time line shipped (`S16`); **period colours shipped with `M11`** (Morning/Afternoon/Evening chips on habit cards — the spec's fourth "Night" period is still unrepresented, see the M11 line); the rail itself is not coloured by period · also: `S15`, `S16`, `M11`
- [ ] **C2** — Duration sizing + drag/reschedule + edit modal. `PARTIAL` — drag reschedule shipped; **overlap detection** missing · also: `S18`
- [ ] **C3** — Today at a Glance header (day, done/total, streak, capacity, Start). `NOT BUILT` · also: `M8`, `M9`
- [ ] **C4** — Up Next line + done/total in header and wallpaper. **`PARTIAL`, and it went backwards on 2026-10-16** — the planner Up Next line **shipped with `M12` and was then RETRACTED with it on owner instruction**, so this plan item now has **less** than it did: the planner half is **gone**, not merely unfinished. The wallpaper NOW/NEXT share shipped earlier and is untouched. What remains open is the **header done/total work (Phase 2)** and the **wallpaper completion gauge (Phase 5)** §7.5 (`M10`). **A `PARTIAL` that reads as "one half shipped" when that half was deleted is exactly the kind of stale line this repo audits for**, so it is restated here rather than left as it was · also: `M12`, `M10`
- [ ] **C5** — Capacity and buffer warnings (never block saving). `PARTIAL` — the **capacity half shipped with `M8`** (Light/Balanced/Heavy on both habit count and planned hours, advisory only, never blocking). The **buffer half is still open** and is `S17` (buffer gap visualiser), which has no code · also: `M8`, `S17`
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
- [ ] **HD25** — Profession-tailored onboarding + paywall. `NOT APPROVED` — **status changed from `NOT BUILT` on 2026-10-16.** The *onboarding* half of this line shipped with **`A3`**, as goal-based reordering of the starter library. **The paywall half is `NOT APPROVED` and the reason is that `A3`'s own text forbids it:** `A3` reads *"Do not use profession to obscure or discriminate on price"*, and this line's substance **is** asking the user's job and then showing them a different price via `STUDENTFOCUS40`. It is additionally unbuildable — the app is local-first with no accounts and no payments, so there is nothing to charge, and Phase 6 (`POL-1`) is not the phase that introduces them. **This is a deliberate product decision, not a scheduling one: it should not be built later without the owner reversing it explicitly** · src: `MASTER_TODO_REVISED.md §26 L1048` · also: `A3`, `F10`
- [ ] **HD26** — Modular feature pricing. `NOT BUILT` · → **Phase 6**
- [ ] **HD27** — 7-day trial conversion hook. `NOT BUILT` · → **Phase 6**

**Phase 2 exit gate:** onboarding route live; habit types beyond binary; focus timer working; capacity warnings non-blocking.

---
## 5. PHASE 3 — Avatar, customisation, shop

Progression, identity, cosmetics and the economy around them.

### 5.1 Gamification & avatar catalogue — `MASTER_TODO_REVISED.md §5 F L302–324`

- [ ] **F1** — Existing progression (XP/ranks/thresholds, rank messages, avatar scenes). `PARTIAL` — XP + 9 ranks shipped; **unique rank dialogs shipped with `M14`**, each rank carrying its own lore, with promotion detection that refuses to fire on a first launch, a repeat, or a demotion. Avatar scenes still missing · also: `M1`, `M14`
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

These are defects, not features, and there are **two different kinds** here, so read the
intro before assuming one fix covers them:

- **`BUG-1` and `BUG-2` are colour/spectrum drift.** Fix them before adding any new wallpaper
  capability, because every new visual below draws category colours and would inherit the
  drift.
- **`BUG-7` is not drift at all** — it is the master switch refusing to stay off across a
  restart, and a battery bug besides. It is listed **first** because it is the only one of the
  three that is a **confirmed defect in shipped code**, while `BUG-1`'s "4×" claim may itself
  be stale (see its line) and `BUG-6` is still an unconfirmed hypothesis.

- [ ] **BUG-7** — Turning the wallpaper master switch off did not survive an app restart; the switch showed ON again while the wallpaper itself was untouched. `PARTIAL` — **root cause found and fixed, but the fix is NATIVE and is UNVERIFIED.** `syncSchedule()` and `syncScheduleWithResult()` in `OdysseyWallpaperBridge.kt` both did `editor.putBoolean("wallpaper_enabled", true)` **unconditionally** as part of writing schedule data. `AppShell` calls `syncCurrentScheduleToNative()` from a `useEffect` on mount, so **every single app launch** pushed a schedule and re-armed the master switch the user had just turned off — the flag read back true, the switch showed ON, and nothing re-applied Odyssey's wallpaper because the user's own image had already been restored. That is exactly the reported symptom, including the "wallpaper doesn't change" half. **Also a battery bug:** turning the switch off cancels the hourly alarm, and the next launch re-armed the engine that alarm had just been cancelled for. Both lines are removed; the flag is now written **only** where the user actually asks for a wallpaper (`setWallpaperMasterEnabled(true)`, the live-wallpaper picker, `enableHourlyAutoUpdate()`). The broadcasts and the static-lockscreen refresh are untouched, so a legitimately-enabled wallpaper still updates as before. **Why `PARTIAL` and not `SHIPPED`:** `tsc` does not read Kotlin and **this machine cannot compile Kotlin at all** — no `gradlew` in the repo, and no `java`, `gradle` or `kotlinc` on PATH at all. The change is two deleted lines and the file's braces balance (220/220), but **it has not been compiled and must not be reported as verified (R12).** Needs an APK build plus the reproduction: switch off → close → reopen → switch must stay OFF · **Relocated from Phase 1 §3.2 to here on 2026-10-16, owner instruction** — it is native wallpaper behaviour and its verification needs a device/APK this machine cannot produce, so it belongs beside the phase's other unverified native work · src: `android/app/src/main/java/com/odyssey/tracker/OdysseyWallpaperBridge.kt:425,486` · also: `P8-E1`

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
- [ ] **J4** — Personalise examples, never hide terms. `PARTIAL` — **status changed from `NOT BUILT` on 2026-10-16: the first half shipped with `A3`, the second is now unreachable.** *"Personalise examples"* landed as the starter library ordering by the goal chosen in onboarding. *"Never hide terms"* was a guardrail attached to the paywall half of **`HD25`**, which is now **`NOT APPROVED`** because it would price-discriminate by profession — so with nothing being sold, there are no terms left to hide. The prohibition is kept as a standing rule rather than deleted: if a paid tier is ever proposed, this line is where "never hide terms" is enforced · also: `A3`, `HD25`, `F10`
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
- [x] **XL14** — Interactive landing & onboarding. `BUILT` — landed with **A1** in Phase 1 (§10 C11). `/` is a **six**-step flow with working state and navigation: Next/Back with Back hidden on step 1 and Next hidden on step 6, a step indicator, an animated circadian preview, the **`A2` basics scene**, and a **theme choice (System/Light/Dark) available on every step that becomes the app's setting** — `setTheme` writes the same `odyssey_theme_mode` key the anti-FOUC script in `layout.tsx` reads, so no extra plumbing. System stays the default because the toggle writes **only on an explicit tap**; writing the resolved value on mount would persist a mode the user never chose. One way in: the old page had four separate controls (a header "Launch App", a hero "Explore Habit Studio", and five footer links) that each marked onboarding complete, so the whole introduction was skippable — verified zero bypass links remain · also: `A1`
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
**M16** (onboarding goal category tags). `A2` **has since shipped, cut down on owner
instruction** to the two actions a basic task actually needs — see its line. `M16` was
the notable one — **A1 shipped
without asking for a goal**, so "goal labels" were left as the open half of **A8**.
That was a deliberate gap, not an oversight: the goal picker wanted the habit
template library to suggest against, and adding one without suggestions would have
been a picker that promises tailoring it cannot yet deliver.

**Superseded by `M16` shipping.** The concern was that a bare picker would over-promise,
and that is the constraint the shipped feature was built against: **every tag carries a
real suggestion** — a name, an icon and one of the modal's actual categories — and opens
the add-habit form filled in. So the picker no longer promises tailoring it cannot
deliver; it performs it. The six-vs-five label disagreement between `A1` L199 and `M16`
L988 is recorded on both lines and was resolved in favour of `M16`'s list rather than
unioned. `A8` therefore closes out its "goal labels" half with `M16`; its other halves
stand as recorded.

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
|---|---|---|
| 2026-10-17 | **`npm run lint` exits 0 for the first time — and the reason it had not been a gate is the real finding.** `planner-content.tsx` carried three `react-hooks/preserve-manual-memoization` errors across two sites: `loadBlocks` and `handleSelectDate` were both `useCallback(..., [])` while calling `setBlocks` / `setBlocksLoading` / `setSelectedDate`. **Not a correctness bug** — React guarantees setters are stable, so `[]` was safe at runtime. **The cost was that React Compiler skipped optimising the ENTIRE planner screen**, not merely those two functions: a component that mutates state on nearly every interaction, receiving no automatic memoisation at all. Fixed by listing the setters. `db`, `getCachedBlocks`, `setCachedBlocks` and `writeString` are **module bindings and stay out** of the arrays — including them would be noise, and they cannot change. **The code is original**, carried through two extractions (`3970e90` moved it out at 1184 lines, `eb3700a` trimmed it), so this was never introduced by a recent change. **What actually went wrong is process: nothing blocked on a red lint count**, because `tsc`, the production build and 361 tests all stayed green throughout — `npm run lint` appears in the Definition of Done and had simply never been run across the whole project, only per-file on touched files. **Phase 1's exit gate line said "gates clean ✓" and had been false since `3970e90`**; corrected in place with the window recorded. Gates: `tsc` exit 0, **`eslint src` 0 errors / 96 warnings, exit 0**, **24 suites / 361 tests** green, build clean. The planner's two affected paths verified with **real seeded data** rather than an empty profile: a block written straight into IndexedDB renders at 09:00, the loading flag clears on first read and again after a date change, selecting a day persists `odyssey_planner_selected_date` and shows that day rather than today's block, and "clean slate" does **not** appear while a block exists · src: `src/components/planner/planner-content.tsx` |
|---|---|---|
|---|---|
| 2026-10-17 | **`A5`'s line became a code-set quote and the edit affordance was removed** — owner instruction: *"write this quote, remove the change icon from there, keep it like I can change the quote in the code to anything"* (Jim Rohn). **This retired machinery that had shipped hours earlier**, and the retirement is the substance: the per-goal "derive + edit in one tap" version carried a `<textarea>`, auto-sizing, a focus/select-on-open effect, Escape/blur handling, an `odyssey_identity_line` storage key and 11 tests. **All removed, and a check now asserts the key is never written again.** The version it replaced had a real liability: **it made the app store a sentence it had written itself and then carry a rule that it must never claim the user wrote it.** A constant cannot be wrong about who said something. `IDENTITY_QUOTE` and `IDENTITY_ATTRIBUTION` are the only two things to edit, and the attribution is a **separate constant beside the text** so repointing the quote cannot leave a stale name under it — `""` renders no attribution. The remaining tests are **not pinning a value** (the owner edits it by hand) but guarding the ways a hand-edit goes wrong invisibly: a stray newline from copy-paste, a quote left ending mid-sentence, an em-dash inside the text producing a second attribution underneath, or a line long enough to clip on a phone. **The layout risk was re-measured, not assumed:** the quote changes the step's height, which is exactly what left the circle 45px off its origin earlier today, so the check asserts **circle-to-button offset 0.00px while holding with the quote on screen**. Gates: `tsc` exit 0, eslint **0 errors** on touched files, **24 suites / 361 tests** green, build clean. In-browser at **360/390/430 in light and dark**: quote renders verbatim, attributed, **wraps to ~2 lines with no ellipsis and no horizontal overflow**, edit affordance fully absent (no button, no textarea, not even the word "change"), retired key untouched, 0 console errors; skip still present and the hold still completes · src: `src/lib/utils/identity-line.ts`, `src/components/onboarding/identity-line.tsx` |
|---|---|---|
|---|---|---|
| 2026-10-17 | **`A5` completed, and the browser found that the hold-to-commit gesture was already broken for a real finger.** Owner instruction: *"complete the a5, go with option 3"* — derive the identity line from the goal already chosen, editable in one tap, **no new question**. **The find that matters most is unrelated to the feature:** instrumenting the document showed `pointerdown` arriving on the hold button and being followed **in the same tick** by `pointerout`/`pointerleave`, which the button's `onPointerLeave={cancel}` turned into an instant cancel — **the circle never visibly spread at all**. Calling React's handler directly *did* work, which is what localised it to event routing rather than the state machine. **`page.evaluate(el.click())` bypasses pointer routing entirely, so every DOM-driven check had been passing over a dead gesture** — the same `#__next` probe shape, and the reason a real `mouse.down` is now in the suite. Fixed with **`setPointerCapture`** on pointerdown: the hold is now about *holding*, not about keeping a finger perfectly still. **Second regression, caught by re-running the old geometry check rather than the new one:** the identity line reads its text from storage in an effect, so it fills in a moment after mount and moves the button **up 45px** — the viewport never changed, so `resize` never fired and the circle kept a stale origin (**measured 45px off at 430×932**). A **`ResizeObserver` on the section** now catches any shift; it cannot loop because origin feeds only `clip-path`. **The line itself** is one first-person sentence per goal plus a generic default that asserts nothing, and **the derived line is never persisted as the user's words** — the app must not claim authorship of a sentence nobody typed. Clearing it reverts rather than showing a blank commitment. The editor is a **`<textarea rows={1}>`, not an `<input>`**, for the reason the `day-schedule` field was fixed the same way, and select-on-open lives in an **effect keyed on the editing state, never a ref callback** — React 19 re-runs ref callbacks every render, which cost a real bug there. Escape abandons, blur commits, and the line hides once a hold starts. **`A5` moved `PARTIAL` → `BUILT`.** "Celebratory" stays the "✓ Day 1 initiated" wording and **not confetti** — recorded as a judgement, since the screen navigates straight into the planner. **The 250-line component limit forced three extractions** (`commit-hold-button`, `commitment-spread`, `identity-line`); that is the rule catching my own change, not a refactor in its own right. Gates: `tsc` exit 0, eslint **0 errors** on touched files, **24 suites / 366 tests** green, build clean. In-browser at 390 in both themes: derived line correct per goal and **not** stored, whole field selected on open, **text intact after 38 keystrokes**, no internal scroll, Escape abandons without writing, blur commits, clearing reverts, hidden mid-hold — plus **both** prior suites re-run green: circle-to-button offset **0.00px** at 360/390/430 in both themes, hold still completes and navigates, Space parity intact · src: `src/components/onboarding/identity-line.tsx`, `src/components/onboarding/commit-hold-button.tsx`, `src/components/onboarding/step-protocol.tsx`, `src/lib/utils/identity-line.ts` |
|---|---|
| 2026-10-16 | **`A5` is no longer a dead end.** The commitment step had **no exit at all** — `OnboardingShell` deliberately hides Next on the last step *"on `protocol` the hold is the only way forward"*, which was true and was not questioned until it mattered. A user who did not discover the press-and-hold, or who simply declined it, sat on that screen **permanently**. **A "Skip for now" control now completes the flow and enters the app.** It records the **same completion flag** as the hold, and is deliberately the **same handler**, so the two exits cannot drift apart — skipping is declining the *ritual*, not the app, and the flag means "first run is finished" rather than "the ceremony happened". Verified that this is real rather than a navigation trick: **skip → `/planner`, flag `"true"`, and a reload does not bounce back into onboarding.** **It is hidden while a hold is in progress and returns on release** — a second finger landing there would exit out from under a half-performed ceremony, and a half-performed commitment ritual is worse than a skipped one. It is a real `<button>` with a visible focus ring, so it is keyboard reachable and Space/Enter activated. **What is still outstanding is the identity line**, and it is **deliberately not built**: it is a *new question*, the same shape the owner cut from `A2` and `A3`, so it needs an explicit decision rather than being assumed in. `A5` therefore stays `PARTIAL` and names precisely what is missing. Gates: `tsc` exit 0, eslint **0 errors** on touched files, **23 suites / 355 tests** green, build clean. In-browser at 390 in light and dark: control present and visible (98px, `<BUTTON>`), focusable as a native button, hidden mid-hold, returns after release, skip reaches `/planner`, flag recorded, reload stays out, 0 console errors · src: `src/components/onboarding/step-protocol.tsx`, `src/app/page.tsx` |
|---|
|---|---|
| 2026-10-16 | **`A3` shipped as goal-based reordering of the starter library, and its paywall half was dropped rather than deferred — the decision on this line is what was NOT built.** The spec ends *"Do not use profession to obscure or discriminate on price"* and its own cross-reference `HD25` asks for profession-driven **paywall copy and discount codes** (`STUDENTFOCUS40`). Those are the same idea: **ask the job, show a different price**, which is precisely what `A3` forbids. It is also unbuildable — the app is local-first with **no accounts and no payments**, and the research the line was copied from records how that ended (*"no way to use the app without paying"*). **`HD25` therefore moved from `NOT BUILT` (Phase 6) to `NOT APPROVED`**, with the reason recorded so it is not quietly rebuilt later, and `J4`'s *"never hide terms"* guardrail is retained as a standing rule with nothing left to hide. **What ships:** the goal already chosen in onboarding now reorders the 14 starter habits — **no new question and no new screen**, because the interest question is `M16`'s five goal tags and asking again would contradict the owner instruction that cut `A2` down for being question-heavy. **The load-bearing discovery: the goal was never persisted.** Only a transient `suggestion` shape reached `CreateHabitModal`, and the library is opened from `/habits` long after the flow ends, so the approved behaviour **could not exist** without persisting the id (`odyssey_primary_goal`, validated through `getGoalTag` on read so devtools cannot inject a fake goal). **Ordered on `domainLabel` and nothing else** — `HABIT_TEMPLATES` also carries a legacy `category` already documented as dead metadata, and adding a second "what is this habit about" field would have made two things able to disagree, which is the `CONS-1` / P0-T3 normaliser-collision class. **A stable partition is a requirement, not a nicety:** an unstable sort would reshuffle the other ten habits every time a goal applied, so the library would change for reasons nobody chose. **Recorded limitation:** `Deep Focus` and `Mindfulness` both resolve to `Mindful Focus` — four domains for five goals, a collision `goal-tags.ts` already documents — so they produce the **same** order and Mindfulness surfaces the deep-work habits; fixing it needs a product decision, not a code one. Gates: `tsc` exit 0, eslint **0 errors** on touched files, **23 suites / 355 tests** green, build clean. In-browser at 390 in both themes: **with no goal the 14 appear in byte-identical default order and nothing is stored** (the negative case, which is the one that is easy to claim and never test); **Deep Focus leads with the four focus habits, Peak Health with the four vitality habits**, each with all 14 present exactly once, measured from rendered positions rather than DOM order so a CSS reorder cannot hide. **Two harness failures were mine, not the app's:** `/add habit/i` never matched because the empty-state CTA reads *"Add your keystone habit"*, and the dismiss helper was scoped to `[role="dialog"]` while the 20:00 evening-plan modal has no such ancestor — so the first screenshots showed the overlay instead of the library, with the DOM assertions still passing · src: `src/lib/utils/habit-template-order.ts`, `src/components/habits/habit-template-library.tsx`, `src/app/page.tsx` |
|---|
| 2026-10-16 | **The commitment hold's circle started in the wrong place — a real defect, found on owner instruction and fixed with a measurement.** *"Make sure that the circle center is at the center of the hold button and make the boundary of the circle little animated."* The circle was clipped to `circle(Rpx at 50% 50%)` — the **viewport** centre — while the button sits under the heading, so measured in-browser the offset was **103px on 360×780, 135px on 390×844 and 179px on 430×932**, growing with screen height. Two comments in the file asserted the opposite (*"the overlay starts exactly on the button the user is holding — no pop, no jump"*), and **33 tests were green throughout**: the radius was always right, only the centre was wrong, and nothing asserted on the centre. The button's real centre is now measured (in an effect, never during render — SSR rule 15) and drives the clip, re-measured on resize and orientation change. **Coverage had to become origin-aware too, and that is the part that was easy to miss:** a half-diagonal is only correct from the centre, so moving the origin while keeping it would have left the **bottom corners uncovered** and committed the route change on a half-filled screen — the exact outcome `hasCoveredViewport` exists to prevent. `viewportCoverRadiusPx` is replaced by `coverRadiusFromPx(originX, originY, w, h)`, and `spreadRadiusPx` takes the origin as a **required** argument rather than defaulting it, because defaulting to the viewport centre is precisely the bug. **Two of my own new tests failed on first run and both were my bad premise, not the code:** one asserted `coverRadiusFromPx(-100,-100,-100,-100) === 0`, which was the *old* centre-only function's artefact of ignoring the origin; the other assumed a corner origin gives a *small* radius when a corner is the **farthest** point (927px vs a 465px minimum) — the button-radius floor is only reachable on a degenerate viewport, and is kept with that honestly recorded. Verified in-browser: **circle-to-button offset 0.00px at 360/390/430 in both themes**, radius growing and covering, release still cancels, full hold still reaches "Day 1 initiated" and navigates to `/planner`, reduced motion still commits immediately **with no rim animation**. **The rim** is a radial-gradient band sharing the circle's exact centre and radius so it rides the clip edge instead of being a separate element that could drift from it, painted above the fill so the edge reads as the source; it breathes opacity 0.55↔1 on a 1.5s cycle (one full pulse per 2.5s hold), keyed inside `prefers-reduced-motion: no-preference` with `animation: none` under `reduce`, per the `keystonePulse` / `slateSweep` / `perfectDayGlow` convention. Opacity only — the gradient stops carry the live radius in px, so animating them would need a registered custom property and a full-viewport repaint every frame. **Purely visual: it cannot affect when the hold completes.** Gates: `tsc` exit 0, eslint **0 errors**, **22 suites / 336 tests** green, build clean. **Two plan lines swept while the commit was open:** **`S14`** and **`A5`** both read `NOT BUILT` while the hold had been live since `A1` — `S14` is now `SHIPPED`, and **`A5` is `PARTIAL`** because its *identity line* half and its *"skippable"* requirement are both genuinely still missing and are recorded rather than quietly accepted · src: `src/components/onboarding/step-protocol.tsx`, `src/lib/utils/onboarding-flow.ts`, `src/app/globals.css` |
|---|
| 2026-10-16 | **`A2` shipped, scoped down on owner instruction from four scenes to the two actions a basic task needs.** The researched line asked for wallpaper + habits + schedule + rewards "through crisp, short scenes" **and** for optional features to stay "contextual instead of dumping all navigation into onboarding" — which pull opposite ways, and the app's own competitor research records users bouncing off long walkthroughs while `A1` promises a usable plan in under a minute. **Owner instruction settled it: "only explain the things required to use the app for basic tasks."** One scene covers two actions — plan an hour, tick the habit — and each exclusion carries a reason rather than a preference: habits are already taught by *doing* them in steps 2–3; rewards need no action; **the wallpaper is off by default and costs battery** (`P8-E1`); journey and stats are reflection. **Two things the first version got wrong, both caught by looking rather than by a gate:** (a) the habit row shipped with an **empty icon circle**, which reads as a broken image and which every assertion passed straight over — the screenshot is what caught it; (b) it displayed an **invented "Drink water"** — a confident display of a fact the user does not have, committed in the very step meant to teach trust in their own data. It now shows **the habit this flow created**, passed down from the habit step, with a neutral placeholder when the user skipped habits (which the flow allows). **No streak number is shown** for the same reason. Motion is gated on `useReducedMotion()` and plays **once — no interval**. **A literal rotted on the way in:** the intro said *"Five short steps"*, so adding a sixth made it false on arrival; it now derives from `ONBOARDING_STEPS` and cannot rot again — the same drift class this file exists to catch, caught by grepping for the phrase rather than by reading the diff. Gates: `tsc` exit 0, eslint **0 errors**, **22 suites / 331 tests** green, build clean. In-browser at **360/390/430 in light and dark**: step counter `5/6`, both cards present, **no wallpaper/reward/rank/shop content anywhere in the scene**, 0 horizontal overflow, 0 console errors; **reduced motion read on the first frame** — 0 nodes mid-fade, 0 running animations. Real-habit path proven separately by creating a habit through the real modal and asserting the exact name reaches the card. **Two harness bugs were mine, not the app's:** `waitForFunction` was given the *clicking* expression and then `evaluate` clicked again, advancing every step twice; and the fallback assertion matched the caption's own words *"your habit"*. **Ports 3000/3001/3100 verified clear** — 3000 held a stale `next start` from an earlier session serving the previous build, killed and swept until it stayed clear |---|
| 2026-10-15 | **`CONS-2` closed, and the defect it recorded was not the defect.** The Phase 1 exit-gate sweep over 5 main surfaces + Profile and Wallpaper at 360/390/430 in light **and** dark — 42 combinations — found that (a) the recorded *"Feedback button over a primary CTA at 360px, 2.4%"* was a **mid-scroll artifact**, since a `fixed` button overlays whatever sits at its screen position, and it never appears at full scroll on any route; and (b) the real defect was **`/journey`'s *"Go to Today"* pill and the Feedback button both at `fixed bottom-20 right-*`** — two floating buttons in one corner, **covering each other 27.1% at every width in both themes**. They now stack via `--app-stack-offset`. **Genuine stuck-control findings 6 → 0.** The durable half is that the two magic numbers are gone: nav height, feedback offset, feedback height and reserved space are four tokens in `globals.css` with `<main>`'s padding **derived** from them, the `sm:` shift is a token override rather than a Tailwind variant (so the reservation follows the button — at 700px it moves to 140px automatically), and the reservation now includes `env(safe-area-inset-bottom)`, which the old flat `pb-24` ignored. Verified 10px clearance at both 360 and 700 by reading computed values back. **Two claims did not reproduce and were left as findings, not gaps:** document horizontal scroll **0** and off-screen elements **0** at every width, so the *"4 fixed pixel widths"* cause no defect (the arbitrary values left are `w-full max-w-[Npx]` caps, which adapt, or genuinely fixed decorative controls), and *"no `md:`"* is stylistic with no measured consequence — no breakpoint was invented for its own sake. `tsc` exit 0, lint 0 errors, **19 suites / 283 tests** green, build clean, 42 screenshots. **`P0-T2` also closed**: `graphify update .` completes and **is** on PATH, so the 2026-10-07 "CLI unavailable" note is superseded; rebuilt to **2164 nodes / 3164 edges / 208 communities**. **Phase 1 exit gate is 3 of 4 met — `P0-T6` is the last criterion open.** Doc drift corrected in the same commit per rule 8: Dexie `version(1)`/6 tables → **`version(2)`/7**, a non-existent `src/lib/categories.ts` removed, 7 stores → **6**, stale `db.ts` line numbers `179`→`206` / `59`→`48` / `76`→`67`, **8** test suites → **19/283** in four places, `FEATURES.md` `D8 CLOSED` corrected to `OPEN` (contradicted `P0-T7 NOT BUILT`), its `XL14` "next feature" row corrected (`A1` shipped), and `android-bridge.ts` 813 → **829** lines. Two durable rules added to `context.md` §11: measure fixed-overlay interference at full scroll, and run servers through the wrapper that kills in a `finally` — the latter written **because this session violated the bare-`Start-Process` rule** |
| 2026-10-08 | **Performance phase: authority consolidated into `inefficiencies.md` §11, master prompt deleted.** §6.5 and `MASTER_TODO_REVISED.md` §23 had each been bound to `tracker-performance-master-prompt.md` by an "edit one, edit the other" rule. Managing two sources with a protocol is worse than not having two, so the prompt's content was **imported verbatim into `inefficiencies.md` §11** and the file **deleted** — one authority, and the drift rule disappears with the drift. Also corrected two stale figures in that audit while I was in it: `backdrop-blur` occurrences **46 → 41 across 21 files** (the "22 heavy" sub-count is explicitly marked *not* re-verified, so it stands as a floor rather than a fact), and `SharedPreferences.commit()` **8 → 9**. §6.5's authority rules, C12 and the §11 source index were repointed; the provenance of the import is recorded in all three places rather than erased · src: `inefficiencies.md` §11, `main_plan.md` §6.5 |
| 2026-10-08 | **Added the performance phase (§6.5) and dissolved `POL-1` into it.** Owner instruction. §6.5 carries all 18 items of the performance master prompt **in full, inline**, so an agent working the phase does not have to reopen it. **Unnumbered on purpose:** `§6` is already *PHASE 4 – Social tab*, and renumbering §7–§12 would touch **33 cross-references in this file alone** plus four more documents. `POL-1`'s wording is preserved verbatim in §6.5.5 and its Phase 6 line became a pointer, so nothing is lost — its stale "29 `backdrop-blur` surfaces" is corrected to the measured **41 across 21 files**. Recorded as **C12**. **Reconciling before writing changed the work:** 5 of 18 items are already delivered (`#1` core via `P8-E2`, `#2c`, `#4a`, `#15`, and `POL-1`'s master switch) and 4 figures are wrong (blur 22→41, `commit()` 8→9, the 1,710/sec allocation estimate, and `#3`'s bundled-asset assumption — the app serves a **remote** URL via `loadUrl(targetUrl)`). So `PERF-0` is a mandatory baselines-and-reconcile step, and delivered items are recorded `BUILT` **with what still needs verifying**. Added `BUILT` to the §0.2 legend, where it was already used on a dozen lines but never defined; it means *code exists, not yet verified*, deliberately weaker than `SHIPPED`. §6.5.4 states the measurement boundary plainly — no `gradlew`, no device, so native items stay `BUILT` + "unverified — needs a device" and must never be promoted on a green web suite alone (R12). |
| 2026-10-07 | **Process rules hardened, on owner instruction.** Two failures this session, both costing real time, are now enforced rather than merely noted. (1) **The commit sequence is mandatory and ordered**: `implement → verify → main_plan.md → context.md → commit`, all three in one commit — a commit with code but no status update is the same defect as uncommitted work, only harder to spot because `git status` is clean. Added to §1, to `AGENTS.md` non-negotiables 11 and to `FEATURE_WORKFLOW.md` Stage 3, with the rule extended to cover features that did *not* ship as planned (dropped, deferred, renamed) so silence never stands in for a decision. (2) **Background servers must never be left running**: `Start-Process` returns as soon as the process spawns and then leaves it alive forever, holding its port; the next start fails with `EADDRINUSE` while silently serving the **previous** build, so a clean page load is not evidence that the change under test is the change being tested. `AGENTS.md` gained a worked start/assert/kill chain and the rule to kill by the **port's owning PID** (not a remembered PID — `next start` spawns a child). Also recorded in `FEATURE_WORKFLOW.md` §Process traps: headless Chrome defaults to dark, the OTA update modal's fixed overlay swallows `page.click`, never edit markdown with PowerShell `Set-Content` (it re-encoded all of `context.md` once), and a failing assertion on the headline requirement needs a control before a fix. |
| 2026-10-07 | **M3 shipped.** Planner zero-block state (`PlannerEmptyState`). Researched copy changed with owner approval because it promised a + button and a template import, neither of which exists — template import is `B1`/`HD29`, Phase 2. Added a `blocksLoading` flag so the state cannot fire on the pre-read `[]` that the planner holds on first paint for every day (D5: it bypasses the schedule store, so there was no loading flag to borrow). Logic extracted to `shouldShowPlannerEmptyState()` with 6 regression tests → 116 green. |
| 2026-10-07 | **Adopted `Market Research/context.md` as the agent entry point.** It existed but was structurally corrupted — text severed mid-sentence and re-appended at the end — so every fact was re-verified against source and the file rewritten whole (product, stack, routes, schema, stores, reward economy, pure-logic modules, 7 phases, environment/toolchain/tests/design system, people/memory/research, session log, git + live task state, binding rules). New **§0** defines the mechanism: read `context.md` → `main_plan.md` → cited spec at session start; write back at session end. Propagated here — §0 header + authority order now put `context.md` first **for orientation only**; **Step 1** requires reading it and forbids asking the owner for context already written down; new **Step 9b** requires the write-back in the same commit; **Definition of Done** gained a checkbox; §11 source index and `AGENTS.md` non-negotiables point at it. Status remains exclusive to this file (C10). `.gitignore` no longer ignores `context.md`, so a fresh clone gets it. |
| 2026-10-05 | **Created.** Migrated the status record from `DEVELOPMENT_PLAN.md` §3 (reconciled against `6b42b74`); consolidated all six backlog docs into the 7 owner-defined phases; recorded 9 contradictions (4 open). Market Research docs un-ignored so they are tracked. |
| 2026-10-05 | **Propagated the new rules across all docs.** `AGENTS.md` now mandates `main_plan.md` first (status rule, code-beats-docs, battery question added as non-negotiables); `.clinerules` gained a §0 Source of Truth section; `FEATURES.md` dropped its "canonical status of record" claim; `MASTER_TODO_REVISED`, `PRODUCTION_PLAN`, `MASTER_TODO`, `TODO`, `AI_TODO` and `PHASE_0_AUDIT_REPORT` all carry headers pointing here and marking their own phase numbers non-binding; `DEVELOPMENT_PLAN.md` §4 maps its P0–P8 onto Phases 1–7. |
| 2026-10-05 | **Consolidated all wallpaper work into Phase 5.** Audited Phase 0 carry-overs through Phase 4. `BUG-1`/`BUG-2` → new §7.2 (defects first). `M10` and `E12` moved out of Phases 1–2 into new §7.5 — both had been tagged `→ Phase 5` for weeks without ever being moved; `E12` is the same feature as `G11`/`XL15` and is now marked do-not-build-three-times. `M10` corrected `NOT BUILT` → `PARTIAL` because `G2` already ships the fraction. `CONS-1`, `B5` and `C4` mention the wallpaper but span card/strip/planner/header too, so they **stay** in their phases with a note naming the Phase 5 share. Phase 4 (Social) has no wallpaper work. Fixed two pre-existing numbering bugs: two sections both numbered 7.3, and two contradiction entries both numbered C9 (now C10). Added **C8** — `XL14` means three different things across three sources, same class of bug as C7. |
