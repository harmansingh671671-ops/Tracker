import { logWarn } from "@/lib/utils/logger";

/**
 * The native bridge resolver — P0-T6.
 *
 * This is the ONLY module in `android-bridge/` permitted to touch
 * `window.OdysseyAndroid` / `window.Android` / `window.AndroidWallpaper`, and it
 * is the whole of `BRIDGE_OWNER` in `eslint.config.mjs`. Everything else in this
 * directory goes through {@link nativeBridge} / {@link hasNative} /
 * {@link callNative} / {@link callNativeBool}.
 *
 * The file used to be all 34 methods in one 829-line module, which is what D1
 * meant by a god-node. Splitting it by concern means the alias question is
 * answered in exactly one place and nothing else can get it wrong.
 */

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
export function errText(e: unknown): string {
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
 * A streak is a count, and 0 is a real count.
 *
 * This used to read `h.currentStreak || 1`, which turned every genuine zero
 * into 1 -- and the native wallpaper renders that number in an amber
 * achievement pill ("1d" with a fire), so a habit with no streak at all
 * arrived on the lock screen wearing a trophy. M13 fixed exactly this on the
 * web side; the native side was never touched, so the app could read "No
 * streak yet" on screen and "1d" on the wallpaper at the same moment.
 *
 * Coerce rather than trust the type: the value round-trips through
 * IndexedDB, which is not type-checked, and a habit written by an older build
 * can hold anything. A non-number becomes 0, never 1.
 *
 * Lives in `core` because both the payload builder and the schedule sync need
 * it, and a helper duplicated across two modules is a helper that drifts.
 */
export function trueStreak(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}