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
| Client JS (30 chunks) | 1,402.6 KB | **436.5 KB** | 31.1% |
| CSS (2 files) | 177.5 KB | **24.7 KB** | 13.9% |
| **Combined** | | **461.2 KB** | |
| Build media (`.next/static/media`) | 326.6 KB | 310.5 KB | 95.1% |
| Public images | 98.6 KB | 90.4 KB | 91.7% |

**Not counted in any total above:** `public/downloads/odyssey-latest.apk`, **11,587 KB**. It is
the **in-app updater payload** — downloaded deliberately by the updater, never on page load.
Counting it against "what a page costs" would be as wrong as excluding it from "what a
release costs", so the script reports it separately and judges it neither way.

**Largest JS chunks, by gzip** — this is what a slow connection actually pays:

| gzip | raw | chunk |
|---:|---:|---|
| 69.8 KB | 223.8 KB | `27t_qfc-3_lzs.js` |
| 43.1 KB | 130.3 KB | `3b4xr8rk6gswf.js` |
| 41.6 KB | 151.8 KB | `3jg84jwj6s1uj.js` |
| 38.6 KB | 110.0 KB | `0cz1d0mv5g_q7.js` |

**Why the table is split by compressibility.** A single "total bytes" figure hides problems
both ways. `public/` images and build media are ~91–95% incompressible, so 3 MB of images
contributes 3 MB of transfer; JS compresses 3:1, so 1.4 MB of source contributes 436 KB.
**Adding those together gives 461 KB and tells you the images are free. They are not.**
That mistake is exactly how a 1.8 MB logo survived in a directory no item was looking at.

---

## 3. What was delivered — and what it actually bought

| Item | Change | Measured effect |
|---|---|---|
| `PERF-4g` | Evening reminder 60 s poll → minute-boundary timeout | One wake/minute instead of one/second, **only while the modal is open**; also fixed a UTC/local date-key bug hiding inside it |
| `PERF-4b` | Three polling timers → one shared clock | **44 wakes/minute → 1**, and 0 while hidden |
| `PERF-19` | `logo.png` 1,808 KB → 88 KB | Public images are now **98.6 KB raw / 90.4 KB gzip** (3 files), measured today. `PERF-19` recorded 93 KB on a slightly different tree — the two figures were taken a few commits apart, and today's is the one to compare against |
| `PERF-9` | Deleted dead `@keyframes` | CSS 25.7 KB → **24.7 KB** gzip; 17 Tailwind animations gained a reduced-motion rule |
| `BUG-13` | Deleted 1,806 lines of orphaned components | −2 blur sites; removed a 7th `setInterval` that was dead |

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
node scripts/measure-bundle.js
```

Re-measure after any of these, and expect the combined figure to move:

- adding or removing a client component (changes JS)
- adding a `@keyframes`, a Tailwind animation, or a `backdrop-blur` (changes CSS)
- touching `next.config` (changes chunking)
- touching anything under `public/` (see the split-table warning in §2)

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

- **18a** — bundle-size budget that fails CI. The number to enforce is `461.2 KB` gzipped
  combined. **There is no `.github/workflows` in this repo**, so this needs the CI to exist
  first — which is a decision about where this project builds, not a perf task.
- **18b** — Lighthouse CI on the production build.
- **18c** — the Macrobenchmark startup test. Blocked on 13a (`minifyEnabled false`) and on
  hardware.

**Acceptance for 18a is "a regression fails CI rather than being discovered later." Until
there is CI, that acceptance test cannot be met by any amount of documentation.**