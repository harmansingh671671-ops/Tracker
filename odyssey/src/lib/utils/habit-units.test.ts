import { describe, it, expect } from "vitest";
import {
  UNIT_PRESETS,
  isUnitPresetId,
  timeUnitMinuteFactor,
  clampCountedValue,
} from "./habit-units";

describe("UNIT_PRESETS (counted-habit unit picker)", () => {
  it("offers Time, Pages, Glasses and Reps — Custom is separate", () => {
    expect(UNIT_PRESETS.map((p) => p.id)).toEqual(["minutes", "pages", "glasses", "reps"]);
    expect(UNIT_PRESETS.map((p) => p.label)).toEqual(["Time", "Pages", "Glasses", "Reps"]);
    expect(isUnitPresetId("custom")).toBe(false); // "custom" is a mode, never a stored id
  });

  it("presets are unique and carry a sane default target", () => {
    const ids = new Set(UNIT_PRESETS.map((p) => p.id));
    expect(ids.size).toBe(UNIT_PRESETS.length);
    for (const p of UNIT_PRESETS) {
      expect(Number.isInteger(p.defaultTarget)).toBe(true);
      expect(p.defaultTarget).toBeGreaterThanOrEqual(1);
    }
  });

  it("the Time preset defaults to a 25-minute focus; Pages 20, Glasses 8, Reps 20", () => {
    const byId = Object.fromEntries(UNIT_PRESETS.map((p) => [p.id, p]));
    expect(byId.minutes.defaultTarget).toBe(25);
    expect(byId.pages.defaultTarget).toBe(20);
    expect(byId.glasses.defaultTarget).toBe(8);
    expect(byId.reps.defaultTarget).toBe(20);
  });
});

describe("isUnitPresetId", () => {
  it("recognises preset ids and nothing else", () => {
    for (const id of ["minutes", "pages", "glasses", "reps"]) {
      expect(isUnitPresetId(id)).toBe(true);
    }
    // A legacy free-text unit (any string the user ever typed) is custom.
    expect(isUnitPresetId("cups")).toBe(false);
    expect(isUnitPresetId("")).toBe(false);
    expect(isUnitPresetId(undefined)).toBe(false);
    expect(isUnitPresetId(null)).toBe(false);
  });
});

describe("timeUnitMinuteFactor (which counted habits open a timer)", () => {
  it("minute-family units open the timer with a factor of 1", () => {
    for (const u of ["minutes", "minute", "min", "mins", "time"]) {
      expect(timeUnitMinuteFactor(u), `unit "${u}"`).toBe(1);
    }
    expect(timeUnitMinuteFactor("Minutes")).toBe(1); // stored case must not matter
    expect(timeUnitMinuteFactor("  minutes ")).toBe(1); // nor stray whitespace
  });

  it("hour-family units open the timer scaled to minutes (factor 60)", () => {
    for (const u of ["hours", "hour", "hr", "hrs"]) {
      expect(timeUnitMinuteFactor(u), `unit "${u}"`).toBe(60);
    }
  });

  it("everything else, including every preset that is not time, is a counter", () => {
    for (const u of ["pages", "glasses", "reps", "cups", "steps", "words", ""]) {
      expect(timeUnitMinuteFactor(u), `unit "${u}"`).toBeNull();
    }
    expect(timeUnitMinuteFactor(undefined)).toBeNull();
    expect(timeUnitMinuteFactor(null)).toBeNull();
  });
});

describe("clampCountedValue (manual typed entry from the counter view)", () => {
  it("passes through sane non-negative integers", () => {
    expect(clampCountedValue(0)).toBe(0);
    expect(clampCountedValue(12)).toBe(12);
    expect(clampCountedValue("7")).toBe(7);
  });

  it("rounds fractional input to the nearest whole unit", () => {
    expect(clampCountedValue(7.9)).toBe(8);
    expect(clampCountedValue(7.4)).toBe(7);
  });

  it("never produces nonsense: bad input clamps to 0", () => {
    expect(clampCountedValue(-3)).toBe(0);
    expect(clampCountedValue(-0.5)).toBe(0);
    expect(clampCountedValue(NaN)).toBe(0);
    expect(clampCountedValue("abc")).toBe(0);
    expect(clampCountedValue(Infinity)).toBe(0);
    expect(clampCountedValue(-Infinity)).toBe(0);
    expect(clampCountedValue(undefined)).toBe(0);
    expect(clampCountedValue(null)).toBe(0);
  });
});
