"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/stores/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { initTheme, destroyThemeListener } = useThemeStore();

  useEffect(() => {
    initTheme();
    return destroyThemeListener;
  }, [initTheme, destroyThemeListener]);

  return <>{children}</>;
}
