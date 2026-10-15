/**
 * Native bridge barrel — P0-T6.
 *
 * `@/lib/utils/android-bridge` used to be a single 829-line file holding all 34
 * native methods (debt **D1**, a "god-node"). It is now split by concern:
 *
 * | Module         | Concern                                        |
 * |----------------|------------------------------------------------|
 * | `core`         | the ONLY module allowed to touch `window.*`    |
 * | `schedule`     | IndexedDB -> payload, push and verify sync     |
 * | `wallpaper`    | applying/storing the lockscreen and home image |
 * | `notifications`| the XX:57 cadence reminder                    |
 * | `app-update`   | APK version check and in-place install         |
 *
 * This barrel re-exports all of them, so **every existing import path is
 * unchanged** — the split is behaviour-preserving by construction, and no
 * consumer had to be edited to accommodate it. That is the point of keeping
 * the public surface flat: a refactor that requires 8 files to change in step
 * is a refactor that can be half-applied.
 *
 * `core` is the only module `eslint.config.mjs` exempts from
 * `odyssey/bridge-boundary`, and it is exempt for a structural reason: the
 * alias question (`OdysseyAndroid` vs `Android` vs `AndroidWallpaper`) has
 * exactly one correct answer and it is answered in one place.
 */

export {
  // Types
  type NativeWallpaperResult,
  type SyncVerificationResult,
  type OdysseyBridge,
  // Resolver
  nativeBridge,
  hasNative,
  callNative,
  callNativeBool,
  isAndroidApp,
  isNativeBridgeAvailable,
  errText,
  trueStreak,
} from "./core";

export {
  buildNativeSchedulePayload,
  syncScheduleDataToNative,
  syncAndVerifySchedule,
  syncCurrentScheduleToNative,
} from "./schedule";

export {
  setNativeLockscreen,
  launchLiveWallpaperPicker,
  enableNativeHourlyAutoUpdate,
  disableNativeHourlyAutoUpdate,
  checkNativeAutoUpdateStatus,
  clearNativeLockscreen,
  pickNativeCustomWallpaperPhoto,
  openSystemWallpaperPicker,
  openSystemWallpaperChooser,
  setCustomTargetWallpaper,
  saveNativeAlternateWallpaper,
  getNativeAlternateWallpaper,
  clearNativeAlternateWallpaper,
  applyNativeAlternateWallpaper,
  saveNativeCustomWallpaper,
  getNativeCustomWallpaper,
  clearNativeCustomWallpaper,
  applyNativeCustomWallpaper,
} from "./wallpaper";

export {
  enableCadenceNotifications,
  disableCadenceNotifications,
  isCadenceNotificationsEnabled,
  triggerNativeTestNotification,
  sendTestNotificationToAndroid,
} from "./notifications";

export {
  type AppUpdateCheckResult,
  isAndroidNativeApp,
  getNativeAppVersion,
  downloadAndInstallNativeApk,
  checkForAppUpdate,
} from "./app-update";