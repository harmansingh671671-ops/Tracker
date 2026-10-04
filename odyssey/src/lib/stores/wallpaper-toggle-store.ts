/**
 * Master on/off switch for the entire Odyssey wallpaper mechanism.
 *
 * DEFAULT IS OFF. The wallpaper is a background service that burns CPU while
 * the app is closed (see inefficiencies.md §2.1), so it must never run unless
 * the user has explicitly asked for it.
 *
 * Turning it OFF is not merely hiding a setting -- it must fully stand the
 * mechanism down:
 *   - native `wallpaper_enabled` preference set to false (the live wallpaper
 *     engine reads this and stops its 30 FPS render loop)
 *   - the user's own lock + home wallpapers restored
 *   - the hourly auto-update alarm cancelled, so the device is not woken
 *     every hour for wallpaper work the user has switched off
 *
 * When disabled, the Wallpaper Studio entry point is hidden (stats page), so
 * the feature is unreachable rather than merely inert.
 */

import { create } from "zustand";

/** Mirrors the native `odyssey_prefs:wallpaper_enabled` preference. */
export const WALLPAPER_ENABLED_KEY = "odyssey_wallpaper_enabled";

interface WallpaperToggleState {
  /** False until `refresh` resolves, so UI never flashes the wrong state. */
  loaded: boolean;
  enabled: boolean;
  refresh: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<boolean>;
}

function readNativeFlag(): boolean | null {
  if (typeof window === "undefined") return null;
  const bridge = window.OdysseyAndroid;
  if (!bridge?.isWallpaperEnabled) return null; // no native side (web preview)
  try {
    return bridge.isWallpaperEnabled() === true;
  } catch {
    // The bridge exists but failed. We do NOT know the native state, and a
    // wrong "on" means background battery burn the user never asked for.
    return false;
  }
}

export const useWallpaperToggle = create<WallpaperToggleState>((set, get) => ({
  loaded: false,
  // OFF by default. Never optimistically true.
  enabled: false,

  refresh: async () => {
    if (typeof window === "undefined") {
      set({ loaded: true, enabled: false });
      return;
    }

    const nativeEnabled = readNativeFlag();
    // Web fallback so the setting still reflects a choice made in the browser
    // preview, where no native bridge exists.
    let webEnabled = false;
    try {
      webEnabled = localStorage.getItem(WALLPAPER_ENABLED_KEY) === "true";
    } catch {}

    // Native is authoritative whenever it can answer -- including a `false`.
    // A stale `localStorage` value must never resurrect a wallpaper the user
    // switched off, which is exactly what `nativeEnabled || webEnabled` did.
    const enabled = nativeEnabled === null ? webEnabled : nativeEnabled;
    try {
      localStorage.setItem(WALLPAPER_ENABLED_KEY, String(enabled));
    } catch {}
    set({ loaded: true, enabled });
  },

  setEnabled: async (enabled: boolean) => {
    // Optimistic for instant feedback, reconciled by the native result below.
    set({ loaded: true, enabled });
    try {
      localStorage.setItem(WALLPAPER_ENABLED_KEY, String(enabled));
    } catch {}

    if (typeof window === "undefined") return enabled;

    try {
      const bridge = window.OdysseyAndroid;
      if (bridge?.setWallpaperMasterEnabled) {
        const ok = bridge.setWallpaperMasterEnabled(enabled) !== false;
        // Native is authoritative -- it may refuse (e.g. restore failed).
        set({ enabled: ok ? enabled : !enabled });
        if (!ok) {
          try {
            localStorage.setItem(WALLPAPER_ENABLED_KEY, String(!enabled));
          } catch {}
        }
        return ok;
      }
      // No native bridge (web preview): the localStorage flag above is enough.
      return enabled;
    } catch {
      // Bridge threw. Fall back to whatever the localStorage mirror says so the
      // UI stays consistent with what the rest of the app will read.
      const settled = !get().enabled ? enabled : !enabled;
      set({ enabled: settled });
      return settled;
    }
  },
}));