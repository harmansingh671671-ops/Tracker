import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getJourneyStartDate, getJourneyDayNumber } from "./journey";

/**
 * These functions only touch localStorage when a `window` global exists, so a
 * bare localStorage stub is not enough -- `window` has to be stubbed too or the
 * whole storage branch is skipped. Stubbing both keeps the fast node
 * environment instead of pulling in jsdom just for these two cases.
 */
let store: Record<string, string>;

beforeEach(() => {
  store = {};
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const atLocal = (y: number, m: number, d: number, h = 12) =>
  new Date(y, m - 1, d, h, 0, 0, 0);

describe("getJourneyStartDate", () => {
  it("derives the start date from createdAt", () => {
    expect(getJourneyStartDate("2026-01-15T10:30:00.000Z")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("zero-pads month and day", () => {
    const result = getJourneyStartDate(atLocal(2026, 3, 7).toISOString());
    expect(result).toBe("2026-03-07");
  });

  it("persists the derived date to localStorage", () => {
    getJourneyStartDate(atLocal(2026, 5, 9).toISOString());
    expect(store.odyssey_journey_start_date).toBe("2026-05-09");
  });

  it("falls back to a stored value when createdAt is absent", () => {
    store.odyssey_journey_start_date = "2020-01-01";
    expect(getJourneyStartDate()).toBe("2020-01-01");
  });

  it("ignores a malformed stored value", () => {
    store.odyssey_journey_start_date = "not-a-date";
    expect(getJourneyStartDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("ignores an unparseable createdAt and uses storage instead", () => {
    store.odyssey_journey_start_date = "2019-06-05";
    expect(getJourneyStartDate("garbage")).toBe("2019-06-05");
  });
});

describe("getJourneyDayNumber", () => {
  it("is day 1 on the start date itself", () => {
    expect(
      getJourneyDayNumber(atLocal(2026, 1, 1).toISOString(), atLocal(2026, 1, 1))
    ).toBe(1);
  });

  it("increments by one per day", () => {
    const start = atLocal(2026, 1, 1).toISOString();
    expect(getJourneyDayNumber(start, atLocal(2026, 1, 2))).toBe(2);
    expect(getJourneyDayNumber(start, atLocal(2026, 1, 10))).toBe(10);
  });

  it("crosses month and year boundaries", () => {
    const start = atLocal(2025, 12, 30).toISOString();
    expect(getJourneyDayNumber(start, atLocal(2026, 1, 2))).toBe(4);
  });

  it("crosses a leap day", () => {
    const start = atLocal(2028, 2, 28).toISOString();
    expect(getJourneyDayNumber(start, atLocal(2028, 2, 29))).toBe(2);
    expect(getJourneyDayNumber(start, atLocal(2028, 3, 1))).toBe(3);
  });

  it("counts by calendar day, not by elapsed hours", () => {
    // 23:00 on the start date and 01:00 the next morning are still day 1 vs 2,
    // because both sides are floored to local midnight before subtracting.
    const start = atLocal(2026, 6, 1).toISOString();
    expect(getJourneyDayNumber(start, atLocal(2026, 6, 1, 23))).toBe(1);
    expect(getJourneyDayNumber(start, atLocal(2026, 6, 2, 1))).toBe(2);
  });

  it("never returns below 1 for a date before the start", () => {
    const start = atLocal(2026, 6, 10).toISOString();
    expect(getJourneyDayNumber(start, atLocal(2026, 6, 1))).toBe(1);
  });
});
