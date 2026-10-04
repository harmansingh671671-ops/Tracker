import { logWarn, readString, writeString } from "@/lib/utils/logger";
import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "odyssey_theme_mode";

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (mode: ThemeMode) => void;
  initTheme: () => void;
  destroyThemeListener: () => void;
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeClass(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  }
}

// Active system-colour listener. Held at module scope so it can be detached
// on unmount; a bare addEventListener here would leak on every mount.
let systemMediaQuery: MediaQueryList | null = null;
let systemThemeHandler: ((e: MediaQueryListEvent) => void) | null = null;

function detachSystemThemeListener() {
  if (systemMediaQuery && systemThemeHandler) {
    systemMediaQuery.removeEventListener("change", systemThemeHandler);
  }
  systemMediaQuery = null;
  systemThemeHandler = null;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "system",
  resolvedTheme: "dark",

  initTheme: () => {
    if (typeof window === "undefined") return;
    const stored = (readString(THEME_STORAGE_KEY) as ThemeMode) || "system";
    const systemTheme = getSystemTheme();
    const resolved = stored === "system" ? systemTheme : stored;

    applyThemeClass(resolved);
    set({ theme: stored, resolvedTheme: resolved });

    // Listen to OS system color scheme changes when mode is "system".
    // Detach any previous listener first so initTheme is safe to call twice
    // (React StrictMode double-invokes effects in development).
    detachSystemThemeListener();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const currentTheme = get().theme;
      if (currentTheme === "system") {
        const newResolved = e.matches ? "dark" : "light";
        applyThemeClass(newResolved);
        set({ resolvedTheme: newResolved });
      }
    };

    mediaQuery.addEventListener("change", handler);
    systemMediaQuery = mediaQuery;
    systemThemeHandler = handler;
  },

  destroyThemeListener: () => {
    detachSystemThemeListener();
  },

  setTheme: (mode: ThemeMode) => {
    if (typeof window === "undefined") return;
    writeString(THEME_STORAGE_KEY, mode);
    const systemTheme = getSystemTheme();
    const resolved = mode === "system" ? systemTheme : mode;
    applyThemeClass(resolved);
    set({ theme: mode, resolvedTheme: resolved });
  },
}));
