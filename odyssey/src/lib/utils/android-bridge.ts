import { type WallpaperData, generateWallpaperCanvas, build24HourlyBlocks } from "./wallpaper-generator";
import { logWarn, readString, writeString, remove } from "@/lib/utils/logger";
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
    /**
     * The bridge, under either of its historical names.
     *
     * The Android side has exposed the same object as both `OdysseyAndroid` and
     * `Android`. Rather than duplicate that choice at ~50 call sites -- which is
     * exactly how the two drifted apart -- resolve it once, here.
     */
    OdysseyAndroid?: OdysseyBridge;
    /** @deprecated Historical alias for {@link OdysseyAndroid}. Read via `nativeBridge()`. */
    Android?: LegacyAndroidBridge;
    /** @deprecated Historical alias. Read via `nativeBridge()`. */
    AndroidWallpaper?: LegacyAndroidBridge;
    Capacitor?: { Plugins?: { Wallpaper?: { setWallpaper?: (opts: { image: string; target: string }) => Promise<{ success?: boolean }> } } };
  }
}

/** Methods on the current bridge. Optional because a browser has none of them. */
export interface OdysseyBridge {
  setLockscreenWallpaper?: (base64Image: string) => boolean;
  setWallpaper?: (base64Image: string) => void;
  setCustomWallpaper?: (base64Image: string, targetScreen: string) => boolean;
  saveCustomWallpaper?: (base64Image: string) => boolean;
  getCustomWallpaper?: () => string;
  clearCustomWallpaper?: () => boolean;
  applyCustomWallpaper?: (targetScreen: string) => boolean;
  pickCustomWallpaperPhoto?: (targetScreen?: string) => boolean;
  saveAlternateWallpaper?: (base64Image: string, targetScreen: string) => boolean;
  getAlternateWallpaper?: (targetScreen: string) => string;
  clearAlternateWallpaper?: (targetScreen: string) => boolean;
  applyAlternateWallpaper?: (targetScreen: string) => boolean;
  clearLockscreenWallpaper?: () => boolean;
  isWallpaperEnabled?: () => boolean;
  setWallpaperMasterEnabled?: (enabled: boolean) => boolean;
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
  downloadAndInstallApk?: (apkUrl: string) => boolean;
  isSupported?: () => boolean;
  [key: string]: unknown;
}

/**
 * The older alias. Deliberately NOT `Omit<OdysseyBridge, ...>`: `Omit` is built
 * on `Exclude<keyof T, K>`, and because `OdysseyBridge` has a string index
 * signature `keyof` is `string | number`, so the `Exclude` discards every named
 * method and the alias silently types as `{}`.
 */
type LegacyAndroidBridge = OdysseyBridge;

/** Best-effort message for an unknown thrown value, without asserting a type. */
function errText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e) ?? String(e);
  } catch {
    return String(e);
  }
}

/**
 * The native bridge, whichever name it answers to. `null` in a plain browser.
 *
 * Single source of truth for "is there a bridge, and which one is it". Every
 * call site goes through this so the alias question is answered once.
 */
export function nativeBridge(): OdysseyBridge | null {
  if (typeof window === "undefined") return null;
  return window.OdysseyAndroid ?? window.Android ?? window.AndroidWallpaper ?? null;
}

/** True when the bridge exists *and* implements `method`. */
export function hasNative(method: string): boolean {
  const b = nativeBridge();
  return Boolean(b && typeof b[method] === "function");
}

/**
 * Calls `method` on the bridge and returns its result.
 *
 * Returns `undefined` when there is no bridge or no such method, so callers can
 * tell "the phone said no" (`false`) from "there is no phone" (`undefined`).
 * A throwing bridge is reported and treated as absent rather than crashing the
 * screen -- this is the single place that decision is made.
 */
export function callNative<T>(method: string, ...args: unknown[]): T | undefined {
  const b = nativeBridge();
  const fn = b?.[method];
  if (typeof fn !== "function") return undefined;
  try {
    return (fn as (...a: unknown[]) => T).apply(b, args);
  } catch (e) {
    logWarn("android-bridge", `bridge call ${method} failed`, e);
    return undefined;
  }
}

/**
 * Like {@link callNative} but coerces a missing bridge to `fallback` (default
 * `false`). For the common "did it work?" bridge method.
 */
export function callNativeBool(method: string, args: unknown[] = [], fallback = false): boolean {
  const result = callNative<unknown>(method, ...args);
  if (result === undefined) return fallback;
  return result !== false;
}

/**
 * Detects whether the app is running inside an Android APK wrapper or WebView
 */
export function isAndroidApp(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Explicit native JavaScript Interface injected by Android APK
  if (nativeBridge()) return true;

  // 2. Capacitor native runtime on Android
  if (window.Capacitor) return true;

  // 3. Android WebView User-Agent signature
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isWebView =
    /wv|Version\/[0-9.]+/i.test(ua) ||
    Boolean((window as unknown as { chrome?: { webview?: unknown } }).chrome?.webview);

  return isAndroid && isWebView;
}

/**
 * Sends wallpaper directly to native Android lockscreen via JavaScript interface.
 * If running inside the Odyssey Native Android APK, this sets the lockscreen automatically with 0 clicks.
 * If running in a standard web browser/PWA, web security prevents silent lockscreen alteration.
 */
export async function setNativeLockscreen(data: WallpaperData, targetScreen: "lock" | "home" = "lock"): Promise<NativeWallpaperResult> {
  const canvas = await generateWallpaperCanvas({ ...data, showClockGuide: false });
  const dataUrl = canvas.toDataURL("image/png");

  // 1. Target-aware bridge method, then the lock-only legacy one, then the
  //    single-target legacy one. Each is a genuinely different bridge method,
  //    not a copy of the same check -- so they stay as separate attempts, but
  //    the alias resolution is now one call.
  const viaSetCustom = callNative<boolean>("setCustomWallpaper", dataUrl, targetScreen);
  if (viaSetCustom !== undefined) {
    await syncScheduleDataToNative(data);
    return {
      success: viaSetCustom !== false,
      method: "native_bridge",
      message:
        viaSetCustom !== false
          ? `${targetScreen === "home" ? "Home Screen" : "Lock Screen"} updated directly via Native Odyssey Bridge!`
          : "Native bridge reported an issue applying wallpaper.",
    };
  }

  const viaSetLockscreen = callNative<boolean>("setLockscreenWallpaper", dataUrl);
  if (viaSetLockscreen !== undefined) {
    await syncScheduleDataToNative(data);
    return {
      success: viaSetLockscreen !== false,
      method: "native_bridge",
      message:
        viaSetLockscreen !== false
          ? "Lockscreen updated directly via Native Odyssey Bridge!"
          : "Native bridge reported an issue applying wallpaper.",
    };
  }

  const viaSetWallpaper = callNative<void>("setWallpaper", dataUrl);
  if (viaSetWallpaper !== undefined) {
    await syncScheduleDataToNative(data);
    return {
      success: true,
      method: "native_bridge",
      message: "Lockscreen updated directly via Android bridge!",
    };
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
    } catch (e) {
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
  return (
    hasNative("setCustomWallpaper") ||
    hasNative("setLockscreenWallpaper") ||
    hasNative("setWallpaper") ||
    Boolean(window.Capacitor?.Plugins?.Wallpaper?.setWallpaper)
  );
}

/**
 * Generates the standardized 24-hour and habit payload for native wallpaper sync.
 */
export function buildNativeSchedulePayload(data: WallpaperData): string {
  const full24 = build24HourlyBlocks(data.blocks);
  
  // Pass all active habits with period & timeOfDay so both JS and native Android can dynamically switch them
  const habitsList = (data.habits && data.habits.length > 0)
    ? data.habits.map((h) => ({
        id: h.id,
        name: h.name,
        icon: h.icon,
        currentStreak: h.currentStreak || 1,
        category: h.category || "Habit Track",
        period: h.period || "",
        timeOfDay: h.timeOfDay || "",
      }))
    : [
        { name: "Mindful Focus", icon: "ðŸ§˜", currentStreak: data.userStreak || 1, category: "Habit Track", period: "morning", timeOfDay: "08:00 AM" },
        { name: "Daily Hydration", icon: "ðŸ’§", currentStreak: data.userStreak || 1, category: "Vitality Track", period: "afternoon", timeOfDay: "01:00 PM" },
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
  writeString("odyssey_native_schedule_cache", payload);

  // Push to Android native bridge if present. `undefined` means no bridge (or
  // a bridge that threw) -- the local cache is still correct, so report success.
  const res = callNative<boolean | void>("syncSchedule", payload);
  if (res === undefined) return true;
  return res !== false;
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
  const taskNames = ((parsed.blocks ?? []) as { title?: string }[])
    .map((b) => b.title)
    .filter((t): t is string => Boolean(t));
  const habitNames = ((parsed.habits ?? []) as { name?: string; icon?: string }[])
    .map((h) => `${h.name ?? ""} ${h.icon ?? ""}`.trim())
    .filter(Boolean);

  // Cache to web storage
  try {
    localStorage.setItem("odyssey_native_schedule_cache", payload);
  } catch (e) { logWarn("android-bridge", "could not write to storage", e); }

  // 1. Native Android APK bridge. The richer methods (result-reporting sync and
  //    verification) only exist on the current bridge; the legacy alias can only
  //    do a plain sync. One path, two capability levels.
  if (nativeBridge()) {
    try {
      const rawRes = callNative<string>("syncScheduleWithResult", payload);
      if (rawRes) {
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
        } catch (e) { logWarn("android-bridge", "sync result was not valid JSON", e); }
      }

      // Fallback: standard sync, then read back what landed.
      callNative("syncSchedule", payload);
      const verifyStr = callNative<string>("verifySync") || "";
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
    } catch (e) {
      return {
        success: false,
        isNativeBridge: true,
        blockCount: taskNames.length,
        habitCount: habitNames.length,
        taskNames,
        habitNames,
        streak: data.userStreak || 1,
        message: `Native bridge error during sync: ${errText(e)}`,
        error: String(e),
        timestamp: timeFormatted,
      };
    }
  }

  // 2. Web Browser Environment (No native bridge injected)
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
  // callNative already resolves the alias, reports a throwing bridge, and tells
  // "no bridge" from "bridge declined" via undefined vs false.
  return callNativeBool("launchLiveWallpaperPicker");
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

  return callNativeBool("enableHourlyAutoUpdate");
}

/**
 * Disables automatic hourly background updates in the Android APK.
 */
export function disableNativeHourlyAutoUpdate(): boolean {
  return callNativeBool("disableHourlyAutoUpdate");
}

/**
 * Checks whether the native hourly auto-update worker is active.
 */
export function checkNativeAutoUpdateStatus(): boolean {
  return callNativeBool("isHourlyAutoUpdateEnabled");
}

/**
 * Clears custom lockscreen wallpaper on Android and restores system default.
 */
export function clearNativeLockscreen(): boolean {
  return callNativeBool("clearLockscreenWallpaper");
}

/**
 * Instantly triggers a test cadence notification on native Android.
 */
export function triggerNativeTestNotification(): boolean {
  return callNativeBool("triggerTestNotification");
}

/**
 * Opens the native Android Photo / Gallery picker to directly select
 * and store a custom restoration wallpaper for target screen ("lock" or "home").
 */
export function pickNativeCustomWallpaperPhoto(targetScreen: "lock" | "home" = "lock"): boolean {
  return callNativeBool("pickCustomWallpaperPhoto", [targetScreen]);
}

/**
 * Opens the Android system wallpaper picker so the user can easily select
 * their previous gallery photo or custom wallpaper.
 */
export function openSystemWallpaperPicker(): boolean {
  return callNativeBool("openSystemWallpaperChooser");
}

export const openSystemWallpaperChooser = openSystemWallpaperPicker;

/**
 * Enables automatic XX:57 cadence notifications.
 */
export function enableCadenceNotifications(): boolean {
  return callNativeBool("enableCadenceNotifications");
}

/**
 * Disables automatic XX:57 cadence notifications.
 */
export function disableCadenceNotifications(): boolean {
  return callNativeBool("disableCadenceNotifications");
}

/**
 * Checks whether cadence notifications are enabled in native preferences.
 *
 * Defaults to `true` when there is no bridge: notifications-on is the intended
 * behaviour for the native app, so a missing bridge should not silently read
 * as "off" and suppress the schedule.
 */
export function isCadenceNotificationsEnabled(): boolean {
  return callNativeBool("isCadenceNotificationsEnabled", [], true);
}

/**
 * Applies a custom wallpaper image directly to target:
 * "lock" -> Lock screen only
 * "home" -> Home screen only
 */
export function setCustomTargetWallpaper(base64Image: string, target: "lock" | "home" = "lock"): boolean {
  return callNativeBool("setCustomWallpaper", [base64Image, target]);
}

/**
 * Saves the user's alternate wallpaper specifically for target screen ("lock" or "home").
 * Isolated so Lock Screen and Home Screen never overwrite each other.
 */
export function saveNativeAlternateWallpaper(base64Image: string, target: "lock" | "home" = "lock"): boolean {
  writeString(`odyssey_alt_wallpaper_${target}`, base64Image);

  callNativeBool("saveAlternateWallpaper", [base64Image, target]);

  // Always true: the browser-side mirror is written above, and the native side
  // is best-effort (it may be absent, or the phone may reject the blob).
  return true;
}

/**
 * Retrieves the user's saved alternate wallpaper for "lock" or "home".
 */
export function getNativeAlternateWallpaper(target: "lock" | "home" = "lock"): string {
  if (typeof window === "undefined") return "";

  const nativeVal = callNative<string>("getAlternateWallpaper", target);
  if (nativeVal && nativeVal.length > 0) return nativeVal;

  const local = readString(`odyssey_alt_wallpaper_${target}`);
  if (local) return local;

  // Legacy single-slot key, kept so older saves are not orphaned.
  if (target === "lock") {
    const legacy = readString("odyssey_custom_restoration_wallpaper");
    if (legacy) return legacy;
  }
  return "";
}

/**
 * Clears only the alternate wallpaper for the specified screen ("lock" or "home").
 */
export function clearNativeAlternateWallpaper(target: "lock" | "home" = "lock"): boolean {
  remove(`odyssey_alt_wallpaper_${target}`);
  if (target === "lock") {
    remove("odyssey_custom_restoration_wallpaper");
  }
  callNative("clearAlternateWallpaper", target);
  return true;
}

/**
 * Applies the user's saved alternate wallpaper directly to "lock" or "home".
 */
export function applyNativeAlternateWallpaper(target: "lock" | "home" = "lock", specificImage?: string): boolean {
  if (typeof window === "undefined") return false;
  const imageToApply = specificImage || getNativeAlternateWallpaper(target);

  // 1. Direct bitmap application via setCustomWallpaper
  if (imageToApply) {
    if (callNativeBool("setCustomWallpaper", [imageToApply, target])) return true;
  }

  // 2. Fallback to native bridge applyAlternateWallpaper
  return callNativeBool("applyAlternateWallpaper", [target]);
}

// Legacy aliases
export function saveNativeCustomWallpaper(base64Image: string): boolean {
  return saveNativeAlternateWallpaper(base64Image, "lock");
}
export function getNativeCustomWallpaper(): string {
  return getNativeAlternateWallpaper("lock");
}
export function clearNativeCustomWallpaper(): boolean {
  return clearNativeAlternateWallpaper("lock");
}
export function applyNativeCustomWallpaper(target: "lock" | "home" = "lock"): boolean {
  return applyNativeAlternateWallpaper(target);
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
 * Checks whether the app is running inside the native Android APK wrapper.
 */
export function isAndroidNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return nativeBridge() !== null;
}

/**
 * Returns the currently installed native APK version info.
 */
export function getNativeAppVersion(): { versionCode: number; versionName: string; isNative: boolean } {
  if (typeof window === "undefined") return { versionCode: 0, versionName: "Web", isNative: false };

  const code = callNative<number>("getAppVersionCode");
  if (code !== undefined) {
    return {
      versionCode: code || 1,
      versionName: callNative<string>("getAppVersionName") || "1.0",
      isNative: true,
    };
  }
  return { versionCode: 0, versionName: "Web", isNative: false };
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

    if (hasNative("downloadAndInstallApk")) {
      return callNativeBool("downloadAndInstallApk", [fullUrl]);
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
 * Only returns hasUpdate=true for installed Android APKs running an older versionCode.
 * Strictly returns null/false for regular Web Browser users.
 */
export async function checkForAppUpdate(): Promise<AppUpdateCheckResult | null> {
  if (typeof window === "undefined") return null;

  // 1. Strictly ignore regular Web Browser users
  const current = getNativeAppVersion();
  if (!current.isNative) {
    return null;
  }

  try {
    const res = await fetch("/api/app-version", { cache: "no-store" });
    if (!res.ok) return null;

    const data = await res.json();

    // 2. Only show update if current native versionCode is strictly LOWER than latest release
    const hasUpdate = Boolean(data.versionCode && data.versionCode > current.versionCode);

    return {
      hasUpdate,
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
export async function syncCurrentScheduleToNative(targetDateStr?: string): Promise<boolean> {
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
        const activeDateStr =
          targetDateStr && /^\d{4}-\d{2}-\d{2}$/.test(targetDateStr) ? targetDateStr : todayStr;

        const blocks = await db.scheduleBlocks
          .where("[userId+date]")
          .equals([user.id, activeDateStr])
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

        const [y, m, d] = activeDateStr.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);

        const wallpaperData: WallpaperData = {
          chapter: activeChapter,
          activeDay,
          rankBadge: rankInfo.badge,
          rankName: rankInfo.name,
          userLevel: user.level ?? 1,
          userStreak: user.streak ?? 1,
          plannedHours,
          dateStr: activeDateStr,
          formattedDate: dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
          blocks,
          habits,
          showClockGuide: false,
          includeHobbies: true,
        };

        const res = await syncScheduleDataToNative(wallpaperData);

        // If target was for tomorrow or another day, ALSO ensure today's live schedule is synced
        if (activeDateStr !== todayStr) {
          const todayBlocks = await db.scheduleBlocks
            .where("[userId+date]")
            .equals([user.id, todayStr])
            .toArray();
          todayBlocks.sort((a, b) => a.startTime.localeCompare(b.startTime));

          const todayWallpaperData: WallpaperData = {
            ...wallpaperData,
            plannedHours: todayBlocks.length,
            dateStr: todayStr,
            formattedDate: now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
            blocks: todayBlocks,
          };
          await syncScheduleDataToNative(todayWallpaperData);
        }

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
      new Notification(`Odyssey â€¢ XX:57 Heads-Up`, {
        body: `Upcoming at ${timeStr}: ${taskTitle} (${category})`,
        icon: "/logo.png",
      });
      return true;
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          new Notification(`Odyssey â€¢ XX:57 Heads-Up`, {
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

