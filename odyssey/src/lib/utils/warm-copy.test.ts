import { describe, it, expect } from "vitest";
import {
  getCompletionToast,
  getStreakLabel,
  isStreakActive,
} from "./warm-copy";

const OPTS = { xpPerCompletion: 15, perfectDayBonus: 50 };

describe("getCompletionToast", () => {
  it("keeps the XP amount in every copy that mentions XP", () => {
    expect(getCompletionToast("scheduled", OPTS)).toContain("15");
    expect(getCompletionToast("rest-day", OPTS)).toContain("15");
    expect(getCompletionToast("perfect-day", OPTS)).toContain("50");
  });

  it("always says 'pending' while the XP is still in flight", () => {
    // M4 established that these figures settle at midnight. Warm copy that said
    // "earned" would be a nicer sentence about money the user does not have.
    for (const kind of ["scheduled", "rest-day", "perfect-day"] as const) {
      expect(getCompletionToast(kind, OPTS)).toMatch(/pending/);
    }
  });

  it("does not claim a day is finished on an ordinary completion", () => {
    const toast = getCompletionToast("scheduled", OPTS);
    expect(toast).not.toMatch(/perfect|all habits|every/i);
  });

  it("only says 'perfect day' when told the day is perfect", () => {
    expect(getCompletionToast("perfect-day", OPTS)).toMatch(/perfect day/i);
  });

  it("says the rest-day habit was NOT scheduled, rather than claiming a routine was ticked", () => {
    // The old string was "Rest-day completion registered!", which reads like a
    // scheduled routine was completed. It was not.
    const toast = getCompletionToast("rest-day", OPTS);
    expect(toast).toMatch(/not scheduled today/i);
    expect(toast).not.toMatch(/routine complete|habit completed/i);
  });

  it("gives reverting no XP and no praise", () => {
    const toast = getCompletionToast("reverted", OPTS);
    expect(toast).not.toContain("XP");
    expect(toast).not.toMatch(/15|50/);
    expect(toast).not.toMatch(/great|nice|awesome|well done/i);
  });

  it("keeps the four toasts distinct", () => {
    const all = (["perfect-day", "scheduled", "rest-day", "reverted"] as const).map((k) =>
      getCompletionToast(k, OPTS)
    );
    expect(new Set(all).size).toBe(4);
  });

  it("never prints NaN or undefined when an XP figure is missing", () => {
    const bad = { xpPerCompletion: Number.NaN, perfectDayBonus: undefined as unknown as number };
    for (const kind of ["scheduled", "rest-day", "perfect-day"] as const) {
      expect(getCompletionToast(kind, bad)).not.toMatch(/NaN|undefined/);
    }
  });
});

describe("getStreakLabel", () => {
  it("says 'No streak yet' for a real zero -- never a fabricated 1d", () => {
    // The bug this replaces: `{h.currentStreak || 1}d` printed "1d" for a habit
    // with no streak, on the habit card, next to a completion count.
    expect(getStreakLabel(0)).toBe("");
    expect(getStreakLabel(0)).not.toContain("1");
  });

  it("renders a positive streak compactly", () => {
    expect(getStreakLabel(1)).toBe("1d");
    expect(getStreakLabel(3)).toBe("3d");
    expect(getStreakLabel(365)).toBe("365d");
  });

  it("renders a positive streak as a phrase for the profile sheet", () => {
    expect(getStreakLabel(1, "long")).toBe("1-day streak");
    expect(getStreakLabel(12, "long")).toBe("12-day streak");
  });

  it("uses the same honest zero phrase in both variants", () => {
    expect(getStreakLabel(0, "long")).toBe("");
  });

  it("treats a missing or nonsense value as zero rather than inventing one", () => {
    expect(getStreakLabel(Number.NaN)).toBe("");
    expect(getStreakLabel(-4)).toBe("");
    expect(getStreakLabel(undefined as unknown as number)).toBe("");
  });

  it("never renders a fractional day count", () => {
    expect(getStreakLabel(3.7)).toBe("3d");
  });

  it("is never the same string for zero and one", () => {
    expect(getStreakLabel(0)).not.toBe(getStreakLabel(1));
    expect(getStreakLabel(0, "long")).not.toBe(getStreakLabel(1, "long"));
  });
});

describe("isStreakActive", () => {
  it("is false for a zero or missing streak", () => {
    expect(isStreakActive(0)).toBe(false);
    expect(isStreakActive(Number.NaN)).toBe(false);
    expect(isStreakActive(-1)).toBe(false);
  });

  it("is true only for a real streak", () => {
    expect(isStreakActive(1)).toBe(true);
  });

  it("agrees with the label: every active streak shows a number", () => {
    for (const days of [0, 1, 2, 30]) {
      const label = getStreakLabel(days);
      if (isStreakActive(days)) expect(label).toMatch(/\d+d$/);
      else expect(label).toBe("");
    }
  });
});
