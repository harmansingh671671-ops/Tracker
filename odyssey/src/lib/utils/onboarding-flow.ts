/**
 * Step machine and commitment-hold maths for the first-run flow (A1 / XL14).
 *
 * Pure and component-free on purpose. This project runs vitest in a plain node
 * environment with no jsdom (`vitect.config.ts` -- `vitest.config.ts`), so a
 * component cannot be mounted in a test at all. Anything with a decision in it
 * that must not regress lives here: which steps exist, what may follow what, and
 * how far the commitment circle has spread.
 */

/** The flow, in order. `intro` is the pitch; `protocol` is the last real step. */
export const ONBOARDING_STEPS = [
  "intro",
  "circadian",
  "welcome",
  "habits",
  "protocol",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const FIRST_STEP: OnboardingStep = "intro";
export const LAST_STEP: OnboardingStep = "protocol";

/** How long the commitment circle takes to cover the viewport. */
export const SPREAD_HOLD_MS = 2500;

/** Pause at full coverage before handing over to the app. */
export const SPREAD_SETTLE_MS = 1000;

/** Radius of the commitment button, which is the circle's starting radius. */
export const COMMIT_RADIUS_PX = 56;

export function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step);
}

export function isFirstStep(step: OnboardingStep): boolean {
  return step === FIRST_STEP;
}

export function isLastStep(step: OnboardingStep): boolean {
  return step === LAST_STEP;
}

/**
 * The step after `step`, or null when already last.
 *
 * Null rather than clamping to itself: the shell uses it to decide whether to
 * render a Next control at all, and a Next button that goes nowhere is worse
 * than no button.
 */
export function nextStep(step: OnboardingStep): OnboardingStep | null {
  const i = stepIndex(step);
  if (i < 0 || i >= ONBOARDING_STEPS.length - 1) return null;
  return ONBOARDING_STEPS[i + 1];
}

/** The step before `step`, or null on the first step. */
export function prevStep(step: OnboardingStep): OnboardingStep | null {
  const i = stepIndex(step);
  if (i <= 0) return null;
  return ONBOARDING_STEPS[i - 1];
}

/**
 * How many steps in, 1-based, for the "Step 2 of 5" readout.
 *
 * Clamped rather than trusting the index: an unknown step must still render a
 * sensible indicator rather than "Step NaN of 5".
 */
export function stepNumber(step: OnboardingStep): number {
  return Math.min(Math.max(stepIndex(step) + 1, 1), ONBOARDING_STEPS.length);
}

export function totalSteps(): number {
  return ONBOARDING_STEPS.length;
}

/**
 * Whether Next is available on a step.
 *
 * The habit count is deliberately NOT consulted. A user who wants to look around
 * before committing to a routine must not be stranded on the "your habits" step
 * with nothing to do -- blocking there turns an introduction into a gate. The
 * parameter stays in the signature so the rule has room to grow, but the
 * behaviour today is simply "not the last step".
 */
export function canAdvance(step: OnboardingStep): boolean {
  return nextStep(step) !== null;
}

/* ------------------------------------------------------------------ */
/* Commitment spread                                                    */
/* ------------------------------------------------------------------ */

/**
 * The radius needed to cover the whole viewport from the centre: half the
 * diagonal. A circle sized to the shorter side leaves the corners showing.
 */
export function viewportCoverRadiusPx(viewportWidth: number, viewportHeight: number): number {
  const w = Math.max(0, viewportWidth);
  const h = Math.max(0, viewportHeight);
  return Math.sqrt((w / 2) ** 2 + (h / 2) ** 2);
}

/**
 * Eased spread from 0 to 1.
 *
 * easeInOutQuad rather than linear: a linear circle feels mechanical and, more
 * importantly, makes the first and last few percent of the hold feel like nothing
 * is happening -- which reads as "snappy" and invites the user to let go early.
 * Symmetric ease means the motion is clearly still going at both ends.
 */
export function spreadProgress(elapsedMs: number, holdMs: number = SPREAD_HOLD_MS): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  if (!Number.isFinite(holdMs) || holdMs <= 0) return 1;

  const t = Math.min(elapsedMs / holdMs, 1);
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

/**
 * The radius to draw, in pixels.
 *
 * Returns the button radius at progress 0, so the overlay starts exactly on the
 * button the user is holding -- no pop, no jump.
 */
export function spreadRadiusPx(
  progress: number,
  viewportWidth: number,
  viewportHeight: number
): number {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const target = viewportCoverRadiusPx(viewportWidth, viewportHeight);
  return COMMIT_RADIUS_PX + (target - COMMIT_RADIUS_PX) * clamped;
}

/**
 * Whether the spread has reached coverage and the flow may commit.
 *
 * Uses `>=` on a fully-clamped progress so it can never fire early on a floating
 * point overshoot, and requires exactly 1 rather than a threshold: there is no
 * "close enough", because a partially covered screen commits to a route change
 * the user cannot take back.
 */
export function hasCoveredViewport(progress: number): boolean {
  return progress >= 1;
}

/* ------------------------------------------------------------------ */
/* Theme selection                                                      */
/* ------------------------------------------------------------------ */

export type OnboardingThemeChoice = "system" | "light" | "dark";

/**
 * The choices offered on every step.
 *
 * Three, not two: the app defaults to following the system, and a two-way toggle
 * would force a user who never had an opinion into choosing one, silently
 * overriding their device setting.
 */
export const THEME_CHOICES: readonly OnboardingThemeChoice[] = ["system", "light", "dark"];

/**
 * Cycle order for the compact toggle: system -> light -> dark -> system.
 */
export function nextThemeChoice(current: OnboardingThemeChoice): OnboardingThemeChoice {
  const i = THEME_CHOICES.indexOf(current);
  return THEME_CHOICES[(i + 1) % THEME_CHOICES.length];
}