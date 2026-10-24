import { describe, expect, it } from "vitest";
import {
  ENERGY_LEVELS,
  energyLogId,
  energySkipKey,
  normaliseEnergyLevel,
  shouldShowEnergyCheckIn,
} from "./energy-check-in";

/**
 * S25 — the daily energy check-in. The prompt itself is UI, but every decision
 * behind it is pure and pinned here: the scale, what counts as a valid answer,
 * the per-user-per-day key, and the four reasons not to ask.
 *
 * The rule that matters for trust is the last group: the app must ask an
 * established user once a day and then leave them alone — no second prompt after
 * an answer, and no second prompt after "Skip for today".
 */

describe("ENERGY_LEVELS", () => {
  it("is the 1-to-5 scale in order, each with an emoji and a word", () => {
    expect(ENERGY_LEVELS.map((level) => level.level)).toEqual([1, 2, 3, 4, 5]);

    for (const level of ENERGY_LEVELS) {
      expect(level.emoji.length).toBeGreaterThan(0);
      expect(level.label.length).toBeGreaterThan(0);
    }

    // Five distinct words, so a screen reader (and the probe) can tell them apart.
    expect(new Set(ENERGY_LEVELS.map((level) => level.label)).size).toBe(5);
  });
});

describe("normaliseEnergyLevel", () => {
  it("keeps every whole level from 1 to 5", () => {
    expect([1, 2, 3, 4, 5].map(normaliseEnergyLevel)).toEqual([1, 2, 3, 4, 5]);
  });

  it("rejects everything else rather than rounding or coercing", () => {
    for (const bad of [0, 6, -1, 2.5, NaN, Infinity, "3", null, undefined, {}, []]) {
      expect(normaliseEnergyLevel(bad)).toBeNull();
    }
  });
});

describe("energyLogId", () => {
  it("keys one log per user per day", () => {
    expect(energyLogId("u1", "2026-10-24")).toBe("u1:2026-10-24");
    expect(energyLogId("u1", "2026-10-24")).not.toBe(energyLogId("u1", "2026-10-25"));
    expect(energyLogId("u1", "2026-10-24")).not.toBe(energyLogId("u2", "2026-10-24"));
  });
});

describe("energySkipKey", () => {
  it("keys the skip to a local day, so tomorrow asks again", () => {
    expect(energySkipKey("2026-10-24")).toBe("odyssey_energy_skip_2026-10-24");
    expect(energySkipKey("2026-10-24")).not.toBe(energySkipKey("2026-10-25"));
  });
});

describe("shouldShowEnergyCheckIn", () => {
  const base = {
    profileReady: true,
    habitCount: 2,
    hasLogToday: false,
    skippedToday: false,
  };

  it("asks an established user who has not answered or skipped", () => {
    expect(shouldShowEnergyCheckIn(base)).toBe(true);
  });

  it("does not ask before the profile is ready", () => {
    expect(shouldShowEnergyCheckIn({ ...base, profileReady: false })).toBe(false);
  });

  it("does not ask a user who has no habits yet (onboarding must not be interrupted)", () => {
    expect(shouldShowEnergyCheckIn({ ...base, habitCount: 0 })).toBe(false);
  });

  it("does not ask twice on the same day", () => {
    expect(shouldShowEnergyCheckIn({ ...base, hasLogToday: true })).toBe(false);
  });

  it("does not ask again after Skip for today", () => {
    expect(shouldShowEnergyCheckIn({ ...base, skippedToday: true })).toBe(false);
  });

  it("stays closed when several reasons apply at once", () => {
    expect(
      shouldShowEnergyCheckIn({
        profileReady: false,
        habitCount: 0,
        hasLogToday: true,
        skippedToday: true,
      })
    ).toBe(false);
  });
});
