# ODYSSEY — CODE REVIEW: BUGS, INEFFICIENCIES & BATTERY AUDIT

**Status:** review only. No code was changed to produce this document.
**Scope:** full repo review with extra weight on the wallpaper subsystem and battery consumption.
**Reviewed at:** commit `1d87449` (5 local commits ahead of `origin/main`, unpushed)

> **⚠️ THIS FILE IS NOW THE SINGLE AUTHORITY FOR PERFORMANCE WORK.**
> §11 holds the **18-item performance overhaul specification**, imported verbatim from
> `tracker-performance-master-prompt.md`, which has been **deleted** — consolidating two
> sources into one rather than maintaining an anti-drift rule between them.
> `main_plan.md` **§6.5** carries the status (`PERF-0`…`PERF-18`);
> `MASTER_TODO_REVISED.md` **§23** carries a restated spec. **On any conflict, this file
> wins** and the other two are the stale side. Editing this file requires checking both.
>
> **Read §11.2 before implementing anything in §11.** Five of the eighteen items are
> already delivered and four of the figures in the imported text are stale. §11.2 is a
> reconciliation addendum dated **2026-10-08** and it **supersedes the numbers** below it.

---

## 1. EXECUTIVE SUMMARY

The most important finding: **yes, this app drains battery, and the dominant cause is a wallpaper
subsystem that is architecturally wasteful rather than merely imperfect.**

`OdysseyLiveWallpaperService` renders its **entire ~900-line scene graph 30 times per second**,
rebuilding the whole data model and re-allocating every drawing object each time, **solely to
animate a single alpha value that follows a 2.4-second sine wave.** It runs inside Android's
`WallpaperService`, so it burns CPU **while the app itself is closed**, whenever the wallpaper is
visible on the home or lock screen.

This is not a tuning problem. It is structural, and it is by a wide margin the largest single cause
of battery drain in this codebase.

Secondary contributors: two device-waking alarms per hour, a 1-second JS timer re-rendering a preview
at 60× the required precision, and ~22 heavy `backdrop-filter: blur()` layers in the WebView.

Every count below comes from direct instrumentation of the source, not estimation.

---

## 2. BATTERY AUDIT

### 2.1 CRITICAL — Live wallpaper re-renders the whole scene 30× per second

**File:** `android/app/src/main/java/com/odyssey/tracker/OdysseyLiveWallpaperService.kt` (972 lines)

The animation loop:

```kotlin
// lines 83-94
private val pulseRunnable = object : Runnable {
    override fun run() {
        if (visible) {
            val prefs = getSharedPreferences("odyssey_prefs", MODE_PRIVATE)
            val isEnabled = prefs.getBoolean("wallpaper_enabled", true)
            drawFrame()
            if (isEnabled) {
                handler.postDelayed(this, 33) // ~30 FPS silky-smooth organic breathing
            }
        }
    }
}
```

`drawFrame()` calls `renderWallpaper(canvas)` — a ~900-line function that rebuilds **everything**
on every frame.

**The key insight — what actually varies per frame is one float:**

```kotlin
// lines ~282-283
val elapsed = SystemClock.elapsedRealtime()
val breathPhase = ((sin(elapsed / 1200.0 * Math.PI) + 1.0) / 2.0).toFloat()
```

A smooth sine with a period of **2400 ms**. It drives the alpha of the "breathing" glow on the
active-task beacon. **That is the only per-frame changing value in the entire function.**

**Per-frame work performed to move one alpha value:**

| Operation | Per frame | Per second (×30) | Per hour visible (×108,000) |
|---|---|---|---|
| `Paint(...)` allocations | 57 | 1,710 | 6.16 M |
| `Typeface.create(...)` calls | 23 | 690 | 2.48 M |
| `"#RRGGBB".toColorInt()` parses | 53 | 1,590 | 5.73 M |
| `RadialGradient(...)` allocations | 3 | 90 | 324 K |
| `SimpleDateFormat` allocations | 1 | 30 | 108 K |
| Full `JSONObject(...)` schedule parse | 1 | 30 | 108 K |
| `getSharedPreferences(...)` lookups | 2 | 60 | 216 K |

The JSON re-parse (~line 300) is not a shallow read — it rebuilds `List<ScheduleBlockItem>` and
`List<HobbyItem>` by iterating arrays, splitting time strings and allocating a data-class instance
per block and per habit. **The data model is reconstructed 30 times a second from a source that has
not changed.**

`Typeface.create()` is especially costly: each call allocates a native font object, so 23 per frame
is ~690 native allocations per second to hold fonts that never change.

**Why this drains battery:**
- It runs in a `WallpaperService`, so it stays active with the app closed.
- `onVisibilityChanged(true)` starts the loop (~lines 112-120), and the wallpaper is visible on
  **both lock and home screens**. Every unlock and every drawer swipe triggers it.
- Sustained allocation at this rate creates heavy GC pressure, which itself costs CPU.
- Full-screen canvas work at 30 FPS keeps GPU and CPU at high clock — exactly what battery stats
  attribute to an app.

**Why 30 FPS is unnecessary:** a 2.4-second cycle at 30 FPS is ~72 frames per cycle for a value
that moves smoothly and predictably. Motion is imperceptibly different at 8-10 FPS.

### 2.2 HIGH — Inaccurate power claim in the source

Line 63 of the same file states:

> `* Zero battery drain: sleeps and removes callbacks whenever screen is off.`

The second half is accurate — `onVisibilityChanged(false)` calls `handler.removeCallbacks(...)` and
the loop genuinely stops when the screen is off.

But "Zero battery drain" is not true, and the comment will mislead the next engineer into assuming
the wallpaper is free. Where the wallpaper *is* visible, the app runs the full 30 FPS render from
2.1. Recommend rewording regardless of whether the render is eventually optimised.

---

### 2.3 HIGH — Two device-waking alarms per hour

**Files:** `OdysseyHourlyWallpaperWorker.kt`, `OdysseyCadenceNotificationWorker.kt`

Both schedule via:

```kotlin
alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.timeInMillis, pendingIntent)
```

`RTC_WAKEUP` + `setAndAllowWhileIdle` deliberately **wakes the device from Doze** — two forced
wakeups per hour, **~48 per day**, each spinning the CPU from cold idle.

| Alarm | Cadence | Purpose |
|---|---|---|
| `ACTION_HOURLY_WALLPAPER_UPDATE` | hourly at XX:00 | regenerate static wallpaper |
| `ACTION_CADENCE_NOTIFICATION` | hourly at XX:57 | notify about the next hour |

**The hourly wallpaper alarm is frequently wasted work.** `updateLockscreenWallpaper` early-returns
when the live wallpaper is already active:

```kotlin
// line ~197
if (wallpaperManager.wallpaperInfo?.packageName == context.packageName) {
    Log.d(TAG, "Odyssey Live Wallpaper is currently active. Skipping static setBitmap ...")
    return
}
```

That check happens **after** the alarm has fired and woken the device. So for every user of the live
wallpaper — the flagship feature — the app still wakes hourly, starts a thread via `goAsync()`, does
the SharedPreferences read and JSON parse, then discards the result. **The early return should happen
before scheduling, not after waking.**

`DEVELOPMENT_PLAN.md` §Phase 2 already carries the correct guidance ("Prefer inexact alarms /
WorkManager... Doze-friendly"); it simply has not been applied here.

---

### 2.4 MEDIUM — Unused `WAKE_LOCK` permission

`AndroidManifest.xml` line 15 declares:

```xml
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

Instrumentation of every `.kt` file returns **0 occurrences** of `newWakeLock` or `PowerManager`.
The permission is never exercised — a no-op today, but an unnecessary declaration that adds
install-time scrutiny for no benefit.

---

### 2.5 MEDIUM — Hourly worker allocates a ~10 MB bitmap

`OdysseyHourlyWallpaperWorker.kt` line ~208:

```kotlin
val bitmap = Bitmap.createBitmap(1080, 2340, Bitmap.Config.ARGB_8888)
```

1080 × 2340 × 4 bytes ≈ **10.1 MB**, allocated on a background thread every time the alarm fires,
then rendered into and pushed via `setBitmap`. Never explicitly recycled, so it becomes garbage.
Combined with 2.3, this runs ~24×/day.
**Suggested remediation (not applied):**
1. Render the static scene once into a cached `Bitmap`; per frame only composite the animated beacon
   over it. This alone removes ~99% of the work.
2. Hoist all `Paint`, `Typeface` and colour constants to fields created once.
3. Parse JSON once, re-parsing only on the `ACTION_WALLPAPER_DATA_UPDATED` broadcast.
4. Lower the frame rate to ~10 FPS, or drive the breath with a lower-rate `ValueAnimator`.
5. Skip redraws when `breathPhase` has not changed perceptibly.
---

### 2.6 MEDIUM — WebView: preview clock ticks 60× faster than it displays

`src/components/wallpaper/wallpaper-preview.tsx` line 44:

```tsx
const timer = setInterval(() => setCurrentTime(new Date()), 1000);
```

The value derived from it is `HH:MM` — **minute precision**. Ticking every second re-renders the
whole preview subtree once per second, to change a string at most once per minute.

Ticking to the next minute boundary would be correct *and* 60× cheaper — the single cheapest win in
the web layer.

---

### 2.7 MEDIUM — WebView: ~22 heavy `backdrop-filter` layers

This is the "chrome" cost inside the Chromium WebView.

`backdrop-filter: blur()` is not cheap. Each instance forces the compositor to read back the pixels
behind the element and run a multi-pass GPU blur. On mobile GPUs — especially in a WebView —
stacking several is a well-known cause of jank and elevated power draw.

| Metric | Count |
|---|---|
| `backdrop-blur-*` occurrences across `src/` | **41 across 21 files** (re-measured 2026-10-08; the original 46 no longer holds) |
| of which heavy (`-xl`, `-2xl`, `-3xl`) | **22** (original estimate — **not re-verified**, treat as a floor) |
| Always-on animations (`pulse`/`spin`/`radar-wave`/`bounce`) | 25 |
| Total `animate-*` usages | 80 |

**Mitigating factor — this is bounded.** `MainActivity` correctly pairs the lifecycle:

```kotlin
override fun onResume() { super.onResume(); webView.onResume() }
override fun onPause()  { webView.onPause(); super.onPause() }
```

`WebView.onPause()` pauses JS timers and rendering, so this cost does **not** accumulate in the
background — it is confined to foreground time. Good practice, worth preserving.

One caveat: `animate-pulse` on the habit-strip loading placeholders means any screen in the
placeholder state animates dozens of elements indefinitely. That state should be short, but if the
store ever fails to load it becomes a permanently animating screen.

---

### 2.8 LOW — Overlapping foreground timers

| File | Interval | Purpose |
|---|---|---|
| `wallpaper-preview.tsx` | 1 s | clock (see 2.6) |
| `habits/page.tsx` | 3 s | midnight rollover detection |
| `journey-day-schedule.tsx` | 5 s | current time |
| `planner/page.tsx` | 15 s | current hour/date |
| `evening-reminder-modal.tsx` | 60 s | tomorrow's schedule check |
| `infinite-date-strip.tsx` | — | scroll/resize observer |

All are cleaned up: `addEventListener` 13 / `removeEventListener` 13, `clearInterval` 14,
`clearTimeout` 17 — balanced, **no leak found**. But the aggregate wake rate with the planner open is
roughly one callback every 1-3 seconds, several triggering React re-renders.

**Recommendation:** consolidate the three overlapping "current time" timers (`planner` 15 s,
`journey-day-schedule` 5 s, `wallpaper-preview` 1 s) into one shared clock store.

---

### 2.9 LOW — Synchronous `SharedPreferences.commit()` on the bridge thread

`OdysseyWallpaperBridge.kt` uses `.commit()` in **9 places** (the original review said 8;
re-counted 2026-10-08). `commit()` does a **synchronous disk write and fsync** on the calling thread, whereas
`apply()` is asynchronous. These arrive via `@JavascriptInterface` from the WebView, so they block a
bridge thread on disk I/O. Should be `apply()` unless a read-back is genuinely required.

---

### 2.10 SUMMARY — BATTERY

| # | Severity | Finding | Impact |
|---|---|---|---|
| 2.1 | **Critical** | Live wallpaper re-renders full scene 30×/sec for one alpha | Dominant drain; runs with app closed |
| 2.3 | High | 2× `RTC_WAKEUP` alarms/hour, one frequently wasted | 48 device wakeups/day |
| 2.6 | Medium | 1-second clock tick at minute precision | 60× excess re-renders |
| 2.7 | Medium | ~22 heavy `backdrop-filter` layers | Foreground GPU cost (bounded by lifecycle) |
| 2.5 | Medium | 10 MB hourly bitmap allocation | 24×/day allocation churn |
| 2.4 | Medium | Unused `WAKE_LOCK` permission | Unnecessary permission |
| 2.8 | Low | Overlapping foreground timers | Redundant wakeups |
| 2.9 | Low | `commit()` instead of `apply()` | Blocking disk I/O |
| 2.2 | Low | Inaccurate "Zero battery drain" comment | Misleads future work |
---

## 3. WALLPAPER SUBSYSTEM — DEEP DIVE

The subsystem is **four separate renderers that all draw the same scene**, with no shared code:

| Renderer | File | Size | Trigger |
|---|---|---|---|
| Live wallpaper (Canvas, 30 FPS) | `OdysseyLiveWallpaperService.kt` | 972 lines | continuously while visible |
| Hourly static wallpaper (Bitmap) | `OdysseyHourlyWallpaperWorker.kt` | 884 lines | hourly alarm |
| Web preview (DOM/CSS) | `wallpaper-preview.tsx` | 18 KB | on demand in app |
| Web canvas generator | `wallpaper-generator.ts` | 27 KB | serialised via `toDataURL` |

### 3.1 Duplication is total and unreconciled

`resolveEmoji()` and `getCategoryBadge()` are **byte-identical duplicates** across
`OdysseyLiveWallpaperService.kt` and `OdysseyHourlyWallpaperWorker.kt`. These hold the category→colour
mapping and emoji fallback tables.

The consequence is not theoretical: when someone changes the "Deep Focus" colour in one file, the
two wallpapers silently diverge, and the lock screen shows a different colour from the home screen
for the same hour. **No test would catch this**, and the existing suite covers only TypeScript utils —
not the Kotlin renderers.

`getCatStyle()` is likewise duplicated between `src/app/planner/page.tsx` and
`src/app/day-schedule/page.tsx`. We already had to fix the same light-mode bug independently in both
files — exactly what duplication causes.

### 3.2 Layout constants are duplicated across all four renderers

Card padding, corner radii, top/bottom margins and the "leave 23% clear for the clock" rule are
hand-copied between the Kotlin live renderer, the Kotlin hourly renderer and the TypeScript
generator. The paths have drifted historically — the live service comments about "high-curvature
rounded cards (54f)" while the hourly renderer uses different values.

### 3.3 Bitmap is never recycled in the live service

When `wallpaper_enabled == false`, `renderWallpaper` decodes and draws:

```kotlin
val customBitmap = BitmapFactory.decodeFile(customFile.absolutePath)
canvas.drawBitmap(customBitmap, cropSrc, dstRect, p)
return
```

The bitmap is never `recycle()`d. This path runs once per visibility change rather than 30×/sec, so
it is minor — but combined with a 1440×2560 photo it is a real allocation left to the GC on every
unlock.

### 3.4 Bitmap decode happens before the one-off decision

`renderWallpaper` decodes the custom restoration bitmap before deciding the frame is a one-off. If
`wallpaper_enabled` is false the loop stops after one frame, but any other trigger (the data-updated
broadcast, or `onVisibilityChanged`) re-decodes the file from disk.

### 3.5 Base64 image is injected as JavaScript source

`MainActivity.handleSelectedPhotoUri` builds a full data-URL and injects it:

```kotlin
val js = "(function(){ window.dispatchEvent(new CustomEvent('odyssey:custom-wallpaper-selected', { detail: { base64: '$escapedBase64', target: '$target' } })); })();"
webView.evaluateJavascript(js, null)
```

A 1440×2560 JPEG at quality 90 base64-encodes to roughly **400 KB – 1 MB**, concatenated into a
single JavaScript source literal. This is fragile: `evaluateJavascript` compiles the string as JS
source, so a payload that large risks slow parsing or failure. It also runs on a background `Thread`
and touches `webView` afterwards without checking the activity is still alive.

The escape only handles `'`, which is correct for base64 (alphabet `A-Za-z0-9+/=`), so there is no
injection risk — but the approach should be `postMessage` rather than source injection.

### 3.6 Wallpaper is applied to LOCK and SYSTEM together

`OdysseyHourlyWallpaperWorker.kt` line ~214:

```kotlin
wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK or WallpaperManager.FLAG_SYSTEM)
```

This overwrites **both** lock screen and home screen in one call, contradicting the app's own
"Isolated Alternate Wallpapers" feature — a *shipped* feature, listed in the `version.json` changelog,
and separately implemented in `MainActivity` and `wallpaper-preview.tsx`. This line defeats it.
---

## 4. BUGS & SECURITY

### 4.1 HIGH — Bridge exposed to a remote URL, under two names

`MainActivity.kt` lines 207-208:

```kotlin
addJavascriptInterface(bridge, "OdysseyAndroid")
addJavascriptInterface(bridge, "Android")
```

The app loads a **remotely hosted** URL:

```kotlin
val targetUrl = intent.getStringExtra("TARGET_URL") ?: prefs.getString("live_vercel_url", defaultUrl) ?: defaultUrl
```

with `defaultUrl` = `https://odyssey-dun-rho.vercel.app` (from `strings.xml`). It is also
**user-overridable** via the `TARGET_URL` intent extra and the `live_vercel_url` preference.

`OdysseyWallpaperBridge` exposes **37 `@JavascriptInterface` methods** across 786 lines — including
wallpaper read/write, native photo selection, and APK install.

**Risk:** any JavaScript running in that WebView origin can call all 37 methods. If the Vercel
account were compromised, the domain hijacked, or a user pointed `live_vercel_url` at an untrusted
host, the result is native code execution on the device.

`@JavascriptInterface` annotation (present on all 37) limits invocation to API 17+, which is why
this is High rather than Critical — and `minSdk 24` means the mitigation does apply. But duplicating
the interface under a second global name doubles the surface for no benefit: the web layer already
prefers `OdysseyAndroid` and only falls back to `Android` defensively.

**Recommendation:** drop the `Android` alias; consider pinning the loaded host rather than allowing
an arbitrary `live_vercel_url`.

### 4.2 MEDIUM — `REQUEST_INSTALL_PACKAGES` + remote URL

Combined with 4.1: the bridge can trigger package installation, and the JS that triggers it comes
from a remote origin. This deserves an explicit threat-model decision rather than an inherited
default.

### 4.3 LOW — Emoji display as mojibake in tooling

Initially suspected to be a source-encoding corruption. **Verified as NOT a bug** — byte-level UTF-8
decoding confirms the file correctly contains `🧘`. This is a PowerShell console rendering artifact.
Recorded here so no one else wastes time on it.

---

## 5. INEFFICIENCIES & CODE QUALITY

### 5.1 Page components are enormous

| File | Size |
|---|---|
| `journey/journey-day-schedule.tsx` | 46.0 KB |
| `app/planner/page.tsx` | 45.7 KB |
| `app/habits/page.tsx` | 41.3 KB |
| `app/day-schedule/page.tsx` | 39.4 KB |
| `app/page.tsx` | 35.4 KB |
| `app/stats/page.tsx` | 34.9 KB |
| `lib/utils/android-bridge.ts` | 34.2 KB |
| `app/wallpaper/page.tsx` | 29.5 KB |
| `lib/utils/wallpaper-generator.ts` | 27.0 KB |

Four route files are 39-46 KB each. `DEVELOPMENT_PLAN.md` D1/D2 already flag `android-bridge.ts` as
the highest-degree god-node; the page components are the same problem at the UI layer and are **not
yet on the register**.

### 5.2 `android-bridge.ts` checks two globals at 43 call sites

Every native call site tests `window.OdysseyAndroid?.x` and falls back to `window.Android?.x`. With
the alias removed (4.1), all 43 sites collapse to one check and the 34 KB file shrinks meaningfully.

### 5.3 Test coverage does not reach the wallpaper renderers

The existing suite (7 files, 90 tests) covers TypeScript utils only. **Zero tests for the Kotlin
wallpaper renderers**, which is where the highest-risk duplication lives (3.1) and where the
category→colour mapping is defined. `resolveEmoji` and `getCategoryBadge` are pure functions and
would be trivially testable once extracted to a shared file — which fixing 3.1 requires anyway.

### 5.4 Lint debt

`npx eslint` reports **59 pre-existing errors across 23 files** (re-confirmed this session: planner
5, stats 0, day-schedule 2, wallpaper-preview 2, habit-store 0). Several are
`react-hooks/set-state-in-effect`, indicating effects that should be derived state.

### 5.5 localStorage used 70 times with no wrapper

Theme, journey start date, onboarding flag, habit cache, block cache, claimed rewards, planner
selected date, native schedule cache, alternate wallpapers — all hand-rolled. Most correctly guard
against private-mode failure, but the habit cache is the only one with a size cap and shape
validation. A thin wrapper would centralise quota handling and give one place to add the cap.
---

## 6. RECOMMENDED ORDER OF WORK

| Priority | Item | Rationale |
|---|---|---|
| 1 | Cache the static wallpaper scene; animate only the beacon (2.1) | Single largest battery win by a wide margin |
| 2 | Drop the `Android` bridge alias; assess `live_vercel_url` (4.1) | Security; also simplifies 5.2 |
| 3 | Move the hourly early-return before alarm scheduling (2.3) | Removes ~24 wasted wakeups/day |
| 4 | Tick the preview clock on the minute boundary (2.6) | Trivial, 60× reduction |
| 5 | Extract shared `resolveEmoji`/`getCategoryBadge`/`getCatStyle` (3.1) | Stops renderer divergence; enables tests |
| 6 | Consolidate the three "current time" timers (2.8) | Removes redundant wakeups |
| 7 | Audit the ~22 heavy `backdrop-blur` layers (2.7) | Foreground GPU cost |
| 8 | Remove unused `WAKE_LOCK`; switch `commit()` → `apply()` (2.4, 2.9) | Trivial hygiene |
| 9 | Fix the LOCK+SYSTEM wallpaper overwrite (3.6) | Currently defeats a shipped feature |
| 10 | Add Kotlin renderer tests (5.3) | Prevents regression on 3.1 |

---

## 7. DIRECT ANSWER TO THE BATTERY QUESTION

> *Does this app consume extra battery on the name of Chrome?*

**Yes — but the dominant cost is not the Chromium engine.**

Two distinct things can be meant by "chrome", and both were investigated:

1. **The Chromium WebView the app is built on.** Real but **bounded and moderate**. ~22 heavy
   `backdrop-filter: blur()` layers and 80 `animate-*` usages cost real GPU while the app is
   foreground, and the preview clock re-renders 60× more often than needed (2.6, 2.7). Critically,
   `MainActivity.onPause()` → `webView.onPause()` correctly suspends timers and rendering, so this
   **does not drain battery in the background**. Foreground cost only.

2. **Visual chrome (UI decoration).** Some real cost, but secondary.

**The actual dominant drain is neither — it is the native live wallpaper (2.1)**, which runs inside
Android's `WallpaperService` and keeps working **with the app fully closed**, whenever the wallpaper
is visible. It re-renders an entire ~900-line scene graph 30 times a second to move one alpha value,
allocating ~1,710 `Paint` objects and ~690 native `Typeface` objects *per second*.

That single issue is very likely an order of magnitude larger than everything the WebView does.

---

## 8. RESOLVED — WHAT WAS CHANGED (2026-10-04, phase P8)

| # | Finding | Resolution |
|---|---|---|
| 2.1 | Per-frame JSON re-parse + `SharedPreferences` read, and a 30 FPS full-scene redraw | **Fixed (2026-10-04).** The animation is gone: the engine is now **static**, rendering once and re-rendering only on the minute boundary. The schedule JSON is also cached in `CachedSchedule`, invalidated on sync and on day rollover. Per-render cost drops from ~30/sec to ~1/min. |
| 2.2 | "Zero battery drain" claim | **Fixed.** Comment replaced with what the engine actually does. |
| 2.3 | Hourly alarm wakes device even when wallpaper is off | **Fixed.** `scheduleNextHourlyUpdate` returns early when the master switch is off. |
| 2.4 | Unused `WAKE_LOCK` | **Fixed.** Removed from the manifest after confirming 0 call sites. |
| 2.6 | Preview clock ticks 60× too fast | **Fixed.** Now re-arms on the minute boundary. |
| 3.6 | `FLAG_LOCK or FLAG_SYSTEM` defeats isolated wallpapers | **Fixed.** Lock and system are applied in separate, individually guarded calls. |
| — | **Wallpaper defaulted to enabled and could not be stopped** | **New.** A fail-closed, default-off master switch (P8-E1). Off = hides Studio, guards `/wallpaper`, stops the loop, cancels the alarm, restores the user's lock/home wallpapers. Native authoritative; bridge errors resolve to OFF. |

### 8.1 Two defects this work surfaced

Both were invisible to `tsc`, `lint` and the test suite, which is why they are recorded here:

1. **`nativeEnabled || webEnabled`** — with native authoritative, `||` silently turns "native says
   no" into "on" whenever the browser's `localStorage` is stale. This would have defeated the entire
   feature while every test stayed green. Now `nativeEnabled === null ? webEnabled : nativeEnabled`.
2. **Uncompiled Kotlin.** There is no `gradlew` in this repo, so a `CachedSchedule` class nested
   inside an `inner class` (illegal in Kotlin) passed a fully green web gate. It was only caught by
   running `:app:compileDebugKotlin`. See `DEVELOPMENT_PLAN.md` rule 6.6 step 5 and risk R12.

---

## 9. METHODOLOGY & LIMITATIONS

**How counts were obtained:** direct instrumentation over the source tree via `Select-String` and
byte-level UTF-8 decoding. No figures are estimated or extrapolated except where explicitly labelled
as arithmetic on measured counts.

**What was NOT done:**
- **No profiling was performed.** This is a static read of the code, not a measurement of a running
  device. The §2 findings are structural and provable from source, but a real
  `adb shell dumpsys batterystats` capture would be needed to put a percentage on the drain.
- **No device or emulator verification.** The wallpaper disable path (restore of the user's lock and
  home wallpapers, alarm cancellation, loop stop) is verified by compilation and by reading
  `clearLockscreenWallpaper()` / `cancelHourlyUpdate()`, **not** by running it on hardware. This
  remains open and is the single most important manual check before release.
- **The Chromium WebView impact was reasoned** from known `backdrop-filter` and timer behaviour, not
  measured on device. `MainActivity`'s `onPause`/`onResume` pairing bounds it correctly, which is the
  key mitigating fact.
- No visual UI review was performed; findings are from source and DOM/computed-style inspection.

**Corrected since first write:** the original review stated the Kotlin was not compiled. That is no
longer true — `:app:compileDebugKotlin` now exits 0 and is a required gate (rule 6.6 step 5).

---

## 10. CODEBASE HEALTH AUDIT (2026-10-04)

**Why this section exists.** Sections 2–8 were a feature-focused review. This is a *whole-codebase*
sweep covering everything the earlier review did not, aimed at one goal: **stop new code from
reproducing the patterns that keep causing defects.**

**Method.** Static instrumentation over the full source tree (`src/`, `android/app/src/main/`) plus a
full `eslint` run. Every number below is counted, not estimated.

### 10.1 Summary

| Class | Count | Severity |
|---|---|---|
| **C1 Silent failures** (empty `catch`) | **77** (70 TS + 7 Kotlin) | **CRITICAL** |
| **C2 No single source of truth** | 5 families, ~390 sites | **HIGH** |
| **C3 React correctness** (`setState` in effect) | **21** across 18 files | **HIGH** |
| **C4 Type-safety holes** (`any` / `!`) | **31 `any`**, 11 `!` | MEDIUM |
| **C5 Dead code** | **92 unused**, 12 dead exports, 16 `console.log` | MEDIUM |
| **C6 Test coverage** | 0 tests for pages/components/native | **HIGH** |
| **C7 Accessibility** | 8 `<img>`, 3 modals w/o keyboard handling | LOW — deferred |

**Totals: 157 lint findings (58 errors, 99 warnings) across the tree.**

### 10.2 C1 — Silent failures · CRITICAL · **RESOLVED (Pass 1)**

**70 TypeScript `try` blocks have a `catch` that does nothing. That is 67% of all 104 `try` blocks.**
7 more on the Kotlin side. Total **77**.

When something fails in Odyssey, it fails invisibly. This is the single class that explains the
defects found earlier in this document and in the wallpaper work: a wrong default buried inside an
empty `catch`, where nothing reports it.

| File | Empty catches |
|---|---|
| `src/lib/utils/android-bridge.ts` | **35** |
| `src/app/planner/page.tsx` | 6 |
| `src/app/stats/page.tsx` | 5 |
| `src/lib/stores/wallpaper-toggle-store.ts` | 4 |
| `src/components/common/app-update-modal.tsx` | 3 |
| `src/app/day-schedule/page.tsx` | 3 |
| `src/lib/habit-cache.ts` | 2 |
| `src/app/habits/page.tsx` | 2 |
| `src/lib/stores/wallpaper-store.ts` | 2 |
| 9 further files | 1 each |

`android-bridge.ts` alone accounts for **half**. Its 35 empty catches sit directly on the path where
the wallpaper default bug lived — every one is a place where a failure would be invisible on a real
device only.

**Not all 77 are defects.** Some are legitimately optional browser APIs (a `localStorage` read that
may legitimately throw in private mode). Those get an explanatory comment instead of a log. The rest
get real logging.
### 10.3 C2 — No single source of truth · HIGH

Every one of these is a place where the next feature will copy the existing pattern, which is how
the count grows.

| Concern | Current state | Consequence |
|---|---|---|
| "Is this a real Android device?" | **59 hand-written copies** of detect → call → fall back | Copies have **already drifted**. This is the `nativeEnabled \|\| webEnabled` defect (see 8.1). |
| Dates | **101** `new Date(…)` + **25** `toLocale*` calls | No single formatting rule; timezone bugs are per-call-site |
| Saved settings | **78** `localStorage` reads + 12 raw key strings | No typed keys; typos are silent |
| Colours | **149** hardcoded hex values | Theme-blind — dark mode cannot be fixed properly |
| Categories | **2 divergent unions** (`db.ts:44` vs `db.ts:59`) | `work`/`Work`, `health`/`Health`, `sleep`/`Sleep` are the *same idea*, differently spelled |

`android-bridge.ts` is **1,027 lines with 35 exports**, and **11 of those exports are dead** —
unused bridge code that has never been exercised and cannot be assumed to work.

**Importers (6):** `day-schedule`, `planner`, `wallpaper`, `app-update-modal`, `app-shell`,
`profile-settings-sheet`. Every native feature in the app funnels through this file.

### 10.4 C3 — React correctness · HIGH

**21 `setState`-called-synchronously-inside-`useEffect` errors**, spread across **18 files** — this
is systemic, not localised.

```
7  day-schedule/page.tsx       4  planner/page.tsx        4  wallpaper/page.tsx
4  evening-reminder-modal      3  edit-habit-modal        3  edit-hour-modal
1  profile/page.tsx            1  shop/page.tsx           1  habit-date-strip
1  habit-month-calendar        1  habit-template-library  1  journey-day-schedule
1  profile-settings-sheet      1  day-schedule-modal      1  distribution-modal
1  inbox-drawer                1  infinite-date-strip
```

These are cascading-render risks: state written during an effect forces at least one extra render
pass. Two additional warnings — *"Compilation Skipped: Existing memoization could not be preserved"* —
show the React compiler has **already given up** on preserving memoisation in two places.
### 10.6 C5 — Dead code · MEDIUM

**92 unused** declarations: **70** imported-but-unused, **22** assigned-but-never-read.

Worst files: `planner/page.tsx` (12), `inbox-drawer.tsx` (11), `wallpaper-preview.tsx` (11),
`page.tsx` (9), `day-schedule/page.tsx` (7), `shop/page.tsx` (5), `profile/page.tsx` (4).

Also: **16** `console.log` left in production code, **81** `Log.d`/`Log.w` in production Kotlin,
**12 dead exports** (11 in `android-bridge.ts`).

### 10.7 C6 — Test coverage · HIGH

8 suites exist, all covering **pure helper functions** (`journey`, `gamification`, `habit-colors`,
`day-status`, `onboarding`, `wallpaper-generator`, `habit-cache`, `wallpaper-toggle-store`).

**Zero tests for:** any page component, any UI component, `android-bridge.ts`, and **all Kotlin**.
Every defect class above lives in the untested regions.

### 10.8 C7 — Accessibility · LOW (deferred)

8 `<img>` without `next/image`, 4 `<img>` missing `alt`, and only 3 `onKeyDown`/`aria-modal`
occurrences across every modal in the app — so most modals are not keyboard-dismissable. No
`onClick` on raw `div`/`span` (good). **Deferred**: real work, but not defect-causing.

---

### 10.9 Remediation plan

Scope agreed 2026-10-04: **fix everything that can cause a defect or will bite new features
(C1–C6). Defer C7.** Each pass is one commit and leaves the app working.

| Pass | Class | What it does | Behaviour change |
|---|---|---|---|
| **1** | C1 | Empty `catch` → real logging (classify optional-browser cases) | None |
| **2** | C2 | One home per concern: bridge, dates, storage, colours, categories | None intended |
| **3** | C3, C4 | `setState`-in-effect, `any` in live paths, memoisation bailouts | None intended |
| **4** | C5 | Delete unused + dead exports + `console.log` | None |
| **5** | — | **ESLint guards so the above cannot return** | Build fails on new violations |

**Pass 5 is what stops this audit from being undone.** The config is currently bare Next defaults,
so nothing prevents the patterns returning. These rules make new code fail the build:
empty `catch` · `any` · direct `localStorage` outside the storage module · direct date formatting
outside the date module · raw hex outside colour tokens.

### 10.10 Fix log

| Date | Pass | Result |
|---|---|---|
| 2026-10-04 | Audit | Recorded. Nothing changed yet. |
| 2026-10-04 | **Pass 1** | **77/77 empty catches eliminated.** Added `src/lib/utils/logger.ts` (`logWarn`/`logError`). TS: 70 → 0 across 16 files. Kotlin: 7 → 0 across 2 files. Messages name the actual failed operation. **Zero behaviour change.** |
| 2026-10-04 | **Pass 2** | Typed storage module; 85 call sites migrated. Bridge alias resolved once — direct `window.OdysseyAndroid`/`window.Android` references **59 → 1**, file **1027 → 813 lines**. Two divergent category unions unified (`normalizeCategory` + 8 new tests). |
| 2026-10-04 | **Pass 3/4 (C4)** | **All 31 `any` casts removed.** Two real defects fixed: placeholder habits rendered the *user's real streak* on the wallpaper; `edit-hour-modal` cast a status the modal cannot represent. |
| 2026-10-04 | **Pass 5** | **Six lint guards added, all reporting 0:** empty `catch`, `any`, direct `localStorage`, direct bridge namespaces, `eqeqeq`, `prefer-const`. Each boundary rule exempts exactly one file — the module that owns the concern. |

### 10.11 What is still open, and why

| Item | Count | Why it was not forced |
|---|---|---|
| `react-hooks/set-state-in-effect` | 21 | Real cascading-render risk, but most are legitimate async-fetch patterns. Fixing them mechanically would change behaviour, so each needs individual judgement. **Not guarded** — a wrong guard here would be worse than none. |
| Unused imports | ~100 | Dead weight, zero defect risk. A scripted removal was unreliable (two script bugs below), so they were left rather than half-fixed. |
| Direct `window.*` bridge access | 0 | Resolved by the resolver. Guarded. |
| Hardcoded hex colours | 149 | Theme migration, not a correctness fix. Changing them alters rendered output and needs visual review per screen. Deliberately deferred. |
| Date formatting spread | 101 `new Date` | Same — needs per-site review to avoid changing what users see. |

**Two script failures worth remembering**, both caught by `tsc` rather than by the script
reporting success: a PowerShell function defined *inside* a loop silently no-opped, and
`"str" + @array` concatenates element-wise, merging import names into one identifier. Both
were rebuilt to take ESLint's own output as the source of truth instead of a regex over
file text.

---
Related: **1** `exhaustive-deps` violation, **2** `no-location-assign` (internal navigation via
`window.location` instead of the router).

### 10.5 C4 — Type-safety holes · MEDIUM

**31 `any` casts** and **11 non-null assertions**, concentrated in exactly the native bridge:

| File | `any` casts |
|---|---|
| `src/lib/utils/android-bridge.ts` | **14** |
| `src/app/day-schedule/page.tsx` | 3 |
| 8 further files | 1–2 each |

The bridge is where types are weakest *and* where a mistake only shows up on a real phone. That
combination is the worst case in the codebase.

---
**Confidence:** the live-wallpaper finding (2.1) is the highest-confidence item here. The 30 FPS
loop, the full-scene re-render and the single-sine-variable are all directly readable in the source,
and the arithmetic follows from measured per-frame allocation counts.
---

## 11. PERFORMANCE OVERHAUL - MASTER SPECIFICATION

**Origin and history.** Imported verbatim on 2026-10-08 from
`tracker-performance-master-prompt.md`, which has since been **deleted**. Two authoritative
sources for one piece of work invites drift, so the documents were merged rather than kept in
sync by rule. This file is now the **single authority**.

- `main_plan.md` **section 6.5** carries the **status** (`PERF-0` ... `PERF-18`).
- `MASTER_TODO_REVISED.md` **section 23** carries a **restated specification**.
- **On any conflict, this file wins** and the other two are the stale side. Editing this file
  requires checking both.

**Read 11.2 BEFORE implementing anything in 11.1.** Five of the eighteen items are already
delivered and four of the figures in the imported text are stale. 11.2 is a reconciliation
addendum dated 2026-10-08 and it **supersedes the numbers** in the text below.

### 11.1 Imported specification

*Verbatim, except that Markdown heading levels are demoted two levels so the imported document
nests under this heading instead of introducing top-level headings that collide with this
file's own structure. No wording was altered.*
## MASTER PROMPT — Tracker App Performance Overhaul

You are a senior Android + Next.js performance engineer. Your job is to make the **Tracker** app (a Next.js web UI running inside a Kotlin Android WebView shell, with schedule/habit/planner screens and a live wallpaper service) **load faster, render smoother, and drain far less battery**.

**You must follow this document in order.** Work through the items from #1 down to #18 sequentially. Do not skip ahead, do not reorder on your own, and do not start an item until the previous one is finished, verified, and committed. If your profiling contradicts the ranking, finish your measurement, report the conflict, and ask before reordering.

Items tagged **[AUDIT]** come from the prior code review of this repo. Items or sub-steps tagged **[ADDED]** are extra improvements on top of that review.

---

### 0. Ground rules (apply to every item)

1. **Verify before you change.** The audit's numbers (line counts, allocation counts, alarm counts) were estimated from a review. Open the real code, confirm the problem exists as described, and note the actual figures. If something is already fixed or described inaccurately, say so and move on.
2. **Measure before and after.** Before item #1, record baselines. After each item, re-measure and record the delta.
   - Android: `adb shell am start -W <package>/<activity>` (cold start), `adb shell dumpsys gfxinfo <package>` (jank), `adb shell dumpsys batterystats <package>`, `adb shell dumpsys alarm | grep <package>` (alarm count/wakeups), Android Studio CPU/Memory profilers, Perfetto.
   - Web: `chrome://inspect` against the WebView (Performance + Memory tabs), React DevTools Profiler, `ANALYZE=true next build` (bundle analyzer), Lighthouse on a production build.
   - Always measure **release builds** on a real mid/low-end device, not the emulator and not debug builds.
3. **No behavior or visual regressions.** The wallpaper must look pixel-identical to today (take reference screenshots first). The UI must look and behave the same unless an item explicitly says otherwise.
4. **One item = one commit** (or one small PR) with a message like `perf(#1): cache static wallpaper scene`. Keep diffs focused.
5. **Prefer the smallest correct change.** Do not rewrite architecture when a targeted fix achieves the goal.
6. **Report format after each item:** what you found, what you changed (files), before/after numbers, risks, and how you tested it.
7. If a step is risky or ambiguous (e.g., an alarm that genuinely must be exact), stop and ask instead of guessing.

---

### THE PRIORITY LIST (highest impact first)

---

#### #1 — 🔴 CRITICAL: Stop re-rendering the whole wallpaper 30×/second `[AUDIT]`
**Where:** `OdysseyLiveWallpaperService.kt` (Kotlin)
**Problem:** The live wallpaper redraws the entire ~900-line scene 30 times per second just to animate one alpha value (the breathing beacon, a ~2.4 s cycle). This is the single largest CPU/GPU/battery cost in the app (~99% of the redraw work is wasted).

**Do, in this order:**
- **1a. Cache the static scene.** Render the full static wallpaper once into an off-screen `Bitmap` (sized to the surface). Each frame, draw the cached bitmap, then draw only the animated beacon on top with the current alpha.
- **1b. Invalidate the cache only when inputs change:** surface size/rotation change, schedule/data update, hour or day rollover, theme/config change, custom wallpaper image change. Rebuild lazily and off the draw path where possible.
- **1c. Hoist allocations out of the draw loop.** `Paint`, `Typeface`, `Path`, `Rect/RectF`, and color constants become fields created once (the audit estimates ~1,710 `Paint` allocations per second today). No object allocation inside the per-frame draw function.
- **1d. Parse JSON once.** Parse the schedule/config JSON when data is updated (and cache the parsed model), never inside the frame loop.
- **1e. Lower the animation rate to 10 FPS** (a 2.4 s breathing cycle is visually indistinguishable at 10 FPS). Precompute the alpha values for one full cycle into a lookup table (e.g., 24 entries) instead of computing trig per frame.
- **1f. [ADDED] Stop drawing when not visible.** In `onVisibilityChanged(false)` remove all frame callbacks; on `true` draw once and resume. Also stop on `onSurfaceDestroyed` and clean up everything in `onDestroy`.
- **1g. [ADDED] Respect power-saving.** If `PowerManager.isPowerSaveMode` is on (or the system animator scale is 0), draw the static frame only or drop to ~5 FPS.
- **1h. [ADDED] Optional, after measuring:** pre-render the beacon as a small sprite bitmap and use `Paint.alpha`; limit redraw to the beacon's dirty rect; consider `lockHardwareCanvas()` (API 26+) if it measurably helps and stays correct.

**Acceptance:** Wallpaper is visually identical; per-frame work is "draw cached bitmap + beacon"; no allocations in the draw loop; zero drawing while not visible; CPU use of the wallpaper process drops by an order of magnitude in the profiler.

---

#### #2 — 🟡 HIGH: Eliminate wasted device wake-ups `[AUDIT]`
**Where:** the alarm scheduling code (hourly wallpaper update + cadence notification), Kotlin
**Problem:** Two `RTC_WAKEUP` alarms per hour wake the device from Doze. The hourly wallpaper alarm wakes the phone, *then* checks whether the live wallpaper is even active, and early-returns. That is a pure waste. (The audit quotes both "~24 wasted wakeups/day" and "48 wakeups/day" in different places — verify the real count with `dumpsys alarm` and report the true number.)

**Do:**
- **2a. Move the early-return check before scheduling.** If the live wallpaper isn't active, don't schedule the hourly alarm at all (and cancel any existing one when the wallpaper is removed/deactivated).
- **2b. Use inexact, non-waking scheduling** where exact timing isn't required: `WorkManager` periodic work, or `setInexactRepeating` / `setAndAllowWhileIdle` with a non-`WAKEUP` type. Keep a wake-up alarm **only** for user-visible notifications that truly must fire on time (and then use the right exact-alarm API and permission for the target SDK).
- **2c. [ADDED] Remove the alarm for the wallpaper entirely when possible.** While the wallpaper engine is visible, register a dynamic `BroadcastReceiver` for `ACTION_TIME_TICK`/`ACTION_DATE_CHANGED`/`ACTION_TIMEZONE_CHANGED`/`ACTION_TIME_CHANGED` (or just compute "next hour boundary" and `Handler.postDelayed`) and unregister when not visible. No alarm needed if nothing is on screen.
- **2d. [ADDED]** Re-schedule alarms correctly after reboot/time change only if still needed.

**Acceptance:** `dumpsys alarm` shows no wake-up alarms for the wallpaper when it isn't active; the early return happens before any alarm is set; notification timing still works.

---

#### #3 — 🟡 HIGH: Cold-start and WebView load path `[ADDED]`
**Where:** `MainActivity`, `Application` class, WebView setup, Next.js export/config
**Problem:** Perceived "loading time" is dominated by app launch → WebView creation → first meaningful paint.

**Do:**
- **3a. Confirm how the web app is delivered** (bundled assets vs. remote URL vs. local server). Optimize accordingly:
  - Bundled: serve via `WebViewAssetLoader` from assets (no network, no server round trip); use a static export if the app doesn't need SSR.
  - Remote: add HTTP caching headers / a service worker for the shell and static assets; preconnect early.
- **3b. Warm up the WebView early** (create/initialize it in `Application.onCreate` via an idle handler, or as the very first thing in the Activity) and **reuse a single instance**.
- **3c. Don't block the main thread during startup.** Defer non-critical init (analytics, bridges not needed on the first screen, alarm setup) until after first frame; use the AndroidX App Startup library or `Looper.myQueue().addIdleHandler`.
- **3d. Native splash/skeleton until the web side is ready.** Use the `SplashScreen` API (or a lightweight native placeholder) and dismiss it when the web app calls a bridge `onAppReady()` after first paint — so the user never sees a white WebView.
- **3e. Sensible WebView settings:** `domStorageEnabled`, `cacheMode = LOAD_DEFAULT`, hardware acceleration on, `setWebContentsDebuggingEnabled(false)` in release.
- **3f. Prefetch other routes on idle** (after first paint), not at startup.

**Acceptance:** Cold-start-to-first-paint time (via `am start -W` + a JS `performance.mark` reported through the bridge) is measurably lower; no white flash; no startup main-thread jank.

---

#### #4 — 🟡 HIGH: Fix the redundant JS timers / clock re-renders `[AUDIT]`
**Where:** `wallpaper-preview.tsx`, `journey-day-schedule.tsx`, `planner/page.tsx` (TypeScript)
**Problem:** `wallpaper-preview.tsx` runs `setInterval(() => setCurrentTime(new Date()), 1000)` to show a **minute-precision** time → 60× more re-renders than needed. Three overlapping timers exist (1 s in `wallpaper-preview`, 5 s in `journey-day-schedule`, 15 s in `planner/page.tsx`).

**Do:**
- **4a. Tick on minute boundaries only.** Align to the next minute: `setTimeout(tick, 60000 - (Date.now() % 60000) + 50)` and re-arm after each tick (~10 lines). Don't use a fixed 1 s interval.
- **4b. Consolidate into one shared clock store.** Create a single `useNow()` hook backed by `useSyncExternalStore` with one timer total, started when the first subscriber mounts and stopped when the last unmounts. Replace all three timers with it. If a screen truly needs finer granularity (confirm it does), let the store offer an explicit opt-in granularity instead of a private timer.
- **4c. [ADDED] Pause when hidden.** Stop ticking while `document.hidden` is true (and when the WebView is paused); on `visibilitychange` back to visible, refresh immediately.
- **4d. [ADDED] Re-render only what depends on time.** Isolate the clock display into a tiny component so a tick doesn't re-render whole pages.
- **4e. [ADDED]** Test minute rollover, midnight rollover, DST change, and timezone change.

**Acceptance:** Exactly one active timer app-wide; ticks occur on minute boundaries; React Profiler shows ~60× fewer renders on the preview screen; no timers while backgrounded.

---

#### #5 — 🟠 MEDIUM-HIGH: Route-level code splitting and bundle diet `[AUDIT]` + `[ADDED]`
**Where:** `planner/page.tsx`, `day-schedule/page.tsx`, `habits/page.tsx`, `journey-day-schedule.tsx` (each ~39–46 KB), plus the rest of the Next.js app
**Problem:** Four very large route files are parsed up-front, slowing initial load and time-to-interactive.

**Do:**
- **5a. Run the bundle analyzer** (`@next/bundle-analyzer`) and record the baseline per-route JS size.
- **5b. Confirm route-level splitting is actually happening**; heavy, below-the-fold, or modal-only components use `next/dynamic` (with `ssr: false` where appropriate for a WebView app) or `React.lazy`.
- **5c. Extract hooks and sub-components** from the four giant files into separate modules (`hooks/`, `components/`) so each route's parse cost shrinks and the code becomes testable.
- **5d. [ADDED] Trim dependencies:** replace heavy libs with lighter ones (e.g., moment → date-fns/dayjs), import icons individually (e.g., `lucide-react` named imports / `optimizePackageImports`), remove unused packages, avoid importing whole utility libraries.
- **5e. [ADDED] Production build hygiene:** minification on, source maps off in the shipped build, `compiler.removeConsole` for production, ensure Tailwind purges unused CSS.
- **5f. [ADDED]** Enable the React Compiler if the Next/React version supports it and the profiler shows benefit.

**Acceptance:** Smaller initial JS per route (report KB before/after); route components load on demand; no file over ~15–20 KB without good reason.

---

#### #6 — 🟠 MEDIUM-HIGH: JS ↔ Kotlin bridge and wallpaper sync efficiency `[ADDED]`
**Where:** `OdysseyWallpaperBridge.kt`, the TypeScript code that calls it
**Problem:** Sending full schedule/config payloads across the bridge on every change causes repeated serialization, disk writes, and wallpaper cache invalidation (which now makes #1's cache rebuild expensive if triggered too often).

**Do:**
- **6a. Debounce/throttle** wallpaper-sync calls from JS (e.g., 300–500 ms trailing debounce); never sync per keystroke or per render.
- **6b. Send only when data actually changed** (compare a hash/version of the payload); skip no-op updates.
- **6c. Batch** multiple preference writes into a single `Editor` transaction.
- **6d. Keep `@JavascriptInterface` methods fast:** do real work on a background thread/dispatcher, not on the bridge thread.

**Acceptance:** Editing a schedule triggers at most one bridge call and one cache rebuild per burst of edits.

---

#### #7 — 🟠 MEDIUM: Reduce heavy `backdrop-filter` blur `[AUDIT]`
**Where:** Tailwind classes across the UI (`backdrop-blur-xl`, `-2xl`, `-3xl`, etc.)
**Problem:** ~22 stacked heavy blur layers are expensive on mobile GPUs. Note the mitigating factor: `MainActivity.onPause()` → `webView.onPause()` already pauses rendering in the background, so this is a **foreground-only** cost (jank while scrolling/animating).

**Do:**
- **7a. Audit and list every `backdrop-blur-*` use** (file, class, whether it sits over scrolling/animated content).
- **7b. Reduce the number of layers:** replace many small stacked blur layers with a few larger blur blocks; never nest blurs.
- **7c. Use cheaper effects where visually acceptable:** semi-transparent solid backgrounds or opacity gradients instead of blur.
- **7d. [ADDED] Cap radii:** nothing above `backdrop-blur-md` on full-screen or scrolling surfaces; avoid animating elements that have `backdrop-filter`.
- **7e. [ADDED] Low-end fallback:** detect low-end devices (e.g., `navigator.deviceMemory`, `hardwareConcurrency`, or a flag from the native side) and swap blur for flat translucent backgrounds.

**Acceptance:** Fewer blur layers; smoother scrolling (`gfxinfo` jank % or the Chrome Performance panel confirms); design still looks the same on a normal device.

---

#### #8 — 🟠 MEDIUM: React render efficiency in the heavy screens `[ADDED]`
**Where:** planner, day-schedule, habits, journey screens
**Do:**
- **8a. Profile first** with React Profiler; fix only the real hot spots.
- **8b. Memoize expensive derived data** (`useMemo` for sorted/filtered schedule lists), stabilize callbacks (`useCallback`) passed to memoized children, and use `React.memo` on list-row components.
- **8c. Virtualize long lists** (e.g., `@tanstack/react-virtual`) if any list can exceed ~50 rows.
- **8d. Split state/context** so a change to one slice doesn't re-render the whole tree; colocate state near where it's used.
- **8e. Avoid work during render:** no `JSON.parse`, no localStorage reads, no date-heavy computation inside render bodies — move to memoized selectors or effects.
- **8f.** Stable `key`s everywhere; no array index keys on reorderable lists.

**Acceptance:** Profiler shows fewer and cheaper commits on the heavy screens; interactions feel instant on a low-end device.

---

#### #9 — 🟠 MEDIUM: Animation and compositing hygiene `[ADDED]`
**Do:**
- **9a.** Animate only `transform` and `opacity`; never animate `width/height/top/left/box-shadow/filter`.
- **9b.** Pause infinite CSS animations when off-screen or when the page is hidden (`IntersectionObserver` / `visibilitychange`).
- **9c.** Honor `prefers-reduced-motion`.
- **9d.** Use `will-change` sparingly and only on elements that actually animate (too many promoted layers costs GPU memory).
- **9e.** Avoid layout thrashing (no read-write-read of layout properties in loops).

**Acceptance:** No continuously running animation on invisible elements; steady 60 fps in common interactions.

---

#### #10 — 🟢 MEDIUM-LOW: Fonts, images, and static assets `[ADDED]`
**Do:**
- **10a.** Self-host fonts via `next/font`, subset them, use `font-display: swap`, and load only the weights actually used.
- **10b.** Convert raster images to WebP/AVIF at sensible dimensions; inline tiny SVGs; remove unused assets from the APK/web bundle.
- **10c.** Lazy-load below-the-fold images; set explicit width/height to prevent layout shift.
- **10d.** Preload only the truly critical font/asset.

**Acceptance:** Smaller asset payload (report before/after), no layout shift on load.

---

#### #11 — 🟢 MEDIUM-LOW: Bitmap handling for custom wallpapers `[AUDIT]` + `[ADDED]`
**Where:** `renderWallpaper` custom-image decoding (Kotlin)
**Do:**
- **11a. Release bitmaps you no longer need** (`.recycle()` on bitmaps that are replaced/discarded — never one that's still being drawn or cached).
- **11b. [ADDED] Decode smartly:** use `inJustDecodeBounds` + `inSampleSize` to decode at screen size, never full resolution; prefer `RGB_565` when no alpha is needed; decode off the main/draw thread.
- **11c. [ADDED] Cache the decoded custom image** (keyed by URI + modified time) so it isn't re-decoded on every rebuild.
- **11d. [ADDED]** Handle `OutOfMemoryError`/decode failure gracefully with a fallback.

**Acceptance:** Lower peak memory in the Memory Profiler; no repeated decodes; no crashes on large images.

---

#### #12 — 🟢 LOW (quick win): `SharedPreferences.commit()` → `apply()` `[AUDIT]`
**Where:** `OdysseyWallpaperBridge.kt` (8 instances)
**Problem:** `commit()` does blocking disk I/O on the bridge thread.
**Do:** Replace with `apply()` (async) and batch edits per transaction (see #6c). **Check each call site:** `apply()` is safe for in-process readers (in-memory state updates immediately), but if anything reads the value from another process or relies on the write being durable before continuing (e.g., immediately before process death), keep `commit()` there and document why.
**Acceptance:** No blocking disk I/O on the bridge thread; behavior unchanged.

---

#### #13 — 🟢 LOW: Release build optimization `[ADDED]`
**Do:**
- **13a.** Enable R8 `minifyEnabled true` and `shrinkResources true` for release; fix any keep-rules needed for the JS bridge (`@JavascriptInterface` classes) and reflection.
- **13b.** Add a **Baseline Profile** (and a Macrobenchmark module) to speed up cold start.
- **13c.** Ship an App Bundle (AAB) so ABI/density splits reduce install size.
- **13d.** Remove unused Gradle dependencies and resources (Android Lint "unused resources").

**Acceptance:** Smaller APK/AAB, faster cold start, release build still works end-to-end (test the bridge and wallpaper!).

---

#### #14 — 🟢 LOW: Logging, leaks, and lifecycle hygiene `[ADDED]`
**Do:**
- **14a.** Strip or gate `Log.*` calls in hot paths and release builds; remove `console.log` from production web code.
- **14b.** Make sure every `Handler` callback, `BroadcastReceiver`, listener, and coroutine is cancelled/unregistered in the matching lifecycle callback (`onDestroy`, `onVisibilityChanged`, `onPause`).
- **14c.** Destroy the WebView correctly in `onDestroy` (remove from parent, `stopLoading`, `destroy`) to avoid leaks.
- **14d.** Add LeakCanary to **debug** builds only and fix what it reports.

**Acceptance:** No leaks reported in a normal usage session; no logging in hot loops.

---

#### #15 — 🟢 LOW (quick win): Remove the unused `WAKE_LOCK` permission `[AUDIT]`
**Where:** `AndroidManifest.xml`
**Do:** Confirm via search that no code acquires a wake lock (including libraries via merged-manifest), then remove the permission. Fewer permissions means less install-time scrutiny.
**Acceptance:** Build passes, app works, merged manifest no longer requests `WAKE_LOCK` (unless a dependency needs it — then document it).

---

#### #16 — 🟢 LOW: Dependency and dead-code audit `[ADDED]`
**Do:**
- **16a.** Run `depcheck`/`knip` (web) and Gradle dependency report (Android) to find unused packages and dead code; remove them.
- **16b.** Update dependencies with known performance fixes (Next.js, React, AndroidX WebKit) after checking the changelogs; test thoroughly.
- **16c.** Delete unused components/routes/assets left from earlier iterations.

---

#### #17 — ⚪ LOW (optional): Storage layer modernization `[ADDED]`
**Do:** If preferences are growing large or being accessed from multiple threads, migrate `SharedPreferences` to Jetpack **DataStore** (async, transactional). On the web side, make sure `localStorage` reads/writes are not in render paths and large JSON isn't re-serialized on every change. Skip if measurement shows no benefit.

---

#### #18 — ⚪ LOW (but lasting): Performance regression guardrails `[ADDED]`
**Do:**
- **18a.** Add a bundle-size budget to CI (fail the build if a route's JS grows by more than an agreed threshold).
- **18b.** Add Lighthouse CI (or equivalent) on the production web build.
- **18c.** Add the Macrobenchmark startup test from #13 to CI if feasible.
- **18d.** Write a short `PERFORMANCE.md` documenting: the baselines, the final numbers, the rules (no allocations in draw loops, one shared clock, no wake-up alarms unless essential, blur budget), and how to re-measure.

---

### FINAL DELIVERABLE

When all 18 items are done (or explicitly deferred with a reason), produce a summary table:

| # | Item | Status | Before | After | Notes/Risks |
|---|------|--------|--------|-------|-------------|

Include: cold-start time, wallpaper CPU %, wake-ups/day, JS bundle size per route, jank %, battery drain over a fixed test period, and APK size. Then list anything you skipped, anything you disagreed with, and any follow-up recommendations.

**Start now with Step 0 (baselines), then begin at item #1 and proceed strictly in order.**

---

### 11.2 RECONCILIATION ADDENDUM (2026-10-08) — supersedes figures in 11.1

The specification above was written against a prior code review, not against measurement.
Applying its own ground rule #1 — *"verify before you change… if something is already fixed or
described inaccurately, say so and move on"* — to the current tree changes the shape of the
work. Verified against source:

| # | 11.1 says | Verified reality | Consequence |
|---|---|---|---|
| **#1** | Wallpaper redraws **30x/sec**; ~**1,710 `Paint` allocs/sec**; ~99% of redraw work wasted | **ALREADY DELIVERED** by `P8-E2` (see section 8). `OdysseyLiveWallpaperService.kt` uses `REFRESH_INTERVAL_MS = 60_000L` and re-arms on the minute boundary; the schedule JSON is cached in `CachedSchedule`, not re-parsed per frame | The item's **headline motivation no longer exists.** Sub-steps 1c (hoist `Paint`/`Path` allocations) and 1h (dirty-rect / hardware canvas) must **not** be implemented on the 30 FPS reasoning — `P8-E4` already classified the residual ~57 `Paint` allocations per render as "a rounding error rather than a drain" at 1 render/minute. If a re-measure contradicts `P8-E4`, report the conflict rather than quietly re-opening them |
| **#2c** | Replace the hourly wallpaper alarm | **ALREADY DELIVERED** — the wallpaper uses `handler.postDelayed`, no alarm | But `RTC_WAKEUP` **still exists** at 2 sites in `OdysseyCadenceNotificationWorker.kt`, so 2a/2b/2d remain genuinely open |
| **#4a** | `wallpaper-preview.tsx` runs `setInterval(…, 1000)` at 60x excess | **ALREADY DELIVERED** — it re-arms on `msToNextMinute` | But there are **7 `setInterval` calls app-wide**, **no shared clock module exists**, and `journey-day-schedule.tsx` still ticks every **5 s** |
| **#7** | "~22 stacked heavy blur layers" | **41 occurrences across 21 files** | Underestimated. (Section 2.7 has been corrected to match.) |
| **#12** | `commit()` in "8 instances" | **9** | Small drift. (Section 2.9 has been corrected to match.) |
| **#15** | Remove the unused `WAKE_LOCK` permission | **ALREADY DELIVERED** — section 8 records the removal; only an explanatory comment remains in the manifest | Verify against the **merged** manifest, then close. If a dependency re-adds it, document that rather than removing the line silently |
| **#3** | Treats bundled-assets-vs-remote-URL as an open question | **REMOTE.** `MainActivity` calls `webView.loadUrl(targetUrl)` | The bundled / `WebViewAssetLoader` branch **does not apply**. The remote branch does: caching headers, service worker, early preconnect |
| — | — | **No `gradlew` in the repo**, and Android Studio's bundled JBR 25 cannot start the Kotlin 1.9.22 compile daemon (`IllegalArgumentException: 25.0.3`, risk **R14**) | See 11.4 — native items cannot be signed off on this machine |

**Net: roughly 4 delivered, 3 partial, 11 open.** Implement the phase as a verification and
measurement effort first. **Do not "optimise" a 30 FPS loop that no longer exists.**

### 11.3 Status of record

`main_plan.md` **section 6.5** holds the authoritative status as `PERF-0` through `PERF-18`,
each with its sub-steps, acceptance criteria and the specific verification still outstanding for
already-delivered items. **Do not record status here.** This file is the specification; that one
is the record.

### 11.4 Measurement boundary

Six items (#1 verification, #2, #3, #11, #13, #14) are native Kotlin and the specification above
requires `adb`, `dumpsys alarm`, `dumpsys gfxinfo` and `dumpsys batterystats` on a **physical
mid/low-end device running a release build**.

This environment has **no `gradlew`**, a broken Kotlin daemon path (R14), and **no device
attached**. `tsc`, `lint`, `build`, `vitest`, Lighthouse, the bundle analyzer and the React
Profiler **can** be run here; the `adb`/R8/Baseline-Profile outcomes **cannot**.

**Rule:** a native item may be implemented and reported, but it stays `BUILT` with
"unverified — needs a device" until someone measures it. **Never** record `SHIPPED` for a native
item on the strength of a green web test suite — `tsc` does not read Kotlin, and a real Kotlin
syntax error once shipped through a fully green web suite (risk **R12**, see 8.1).
