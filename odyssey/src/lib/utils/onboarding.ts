import { readBool, writeString } from "@/lib/utils/logger";
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
  // Absence of storage reads as "not completed" -- the safe direction, since it
  // only re-shows onboarding.
  return readBool(ONBOARDING_STORAGE_KEY, false);
}

export function markOnboardingComplete(): void {
  // Private-mode / quota failures must not block entry into the app, which is
  // why this returns a boolean nobody checks.
  writeString(ONBOARDING_STORAGE_KEY, "true");
}

/**
 * Dismissal flag for the in-app welcome card (M6).
 *
 * **Deliberately a separate key from `ONBOARDING_STORAGE_KEY`.** These look like
 * the same fact -- "this person has seen the intro" -- but they gate different
 * surfaces: that one decides whether the landing page's press-and-hold pitch
 * shows, this one decides whether the welcome card shows. Sharing a key would
 * mean dismissing the card let the landing page reappear, and vice versa.
 *
 * **localStorage is correct here, unlike the reward ledger.** ADR 0002 had to
 * move reward settlement records into IndexedDB because they protect a balance
 * -- losing them would pay the same day twice. A dismissed banner protects
 * nothing; the failure mode of losing this flag is that someone who already
 * dismissed a welcome sees it once more, which is harmless. Browser storage is
 * the right tier for a UI preference.
 */
export const WELCOME_CARD_DISMISSED_KEY = "odyssey_welcome_card_dismissed";

export function hasDismissedWelcomeCard(): boolean {
  return readBool(WELCOME_CARD_DISMISSED_KEY, false);
}

export function dismissWelcomeCard(): void {
  // A failed write must not trap the card on screen forever, but it also must not
  // throw into a click handler. Like `markOnboardingComplete`, the result is
  // intentionally unchecked: the worst case is the card returning on next load.
  writeString(WELCOME_CARD_DISMISSED_KEY, "true");
}
