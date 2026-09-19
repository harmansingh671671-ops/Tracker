import { type WallpaperData, generateWallpaperCanvas } from "./wallpaper-generator";

export interface NativeWallpaperResult {
  success: boolean;
  method: "native_bridge" | "native_share" | "web_browser_unsupported" | "error";
  message: string;
}

declare global {
  interface Window {
    OdysseyAndroid?: {
      setLockscreenWallpaper?: (base64Image: string) => boolean;
      clearLockscreenWallpaper?: () => boolean;
      syncSchedule?: (scheduleJson: string) => void;
      launchLiveWallpaperPicker?: () => void;
      enableHourlyAutoUpdate?: () => boolean;
      disableHourlyAutoUpdate?: () => boolean;
      isHourlyAutoUpdateEnabled?: () => boolean;
      isSupported?: () => boolean;
    };
    Android?: {
      setWallpaper?: (base64Image: string) => void;
      syncSchedule?: (scheduleJson: string) => void;
      launchLiveWallpaperPicker?: () => void;
      enableHourlyAutoUpdate?: () => boolean;
      disableHourlyAutoUpdate?: () => boolean;
      isHourlyAutoUpdateEnabled?: () => boolean;
    };
    AndroidWallpaper?: {
      setWallpaper?: (base64Image: string, target?: string) => boolean;
    };
    Capacitor?: any;
  }
}

/**
 * Detects whether the app is running inside an Android APK wrapper or WebView
 */
export function isAndroidApp(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Explicit native JavaScript Interface injected by Android APK
  if (window.OdysseyAndroid || window.Android) return true;

  // 2. Capacitor native runtime on Android
  if (window.Capacitor) return true;

  // 3. Android WebView User-Agent signature
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isWebView = /wv|Version\/[0-9.]+/i.test(ua) || Boolean((window as any).chrome?.webview);

  return isAndroid && isWebView;
}

/**
 * Sends wallpaper directly to native Android lockscreen via JavaScript interface.
 * If running inside the Odyssey Native Android APK, this sets the lockscreen automatically with 0 clicks.
 * If running in a standard web browser/PWA, web security prevents silent lockscreen alteration.
 */
export async function setNativeLockscreen(data: WallpaperData): Promise<NativeWallpaperResult> {
  const canvas = await generateWallpaperCanvas({ ...data, showClockGuide: false });
  const dataUrl = canvas.toDataURL("image/png");

  // 1. Check for Odyssey Native Android Bridge (WebView addJavascriptInterface)
  if (typeof window !== "undefined" && window.OdysseyAndroid?.setLockscreenWallpaper) {
    try {
      const ok = window.OdysseyAndroid.setLockscreenWallpaper(dataUrl);
      await syncScheduleDataToNative(data);
      return {
        success: Boolean(ok),
        method: "native_bridge",
        message: ok
          ? "Lockscreen updated directly via Native Odyssey Bridge!"
          : "Native bridge reported an issue applying wallpaper.",
      };
    } catch (e: any) {
      console.warn("OdysseyAndroid bridge error:", e);
    }
  }

  // 2. Check for generic Android wallpaper interface
  if (typeof window !== "undefined" && window.Android?.setWallpaper) {
    try {
      window.Android.setWallpaper(dataUrl);
      await syncScheduleDataToNative(data);
      return {
        success: true,
        method: "native_bridge",
        message: "Lockscreen updated directly via Android bridge!",
      };
    } catch (e: any) {
      console.warn("Android bridge error:", e);
    }
  }

  // 3. Check for Capacitor native bridge
  if (typeof window !== "undefined" && window.Capacitor?.Plugins?.Wallpaper?.setWallpaper) {
    try {
      const res = await window.Capacitor.Plugins.Wallpaper.setWallpaper({
        image: dataUrl,
        target: "lock",
      });
      await syncScheduleDataToNative(data);
      return {
        success: res.success !== false,
        method: "native_bridge",
        message: "Lockscreen updated via Capacitor!",
      };
    } catch (e: any) {
      console.warn("Capacitor Wallpaper error:", e);
    }
  }

  // 4. Web Browser / PWA Sandbox Notice (NO PNG downloading)
  return {
    success: false,
    method: "web_browser_unsupported",
    message: "Web browsers cannot modify your phone's lockscreen due to Android OS security sandboxing. This requires the compiled Native APK.",
  };
}

/**
 * Checks whether a native APK JavaScript bridge is actively connected.
 */
export function isNativeBridgeAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.OdysseyAndroid?.setLockscreenWallpaper ||
    window.Android?.setWallpaper ||
    window.Capacitor?.Plugins?.Wallpaper?.setWallpaper
  );
}

/**
 * Synchronizes today's 24-hour hourly blocks to Android SharedPreferences
 * so the native Live Wallpaper engine can render and center the current hour
 * dynamically whenever the user wakes their screen!
 */
export async function syncScheduleDataToNative(data: WallpaperData): Promise<void> {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    dateStr: data.dateStr,
    chapter: data.chapter,
    activeDay: data.activeDay,
    rankName: data.rankName,
    rankBadge: data.rankBadge,
    userLevel: data.userLevel,
    plannedHours: data.plannedHours,
    blocks: data.blocks.map((b) => ({
      startTime: b.startTime,
      endTime: b.endTime,
      title: b.title,
      category: b.category,
    })),
    habits: (data.habits || []).slice(0, 4).map((h) => ({
      name: h.name,
      icon: h.icon,
      currentStreak: h.currentStreak,
      category: h.category,
    })),
  });

  // Save to web local cache
  try {
    localStorage.setItem("odyssey_native_schedule_cache", payload);
  } catch {}

  // Push to Android native bridge if present
  if (window.OdysseyAndroid?.syncSchedule) {
    try {
      window.OdysseyAndroid.syncSchedule(payload);
    } catch {}
  } else if (window.Android?.syncSchedule) {
    try {
      window.Android.syncSchedule(payload);
    } catch {}
  }
}

/**
 * Opens Android's native Live Wallpaper preview screen
 */
export function launchLiveWallpaperPicker(): boolean {
  if (typeof window === "undefined") return false;

  if (window.OdysseyAndroid?.launchLiveWallpaperPicker) {
    try {
      window.OdysseyAndroid.launchLiveWallpaperPicker();
      return true;
    } catch {}
  } else if (window.Android?.launchLiveWallpaperPicker) {
    try {
      window.Android.launchLiveWallpaperPicker();
      return true;
    } catch {}
  }

  return false;
}

/**
 * Enables automatic hourly background lockscreen refresh in the Android APK.
 * Syncs schedule data first, then starts the native AlarmManager worker.
 */
export async function enableNativeHourlyAutoUpdate(data?: WallpaperData): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (data) {
    await syncScheduleDataToNative(data);
  }

  if (window.OdysseyAndroid?.enableHourlyAutoUpdate) {
    try {
      return window.OdysseyAndroid.enableHourlyAutoUpdate() !== false;
    } catch {}
  } else if (window.Android?.enableHourlyAutoUpdate) {
    try {
      return window.Android.enableHourlyAutoUpdate() !== false;
    } catch {}
  }

  return false;
}

/**
 * Disables automatic hourly background updates in the Android APK.
 */
export function disableNativeHourlyAutoUpdate(): boolean {
  if (typeof window === "undefined") return false;

  if (window.OdysseyAndroid?.disableHourlyAutoUpdate) {
    try {
      return window.OdysseyAndroid.disableHourlyAutoUpdate() !== false;
    } catch {}
  } else if (window.Android?.disableHourlyAutoUpdate) {
    try {
      return window.Android.disableHourlyAutoUpdate() !== false;
    } catch {}
  }

  return false;
}

/**
 * Checks whether the native hourly auto-update worker is active.
 */
export function checkNativeAutoUpdateStatus(): boolean {
  if (typeof window === "undefined") return false;

  if (window.OdysseyAndroid?.isHourlyAutoUpdateEnabled) {
    try {
      return Boolean(window.OdysseyAndroid.isHourlyAutoUpdateEnabled());
    } catch {}
  } else if (window.Android?.isHourlyAutoUpdateEnabled) {
    try {
      return Boolean(window.Android.isHourlyAutoUpdateEnabled());
    } catch {}
  }

  return false;
}

/**
 * Clears custom lockscreen wallpaper on Android and restores system default.
 */
export function clearNativeLockscreen(): boolean {
  if (typeof window === "undefined") return false;

  if (window.OdysseyAndroid?.clearLockscreenWallpaper) {
    try {
      return Boolean(window.OdysseyAndroid.clearLockscreenWallpaper());
    } catch {}
  }

  return false;
}

