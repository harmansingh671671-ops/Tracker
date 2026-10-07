import { describe, it, expect } from "vitest";
import {
  COMMIT_RADIUS_PX,
  FIRST_STEP,
  LAST_STEP,
  ONBOARDING_STEPS,
  SPREAD_HOLD_MS,
  SPREAD_SETTLE_MS,
  THEME_CHOICES,
  canAdvance,
  hasCoveredViewport,
  isFirstStep,
  isLastStep,
  nextStep,
  nextThemeChoice,
  prevStep,
  spreadProgress,
  spreadRadiusPx,
  stepIndex,
  stepNumber,
  totalSteps,
  viewportCoverRadiusPx,
  type OnboardingThemeChoice,
  type OnboardingStep,
} from "./onboarding-flow";

describe("step machine", () => {
  it("has the agreed five steps in order", () => {
    expect(ONBOARDING_STEPS).toEqual(["intro", "circadian", "welcome", "habits", "protocol"]);
  });

  it("walks forward through every step and stops at the end", () => {
    let step: OnboardingStep = FIRST_STEP;
    const seen: OnboardingStep[] = [step];

    for (let guard = 0; guard < 10; guard++) {
      const n = nextStep(step);
      if (!n) break;
      step = n;
      seen.push(step);
    }

    expect(seen).toEqual(ONBOARDING_STEPS);
  });

  it("walks backward and stops at the start", () => {
    let step: OnboardingStep = LAST_STEP;
    const seen: OnboardingStep[] = [step];

    for (let guard = 0; guard < 10; guard++) {
      const p = prevStep(step);
      if (!p) break;
      step = p;
      seen.push(step);
    }

    expect(seen).toEqual([...ONBOARDING_STEPS].reverse());
  });

  // The Back button is hidden rather than disabled-forever, so these drive its
  // visibility. Null is what makes that possible.
  it("has no previous step on the first step", () => {
    expect(isFirstStep(FIRST_STEP)).toBe(true);
    expect(prevStep(FIRST_STEP)).toBeNull();
  });

  it("has no next step on the last step", () => {
    expect(isLastStep(LAST_STEP)).toBe(true);
    expect(nextStep(LAST_STEP)).toBeNull();
  });

  it("round-trips back and forward without losing the step", () => {
    for (const step of ONBOARDING_STEPS) {
      const back = prevStep(step);
      if (!back) continue;
      expect(nextStep(back)).toBe(step);
    }
  });

  it("reports a 1-based step number and a total", () => {
    expect(stepNumber(FIRST_STEP)).toBe(1);
    expect(stepNumber(LAST_STEP)).toBe(totalSteps());
    expect(stepNumber("welcome")).toBe(3);
  });

  // A malformed step must not render "Step NaN of 5".
  it("clamps the step number for an unknown step", () => {
    const bogus = "nope" as OnboardingStep;
    expect(stepIndex(bogus)).toBe(-1);
    expect(stepNumber(bogus)).toBe(1);
  });
});

describe("canAdvance", () => {
  it("allows progress off every step except the last", () => {
    for (const step of ONBOARDING_STEPS) {
      expect(canAdvance(step)).toBe(!isLastStep(step));
    }
  });

  // Owner decision: a user who wants to look around first must not be stranded.
  it("allows leaving the habits step with nothing created", () => {
    expect(canAdvance("habits")).toBe(true);
  });
});

describe("viewportCoverRadiusPx", () => {
  it("is the half-diagonal, so a shorter-side circle cannot cover it", () => {
    // 390 x 844: half-diagonal is much larger than half the height.
    const r = viewportCoverRadiusPx(390, 844);
    expect(r).toBeCloseTo(Math.sqrt(195 ** 2 + 422 ** 2), 5);
    expect(r).toBeGreaterThan(844 / 2);
  });

  it("handles a square viewport", () => {
    expect(viewportCoverRadiusPx(800, 800)).toBeCloseTo(Math.sqrt(400 ** 2 + 400 ** 2), 5);
  });

  it("never returns a negative radius", () => {
    expect(viewportCoverRadiusPx(-100, -100)).toBe(0);
  });
});

describe("spreadProgress", () => {
  it("starts at zero and ends at one", () => {
    expect(spreadProgress(0)).toBe(0);
    expect(spreadProgress(SPREAD_HOLD_MS)).toBe(1);
  });

  it("clamps beyond the hold rather than overshooting", () => {
    expect(spreadProgress(SPREAD_HOLD_MS * 4)).toBe(1);
  });

  it("is monotonic", () => {
    let previous = -1;
    for (let ms = 0; ms <= SPREAD_HOLD_MS; ms += 50) {
      const p = spreadProgress(ms);
      expect(p).toBeGreaterThanOrEqual(previous);
      previous = p;
    }
  });

  it("stays within 0..1", () => {
    for (const ms of [-500, 0, 1, 600, 1250, 2400, 2500, 9999]) {
      const p = spreadProgress(ms);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  // Linear would put these at 0.48 and 0.96; easing pulls them in so the motion
  // is visibly still moving at both ends of the hold.
  it("eases rather than running linearly", () => {
    expect(spreadProgress(SPREAD_HOLD_MS / 2)).toBeCloseTo(0.5, 5);
    expect(spreadProgress(SPREAD_HOLD_MS * 0.25)).toBeLessThan(0.25);
    expect(spreadProgress(SPREAD_HOLD_MS * 0.75)).toBeGreaterThan(0.75);
  });

  it("treats a zero-length hold as instantly complete", () => {
    expect(spreadProgress(100, 0)).toBe(1);
  });

  it("treats nonsense input as not started", () => {
    expect(spreadProgress(NaN)).toBe(0);
    expect(spreadProgress(-1)).toBe(0);
  });

  it("uses a hold long enough not to feel snappy", () => {
    // Owner decision: 2.5s, up from the old 1.4s ring.
    expect(SPREAD_HOLD_MS).toBe(2500);
    expect(SPREAD_SETTLE_MS).toBe(1000);
  });
});

describe("spreadRadiusPx", () => {
  it("starts exactly on the commitment button", () => {
    // No pop: at progress 0 the overlay is the button the user is holding.
    expect(spreadRadiusPx(0, 390, 844)).toBe(COMMIT_RADIUS_PX);
  });

  it("reaches full coverage at progress 1", () => {
    expect(spreadRadiusPx(1, 390, 844)).toBeCloseTo(viewportCoverRadiusPx(390, 844), 5);
  });

  it("clamps out-of-range progress", () => {
    expect(spreadRadiusPx(-5, 390, 844)).toBe(COMMIT_RADIUS_PX);
    expect(spreadRadiusPx(9, 390, 844)).toBeCloseTo(viewportCoverRadiusPx(390, 844), 5);
  });
});

describe("hasCoveredViewport", () => {
  it("is false below full coverage", () => {
    expect(hasCoveredViewport(0)).toBe(false);
    expect(hasCoveredViewport(0.999)).toBe(false);
  });

  it("is true only at full coverage", () => {
    // No "close enough": a partly covered screen must not commit to a route
    // change the user cannot take back.
    expect(hasCoveredViewport(1)).toBe(true);
    expect(hasCoveredViewport(1.2)).toBe(true);
  });
});

describe("theme choices", () => {
  it("offers three choices so 'system' stays reachable", () => {
    // A two-way toggle would force a user with no opinion to override their
    // device setting by tapping something.
    expect(THEME_CHOICES).toEqual(["system", "light", "dark"]);
    expect(THEME_CHOICES).toContain("system");
  });

  it("cycles system -> light -> dark -> system", () => {
    expect(nextThemeChoice("system")).toBe("light");
    expect(nextThemeChoice("light")).toBe("dark");
    expect(nextThemeChoice("dark")).toBe("system");
  });

  it("returns to where it started after a full cycle", () => {
    let c: OnboardingThemeChoice = "system";
    for (let i = 0; i < THEME_CHOICES.length; i++) c = nextThemeChoice(c);
    expect(c).toBe("system");
  });
});