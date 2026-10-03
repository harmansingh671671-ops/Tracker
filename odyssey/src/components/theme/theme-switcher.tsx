"use client";

import { useThemeStore, type ThemeMode } from "@/lib/stores/theme-store";
import { Sun, Moon, Laptop, Check } from "lucide-react";

export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useThemeStore();

  // Order matters: Light (left) -> System (centre, default) -> Dark (right).
  const options: Array<{
    mode: ThemeMode;
    label: string;
    sublabel: string;
    icon: typeof Sun;
  }> = [
    {
      mode: "light",
      label: "Light",
      sublabel: "Clean daylight",
      icon: Sun,
    },
    {
      mode: "system",
      label: "System",
      sublabel: "Match device mode",
      icon: Laptop,
    },
    {
      mode: "dark",
      label: "Dark",
      sublabel: "Midnight Cyberpunk",
      icon: Moon,
    },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => {
          const isSelected = theme === opt.mode;
          const Icon = opt.icon;

          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setTheme(opt.mode)}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer relative overflow-hidden select-none active:scale-[0.98] ${
                isSelected
                  ? "bg-primary/15 border-primary shadow-sm text-on-surface ring-1 ring-primary/40"
                  : "bg-surface-container-high/60 hover:bg-surface-container-high border-outline/15 text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {/* Header Icon + Checkmark */}
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-primary text-on-primary shadow-sm shadow-primary/30"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Text labels */}
              <div>
                <span
                  className={`text-xs font-bold block ${
                    isSelected ? "text-on-surface" : "text-on-surface-variant"
                  }`}
                >
                  {opt.label}
                </span>
                <span className="text-[10px] font-mono text-on-surface-variant/70 block leading-tight mt-0.5">
                  {opt.sublabel}
                  {/* When "System" is active, surface which theme it resolved
                      to — otherwise the active theme is invisible. */}
                  {isSelected && opt.mode === "system" && (
                    <span className="block font-bold text-primary mt-0.5">
                      Showing {resolvedTheme}
                    </span>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
