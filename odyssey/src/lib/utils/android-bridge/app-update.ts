import { nativeBridge, callNative, callNativeBool, hasNative } from "./core";

/**
 * APK version checking and in-place updates — P0-T6.
 *
 * Isolated because it is the only part of the bridge that reaches the network
 * (`/api/app-version`) and the only part that mutates the installed app. It had
 * no business sharing a file with the wallpaper pickers.
 */

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