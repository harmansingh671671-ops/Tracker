import { type WallpaperData, generateWallpaperCanvas, shareWallpaper } from "./wallpaper-generator";

declare global {
  interface Window {
    OdysseyAndroid?: {
      setLockscreenWallpaper?: (base64Image: string) => boolean;
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
    Capacitor?: {
      Plugins?: {
        Wallpaper?: {
          setWallpaper?: (options: { image: string; target?: string }) => Promise<{ success: boolean }>;
        };
      };
    };
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
 * Directly sets the lockscreen wallpaper via Android native APIs if running in an APK,
 * or smoothly falls back to the native OS share sheet.
 */
export async function setNativeLockscreen(
  data: WallpaperData
): Promise<{ success: boolean; method: "native_bridge" | "native_share"; message: string }> {
  if (typeof window === "undefined") {
    return { success: false, method: "native_bridge", message: "Window not available" };
  }

  // Generate the clean OLED wallpaper canvas without baked-in clock
  const canvas = await generateWallpaperCanvas({ ...data, showClockGuide: false });
  const dataUrl = canvas.toDataURL("image/png");
  const base64Clean = dataUrl.replace(/^data:image\/png;base64,/, "");

  // 1. Direct OdysseyAndroid Native Bridge
  if (window.OdysseyAndroid && typeof window.OdysseyAndroid.setLockscreenWallpaper === "function") {
    try {
      const res = window.OdysseyAndroid.setLockscreenWallpaper(base64Clean);
      await syncScheduleDataToNative(data);
      return {
        success: res !== false,
        method: "native_bridge",
        message: "Lockscreen wallpaper applied directly via native Android WallpaperManager!",
      };
    } catch (e: any) {
      console.warn("OdysseyAndroid native bridge error:", e);
    }
  }

  // 2. Standard Android JavascriptInterface
  if (window.Android && typeof window.Android.setWallpaper === "function") {
    try {
      window.Android.setWallpaper(base64Clean);
      await syncScheduleDataToNative(data);
      return {
        success: true,
        method: "native_bridge",
        message: "Lockscreen wallpaper updated directly!",
      };
    } catch (e: any) {
      console.warn("Android JavascriptInterface error:", e);
    }
  }

  // 3. Capacitor Wallpaper Plugin
  if (window.Capacitor?.Plugins?.Wallpaper?.setWallpaper) {
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

  // 4. Fallback: Native Web Share with file (triggers Android's system 'Set as Wallpaper' picker)
  try {
    const shared = await shareWallpaper(data);
    return {
      success: shared,
      method: "native_share",
      message: shared
        ? "Choose 'Set as Wallpaper' from the system menu."
        : "Image saved to downloads.",
    };
  } catch (err: any) {
    return { success: false, method: "native_share", message: err.message || "Failed to set wallpaper" };
  }
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

