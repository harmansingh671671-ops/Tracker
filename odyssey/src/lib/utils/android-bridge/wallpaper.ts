import { type WallpaperData, generateWallpaperCanvas } from "../wallpaper-generator";
import { readString, remove, writeString } from "@/lib/utils/logger";
import { callNative, callNativeBool, type NativeWallpaperResult } from "./core";
import { syncScheduleDataToNative } from "./schedule";

/**
 * Wallpaper application and storage — P0-T6.
 *
 * Everything that puts an image on a screen: applying the generated canvas,
 * the live-wallpaper picker, the hourly auto-update worker, and the user's own
 * saved lock/home images. These were interleaved with notification and
 * app-update code in one file; they are separate concerns that happen to share
 * a bridge.
 */

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