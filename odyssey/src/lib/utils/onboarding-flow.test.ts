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
  coverRadiusFromPx,
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
  type OnboardingThemeChoice,
  type OnboardingStep,
} from "./onboarding-flow";

describe("step machine", () => {
  it("has the agreed six steps in order", () => {
    expect(ONBOARDING_STEPS).toEqual([
      "intro",
      "circadian",
      "welcome",
      "habits",
      "basics",
      "protocol",
    ]);
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

describe("coverRadiusFromPx", () => {
  it("reduces to the half-diagonal when the origin IS the viewport centre", () => {
    expect(coverRadiusFromPx(195, 422, 390, 844)).toBeCloseTo(
      Math.sqrt(195 ** 2 + 422 ** 2),
      5
    );
  });

  it("handles a square viewport centred", () => {
    expect(coverRadiusFromPx(400, 400, 800, 800)).toBeCloseTo(Math.sqrt(400 ** 2 + 400 ** 2), 5);
  });

  // The regression this function exists for: the hold button sits well ABOVE the
  // viewport centre, and a centre-sized radius leaves the bottom corners bare.
  it("covers the FAR corner when the origin is off-centre", () => {
    const originX = 195;
    const originY = 286.5;
    const radius = coverRadiusFromPx(originX, originY, 390, 844);
    const farCorner = Math.hypot(195, 844 - originY);
    expect(radius).toBeCloseTo(farCorner, 5);
    // And it MUST exceed the centred radius, or corners would show.
    expect(radius).toBeGreaterThan(coverRadiusFromPx(195, 422, 390, 844));
  });

  it("reaches every corner from an off-centre origin", () => {
    const ox = 100;
    const oy = 150;
    const r = coverRadiusFromPx(ox, oy, 390, 844);
    for (const [cx, cy] of [[0, 0], [390, 0], [0, 844], [390, 844]]) {
      expect(Math.hypot(cx - ox, cy - oy)).toBeLessThanOrEqual(r + 1e-9);
    }
  });

  it("never returns a negative or non-finite radius", () => {
    // Note this is NOT 0, which is what the old centre-only function returned for
    // negative input: it clamped the viewport to 0 and ignored the origin, so the
    // answer was an artefact of there being no origin to consider. Measured, the
    // honest result is a positive finite distance.
    const r = coverRadiusFromPx(-100, -100, -100, -100);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r)).toBe(true);
    expect(coverRadiusFromPx(0, 0, 0, 0)).toBe(0);
  });

  it("treats a non-finite origin as zero rather than propagating NaN", () => {
    expect(coverRadiusFromPx(NaN, Infinity, 390, 844)).toBeCloseTo(
      coverRadiusFromPx(0, 0, 390, 844),
      5
    );
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
  // The real button centre on a 390x844 phone, measured in-browser.
  const OX = 195;
  const OY = 286.5;

  it("starts exactly on the commitment button", () => {
    // No pop: at progress 0 the overlay is the button the user is holding.
    expect(spreadRadiusPx(0, 390, 844, OX, OY)).toBe(COMMIT_RADIUS_PX);
  });

  it("reaches full coverage at progress 1", () => {
    expect(spreadRadiusPx(1, 390, 844, OX, OY)).toBeCloseTo(
      coverRadiusFromPx(OX, OY, 390, 844),
      5
    );
  });

  it("clamps out-of-range progress", () => {
    expect(spreadRadiusPx(-5, 390, 844, OX, OY)).toBe(COMMIT_RADIUS_PX);
    expect(spreadRadiusPx(9, 390, 844, OX, OY)).toBeCloseTo(
      coverRadiusFromPx(OX, OY, 390, 844),
      5
    );
  });

  it("never shrinks below the button", () => {
    // A corner origin is the FARTHEST point, not the nearest -- the minimum for a
    // 390x844 viewport is ~465, so this floor is only reachable on a degenerate
    // viewport. It is kept anyway: it makes the invariant explicit for ~one line,
    // rather than leaving the inversion reachable through a future refactor.
    const tiny = coverRadiusFromPx(30, 30, 60, 60);
    expect(tiny).toBeLessThan(COMMIT_RADIUS_PX);
    expect(spreadRadiusPx(0.5, 60, 60, 30, 30)).toBeGreaterThanOrEqual(COMMIT_RADIUS_PX);
  });

  it("grows monotonically through the hold", () => {
    let prev = 0;
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      const r = spreadRadiusPx(p, 390, 844, OX, OY);
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
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