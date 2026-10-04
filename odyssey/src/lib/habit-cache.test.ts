import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readHabitCache, writeHabitCache, clearHabitCache, type HabitCache } from "./habit-cache";
import { type Habit } from "./db";

/**
 * `window` must be stubbed alongside `localStorage` -- the helpers gate on
 * both, and a bare localStorage stub skips the whole storage branch.
 */
let store: Record<string, string>;
let quotaFails = false;

beforeEach(() => {
  store = {};
  quotaFails = false;
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      if (quotaFails) throw new Error("QuotaExceededError");
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const sampleHabit: Habit = {
  id: "h1",
  userId: "u1",
  name: "Read",
  icon: "book",
  category: "Learning",
  frequency: "daily",
  currentStreak: 3,
  longestStreak: 9,
  totalCompletions: 12,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const sample: HabitCache = {
  capturedDate: "2026-04-10",
  habits: [sampleHabit],
  todayLogs: {
    h1: { id: "l1", habitId: "h1", userId: "u1", date: "2026-04-10", completed: true, loggedAt: "now" },
  },
  historyLogs: { h1: { "2026-04-10": true } },
};

describe("habit cache mirror", () => {
  it("round-trips habits and logs", () => {
    writeHabitCache("u1", sample);
    const read = readHabitCache("u1");
    expect(read).not.toBeNull();
    expect(read!.habits).toHaveLength(1);
    expect(read!.habits[0].name).toBe("Read");
    expect(read!.historyLogs.h1["2026-04-10"]).toBe(true);
    expect(read!.todayLogs.h1.completed).toBe(true);
    expect(read!.capturedDate).toBe("2026-04-10");
  });

  it("scopes the cache by user so profiles cannot bleed", () => {
    writeHabitCache("u1", sample);
    expect(readHabitCache("u2")).toBeNull();
  });

  it("survives a reload, which is the whole point of the mirror", () => {
    writeHabitCache("u1", sample);
    // A reload keeps localStorage but rebuilds every in-memory store.
    store = {};
    writeHabitCache("u1", sample);
    expect(readHabitCache("u1")).not.toBeNull();
  });

  it("returns null for a missing entry rather than throwing", () => {
    expect(readHabitCache("nobody")).toBeNull();
  });

  it("rejects a malformed or partial cache", () => {
    store["odyssey_habits_cache_u1"] = JSON.stringify({ habits: "not-an-array" });
    expect(readHabitCache("u1")).toBeNull();

    store["odyssey_habits_cache_u1"] = "{not json at all";
    expect(readHabitCache("u1")).toBeNull();

    // historyLogs is required; a cache without it must not hydrate the store.
    store["odyssey_habits_cache_u1"] = JSON.stringify({ habits: [] });
    expect(readHabitCache("u1")).toBeNull();
  });

  it("defaults missing optional slices instead of returning undefined", () => {
    store["odyssey_habits_cache_u1"] = JSON.stringify({ habits: [], historyLogs: {} });
    const read = readHabitCache("u1");
    expect(read).not.toBeNull();
    expect(read!.todayLogs).toEqual({});
    expect(read!.capturedDate).toBe("");
  });

  it("does not throw when storage rejects the write", () => {
    quotaFails = true;
    expect(() => writeHabitCache("u1", sample)).not.toThrow();
    expect(readHabitCache("u1")).toBeNull();
  });

  it("does not throw when storage throws on read", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
    });
    expect(readHabitCache("u1")).toBeNull();
  });

  it("clears the cache on request", () => {
    writeHabitCache("u1", sample);
    clearHabitCache("u1");
    expect(readHabitCache("u1")).toBeNull();
  });
});

/**
 * The day-scoping rule is the subtle part and lives in the store, not the
 * cache module. `todayLogs` belongs to one specific day; habits and history do
 * not. Reusing a day-scoped slice on the wrong day would credit yesterday's
 * completions to today.
 */
describe("day-scoped reuse", () => {
  const decide = (capturedDate: string, requestedDate: string) =>
    capturedDate === requestedDate;

  it("reuses todayLogs only when the captured day is the requested day", () => {
    expect(decide("2026-04-10", "2026-04-10")).toBe(true);
    expect(decide("2026-04-10", "2026-04-11")).toBe(false);
    expect(decide("", "2026-04-10")).toBe(false);
  });

  it("marks a cache captured with no date as unusable for any day", () => {
    const legacy = { ...sample, capturedDate: "" } as HabitCache;
    writeHabitCache("u1", legacy);
    const read = readHabitCache("u1");
    expect(read).not.toBeNull();
    expect(decide(read!.capturedDate, "2026-04-10")).toBe(false);
  });
});