# Odyssey Android APK Real-Time Lockscreen Engine

This module provides **real-time automatic lockscreen updates** directly within the Odyssey Android APK without requiring manual downloads or gallery navigation.

---

## 🛡️ User Privacy & Trust (Zero Invasive Permissions)

- **Normal Install-Time Permission Only:** Uses standard `<uses-permission android:name="android.permission.SET_WALLPAPER" />`.
- **Zero Runtime Prompts:** Android classifies `SET_WALLPAPER` as a *normal protection level* permission. Android grants it silently at installation—**it NEVER triggers scary permission popups asking for storage, camera, contacts, or location**.
- **100% On-Device:** All schedule calculations and canvas rendering happen entirely locally on the phone.

---

## ⚡ Two Ways It Works in Your APK

### 1. Direct 1-Tap Lockscreen Update (Instant)
- Inside the APK, tapping **"Set Lockscreen Directly"** calls `OdysseyWallpaperBridge.setLockscreenWallpaper()`.
- The native Android `WallpaperManager` applies the wallpaper directly to `WallpaperManager.FLAG_LOCK` in one click.

### 2. Native Live Wallpaper Service (Real-Time Automatic Updates)
- `OdysseyLiveWallpaperService.kt` is a native Android `WallpaperService`.
- **How Real-Time Centering Works:**
  1. Whenever the user picks up or turns on their phone, Android triggers `onVisibilityChanged(true)`.
  2. The service checks the current hour (e.g., 14:00).
  3. It dynamically centers the 14:00 block in the 5-card window on the lockscreen canvas.
  4. At 15:00, when the screen turns on, 15:00 is automatically in the center.
  5. **Battery Impact: 0% drain while screen is off** (the engine only draws when the screen is activated).

## 🚀 Hybrid Architecture: Live Vercel Pushes + Native Superpowers

### How You Leverage Vercel with the Native APK (Zero APK Rebuilds)

During prototyping and rapid iteration, rebuilding an APK for every single CSS tweak or UI change would be frustrating. 

Odyssey solves this by implementing a **Live Hybrid Shell Architecture**:
1. **The Native APK is Built Once**: The `.apk` installed on your phone contains `MainActivity.kt` with an optimized Android `WebView` that points to your live Vercel URL (configured in `res/values/strings.xml` or via Intent).
2. **Instant Cloud Updates via Vercel**:
   - You edit your Next.js components, habit logic, or styles in VS Code.
   - You run `git push`.
   - Vercel deploys in ~30 seconds.
   - The next time you open the Odyssey app on your phone, **it immediately loads your newest Vercel deployment** over the air!
   - **You never need to rebuild or reinstall the APK for frontend changes.**
3. **Native Lockscreen Capabilities**:
   - `MainActivity.kt` permanently injects the native bridge (`window.OdysseyAndroid`) into your Vercel web app.
   - Your remote Vercel site can trigger Android's native `WallpaperManager` directly.
   - Background workers (`OdysseyHourlyWallpaperWorker`) run independently in the native OS to refresh the lockscreen every hour.

---

## 🛠️ How to Build the APK

### Option A: Using Android Studio (Visual & 1-Click)
1. Open **Android Studio**.
2. Click **Open** and select the `android/` folder in this repository.
3. Let Gradle sync dependencies.
4. Set your live Vercel URL in `android/src/main/res/values/strings.xml`:
   ```xml
   <string name="default_vercel_url">https://your-odyssey.vercel.app</string>
   ```
5. Click **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
6. Transfer the generated `.apk` to your phone and install it!

### Option B: Using GitHub Actions (Automated Cloud APK Build)
You can set up a simple GitHub Action (`.github/workflows/build-apk.yml`) that automatically compiles the APK on GitHub's cloud servers whenever you tag a release, giving you a downloadable `.apk` link without needing Android Studio installed locally.
