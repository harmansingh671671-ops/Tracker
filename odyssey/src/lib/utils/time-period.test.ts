import { describe, it, expect } from "vitest";
import {
  getTimePeriod,
  getTimePeriodAccent,
  allTimePeriods,
  periodFromTime,
  type TimePeriod,
} from "./time-period";

describe("getTimePeriod", () => {
  it("returns each known period", () => {
    expect(getTimePeriod({ period: "morning" })).toBe("morning");
    expect(getTimePeriod({ period: "afternoon" })).toBe("afternoon");
    expect(getTimePeriod({ period: "evening" })).toBe("evening");
  });

  it("returns null when the habit has no period (the 'anytime' path)", () => {
    // The create form writes `undefined` for "anytime", so the common case for
    // a scheduled habit is no period at all.
    expect(getTimePeriod({ period: undefined })).toBeNull();
  });

  it("returns null for a missing habit", () => {
    expect(getTimePeriod(null)).toBeNull();
    expect(getTimePeriod(undefined)).toBeNull();
    expect(getTimePeriod({})).toBeNull();
  });

  it("returns null for an unrecognised value instead of throwing", () => {
    // `period` is a union in TypeScript but the value round-trips through
    // IndexedDB, which is not type-checked. A habit written by an older build
    // must render, not crash.
    expect(getTimePeriod({ period: "night" as TimePeriod })).toBeNull();
    expect(getTimePeriod({ period: "" as TimePeriod })).toBeNull();
    expect(getTimePeriod({ period: "brunch" as TimePeriod })).toBeNull();
  });

  it("normalises case and surrounding whitespace", () => {
    expect(getTimePeriod({ period: "  Morning " as TimePeriod })).toBe("morning");
    expect(getTimePeriod({ period: "EVENING" as TimePeriod })).toBe("evening");
  });
});

describe("getTimePeriodAccent", () => {
  it("returns null when there is no usable period", () => {
    expect(getTimePeriodAccent({ period: undefined })).toBeNull();
    expect(getTimePeriodAccent(null)).toBeNull();
  });

  it("gives each period a distinct id and label", () => {
    const morning = getTimePeriodAccent({ period: "morning" });
    const afternoon = getTimePeriodAccent({ period: "afternoon" });
    const evening = getTimePeriodAccent({ period: "evening" });
    expect(morning?.id).toBe("morning");
    expect(afternoon?.id).toBe("afternoon");
    expect(evening?.id).toBe("evening");
    expect(morning?.label).toBe("Morning");
    expect(afternoon?.label).toBe("Afternoon");
    expect(evening?.label).toBe("Evening");
  });

  it("never returns raw hex -- colours must come from tokens", () => {
    // DEVELOPMENT_PLAN 5.4 bans a raw colour value in a component. This is the
    // test that keeps the accents honest if someone adds a literal later.
    for (const accent of allTimePeriods()) {
      for (const cls of [accent.accentClass, accent.containerClass]) {
        expect(cls).not.toMatch(/#[0-9a-f]{3,8}/i);
        expect(cls).not.toMatch(/\brgba?\(/i);
      }
    }
  });

  it("uses distinct token classes per period", () => {
    const accents = allTimePeriods();
    expect(new Set(accents.map((a) => a.accentClass)).size).toBe(3);
    expect(new Set(accents.map((a) => a.containerClass)).size).toBe(3);
    expect(accents.map((a) => a.accentClass)).toEqual([
      "text-period-morning",
      "text-period-afternoon",
      "text-period-evening",
    ]);
    expect(accents.map((a) => a.containerClass)).toEqual([
      "bg-period-morning-container",
      "bg-period-afternoon-container",
      "bg-period-evening-container",
    ]);
  });
});

describe("allTimePeriods", () => {
  it("exposes exactly three periods -- there is no night", () => {
    // The spec lists a fourth "Night" period, but the schema union has three
    // members and the create flow cannot set it. Pinning the count makes the
    // gap visible in the test suite rather than only in the docs.
    expect(allTimePeriods()).toHaveLength(3);
    expect(allTimePeriods().map((a) => a.id)).not.toContain("night");
  });

  it("returns a fresh array so a caller cannot mutate the table", () => {
    const a = allTimePeriods();
    a.pop();
    expect(allTimePeriods()).toHaveLength(3);
  });
});

describe("periodFromTime", () => {
  it("derives morning before noon", () => {
    expect(periodFromTime("06:30")).toBe("morning");
    expect(periodFromTime("11:59")).toBe("morning");
  });
  it("derives afternoon from noon to 16:59", () => {
    expect(periodFromTime("12:00")).toBe("afternoon");
    expect(periodFromTime("16:59")).toBe("afternoon");
  });
  it("derives evening from 17:00", () => {
    expect(periodFromTime("17:00")).toBe("evening");
    expect(periodFromTime("23:45")).toBe("evening");
  });
  it("empty or malformed means no period, never a guess", () => {
    expect(periodFromTime(undefined)).toBeUndefined();
    expect(periodFromTime("")).toBeUndefined();
    expect(periodFromTime("anytime")).toBeUndefined();
    expect(periodFromTime("25:00")).toBeUndefined();
    expect(periodFromTime("6:30 pm")).toBeUndefined();
  });
});