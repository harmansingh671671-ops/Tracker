# PERFORMANCE.md

**Status:** web figures measured on a production build. **Native figures are not measured.**
**Last measured:** 2026-10-17 · `agent/mainline` @ `416e7dc`

---

## Read this before quoting any number in this file

Two kinds of number appear here, and they are not interchangeable:

| | What it means | Confidence |
|---|---|---|
| **MEASURED** | Read off a production build or counted against source by a script | Reproducible today, with the command given |
| **UNVERIFIED** | A claim inherited from an earlier code review, re-counted against source but **never profiled** | Correct about the *code*. Unknown about the *cost* |

**Nothing native is MEASURED.** There is no `gradlew` in this repo, no device attached, and
JBR 25 cannot start the project's Kotlin 1.9.22 daemon (`IllegalArgumentException: 25.0.3`,
risk `R14`). `tsc` does not read Kotlin, so a green web suite says nothing about the Android
side — a real Kotlin syntax error once shipped through a fully green web suite (risk `R12`).

**So: do not claim a battery, cold-start or frame-rate improvement from this file.** Claim
the *structural* change (one timer instead of three, 88 KB instead of 1.8 MB) and say the
saving is unmeasured until someone runs it on a real mid/low-end release build.

---

## 1. The four rules

These are the durable output of the performance phase. They are short enough to remember
and specific enough to check.

### Rule 1 — No allocations in a draw loop

A live wallpaper redraw allocates nothing it does not have to. If you find yourself writing
`Paint()`, `Rect()`, a `String`, a lambda capturing anything, or `JSON.parse` inside a
render/`onDraw` path, it belongs in a field initialised once, or a cached object.

**Why it is still a rule when the problem was already fixed:** the 30 FPS loop and its
~1,710 `Paint` allocations per second are **gone** — `REFRESH_INTERVAL_MS = 60_000L`, and the
schedule JSON is cached rather than re-parsed per frame. The rule survives because the
regression is the easy part: the next person to add an animation will not know why the old
one was wrong.

### Rule 2 — One shared clock

There is exactly one clock: `src/lib/utils/shared-clock.ts`. It is armed at the **next real
minute boundary**, not on a fixed interval, so drift cannot accumulate. It runs while
something subscribes and **stops when nothing does**, and it does not arm at all while
`document.hidden`.

**A `setInterval` that does not read the wall clock is not a clock and does not belong here.**
Three legitimate timers exist and must stay local: two 30 ms × 15-attempt layout-settle
retries, and the onboarding carousel. See §4.

### Rule 3 — No wake-up alarms unless essential

A `RTC_WAKEUP` alarm costs real battery: it wakes the CPU out of deep sleep and holds it
there. Use `handler.postDelayed` for anything that does not need to survive a reboot.
`WAKE_LOCK` is **already removed** and must not come back.

**Four `RTC_WAKEUP` sites remain, across two files** — see §5. They are genuinely open.

### Rule 4 — A blur budget

`backdrop-filter: blur(...)` is the most expensive thing in this stylesheet. Every use is a
GPU pass over a live surface.

> **Proposed budget: 15 occurrences repo-wide. Measured cost: unknown.**
>
> The count is the *current* number (44). The budget is **proposed, not derived** — nobody
> has profiled what 44 costs on a low-end device. Set it because it bounds the direction of
> travel, and revise it the first time someone gets real numbers. **A budget invented to
> match the current number is not a budget, it is a ratchet — say so rather than pretend
> otherwise.**

`backdrop-blur` is not a free substitute for anything. Removing it changes what the user sees.

---

## 2. Web baseline — MEASURED

From a **production** build (`npm run build`), because `next start` against a dev build or a
stale `.next` measures the wrong thing. Gzipped, because uncompressed bytes on disk are not
what a phone downloads.

```
npm run build
node scripts/measure-bundle.js
```

The script lives in the repo on purpose. A measurement instruction that points at a temp
directory is not an instruction, it is a rumour.

| | raw | gzip | ratio |
|---|---:|---:|---:|
| Client JS (33 chunks) | 1,515.7 KB | **476.7 KB** | 31.5% |
| CSS (2 files) | 182.5 KB | **25.2 KB** | 13.8% |
| **Combined** | | **501.9 KB** | |
| Build media (`.next/static/media`) | 326.6 KB | 310.5 KB | 95.1% |
| Public images | 98.3 KB | 90.4 KB | 91.9% |

**The combined total went UP by 45 KB in the `PERF-5` commit while what a screen loads went
DOWN by 84 KB.** Neither figure is wrong — see §2.1, which is the number to watch.

**Not counted in any total above:** `public/downloads/odyssey-latest.apk`, **11,587 KB**. It is
the **in-app updater payload** — downloaded deliberately by the updater, never on page load.
Counting it against "what a page costs" would be as wrong as excluding it from "what a
release costs", so the script reports it separately and judges it neither way.

**Largest JS chunks, by gzip** — this is what a slow connection actually pays:

| gzip | raw | chunk |
|---:|---:|---|
| 69.8 KB | 223.8 KB | `27t_qfc-3_lzs.js` |
| 48.3 KB | 154.7 KB | `33qo-76wa_gir.js` |
| 41.6 KB | 151.8 KB | `3jg84jwj6s1uj.js` |
| 38.6 KB | 110.0 KB | `0cz1d0mv5g_q7.js` |

**Why the table is split by compressibility.** A single "total bytes" figure hides problems
both ways. `public/` images and build media are ~91–95% incompressible, so 3 MB of images
contributes 3 MB of transfer; JS compresses 3:1, so 1.4 MB of source contributes 436 KB.
**Adding those together gives 461 KB and tells you the images are free. They are not.**
That mistake is exactly how a 1.8 MB logo survived in a directory no item was looking at.

### 2.1 Per-route first load — the number that matters

**Added 2026-10-19 by `PERF-5`.** `measure-bundle.js` totals the build; it cannot see that a
screen pays for code it never runs. Next's own Turbopack analyzer can, and `npm run
measure-routes` reports it per route.

**What the `PERF-5` commit did:**

| | before | after |
|---|---:|---:|
| Shared set — loaded by **every** route | 261.4 KB gzip (11 chunks) | **178.4 KB gzip** (9 chunks) |
| `/planner` first visit | 263.0 KB | **178.8 KB** (−32%) |
| Whole build, every chunk, every route | 431.9 KB gzip (30 files) | 476.7 KB gzip (33 files) |

**The third row went up while the first two went down, and both are true.** Deferring a
component moves its code into its own file, so a library used by several deferred pieces is
copied into each — the build total counts every copy, a screen downloads one. **The row to
watch is the per-route one; the build total is now the misleading number** in exactly the way
the split-by-compressibility warning above describes.

| route | before | after | | route | before | after |
|---|---:|---:|---|---|---:|---:|
| `/habits` | 300.8 | 256.0 | | `/journey` | 266.6 | 184.3 |
| `/` | 289.3 | 254.6 | | `/shop` | 265.3 | 182.4 |
| `/profile` | 268.4 | 201.2 | | `/planner` | 263.0 | 178.8 |
| `/wallpaper` | 274.8 | 192.9 | | `/_not-found` | 261.4 | 178.4 |
| `/day-schedule` | 269.3 | 186.8 | | `/stats` | 268.1 | 186.1 |

`/` and `/habits` stay ~255 KB because they genuinely animate: the animation library is now in
*their* code, where it is used, instead of in everyone's.

**What is left in the 178.4 KB**, and what it is: ~127 KB is the React/Next runtime (69.8 +
41.6 + 8.3 + 3.8 + 3.5), 30.7 KB is the local database, 9.8 KB is the shell's native schedule
sync, 7.3 KB is the icon set. **Two of those are still paid by screens that may not need
them** — `/` and `/day-schedule` hide the header and still download the database and the sync
because the shell imports them statically.

> **Correction 2026-10-19 (`PERF-5d/5e`, measured): the "next win" above was re-measured and
> does not survive.** Making the sync load on demand (both from the barrel and from its own
> module) moved it out of every route's *first paint* but duplicated its graph into per-entry
> async chunks: the build rose **476 → 500.5 KB gzip**, four routes' first load rose ~3.5 KB,
> and the database (30.7 KB) stayed shared **through the header's profile chain regardless** —
> the header mounts its profile store statically, so the two header-less screens were the only
> routes that could not reach the chain, and both of them open the database within moments of
> paint anyway (`/` may start onboarding, `/day-schedule` reads its schedule). The sync is
> therefore back on its static import: it is session-shared code that every real screen touches,
> the static form builds smaller, and the deferral bought ~3 KB at paint for a +25 KB build.
> The variant worth having later is a different one: stop the *header* from keeping the profile
> chain in the shared set (route-group the two shell-less screens), which is layout surgery and
> has its own pop-in risk to verify visually.

**What `PERF-5d/5e` did ship (same day, measured):**

- **5d — dependency trim.** Five runtime dependencies had **zero imports anywhere** and are
  gone from `package.json`: `date-fns`, `recharts`, `dexie-react-hooks`, `react-day-picker`
  (imported only by an already-orphaned calendar component, deleted with it) and `shadcn` (a
  scaffold CLI, not a runtime library). **Honest effect: none of them ever shipped a byte** —
  nothing imported them, so no chunk ever held them. What this buys is install time, lockfile
  weight and one less stale-premise surface for future work, not first-load KB.
- **5e — production hygiene.** `compiler.removeConsole` with `exclude: ["error", "warn"]` is
  now in `next.config.ts`. It was **verified empirically, not assumed**: two marker strings
  (`console.log` / `console.info`) were planted in a client component, built, and scanned for
  across all 36 shipped client files — 0 hits, while a control string in the same round found
  11 in the same scan, so the transform strips `log`/`info`/`debug` on **Turbopack builds**
  (the 2023 forum-era answer that it does not apply to Turbopack is stale). The deliberate
  `logWarn`/`logError` diagnostics survive, which is the point: they are what a device's
  logcat is read through. Source maps are already production-off by default (`productionBrowserSourceMaps`,
  local Next 16 docs), minification is Turbopack default, and Tailwind v4 detects used classes
  automatically — the v3-era "purge" premise needed no work.
- **5f — React Compiler: declined for now**, per its own condition — no profiler evidence
  that it pays, and the plan gate says only then.

**The premise this corrected.** `main_plan.md` expected the win in `PERF-5c` — extracting
hooks and sub-components out of five large *screen* files (planner 48.3 KB of source, habits
45.4 KB, …). Measured, those screens' own first-load code is **0.4–1.6 KB gzipped**: they are
already routes. Source size is not what a phone pays for. The shared set was the whole problem.

---

## 3. What was delivered — and what it actually bought

| Item | Change | Measured effect |
|---|---|---|
| `PERF-4g` | Evening reminder 60 s poll → minute-boundary timeout | One wake/minute instead of one/second, **only while the modal is open**; also fixed a UTC/local date-key bug hiding inside it |
| `PERF-4b` | Three polling timers → one shared clock | **44 wakes/minute → 1**, and 0 while hidden |
| `PERF-19` | `logo.png` 1,808 KB → 88 KB | Public images are now **98.6 KB raw / 90.4 KB gzip** (3 files), measured today. `PERF-19` recorded 93 KB on a slightly different tree — the two figures were taken a few commits apart, and today's is the one to compare against |
| `PERF-9` | Deleted dead `@keyframes` | CSS 25.7 KB → **24.7 KB** gzip; 17 Tailwind animations gained a reduced-motion rule |
| `BUG-13` | Deleted 1,806 lines of orphaned components | −2 blur sites; removed a 7th `setInterval` that was dead |
| `PERF-5` | Animation library out of the shared set (the permission panel animates with two keyframes now), and the profile sheet, rank-up dialog, evening reminder and update notice load on demand instead of being imported by the shell | Shared set **261.4 → 178.4 KB** gzip; `/planner` first visit **263.0 → 178.8 KB**. Build total **rose** 431.9 → 476.7 KB — deferred code is duplicated per chunk. See §2.1 |
| `PERF-5a` | `npm run measure-routes` — per-route first load, from Next's own analyzer | The baseline above; it is what showed `PERF-5c`'s premise was wrong |
| `PERF-5d` | Removed 5 zero-import runtime dependencies (`date-fns`, `recharts`, `dexie-react-hooks`, `react-day-picker`, `shadcn`) + the orphaned calendar component that was `react-day-picker`'s only importer | **0 shipped KB** — nothing ever imported them; install/lockfile hygiene only (recorded in §2.1, correction note) |
| `PERF-5e` | `compiler.removeConsole` (`error`/`warn` excluded) verified on a Turbopack build by marker-string build+scan: `log`/`info` stripped from all 36 client chunks, diagnostics kept; source maps confirmed production-off via local docs; Tailwind v4 auto-scans | Production bundles carry no stray console output, and device diagnostics survive |

### The `PERF-4b` number, stated precisely

Three of the timers were genuinely reading the clock: two 3-second day-rollover polls and
one 15-second day-and-hour poll. Visible and ticking, those woke **44 times a minute**
(20 + 20 + 4). They now share one wake per minute.

**The latency trade is real and should be stated, not buried.** A date change is now noticed
within 60 s rather than 3 s, and an hour change within 60 s rather than 15 s. This is
acceptable because `habits/page.tsx` already had `focus` and `visibilitychange` handlers —
coming back to a backgrounded tab updates the date *immediately*, which is the case that
actually matters. **Worst case is a visible tab left open across midnight, which now updates
up to 60 s late instead of 3 s.**

---

## 4. Timers — all four, classified

Measured by script, 2026-10-17. **Four, and only one is a clock.**

| Site | Period | Verdict |
|---|---|---|
| `app/habits/page.tsx` | 3 s | **the last real clock** — day-rollover poll, not yet migrated |
| `habits/habit-date-strip.tsx:326` | 30 ms, ≤15 attempts | layout-settle retry — **leave** |
| `planner/infinite-date-strip.tsx:295` | 30 ms, ≤15 attempts | layout-settle retry — **leave** |
| `onboarding/step-circadian.tsx` | 4.2 s | onboarding carousel, gated on `isAutoPlaying` — **leave** |

The two 30 ms timers poll `centerDate()` until the scroll container has laid out, then stop
after 15 attempts. **Folding them into the shared clock would fire them 60× slower than
their own timeout** and the carousel would stall. "One timer total" was the wrong goal.

---

## 5. Native — UNVERIFIED

Source-verified counts. **None of these has been profiled.**

| | Now | Note |
|---|---:|---|
| `RTC_WAKEUP` alarms | **4 across 2 files** | `OdysseyCadenceNotificationWorker.kt` ×2, `OdysseyHourlyWallpaperWorker.kt` ×2 |
| `SharedPreferences.commit()` | **9** | `.commit()` is synchronous; `.apply()` is not |
| `WAKE_LOCK` | **0** | removed — Rule 3 |
| `minifyEnabled` | **false** | R8 is off entirely |
| `REFRESH_INTERVAL_MS` | `60_000L` | the wallpaper is 1 render/minute |
| `gradlew` | **absent** | builds run through Android Studio's manual Gradle path |

**`RTC_WAKEUP` was initially understated as "2 in 1 file".** There is a second file. That
is the more dangerous direction to be wrong in — an audit that under-counts gets trusted.

### What is needed to close this out

On a **release** build, on a **real mid/low-end device** — not the emulator, not debug:

```
adb shell am start -W com.odyssey.tracker/.MainActivity    # cold start
adb shell dumpsys gfxinfo com.odyssey.tracker reset        # jank, frame time
adb shell dumpsys batterystats com.odyssey.tracker         # wakelocks, wakeups
adb shell dumpsys alarm | findstr odyssey                  # who is holding wakeups
```

Plus Perfetto, and `chrome://inspect` against the WebView for the web half inside it.

---

## 6. How to re-measure

```bash
npm run build                              # ALWAYS first - next start serves the previous build
node scripts/measure-bundle.js             # every chunk in the build
npm run measure-routes                     # what each screen loads at first paint
```

`npm run measure-routes` builds, runs Next's Turbopack analyzer, and prints §2.1's table.
It needs a **build** first: the analyzer reads the last build's output and reports the
*previous* code's numbers if there isn't one (its `--no-analyze` flag reuses an existing run).

Re-measure after any of these, and expect the combined figure to move:

- adding or removing a client component (changes JS)
- adding a `@keyframes`, a Tailwind animation, or a `backdrop-blur` (changes CSS)
- touching `next.config` (changes chunking)
- touching anything under `public/` (see the split-table warning in §2)
- **making something load on demand, or adding an import to the shell** — the first moves the
  build total *up* and the per-route numbers *down*; the second does the reverse

### Rules for anyone measuring

1. **Build first.** `next start` against a stale `.next` answers with the *previous* build
   and looks like a successful test of your change. This has happened.
2. **Release builds on real hardware.** A debug build tells you about the debug build.
3. **Assert both directions.** "Nothing animates" passes trivially if the disable rule fires
   unconditionally. Check that the thing still animates when it should.
4. **If profiling contradicts the ranking in `main_plan.md` §6.5.2, finish measuring, report
   the conflict, and ask before reordering.** Do not quietly re-sort the priority list.

---

## 7. Not written yet

`PERF-18` is `PARTIAL`. This file is **18d**. The other three are not built:

- **18a** — bundle-size budget that fails CI. **The number to enforce is the per-route first
  load (§2.1), not the build total** — `PERF-5` raised the total by 45 KB while cutting what a
  screen loads by 84 KB, so a total-based budget would have failed the change that fixed it.
  Start from `/planner` at **178.8 KB gzip**. **There is no `.github/workflows` in this repo**,
  so this needs the CI to exist first — which is a decision about where this project builds,
  not a perf task.
- **18b** — Lighthouse CI on the production build.
- **18c** — the Macrobenchmark startup test. Blocked on 13a (`minifyEnabled false`) and on
  hardware.

**Acceptance for 18a is "a regression fails CI rather than being discovered later." Until
there is CI, that acceptance test cannot be met by any amount of documentation.**