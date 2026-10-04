import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useWallpaperToggle, WALLPAPER_ENABLED_KEY } from "./wallpaper-toggle-store";

/**
 * The wallpaper is a background service that keeps burning CPU with the app
 * closed, so "OFF by default" is a correctness rule, not a preference: any path
 * that resolves to enabled without the user asking for it is a bug.
 */
let store: Record<string, string>;
let nativeEnabled = false;
let nativeThrows = false;

const reset = () => {
  store = {};
  nativeEnabled = false;
  nativeThrows = false;
  // Start from the OFF state every test asserts against.
  useWallpaperToggle.setState({ loaded: false, enabled: false });
};

beforeEach(() => {
  reset();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
  });
  // The store reads window.OdysseyAndroid, which is how addJavascriptInterface
  // exposes the native bridge -- so the stub has to live ON the window object.
  vi.stubGlobal("window", {
    OdysseyAndroid: {
      isWallpaperEnabled: () => {
        if (nativeThrows) throw new Error("bridge unavailable");
        return nativeEnabled;
      },
      setWallpaperMasterEnabled: (enabled: boolean) => {
        if (nativeThrows) throw new Error("bridge unavailable");
        nativeEnabled = enabled;
        return true;
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("wallpaper master toggle", () => {
  it("defaults to OFF", () => {
    expect(useWallpaperToggle.getState().enabled).toBe(false);
  });

  it("stays off when no native flag and no stored value exist", async () => {
    vi.stubGlobal("window", {});
    await useWallpaperToggle.getState().refresh();
    expect(useWallpaperToggle.getState().enabled).toBe(false);
  });

  it("reads ON from the native preference when the user enabled it", async () => {
    nativeEnabled = true;
    await useWallpaperToggle.getState().refresh();
    expect(useWallpaperToggle.getState().enabled).toBe(true);
  });

  it("enables via the native master switch and mirrors to storage", async () => {
    const ok = await useWallpaperToggle.getState().setEnabled(true);
    expect(ok).toBe(true);
    expect(nativeEnabled).toBe(true);
    expect(useWallpaperToggle.getState().enabled).toBe(true);
    expect(store[WALLPAPER_ENABLED_KEY]).toBe("true");
  });

  it("disables via the native master switch and mirrors to storage", async () => {
    nativeEnabled = true;
    await useWallpaperToggle.getState().setEnabled(true);
    const ok = await useWallpaperToggle.getState().setEnabled(false);
    expect(ok).toBe(true);
    // Native must actually be told to stand down, not just the web mirror.
    expect(nativeEnabled).toBe(false);
    expect(useWallpaperToggle.getState().enabled).toBe(false);
    expect(store[WALLPAPER_ENABLED_KEY]).toBe("false");
  });

  it("does not require a native bridge (web preview still toggles)", async () => {
    vi.stubGlobal("window", {});
    const ok = await useWallpaperToggle.getState().setEnabled(true);
    expect(ok).toBe(true);
    expect(useWallpaperToggle.getState().enabled).toBe(true);
  });

  it("reconciles to OFF when the native bridge throws on read", async () => {
    store[WALLPAPER_ENABLED_KEY] = "true";
    nativeThrows = true;
    await useWallpaperToggle.getState().refresh();
    // A bridge failure must never be read as permission to run the wallpaper.
    expect(useWallpaperToggle.getState().enabled).toBe(false);
  });

  it("never claims loaded before the first read", () => {
    expect(useWallpaperToggle.getState().loaded).toBe(false);
  });
});