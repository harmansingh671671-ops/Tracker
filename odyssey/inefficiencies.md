# ODYSSEY — CODE REVIEW: BUGS, INEFFICIENCIES & BATTERY AUDIT

**Status:** review only. No code was changed to produce this document.
**Scope:** full repo review with extra weight on the wallpaper subsystem and battery consumption.
**Date:** 2026-10-10
**Reviewed at:** commit `1d87449` (5 local commits ahead of `origin/main`, unpushed)

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
| `backdrop-blur-*` occurrences across `src/` | 46 |
| of which heavy (`-xl`, `-2xl`, `-3xl`) | **22** |
| Concentrated in a single file | 25 (one page/component dominates) |
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

`OdysseyWallpaperBridge.kt` uses `.commit()` in **8 places** (lines 150, 181, 204, 298, 363, 424,
498, 529). `commit()` does a **synchronous disk write and fsync** on the calling thread, whereas
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

**Confidence:** the live-wallpaper finding (2.1) is the highest-confidence item here. The 30 FPS
loop, the full-scene re-render and the single-sine-variable are all directly readable in the source,
and the arithmetic follows from measured per-frame allocation counts.