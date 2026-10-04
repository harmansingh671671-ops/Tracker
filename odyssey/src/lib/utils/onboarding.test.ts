import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ONBOARDING_STORAGE_KEY,
  hasCompletedOnboarding,
  markOnboardingComplete,
} from "./onboarding";

/** Fresh in-memory Storage stub, shared by `window.localStorage` and the bare global. */
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
  } as Storage;
}

/**
 * `window` has to be stubbed as well as `localStorage` -- the storage layer
 * reads `window.localStorage`, and a bare global stub would not be seen.
 */
let store: Record<string, string>;

beforeEach(() => {
  store = {};
  vi.stubGlobal("window", { localStorage: mkStorage() });
  vi.stubGlobal("localStorage", mkStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("onboarding first-run gate", () => {
  it("treats a device with no stored value as a first launch", () => {
    expect(hasCompletedOnboarding()).toBe(false);
  });

  it("records completion under the shared key", () => {
    markOnboardingComplete();
    expect(store[ONBOARDING_STORAGE_KEY]).toBe("true");
  });

  it("reports completed after the flag is written", () => {
    expect(hasCompletedOnboarding()).toBe(false);
    markOnboardingComplete();
    expect(hasCompletedOnboarding()).toBe(true);
  });

  it("survives a reload, which is the whole point of persisting", () => {
    markOnboardingComplete();
    // A reload keeps localStorage but rebuilds every in-memory React state.
    const persisted = store[ONBOARDING_STORAGE_KEY];
    store = {};
    store[ONBOARDING_STORAGE_KEY] = persisted;
    expect(hasCompletedOnboarding()).toBe(true);
  });

  it("ignores values written by anything other than this module", () => {
    store[ONBOARDING_STORAGE_KEY] = "false";
    expect(hasCompletedOnboarding()).toBe(false);
    store[ONBOARDING_STORAGE_KEY] = "1";
    expect(hasCompletedOnboarding()).toBe(false);
  });

  it("reports first launch when there is no browser at all", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("localStorage", undefined);
    expect(hasCompletedOnboarding()).toBe(false);
    expect(() => markOnboardingComplete()).not.toThrow();
  });

  it("falls back to first launch when storage throws", () => {
    // The throwing stub has to sit on `window` -- the storage layer reads
    // `window.localStorage`, so stubbing the bare global would not be seen.
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("SecurityError");
        },
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      },
    });
    expect(hasCompletedOnboarding()).toBe(false);
    expect(() => markOnboardingComplete()).not.toThrow();
  });
});
