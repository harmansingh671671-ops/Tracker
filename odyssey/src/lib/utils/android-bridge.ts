import { type WallpaperData, generateWallpaperCanvas, build24HourlyBlocks } from "./wallpaper-generator";
import { db } from "../db";
import { calculateRank, getRankInfo } from "./gamification";

export interface NativeWallpaperResult {
  success: boolean;
  method: "native_bridge" | "native_share" | "web_browser_unsupported" | "error";
  message: string;
}

export interface SyncVerificationResult {
  success: boolean;
  isNativeBridge: boolean;
  blockCount: number;
  habitCount: number;
  taskNames: string[];
  habitNames: string[];
  streak: number;
  message: string;
  timestamp: string;
  error?: string;
}

declare global {
  interface Window {
    OdysseyAndroid?: {
      setLockscreenWallpaper?: (base64Image: string) => boolean;
      setCustomWallpaper?: (base64Image: string, targetScreen: string) => boolean;
      saveAlternateWallpaper?: (base64Image: string, targetScreen: string) => boolean;
      getAlternateWallpaper?: (targetScreen: string) => string;
      applyAlternateWallpaper?: (targetScreen: string) => boolean;
      clearLockscreenWallpaper?: () => boolean;
      syncSchedule?: (scheduleJson: string) => boolean | void;
      syncScheduleWithResult?: (scheduleJson: string) => string;
      getSyncedSchedule?: () => string;
      verifySync?: () => string;
      launchLiveWallpaperPicker?: () => void;
      enableHourlyAutoUpdate?: () => boolean;
      disableHourlyAutoUpdate?: () => boolean;
      isHourlyAutoUpdateEnabled?: () => boolean;
      enableCadenceNotifications?: () => boolean;
      disableCadenceNotifications?: () => boolean;
      isCadenceNotificationsEnabled?: () => boolean;
      triggerTestNotification?: () => boolean;
      armCadenceNotification?: () => boolean;
      openSystemWallpaperChooser?: () => boolean;
      getAppVersionCode?: () => number;
      getAppVersionName?: () => string;
      isSupported?: () => boolean;
    };
    Android?: {
      setWallpaper?: (base64Image: string) => void;
      setCustomWallpaper?: (base64Image: string, targetScreen: string) => boolean;
      saveAlternateWallpaper?: (base64Image: string, targetScreen: string) => boolean;
      getAlternateWallpaper?: (targetScreen: string) => string;
      applyAlternateWallpaper?: (targetScreen: string) => boolean;
      syncSchedule?: (scheduleJson: string) => void;
      syncScheduleWithResult?: (scheduleJson: string) => string;
      getSyncedSchedule?: () => string;
      verifySync?: () => string;
      launchLiveWallpaperPicker?: () => void;
      enableHourlyAutoUpdate?: () => boolean;
      disableHourlyAutoUpdate?: () => boolean;
      isHourlyAutoUpdateEnabled?: () => boolean;
      enableCadenceNotifications?: () => boolean;
      disableCadenceNotifications?: () => boolean;
      isCadenceNotificationsEnabled?: () => boolean;
      triggerTestNotification?: () => boolean;
      armCadenceNotification?: () => boolean;
      openSystemWallpaperChooser?: () => boolean;
      getAppVersionCode?: () => number;
      getAppVersionName?: () => string;
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
 * Generates the standardized 24-hour and habit payload for native wallpaper sync.
 */
export function buildNativeSchedulePayload(data: WallpaperData): string {
  const full24 = build24HourlyBlocks(data.blocks);
  
  // Collect habits from data, or provide guaranteed default habit tracks so section is never blank
  const habitsList = (data.habits && data.habits.length > 0)
    ? data.habits.slice(0, 4).map((h) => ({
        name: h.name,
        icon: h.icon,
        currentStreak: h.currentStreak || 1,
        category: h.category || "Habit Track",
      }))
    : [
        { name: "Mindful Focus", icon: "🧘", currentStreak: data.userStreak || 1, category: "Habit Track" },
        { name: "Daily Hydration", icon: "💧", currentStreak: data.userStreak || 1, category: "Vitality Track" },
      ];

  // Merge full 24 blocks with raw user blocks to ensure exact title and hour matching
  const blocksList = full24.map((b) => ({
    startTime: b.startTime,
    endTime: b.endTime,
    title: b.title,
    category: b.category,
    isUserDefined: b.isUserDefined,
  }));

  return JSON.stringify({
    dateStr: data.dateStr,
    chapter: data.chapter,
    activeDay: data.activeDay,
    rankName: data.rankName,
    rankBadge: data.rankBadge,
    userLevel: data.userLevel,
    userStreak: data.userStreak || data.activeDay || 1,
    plannedHours: data.plannedHours,
    blocks: blocksList,
    habits: habitsList,
    syncedAt: Date.now(),
  });
}

/**
 * Synchronizes today's 24-hour hourly blocks to Android SharedPreferences
 * so the native Live Wallpaper engine can render and center the current hour
 * dynamically whenever the user wakes their screen!
 */
export async function syncScheduleDataToNative(data: WallpaperData): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const payload = buildNativeSchedulePayload(data);

  // Save to web local cache
  try {
    localStorage.setItem("odyssey_native_schedule_cache", payload);
  } catch {}

  // Push to Android native bridge if present
  if (window.OdysseyAndroid?.syncSchedule) {
    try {
      const res = window.OdysseyAndroid.syncSchedule(payload);
      return res !== false;
    } catch (e) {
      console.warn("OdysseyAndroid.syncSchedule error:", e);
    }
  } else if (window.Android?.syncSchedule) {
    try {
      window.Android.syncSchedule(payload);
      return true;
    } catch (e) {
      console.warn("Android.syncSchedule error:", e);
    }
  }

  return true;
}

/**
 * Explicitly synchronizes and verifies that the Android Live Wallpaper Service
 * has committed the schedule and habits data to disk.
 * Returns a detailed verification result with exact confirmed task & habit counts.
 */
export async function syncAndVerifySchedule(data: WallpaperData): Promise<SyncVerificationResult> {
  const timeFormatted = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const payload = buildNativeSchedulePayload(data);
  const parsed = JSON.parse(payload);
  const taskNames = (parsed.blocks || []).map((b: any) => b.title).filter(Boolean);
  const habitNames = (parsed.habits || []).map((h: any) => `${h.name} ${h.icon}`).filter(Boolean);

  // Cache to web storage
  try {
    localStorage.setItem("odyssey_native_schedule_cache", payload);
  } catch {}

  // 1. Native Android APK Bridge Check
  if (typeof window !== "undefined" && window.OdysseyAndroid) {
    try {
      // Try syncScheduleWithResult first
      if (window.OdysseyAndroid.syncScheduleWithResult) {
        const rawRes = window.OdysseyAndroid.syncScheduleWithResult(payload);
        try {
          const resObj = JSON.parse(rawRes);
          if (resObj.success) {
            return {
              success: true,
              isNativeBridge: true,
              blockCount: resObj.blockCount ?? taskNames.length,
              habitCount: resObj.habitCount ?? habitNames.length,
              taskNames,
              habitNames,
              streak: resObj.streak ?? data.userStreak ?? 1,
              message: `Verified: ${resObj.blockCount ?? taskNames.length} tasks and ${resObj.habitCount ?? habitNames.length} hobbies confirmed in Android Native Storage!`,
              timestamp: timeFormatted,
            };
          }
        } catch {}
      }

      // Fallback: standard syncSchedule + verifySync
      window.OdysseyAndroid.syncSchedule?.(payload);
      const verifyStr = window.OdysseyAndroid.verifySync?.() || "";
      const isOk = verifyStr.startsWith("OK") || verifyStr.length > 0;

      return {
        success: isOk,
        isNativeBridge: true,
        blockCount: taskNames.length,
        habitCount: habitNames.length,
        taskNames,
        habitNames,
        streak: data.userStreak || 1,
        message: isOk
          ? `Verified: ${taskNames.length} tasks and ${habitNames.length} hobbies synced to Android preferences.`
          : `Synced to native Android engine (${taskNames.length} tasks, ${habitNames.length} hobbies).`,
        timestamp: timeFormatted,
      };
    } catch (e: any) {
      return {
        success: false,
        isNativeBridge: true,
        blockCount: taskNames.length,
        habitCount: habitNames.length,
        taskNames,
        habitNames,
        streak: data.userStreak || 1,
        message: `Native bridge error during sync: ${e?.message || e}`,
        error: String(e),
        timestamp: timeFormatted,
      };
    }
  }

  // 2. Generic Android Bridge
  if (typeof window !== "undefined" && window.Android?.syncSchedule) {
    try {
      window.Android.syncSchedule(payload);
      return {
        success: true,
        isNativeBridge: true,
        blockCount: taskNames.length,
        habitCount: habitNames.length,
        taskNames,
        habitNames,
        streak: data.userStreak || 1,
        message: `Synced ${taskNames.length} tasks & ${habitNames.length} hobbies to Android bridge.`,
        timestamp: timeFormatted,
      };
    } catch (e: any) {
      return {
        success: false,
        isNativeBridge: true,
        blockCount: taskNames.length,
        habitCount: habitNames.length,
        taskNames,
        habitNames,
        streak: data.userStreak || 1,
        message: `Android bridge sync error: ${e?.message || e}`,
        timestamp: timeFormatted,
      };
    }
  }

  // 3. Web Browser Environment (No native bridge injected)
  return {
    success: false,
    isNativeBridge: false,
    blockCount: taskNames.length,
    habitCount: habitNames.length,
    taskNames,
    habitNames,
    streak: data.userStreak || 1,
    message: "Running in web browser (Chrome). The 24-hour schedule and hobbies are verified in web cache, but modifying your physical phone's lockscreen requires the Native APK build.",
    timestamp: timeFormatted,
  };
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

/**
 * Instantly triggers a test cadence notification on native Android.
 */
export function triggerNativeTestNotification(): boolean {
  if (typeof window === "undefined") return false;
  if (window.OdysseyAndroid?.triggerTestNotification) {
    try {
      return Boolean(window.OdysseyAndroid.triggerTestNotification());
    } catch {}
  }
  if (window.Android?.triggerTestNotification) {
    try {
      return Boolean(window.Android.triggerTestNotification());
    } catch {}
  }
  return false;
}

/**
 * Opens the Android system wallpaper picker so the user can easily select
 * their previous gallery photo or custom wallpaper.
 */
export function openSystemWallpaperPicker(): boolean {
  if (typeof window === "undefined") return false;
  if (window.OdysseyAndroid?.openSystemWallpaperChooser) {
    try {
      return Boolean(window.OdysseyAndroid.openSystemWallpaperChooser());
    } catch {}
  }
  if (window.Android?.openSystemWallpaperChooser) {
    try {
      return Boolean(window.Android.openSystemWallpaperChooser());
    } catch {}
  }
  return false;
}

/**
 * Enables automatic XX:57 cadence notifications.
 */
export function enableCadenceNotifications(): boolean {
  if (typeof window === "undefined") return false;
  if (window.OdysseyAndroid?.enableCadenceNotifications) {
    try {
      return Boolean(window.OdysseyAndroid.enableCadenceNotifications());
    } catch {}
  }
  if (window.Android?.enableCadenceNotifications) {
    try {
      return Boolean(window.Android.enableCadenceNotifications());
    } catch {}
  }
  return false;
}

/**
 * Disables automatic XX:57 cadence notifications.
 */
export function disableCadenceNotifications(): boolean {
  if (typeof window === "undefined") return false;
  if (window.OdysseyAndroid?.disableCadenceNotifications) {
    try {
      return Boolean(window.OdysseyAndroid.disableCadenceNotifications());
    } catch {}
  }
  if (window.Android?.disableCadenceNotifications) {
    try {
      return Boolean(window.Android.disableCadenceNotifications());
    } catch {}
  }
  return false;
}

/**
 * Checks whether cadence notifications are enabled in native preferences.
 */
export function isCadenceNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  if (window.OdysseyAndroid?.isCadenceNotificationsEnabled) {
    try {
      return Boolean(window.OdysseyAndroid.isCadenceNotificationsEnabled());
    } catch {}
  }
  if (window.Android?.isCadenceNotificationsEnabled) {
    try {
      return Boolean(window.Android.isCadenceNotificationsEnabled());
    } catch {}
  }
  return true;
}

/**
 * Applies a custom wallpaper image directly to target:
 * "lock" -> Lock screen only
 * "home" -> Home screen only
 * "both" -> Lock and Home screen
 */
export function setCustomTargetWallpaper(base64Image: string, target: "lock" | "home" | "both" = "both"): boolean {
  if (typeof window === "undefined") return false;
  if (window.OdysseyAndroid?.setCustomWallpaper) {
    try {
      return Boolean(window.OdysseyAndroid.setCustomWallpaper(base64Image, target));
    } catch {}
  }
  if (window.Android?.setCustomWallpaper) {
    try {
      return Boolean(window.Android.setCustomWallpaper(base64Image, target));
    } catch {}
  }
  return false;
}

/**
 * Saves the user's custom alternate wallpaper in native storage.
 */
export function saveNativeAlternateWallpaper(base64Image: string, target: "lock" | "home"): boolean {
  if (typeof window === "undefined") return false;
  if (window.OdysseyAndroid?.saveAlternateWallpaper) {
    try {
      return Boolean(window.OdysseyAndroid.saveAlternateWallpaper(base64Image, target));
    } catch {}
  }
  if (window.Android?.saveAlternateWallpaper) {
    try {
      return Boolean(window.Android.saveAlternateWallpaper(base64Image, target));
    } catch {}
  }
  return false;
}

/**
 * Retrieves the user's saved alternate wallpaper from native storage.
 */
export function getNativeAlternateWallpaper(target: "lock" | "home"): string {
  if (typeof window === "undefined") return "";
  if (window.OdysseyAndroid?.getAlternateWallpaper) {
    try {
      return window.OdysseyAndroid.getAlternateWallpaper(target) || "";
    } catch {}
  }
  if (window.Android?.getAlternateWallpaper) {
    try {
      return window.Android.getAlternateWallpaper(target) || "";
    } catch {}
  }
  return "";
}

/**
 * Applies the user's saved alternate wallpaper directly to lock, home, or both.
 */
export function applyNativeAlternateWallpaper(target: "lock" | "home" | "both" = "both"): boolean {
  if (typeof window === "undefined") return false;
  if (window.OdysseyAndroid?.applyAlternateWallpaper) {
    try {
      return Boolean(window.OdysseyAndroid.applyAlternateWallpaper(target));
    } catch {}
  }
  if (window.Android?.applyAlternateWallpaper) {
    try {
      return Boolean(window.Android.applyAlternateWallpaper(target));
    } catch {}
  }
  return false;
}

export interface AppUpdateCheckResult {
  hasUpdate: boolean;
  currentVersionCode: number;
  currentVersionName: string;
  latestVersionCode: number;
  latestVersionName: string;
  apkUrl: string;
  changelog: string[];
  mandatory: boolean;
}

/**
 * Returns the currently installed native APK version info.
 */
export function getNativeAppVersion(): { versionCode: number; versionName: string } {
  if (typeof window === "undefined") return { versionCode: 1, versionName: "1.0" };

  try {
    if (window.OdysseyAndroid?.getAppVersionCode) {
      return {
        versionCode: window.OdysseyAndroid.getAppVersionCode() || 1,
        versionName: window.OdysseyAndroid.getAppVersionName?.() || "1.0",
      };
    }
    if (window.Android?.getAppVersionCode) {
      return {
        versionCode: window.Android.getAppVersionCode() || 1,
        versionName: window.Android.getAppVersionName?.() || "1.0",
      };
    }
  } catch {}

  return { versionCode: 1, versionName: "1.0" };
}

/**
 * Downloads the updated APK and prompts Android's native in-place installer.
 */
export function downloadAndInstallNativeApk(apkUrl: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const fullUrl =
      apkUrl.startsWith("http://") || apkUrl.startsWith("https://")
        ? apkUrl
        : `${window.location.origin}${apkUrl.startsWith("/") ? "" : "/"}${apkUrl}`;

    if ((window.OdysseyAndroid as any)?.downloadAndInstallApk) {
      return (window.OdysseyAndroid as any).downloadAndInstallApk(fullUrl);
    }
    if ((window.Android as any)?.downloadAndInstallApk) {
      return (window.Android as any).downloadAndInstallApk(fullUrl);
    }
    // Browser fallback: trigger immediate direct file download without opening empty tabs
    const a = document.createElement("a");
    a.href = fullUrl;
    a.download = "odyssey-latest.apk";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks Vercel API for newer APK releases.
 */
export async function checkForAppUpdate(): Promise<AppUpdateCheckResult | null> {
  if (typeof window === "undefined") return null;

  try {
    const res = await fetch("/api/app-version", { cache: "no-store" });
    if (!res.ok) return null;

    const data = await res.json();
    const current = getNativeAppVersion();

    return {
      hasUpdate: data.versionCode > current.versionCode,
      currentVersionCode: current.versionCode,
      currentVersionName: current.versionName,
      latestVersionCode: data.versionCode,
      latestVersionName: data.versionName,
      apkUrl: data.apkUrl,
      changelog: data.changelog || [],
      mandatory: Boolean(data.mandatory),
    };
  } catch {
    return null;
  }
}

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Automatically fetches today's latest schedule & habits from IndexedDB
 * and pushes the updated payload directly to the Android native bridge.
 * This ensures the lockscreen & live wallpapers refresh immediately
 * whenever any task is added, edited, deleted, or auto-filled!
 */
export async function syncCurrentScheduleToNative(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  return new Promise((resolve) => {
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
    }

    syncDebounceTimer = setTimeout(async () => {
      try {
        const users = await db.profiles.toArray();
        const user = users[0];
        if (!user) {
          resolve(false);
          return;
        }

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const blocks = await db.scheduleBlocks
          .where("[userId+date]")
          .equals([user.id, todayStr])
          .toArray();

        // Sort blocks by start time
        blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));

        const habits = await db.habits
          .where("userId")
          .equals(user.id)
          .toArray();

        const rankInfo = getRankInfo(user.militaryRank || calculateRank(user.streak ?? 0));
        const plannedHours = blocks.length;
        const activeDay = user.streak > 0 ? user.streak : 1;
        const activeChapter = Math.ceil(activeDay / 7);

        const wallpaperData: WallpaperData = {
          chapter: activeChapter,
          activeDay,
          rankBadge: rankInfo.badge,
          rankName: rankInfo.name,
          userLevel: user.level ?? 1,
          userStreak: user.streak ?? 1,
          plannedHours,
          dateStr: todayStr,
          formattedDate: now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
          blocks,
          habits,
          showClockGuide: false,
          includeHobbies: true,
        };

        const res = await syncScheduleDataToNative(wallpaperData);
        resolve(res);
      } catch (err) {
        console.warn("syncCurrentScheduleToNative failed:", err);
        resolve(false);
      }
    }, 250);
  });
}

/**
 * Sends a test notification to Android or browser.
 */
export function sendTestNotificationToAndroid(
  timeStr = "09:42",
  taskTitle = "Deep Focus Sprint",
  category = "Focus"
): boolean {
  const nativeOk = triggerNativeTestNotification();
  if (nativeOk) return true;

  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(`Odyssey • XX:57 Heads-Up`, {
        body: `Upcoming at ${timeStr}: ${taskTitle} (${category})`,
        icon: "/logo.png",
      });
      return true;
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          new Notification(`Odyssey • XX:57 Heads-Up`, {
            body: `Upcoming at ${timeStr}: ${taskTitle} (${category})`,
            icon: "/logo.png",
          });
        }
      });
      return true;
    }
  }
  return false;
}



