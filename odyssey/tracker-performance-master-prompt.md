# MASTER PROMPT — Tracker App Performance Overhaul

You are a senior Android + Next.js performance engineer. Your job is to make the **Tracker** app (a Next.js web UI running inside a Kotlin Android WebView shell, with schedule/habit/planner screens and a live wallpaper service) **load faster, render smoother, and drain far less battery**.

**You must follow this document in order.** Work through the items from #1 down to #18 sequentially. Do not skip ahead, do not reorder on your own, and do not start an item until the previous one is finished, verified, and committed. If your profiling contradicts the ranking, finish your measurement, report the conflict, and ask before reordering.

Items tagged **[AUDIT]** come from the prior code review of this repo. Items or sub-steps tagged **[ADDED]** are extra improvements on top of that review.

---

## 0. Ground rules (apply to every item)

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

## THE PRIORITY LIST (highest impact first)

---

### #1 — 🔴 CRITICAL: Stop re-rendering the whole wallpaper 30×/second `[AUDIT]`
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

### #2 — 🟡 HIGH: Eliminate wasted device wake-ups `[AUDIT]`
**Where:** the alarm scheduling code (hourly wallpaper update + cadence notification), Kotlin
**Problem:** Two `RTC_WAKEUP` alarms per hour wake the device from Doze. The hourly wallpaper alarm wakes the phone, *then* checks whether the live wallpaper is even active, and early-returns. That is a pure waste. (The audit quotes both "~24 wasted wakeups/day" and "48 wakeups/day" in different places — verify the real count with `dumpsys alarm` and report the true number.)

**Do:**
- **2a. Move the early-return check before scheduling.** If the live wallpaper isn't active, don't schedule the hourly alarm at all (and cancel any existing one when the wallpaper is removed/deactivated).
- **2b. Use inexact, non-waking scheduling** where exact timing isn't required: `WorkManager` periodic work, or `setInexactRepeating` / `setAndAllowWhileIdle` with a non-`WAKEUP` type. Keep a wake-up alarm **only** for user-visible notifications that truly must fire on time (and then use the right exact-alarm API and permission for the target SDK).
- **2c. [ADDED] Remove the alarm for the wallpaper entirely when possible.** While the wallpaper engine is visible, register a dynamic `BroadcastReceiver` for `ACTION_TIME_TICK`/`ACTION_DATE_CHANGED`/`ACTION_TIMEZONE_CHANGED`/`ACTION_TIME_CHANGED` (or just compute "next hour boundary" and `Handler.postDelayed`) and unregister when not visible. No alarm needed if nothing is on screen.
- **2d. [ADDED]** Re-schedule alarms correctly after reboot/time change only if still needed.

**Acceptance:** `dumpsys alarm` shows no wake-up alarms for the wallpaper when it isn't active; the early return happens before any alarm is set; notification timing still works.

---

### #3 — 🟡 HIGH: Cold-start and WebView load path `[ADDED]`
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

### #4 — 🟡 HIGH: Fix the redundant JS timers / clock re-renders `[AUDIT]`
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

### #5 — 🟠 MEDIUM-HIGH: Route-level code splitting and bundle diet `[AUDIT]` + `[ADDED]`
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

### #6 — 🟠 MEDIUM-HIGH: JS ↔ Kotlin bridge and wallpaper sync efficiency `[ADDED]`
**Where:** `OdysseyWallpaperBridge.kt`, the TypeScript code that calls it
**Problem:** Sending full schedule/config payloads across the bridge on every change causes repeated serialization, disk writes, and wallpaper cache invalidation (which now makes #1's cache rebuild expensive if triggered too often).

**Do:**
- **6a. Debounce/throttle** wallpaper-sync calls from JS (e.g., 300–500 ms trailing debounce); never sync per keystroke or per render.
- **6b. Send only when data actually changed** (compare a hash/version of the payload); skip no-op updates.
- **6c. Batch** multiple preference writes into a single `Editor` transaction.
- **6d. Keep `@JavascriptInterface` methods fast:** do real work on a background thread/dispatcher, not on the bridge thread.

**Acceptance:** Editing a schedule triggers at most one bridge call and one cache rebuild per burst of edits.

---

### #7 — 🟠 MEDIUM: Reduce heavy `backdrop-filter` blur `[AUDIT]`
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

### #8 — 🟠 MEDIUM: React render efficiency in the heavy screens `[ADDED]`
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

### #9 — 🟠 MEDIUM: Animation and compositing hygiene `[ADDED]`
**Do:**
- **9a.** Animate only `transform` and `opacity`; never animate `width/height/top/left/box-shadow/filter`.
- **9b.** Pause infinite CSS animations when off-screen or when the page is hidden (`IntersectionObserver` / `visibilitychange`).
- **9c.** Honor `prefers-reduced-motion`.
- **9d.** Use `will-change` sparingly and only on elements that actually animate (too many promoted layers costs GPU memory).
- **9e.** Avoid layout thrashing (no read-write-read of layout properties in loops).

**Acceptance:** No continuously running animation on invisible elements; steady 60 fps in common interactions.

---

### #10 — 🟢 MEDIUM-LOW: Fonts, images, and static assets `[ADDED]`
**Do:**
- **10a.** Self-host fonts via `next/font`, subset them, use `font-display: swap`, and load only the weights actually used.
- **10b.** Convert raster images to WebP/AVIF at sensible dimensions; inline tiny SVGs; remove unused assets from the APK/web bundle.
- **10c.** Lazy-load below-the-fold images; set explicit width/height to prevent layout shift.
- **10d.** Preload only the truly critical font/asset.

**Acceptance:** Smaller asset payload (report before/after), no layout shift on load.

---

### #11 — 🟢 MEDIUM-LOW: Bitmap handling for custom wallpapers `[AUDIT]` + `[ADDED]`
**Where:** `renderWallpaper` custom-image decoding (Kotlin)
**Do:**
- **11a. Release bitmaps you no longer need** (`.recycle()` on bitmaps that are replaced/discarded — never one that's still being drawn or cached).
- **11b. [ADDED] Decode smartly:** use `inJustDecodeBounds` + `inSampleSize` to decode at screen size, never full resolution; prefer `RGB_565` when no alpha is needed; decode off the main/draw thread.
- **11c. [ADDED] Cache the decoded custom image** (keyed by URI + modified time) so it isn't re-decoded on every rebuild.
- **11d. [ADDED]** Handle `OutOfMemoryError`/decode failure gracefully with a fallback.

**Acceptance:** Lower peak memory in the Memory Profiler; no repeated decodes; no crashes on large images.

---

### #12 — 🟢 LOW (quick win): `SharedPreferences.commit()` → `apply()` `[AUDIT]`
**Where:** `OdysseyWallpaperBridge.kt` (8 instances)
**Problem:** `commit()` does blocking disk I/O on the bridge thread.
**Do:** Replace with `apply()` (async) and batch edits per transaction (see #6c). **Check each call site:** `apply()` is safe for in-process readers (in-memory state updates immediately), but if anything reads the value from another process or relies on the write being durable before continuing (e.g., immediately before process death), keep `commit()` there and document why.
**Acceptance:** No blocking disk I/O on the bridge thread; behavior unchanged.

---

### #13 — 🟢 LOW: Release build optimization `[ADDED]`
**Do:**
- **13a.** Enable R8 `minifyEnabled true` and `shrinkResources true` for release; fix any keep-rules needed for the JS bridge (`@JavascriptInterface` classes) and reflection.
- **13b.** Add a **Baseline Profile** (and a Macrobenchmark module) to speed up cold start.
- **13c.** Ship an App Bundle (AAB) so ABI/density splits reduce install size.
- **13d.** Remove unused Gradle dependencies and resources (Android Lint "unused resources").

**Acceptance:** Smaller APK/AAB, faster cold start, release build still works end-to-end (test the bridge and wallpaper!).

---

### #14 — 🟢 LOW: Logging, leaks, and lifecycle hygiene `[ADDED]`
**Do:**
- **14a.** Strip or gate `Log.*` calls in hot paths and release builds; remove `console.log` from production web code.
- **14b.** Make sure every `Handler` callback, `BroadcastReceiver`, listener, and coroutine is cancelled/unregistered in the matching lifecycle callback (`onDestroy`, `onVisibilityChanged`, `onPause`).
- **14c.** Destroy the WebView correctly in `onDestroy` (remove from parent, `stopLoading`, `destroy`) to avoid leaks.
- **14d.** Add LeakCanary to **debug** builds only and fix what it reports.

**Acceptance:** No leaks reported in a normal usage session; no logging in hot loops.

---

### #15 — 🟢 LOW (quick win): Remove the unused `WAKE_LOCK` permission `[AUDIT]`
**Where:** `AndroidManifest.xml`
**Do:** Confirm via search that no code acquires a wake lock (including libraries via merged-manifest), then remove the permission. Fewer permissions means less install-time scrutiny.
**Acceptance:** Build passes, app works, merged manifest no longer requests `WAKE_LOCK` (unless a dependency needs it — then document it).

---

### #16 — 🟢 LOW: Dependency and dead-code audit `[ADDED]`
**Do:**
- **16a.** Run `depcheck`/`knip` (web) and Gradle dependency report (Android) to find unused packages and dead code; remove them.
- **16b.** Update dependencies with known performance fixes (Next.js, React, AndroidX WebKit) after checking the changelogs; test thoroughly.
- **16c.** Delete unused components/routes/assets left from earlier iterations.

---

### #17 — ⚪ LOW (optional): Storage layer modernization `[ADDED]`
**Do:** If preferences are growing large or being accessed from multiple threads, migrate `SharedPreferences` to Jetpack **DataStore** (async, transactional). On the web side, make sure `localStorage` reads/writes are not in render paths and large JSON isn't re-serialized on every change. Skip if measurement shows no benefit.

---

### #18 — ⚪ LOW (but lasting): Performance regression guardrails `[ADDED]`
**Do:**
- **18a.** Add a bundle-size budget to CI (fail the build if a route's JS grows by more than an agreed threshold).
- **18b.** Add Lighthouse CI (or equivalent) on the production web build.
- **18c.** Add the Macrobenchmark startup test from #13 to CI if feasible.
- **18d.** Write a short `PERFORMANCE.md` documenting: the baselines, the final numbers, the rules (no allocations in draw loops, one shared clock, no wake-up alarms unless essential, blur budget), and how to re-measure.

---

## FINAL DELIVERABLE

When all 18 items are done (or explicitly deferred with a reason), produce a summary table:

| # | Item | Status | Before | After | Notes/Risks |
|---|------|--------|--------|-------|-------------|

Include: cold-start time, wallpaper CPU %, wake-ups/day, JS bundle size per route, jank %, battery drain over a fixed test period, and APK size. Then list anything you skipped, anything you disagreed with, and any follow-up recommendations.

**Start now with Step 0 (baselines), then begin at item #1 and proceed strictly in order.**
