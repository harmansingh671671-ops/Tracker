import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GOAL_TAGS } from "./goal-tags";
import {
  DEFAULT_IDENTITY_LINE,
  GOAL_IDENTITY_LINES,
  IDENTITY_STORAGE_KEY,
  derivedIdentityLine,
  readIdentityLine,
  resolveIdentityLine,
  writeIdentityLine,
} from "./identity-line";

describe("derivedIdentityLine", () => {
  it("gives every real goal a distinct line", () => {
    const lines = GOAL_TAGS.map((t) => derivedIdentityLine(t.id));
    expect(new Set(lines).size).toBe(GOAL_TAGS.length);
    for (const line of lines) {
      expect(line.trim().length).toBeGreaterThan(10);
      expect(line.endsWith(".")).toBe(true);
    }
  });

  it("falls back to the generic default when no goal was chosen", () => {
    expect(derivedIdentityLine(null)).toBe(DEFAULT_IDENTITY_LINE);
    expect(derivedIdentityLine(undefined)).toBe(DEFAULT_IDENTITY_LINE);
    expect(derivedIdentityLine("")).toBe(DEFAULT_IDENTITY_LINE);
    expect(derivedIdentityLine("warlord")).toBe(DEFAULT_IDENTITY_LINE);
  });

  it("is tolerant of case and padding, like every other stored value", () => {
    expect(derivedIdentityLine("  FOCUS  ")).toBe(GOAL_IDENTITY_LINES.focus);
  });

  // These are offered to the user, not asserted about them. A line that reads
  // like a product claim would be a "confident display that contradicts the fact
  // it reports" -- the failure mode this repo keeps finding.
  it("never names a feature, a streak or a reward", () => {
    const banned = /\b(streak|xp|diamond|reward|wallpaper|level|rank|unlock)\b/i;
    for (const line of Object.values(GOAL_IDENTITY_LINES)) {
      expect(line).not.toMatch(banned);
    }
    expect(DEFAULT_IDENTITY_LINE).not.toMatch(banned);
  });

  it("is first person throughout", () => {
    for (const line of [...Object.values(GOAL_IDENTITY_LINES), DEFAULT_IDENTITY_LINE]) {
      expect(line).toMatch(/\b(I|me|my)\b/);
    }
  });
});

describe("identity line storage", () => {
  function mkStorage(): Storage {
    return {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() {
        return Object.keys(store).length;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    } as Storage;
  }

  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal("window", { localStorage: mkStorage() });
    vi.stubGlobal("localStorage", mkStorage());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reports nothing when the user never wrote one", () => {
    expect(readIdentityLine()).toBeNull();
  });

  it("round-trips a written line", () => {
    expect(writeIdentityLine("  I will show up.  ")).toBe(true);
    expect(readIdentityLine()).toBe("I will show up.");
    expect(store[IDENTITY_STORAGE_KEY]).toBe("I will show up.");
  });

  it("treats an empty or whitespace line as never having written one", () => {
    // So clearing the field returns the step to the derived line rather than
    // leaving a blank commitment on the screen.
    store[IDENTITY_STORAGE_KEY] = "   ";
    expect(readIdentityLine()).toBeNull();
    writeIdentityLine("");
    expect(readIdentityLine()).toBeNull();
  });

  it("prefers the user's words over the derived line", () => {
    expect(resolveIdentityLine("focus")).toBe(derivedIdentityLine("focus"));
    writeIdentityLine("My own words");
    expect(resolveIdentityLine("focus")).toBe("My own words");
  });

  it("falls back to the derived line again if the stored line is cleared", () => {
    writeIdentityLine("My own words");
    writeIdentityLine("   ");
    expect(resolveIdentityLine("focus")).toBe(derivedIdentityLine("focus"));
  });

  it("keeps a user's line rather than overwriting it with the derived one", () => {
    writeIdentityLine("Mine");
    resolveIdentityLine("health");
    expect(readIdentityLine()).toBe("Mine");
    expect(store[IDENTITY_STORAGE_KEY]).toBe("Mine");
  });
});