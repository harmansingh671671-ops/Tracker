/**
 * One clock for the whole app.
 *
 * ## What this replaces, and what it deliberately does not
 *
 * The plan counted "7 `setInterval` calls app-wide" as though they were all clocks.
 * They are not. Classified against the source, **only three are time-of-day polls**:
 *
 * | site | period | verdict |
 * |---|---|---|
 * | `app/habits/page.tsx` | 3s | **day-rollover poll** -> migrate |
 * | `habits/habit-date-strip.tsx:52` | 3s | **day-rollover poll** -> migrate |
 * | `planner/planner-content.tsx` | 15s | **day + hour boundary poll** -> migrate |
 * | `habits/habit-date-strip.tsx:317` | 30ms, max 15 | **layout-settle retry** -> leave |
 * | `planner/infinite-date-strip.tsx:295` | 30ms, max 15 | **layout-settle retry** -> leave |
 * | `onboarding/step-circadian.tsx` | 4.2s | **UI carousel advance** -> leave |
 * | `notifications/evening-reminder-modal.tsx` | 60s | already replaced in `6367493` |
 *
 * The two 30ms timers poll `centerDate()` until the scroll container has laid out,
 * then stop after 15 attempts. The 4.2s one advances an onboarding carousel. None
 * of them reads the wall clock, and folding them into a shared minute ticker would
 * break all three: the layout retry would fire 60x slower than its own timeout, and
 * the carousel would stall. **"One timer total" is not the goal; one timer for the
 * things that are actually clocks is.**
 *
 * ## The win, measured
 *
 * Visible and ticking, the three clocks woke **44 times a minute**: two 3-second
 * polls (20 + 20) and one 15-second poll (4). Now there is **one** wake a minute
 * regardless of how many screens are open - 44x fewer.
 *
 * ## Boundary-aligned, not `setInterval`
 *
 * `setInterval(fn, 60000)` drifts and fires up to a second late, forever. Each tick
 * re-arms at the **next real minute boundary**, so drift cannot accumulate.
 *
 * ## Hidden tabs cost nothing
 *
 * Browsers throttle timers in background tabs but do not stop them, so a throttled
 * minute tick can resume minutes late. The clock stops arming while hidden and
 * refreshes on `visibilitychange`. That is also strictly *more* correct than what
 * it replaces: crossing midnight in a hidden tab updates the date the instant you
 * return, rather than up to 3 seconds later.
 *
 * ## Why the environment is injected
 *
 * The store needs exactly two things from its host: whether the document is hidden,
 * and a way to hear about visibility changes. Taking them as a parameter (rather
 * than reading the `document` global) keeps this module testable under the repo's
 * deliberate **node-only, pure-function** vitest setup (`vitest.config.ts`, `P0-T5`)
 * - a jsdom environment for one module would have slowed every suite in the repo.
 */

import { useSyncExternalStore } from "react";

/** One minute, in ms. The clock's resolution. */
export const MINUTE_MS = 60_000;

// =========================================================================
// Environment
// =========================================================================

export interface ClockEnvironment {
  /** True while the tab is in the background. */
  isHidden(): boolean;
  /** Called when visibility changes. Returns an unsubscribe. */
  onVisibilityChange(cb: () => void): () => void;
}

const defaultEnvironment: ClockEnvironment = {
  isHidden: () => typeof document !== "undefined" && document.hidden,
  onVisibilityChange: (cb) => {
    if (typeof document === "undefined") return () => {};
    document.addEventListener("visibilitychange", cb);
    return () => document.removeEventListener("visibilitychange", cb);
  },
};

let environment: ClockEnvironment = defaultEnvironment;

/**
 * Swap the environment. Returns the previous one so tests can restore it.
 *
 * Exported for tests only. Nothing in `src/` should call it.
 */
export function setClockEnvironment(next: ClockEnvironment): ClockEnvironment {
  const previous = environment;
  environment = next;
  return previous;
}

// =========================================================================
// Pure helpers -- the part that carries the real logic
// =========================================================================

/**
 * Ms until the next minute boundary. **Never zero.**
 *
 * At exactly `:00.000` the arithmetic gives a full minute rather than 0, because a
 * `setTimeout(0)` would re-arm immediately and busy-loop. The modulus is also
 * normalised, so a clock handed a stale instant (a `setTimeout` that fired late,
 * or a machine that slept) still gets a forward-looking delay.
 */
export function msUntilNextMinute(now: number): number {
  const remainder = ((now % MINUTE_MS) + MINUTE_MS) % MINUTE_MS;
  return remainder === 0 ? MINUTE_MS : MINUTE_MS - remainder;
}

/** `YYYY-MM-DD` in **local** time -- never `toISOString()`, which is UTC. */
export function localDateStr(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// =========================================================================
// The store
// =========================================================================

const listeners = new Set<() => void>();

let timer: ReturnType<typeof setTimeout> | null = null;

let unsubscribeVisibility: (() => void) | null = null;

/**
 * The store's snapshot: **minutes since the epoch**, floored.
 *
 * It must only change once a minute, because `useSyncExternalStore` compares
 * snapshots by `Object.is` and re-renders on any change. Publishing `Date.now()`
 * instead would yield a new number on every read and spin the component forever,
 * so the clock publishes a *quantised* value and consumers derive what they need.
 */
let minuteIndex = 0;

function getSnapshot(): number {
  return minuteIndex;
}

/** Stable on the server, so hydration compares equal. */
function getServerSnapshot(): number {
  return 0;
}

/** Recompute and notify, but only if the minute actually turned. */
function refresh(): boolean {
  const next = Math.floor(Date.now() / MINUTE_MS);
  if (next === minuteIndex) return false;
  minuteIndex = next;
  for (const l of [...listeners]) l();
  return true;
}

function arm(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  if (listeners.size === 0) return;
  // Paused while hidden: a background tab still runs this, just throttled, so
  // skipping the arm is both cheaper and avoids waking at all.
  if (environment.isHidden()) return;
  timer = setTimeout(() => {
    timer = null;
    refresh();
    arm();
  }, msUntilNextMinute(Date.now()));
}

function handleVisibilityChange(): void {
  if (environment.isHidden()) {
    // Going to the background: cancel the armed timer outright. Merely declining
    // to re-arm would still let the pending one fire -- so a hidden tab would
    // wake once rather than zero, and the "hidden costs nothing" claim would be
    // false by exactly one tick. A test caught this.
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    return;
  }
  // Refresh first so subscribers re-render with a current value, then re-arm at a
  // real boundary rather than inheriting the old timer's schedule.
  refresh();
  arm();
}

/**
 * Subscribe to the shared clock. Starts it on the first subscriber, stops it on the
 * last, so an app with no clocks open runs no clock at all.
 */
export function subscribeToClock(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    // Catch up immediately: a component mounting at 12:59:58 must not show
    // yesterday's date for two seconds.
    refresh();
    arm();
    unsubscribeVisibility = environment.onVisibilityChange(handleVisibilityChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      unsubscribeVisibility?.();
      unsubscribeVisibility = null;
    }
  };
}

/** Live subscriber count. For tests, and for asserting the win. */
export function clockSubscriberCount(): number {
  return listeners.size;
}

/** Current minute index. For tests. */
export function clockSnapshot(): number {
  return minuteIndex;
}

// =========================================================================
// The hook
// =========================================================================

/**
 * A value that changes **once a minute**, for as long as the component is mounted.
 *
 * That is the whole hook. Consumers keep their own state and update it from an
 * effect keyed on this tick -- the smallest possible change at the call site, and
 * it leaves each component's initial value and its server render untouched:
 *
 * ```ts
 * const [todayStr, setTodayStr] = useState(getLocalTodayStr);
 * const tick = useMinuteTick();
 * useEffect(() => { setTodayStr(getLocalTodayStr()); }, [tick]);
 * ```
 *
 * Deriving the value *inside render* from `Date.now()` instead would be an impure
 * read, and `new Date()` in a render body is banned by `AGENTS.md` rule 15.
 */
export function useMinuteTick(): number {
  return useSyncExternalStore(subscribeToClock, getSnapshot, getServerSnapshot);
}

// =========================================================================
// Derived values
//
// These exist so consumers do **not** mirror the clock into `useState` and update
// it from an effect. React's `react-hooks/set-state-in-effect` rule is right to
// object to that pattern: it re-renders the component and then re-renders again,
// and the stored copy can drift from the snapshot it came from. Reading the value
// through `useSyncExternalStore` instead means the value is always *derived*, never
// *synchronised*, and there is no second copy to go stale.
//
// Both snapshots are **stable between renders**: `useSyncExternalStore` compares
// with `Object.is`, and a date string and an hour number compare by value, so
// nothing re-renders until the underlying value actually changes.
// =========================================================================

/** Today's local date, updating at midnight. `""` on the server. */
export function useClockTodayStr(): string {
  return useSyncExternalStore(subscribeToClock, todaySnapshot, serverTodaySnapshot);
}

/** The current local hour, 0-23. `-1` on the server. */
export function useClockHour(): number {
  return useSyncExternalStore(subscribeToClock, hourSnapshot, serverHourSnapshot);
}

function todaySnapshot(): string {
  return localDateStr(new Date());
}

function hourSnapshot(): number {
  return new Date().getHours();
}

// Stable server values. Empty/-1 rather than a real date, so a server render can
// never disagree with the client's timezone on a date string.
function serverTodaySnapshot(): string {
  return "";
}

function serverHourSnapshot(): number {
  return -1;
}
