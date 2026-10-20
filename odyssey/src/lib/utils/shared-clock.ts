/**
 * Shared clock — single source of "now" for the whole app.
 *
 * Replaces the 7+ independent `setInterval` timers that used to tick at
 * 1 s / 3 s / 4 s / 5 s / 15 s / 30 ms / 4.2 s. One timer, minute-boundary
 * aligned, started on first subscriber and stopped on last unsubscribe.
 *
 * Uses `useSyncExternalStore` so React 18 concurrent features work correctly
 * and SSR never sees a partially-initialised value.
 *
 * Per the battery audit (§2.8, §4b): consolidating to one minute-boundary timer
 * removes ~60× excess re-renders on the wallpaper preview and eliminates the
 * redundant wakeups from the habits/planner/date-strip timers.
 */

import { useSyncExternalStore } from "react";

// Re-export local date/time formatters (no React, safe for Server Components)
export { localDateStr, localTimeStr, localTimeStrWithSeconds } from "./local-date";

/** One minute, in ms. The clock's resolution. */
export const MINUTE_MS = 60_000;

type Subscriber = () => void;

const subscribers = new Set<Subscriber>();
let tickTimer: ReturnType<typeof setTimeout> | null = null;
let currentNow = new Date();

function notify() {
  currentNow = new Date();
  for (const cb of subscribers) cb();
}

function scheduleNextTick() {
  if (tickTimer) clearTimeout(tickTimer);
  const now = Date.now();
  // Align to the next minute boundary + 50 ms guard so we never fire
  // exactly at :00.000 and read the previous minute.
  const delay = MINUTE_MS - (now % MINUTE_MS) + 50;
  tickTimer = setTimeout(() => {
    notify();
    scheduleNextTick();
  }, delay);
}

function subscribe(cb: Subscriber) {
  const wasEmpty = subscribers.size === 0;
  subscribers.add(cb);
  if (wasEmpty) scheduleNextTick();
  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0 && tickTimer) {
      clearTimeout(tickTimer);
      tickTimer = null;
    }
  };
}

// React requires every `getServerSnapshot` to hand back the SAME cached
// instance on each call; a fresh `new Date()` there throws
// "The result of getServerSnapshot should be cached to avoid an infinite
// loop" (observed on the habits screen). One fixed instant is fine for SSR:
// nothing renders a live clock server-side, and the first client tick
// corrects it.
const serverNow = new Date();

function getSnapshot() {
  return currentNow;
}

function getServerSnapshot() {
  return serverNow;
}

/**
 * Returns the current local time as a `Date`, updated once per minute.
 * The value only changes when the minute rolls over, so components that
 * only need `HH:MM` re-render at most once per minute instead of every
 * second/3 seconds/5 seconds.
 *
 * Usage:
 *   const now = useSharedClock();
 *   const hour = now.getHours();
 *   const minute = now.getMinutes();
 */
export function useSharedClock(): Date {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Returns the current local time as a `Date`, updated on every tick.
 * Only use this if you genuinely need sub-minute precision (e.g. a
 * seconds display). Most callers should use `useSharedClock`.
 */
export function useSharedClockPrecise(): Date {
  // For now this is the same source; if a true per-second tick is ever
  // needed again we can add a second store with a 1 s timer.
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export { MINUTE_MS as minuteMs };