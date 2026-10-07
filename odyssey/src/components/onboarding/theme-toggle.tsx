"use client";

/**
 * Three-way theme control (System / Light / Dark) for the first-run flow.
 *
 * "System" is a real option, not filler. The app resolves its theme through
 * `prefers-color-scheme` and the store already defaults to following the device,
 * so a two-way toggle would force a user with no opinion to override their own
 * device setting just to dismiss the control.
 *
 * It writes through `useThemeStore.setTheme`, which persists to
 * `odyssey_theme_mode` -- the same key the anti-FOUC script in `layout.tsx` reads
 * before paint. That is what makes the choice here become the app's setting
 * rather than a landing-page-only preference: nothing else has to be wired.
 *
 * Deliberately does NOT call `setTheme` on mount. Writing the resolved value
 * unprompted would persist a mode the user never chose, which is exactly the
 * "system by default" behaviour the owner asked for. It reads the store and
 * writes only on an explicit tap.
 */

import { Monitor, Moon, Sun } from "lucide-react";
import { useThemeStore, type ThemeMode } from "@/lib/stores/theme-store";
import { THEME_CHOICES, type OnboardingThemeChoice } from "@/lib/utils/onboarding-flow";

const OPTIONS: Array<{
  value: OnboardingThemeChoice;
  label: string;
  Icon: typeof Monitor;
}> = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  // Guard the mapping rather than casting: the store's type and the flow's type
  // are kept separate on purpose, and an unknown stored value must fall back to
  // showing "System" instead of rendering nothing.
  const active: OnboardingThemeChoice = THEME_CHOICES.includes(theme as OnboardingThemeChoice)
    ? (theme as OnboardingThemeChoice)
    : "system";

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 p-1 rounded-xl bg-surface-container-low border border-outline/12"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value as ThemeMode)}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isActive
                ? "bg-primary text-on-primary shadow-sm shadow-primary/25"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}