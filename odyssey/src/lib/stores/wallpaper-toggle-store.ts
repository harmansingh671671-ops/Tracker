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
import { logWarn, readBool, writeString } from "@/lib/utils/logger";
import { callNative, hasNative, nativeBridge } from "@/lib/utils/android-bridge";

/** Mirrors the native `odyssey_prefs:wallpaper_enabled` preference. */
export const WALLPAPER_ENABLED_KEY = "odyssey_wallpaper_enabled";

/** Reads the stored preference. `false` whenever it is absent or unreadable. */
function readStored(): boolean {
  return readBool(WALLPAPER_ENABLED_KEY, false);
}

interface WallpaperToggleState {
  /** False until `refresh` resolves, so UI never flashes the wrong state. */
  loaded: boolean;
  enabled: boolean;
  refresh: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<boolean>;
}

function readNativeFlag(): boolean | null {
  if (typeof window === "undefined") return null;
  // Was `const bridge = window.OdysseyAndroid; if (!bridge?.isWallpaperEnabled)`.
  // Reaching for the global here is exactly what `odyssey/bridge-boundary`
  // forbids -- and the rule's selector only matched the two-level form, so
  // this line passed lint for as long as the rule existed. Fixing the selector
  // found it immediately.
  if (!nativeBridge() || !hasNative("isWallpaperEnabled")) return null; // no native side (web preview)
  // A throwing bridge is reported by callNative as `undefined`, which compares
  // false here -- the same outcome the original `catch` produced, but now it is
  // also logged rather than swallowed.
  return callNative<unknown>("isWallpaperEnabled") === true;
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
    const webEnabled = readStored();

    // Native is authoritative whenever it can answer -- including a `false`.
    // A stale stored value must never resurrect a wallpaper the user switched
    // off, which is exactly what `nativeEnabled || webEnabled` did.
    const enabled = nativeEnabled === null ? webEnabled : nativeEnabled;
    writeString(WALLPAPER_ENABLED_KEY, String(enabled));
    set({ loaded: true, enabled });
  },

  setEnabled: async (enabled: boolean) => {
    // Optimistic for instant feedback, reconciled by the native result below.
    set({ loaded: true, enabled });
    writeString(WALLPAPER_ENABLED_KEY, String(enabled));

    if (typeof window === "undefined") return enabled;

    try {
      if (nativeBridge() && hasNative("setWallpaperMasterEnabled")) {
        // NOT callNativeBool. `callNative` reports three different situations
        // as `undefined` -- bridge absent, method missing, or the bridge
        // throwing -- and this code must tell "the phone said no" apart from
        // "we could not ask the phone".
        //
        // "Said no" (returned false) flips to the opposite of what was asked.
        // "Could not ask" settles OFF in both directions: a bridge we could not
        // reach must never leave the wallpaper running, and above all must not
        // turn a wallpaper the user just switched OFF back on.
        const raw = callNative<unknown>("setWallpaperMasterEnabled", enabled);
        if (raw === undefined) {
          set({ enabled: false });
          writeString(WALLPAPER_ENABLED_KEY, "false");
          return false;
        }
        const ok = raw !== false;
        // Native is authoritative -- it may refuse (e.g. restore failed).
        set({ enabled: ok ? enabled : !enabled });
        if (!ok) {
          writeString(WALLPAPER_ENABLED_KEY, String(!enabled));
        }
        return ok;
      }
      // No native bridge (web preview): the stored flag above is enough.
      return enabled;
    } catch (e) {
      logWarn("wallpaper-toggle-store", "bridge call setWallpaperMasterEnabled failed", e);
      // Bridge threw. Fall back to the stored value so the UI stays consistent
      // with what the rest of the app will read.
      const settled = !get().enabled ? enabled : !enabled;
      set({ enabled: settled });
      return settled;
    }
  },
}));
