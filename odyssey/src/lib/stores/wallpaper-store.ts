import { create } from "zustand";

export interface WallpaperSettings {
  enabled: boolean;
  showClockGuide: boolean;
  includeHobbies: boolean;
  deviceRatio: "phone" | "tablet" | "desktop";
  lastGeneratedAt?: string;
}

interface WallpaperStoreState extends WallpaperSettings {
  setEnabled: (enabled: boolean) => void;
  setShowClockGuide: (show: boolean) => void;
  setIncludeHobbies: (include: boolean) => void;
  setDeviceRatio: (ratio: "phone" | "tablet" | "desktop") => void;
  toggleEnabled: () => void;
}

const STORAGE_KEY = "odyssey_wallpaper_settings";

function loadSavedSettings(): WallpaperSettings {
  if (typeof window === "undefined") {
    return {
      enabled: true,
      showClockGuide: true,
      includeHobbies: true,
      deviceRatio: "phone",
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : true,
        showClockGuide: typeof parsed.showClockGuide === "boolean" ? parsed.showClockGuide : true,
        includeHobbies: typeof parsed.includeHobbies === "boolean" ? parsed.includeHobbies : true,
        deviceRatio: parsed.deviceRatio || "phone",
      };
    }
  } catch {}
  return {
    enabled: true,
    showClockGuide: true,
    includeHobbies: true,
    deviceRatio: "phone",
  };
}

function saveSettings(settings: WallpaperSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export const useWallpaperStore = create<WallpaperStoreState>((set, get) => {
  const initial = loadSavedSettings();

  return {
    ...initial,
    setEnabled: (enabled) => {
      set({ enabled });
      saveSettings({ ...get(), enabled });
    },
    toggleEnabled: () => {
      const next = !get().enabled;
      set({ enabled: next });
      saveSettings({ ...get(), enabled: next });
    },
    setShowClockGuide: (showClockGuide) => {
      set({ showClockGuide });
      saveSettings({ ...get(), showClockGuide });
    },
    setIncludeHobbies: (includeHobbies) => {
      set({ includeHobbies });
      saveSettings({ ...get(), includeHobbies });
    },
    setDeviceRatio: (deviceRatio) => {
      set({ deviceRatio });
      saveSettings({ ...get(), deviceRatio });
    },
  };
});
