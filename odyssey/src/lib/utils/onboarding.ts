/**
 * First-run gate for the landing page.
 *
 * The landing page is the install-time pitch, not a permanent home page, so it
 * must appear exactly once: on the first launch after install. Completion is a
 * single localStorage flag, which lives and dies with the app's own storage --
 * clearing app data is indistinguishable from reinstalling, and that is the
 * behaviour we want.
 *
 * Server renders must not read storage (there is none), so the guard returns
 * "not completed" whenever `window` or `localStorage` is absent. The landing
 * page renders a neutral splash until this has been checked in the browser, so
 * the mismatch never shows as a flash of the landing page.
 */

export const ONBOARDING_STORAGE_KEY = "odyssey_onboarding_complete";

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markOnboardingComplete(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  } catch {
    /* Private-mode / quota failures must not block entry into the app. */
  }
}