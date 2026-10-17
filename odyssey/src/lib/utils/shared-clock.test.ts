import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  MINUTE_MS,
  msUntilNextMinute,
  localDateStr,
} from "./shared-clock";
import type { ClockEnvironment } from "./shared-clock";

/**
 * `PERF-4b`. A clock is only worth having if it is correct at the edges, and the
 * edges are where a minute clock fails: drift that accumulates, a boundary that
 * fires twice, a hidden tab that wakes anyway, and a DST change where "local time"
 * does something arithmetic would not predict.
 *
 * Runs under the repo's **node-only** vitest environment (`vitest.config.ts`,
 * `P0-T5`). That is why `ClockEnvironment` is injected rather than the module
 * reading the `document` global -- see the note in `shared-clock.ts`.
 */

/** Local-time constructor. Deliberately not an ISO string, which parses as UTC. */
const at = (y: number, mo: number, d: number, h: number, mi = 0, s = 0) =>
  new Date(y, mo - 1, d, h, mi, s, 0).getTime();

// =========================================================================
describe("msUntilNextMinute", () => {
  it("targets the next real minute boundary, not a fixed offset", () => {
    expect(msUntilNextMinute(at(2026, 10, 17, 12, 0, 0))).toBe(MINUTE_MS);
    expect(msUntilNextMinute(at(2026, 10, 17, 12, 0, 1))).toBe(MINUTE_MS - 1000);
    expect(msUntilNextMinute(at(2026, 10, 17, 12, 0, 30))).toBe(30_000);
    // 999ms needs its own constructor: `at()` takes whole seconds only.
    expect(msUntilNextMinute(at(2026, 10, 17, 12, 0, 59) + 999)).toBe(1);
  });

  it("never returns zero or negative, at any millisecond of a minute", () => {
    // Sweeps the whole minute. A single 0 would re-arm immediately and busy-loop.
    const base = at(2026, 10, 17, 12, 0, 0);
    for (let ms = 0; ms < MINUTE_MS; ms += 997) {
      const d = msUntilNextMinute(base + ms);
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThanOrEqual(MINUTE_MS);
    }
  });

  it("does not drift: successive boundaries stay aligned to the wall clock", () => {
    // The reason this is setTimeout-at-a-boundary rather than setInterval.
    // Accumulate the delays the way a re-arming timer would; the running total
    // must land exactly on consecutive minute boundaries.
    let t = at(2026, 10, 17, 12, 0, 0) + 7_000; // 7s past the hour
    for (let i = 0; i < 10_000; i++) {
      t += msUntilNextMinute(t);
      if (t % MINUTE_MS !== 0) throw new Error(`drifted off the boundary at iteration ${i}`);
    }
    expect(t % MINUTE_MS).toBe(0);
  });

  it("tolerates a clock handed a stale instant, as after a suspended tab", () => {
    expect(msUntilNextMinute(0)).toBeGreaterThan(0);
    expect(msUntilNextMinute(1)).toBeGreaterThan(0);
  });
});

// =========================================================================
describe("localDateStr", () => {
  it("uses LOCAL time, never UTC", () => {
    // 23:30 local is already the 17th in UTC for any eastern offset. Using
    // toISOString() here is the exact bug the evening reminder had.
    expect(localDateStr(new Date(at(2026, 10, 16, 23, 30)))).toBe("2026-10-16");
    expect(localDateStr(new Date(at(2026, 10, 17, 0, 15)))).toBe("2026-10-17");
  });

  it("zero-pads", () => {
    expect(localDateStr(new Date(at(2026, 1, 5, 12)))).toBe("2026-01-05");
  });

  it("tracks the day across DST boundaries, which epoch arithmetic would miss", () => {
    // A clock built on `floor(now / 86400000)` is off by an hour on both of these
    // days. Reading local fields is what makes them correct.
    expect(localDateStr(new Date(2026, 2, 8, 12))).toBe("2026-03-08"); // spring forward
    expect(localDateStr(new Date(2026, 10, 1, 12))).toBe("2026-11-01"); // fall back
    expect(localDateStr(new Date(2026, 10, 1, 23, 59))).not.toBe(
      localDateStr(new Date(2026, 11, 1, 0, 1))
    );
  });
});

// =========================================================================
// The store: reference counting, the hidden-tab pause, and the wake count.
//
// Three things about this block are load-bearing, and all three were learned by
// watching it fail:
//
// 1. **A fresh module per test.** The store is a module singleton, so `minuteIndex`
//    survives between tests. The first test to run caches the minute; the next one
//    starts at that same cached value, so `refresh()` correctly reports "the minute
//    did not turn" and notifies nobody. The catch-up assertion then fails for a
//    reason that has nothing to do with the clock. `vi.resetModules()` + a dynamic
//    import gives each test honest state without adding a test-only reset export
//    to production code.
// 2. **Only the FIRST subscriber is notified on subscribe**, because that is what
//    starts the clock. A later subscriber reads the current value through
//    `getSnapshot`. Asserting both were notified was my bad premise.
// 3. **Every subscription is released in `afterEach`, not at the end of the test
//    body.** An assertion that throws before reaching its `off()` otherwise leaks a
//    live subscriber into every later test, and the failure surfaces somewhere
//    unrelated and looks like a bug in the clock.
// =========================================================================
describe("shared clock store", () => {
  let clock: typeof import("./shared-clock");
  let hidden = false;
  let fireVisibility: (() => void) | null = null;
  const open: Array<() => void> = [];

  const fakeEnvironment: ClockEnvironment = {
    isHidden: () => hidden,
    onVisibilityChange: (cb) => {
      fireVisibility = cb;
      return () => {
        fireVisibility = null;
      };
    },
  };

  const sub = (fn: () => void) => {
    const off = clock.subscribeToClock(fn);
    open.push(off);
    return off;
  };

  beforeEach(async () => {
    vi.resetModules();
    clock = await import("./shared-clock");
    vi.useFakeTimers();
    hidden = false;
    fireVisibility = null;
    clock.setClockEnvironment(fakeEnvironment);
    // Land exactly on a boundary so the first arm is unambiguous.
    vi.setSystemTime(at(2026, 10, 17, 12, 0, 0));
  });

  afterEach(() => {
    while (open.length) open.pop()?.();
    expect(clock.clockSubscriberCount()).toBe(0);
    vi.useRealTimers();
  });

  it("is reference counted: one timer for many subscribers, none for zero", () => {
    expect(clock.clockSubscriberCount()).toBe(0);
    sub(() => {});
    sub(() => {});
    expect(clock.clockSubscriberCount()).toBe(2);
    expect(vi.getTimerCount()).toBe(1); // ONE timer for two subscribers
  });

  it("stops entirely when the last subscriber leaves", () => {
    const a = sub(() => {});
    sub(() => {});
    expect(vi.getTimerCount()).toBe(1);
    a();
    expect(clock.clockSubscriberCount()).toBe(1);
    expect(vi.getTimerCount()).toBe(1); // still one subscriber, still armed
    open.pop()?.(); // release the second by hand
    expect(clock.clockSubscriberCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0); // nobody left -> no clock at all
  });

  it("notifies the first subscriber immediately, and everyone each minute", () => {
    let aCount = 0;
    let bCount = 0;
    sub(() => aCount++);
    expect(aCount).toBe(1); // the catch-up, which is what starts the clock
    sub(() => bCount++);
    expect(bCount).toBe(0); // a later subscriber reads getSnapshot instead

    vi.advanceTimersByTime(MINUTE_MS);
    expect(aCount).toBe(2);
    expect(bCount).toBe(1);

    vi.advanceTimersByTime(MINUTE_MS * 3);
    expect(aCount).toBe(5);
    expect(bCount).toBe(4);
  });

  it("does NOT notify inside the same minute -- that is the whole point", () => {
    let ticks = 0;
    sub(() => ticks++);
    const base = ticks;
    // 30 seconds: the two 3s polls this replaces would each have fired 10 times.
    vi.advanceTimersByTime(30_000);
    expect(ticks).toBe(base);
    expect(vi.getTimerCount()).toBe(1); // and still exactly one armed
  });

  it("keeps ticking across a day boundary and into a new month", () => {
    vi.setSystemTime(at(2026, 10, 31, 23, 59, 0));
    let ticks = 0;
    sub(() => ticks++);
    const base = ticks;
    vi.advanceTimersByTime(MINUTE_MS * 3); // crosses into November
    expect(ticks).toBe(base + 3);
  });

  it("arms nothing while hidden, wakes zero times, and refreshes on return", () => {
    let ticks = 0;
    sub(() => ticks++);
    const base = ticks;
    expect(vi.getTimerCount()).toBe(1);

    // Going to the background must CANCEL the pending timer, not merely decline to
    // re-arm. An earlier version did the latter, and this test caught the
    // difference: the hidden tab still woke exactly once.
    hidden = true;
    fireVisibility?.();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(MINUTE_MS * 5);
    expect(ticks).toBe(base); // five minutes hidden, zero wakes

    hidden = false;
    fireVisibility?.();
    expect(ticks).toBe(base + 1); // caught up the instant we return
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(MINUTE_MS);
    expect(ticks).toBe(base + 2); // and it resumes at a real boundary
  });

  it("publishes a minute-quantised snapshot, not Date.now()", () => {
    // getSnapshot is compared by Object.is, so a raw timestamp would re-render on
    // every read. It must change only when the minute does.
    sub(() => {});
    const first = clock.clockSnapshot();
    vi.advanceTimersByTime(1_000);
    expect(clock.clockSnapshot()).toBe(first);
    vi.advanceTimersByTime(MINUTE_MS - 1_000);
    expect(clock.clockSnapshot()).toBe(first + 1);
  });

  it("catches a first subscriber up rather than showing a stale value", () => {
    // Mounting at 12:59:58 must not show yesterday's date for two seconds.
    vi.setSystemTime(at(2026, 10, 17, 12, 59, 58));
    let ticks = 0;
    sub(() => ticks++);
    expect(ticks).toBe(1); // refreshed on first subscribe
    vi.advanceTimersByTime(2_000);
    expect(ticks).toBe(2); // and it turned the minute on its own
  });

  it("costs exactly one wake a minute however many subscribers there are", () => {
    // The measurable claim behind PERF-4b. Before it, the three live clocks woke
    // 44 times a minute: two 3s polls (20 + 20) and one 15s poll (4).
    for (let i = 0; i < 3; i++) sub(() => {});
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(MINUTE_MS * 10);
    // Still a single armed timer after ten minutes, and no accumulation.
    expect(vi.getTimerCount()).toBe(1);
  });
});
