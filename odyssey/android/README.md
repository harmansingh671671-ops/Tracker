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

---

## 🔌 Connecting to your APK's `MainActivity`

In your Android WebView setup (e.g., `MainActivity.kt`), simply add:

```kotlin
val webView: WebView = findViewById(R.id.webview)
webView.settings.javaScriptEnabled = true

// Attach the Odyssey Wallpaper Bridge
webView.addJavascriptInterface(OdysseyWallpaperBridge(this), "OdysseyAndroid")
webView.addJavascriptInterface(OdysseyWallpaperBridge(this), "Android")
```

The web app in [`src/lib/utils/android-bridge.ts`](file:///c:/PROJECTS/odyssey/src/lib/utils/android-bridge.ts) automatically detects this bridge and unlocks the 1-click real-time features.
