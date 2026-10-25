/**
 * Wall-clock session timer math (D1/D2 session work, 2026-10-25).
 *
 * The elapsed time is computed from `Date.now()` at read time, never from a
 * counting interval: the session view ticks only to *display* the value, and a
 * page hidden for an hour answers with the true hour on the next tick. This is
 * the same correctness the app's day-rollover handling relies on — a timer
 * that accrues by interval goes wrong the moment the tab is backgrounded.
 *
 * Pure: every function takes its `now`, so the test suite pins the accounting
 * without a single fake clock.
 */

export interface TimerSnapshot {
  /** Epoch ms the current running span started; null while paused. */
  startedAt: number | null;
  /** Running time banked from spans that already ended. */
  accumulatedMs: number;
}

/** A paused timer at zero — the state the session view opens on. */
export function freshTimer(): TimerSnapshot {
  return { startedAt: null, accumulatedMs: 0 };
}

export function isTimerRunning(snapshot: TimerSnapshot): boolean {
  return snapshot.startedAt !== null;
}

/** Begin (or resume) from a paused state. Starting a running timer is a no-op:
 *  re-dispatching the start because of a re-render must never re-bank time. */
export function startTimer(snapshot: TimerSnapshot, now: number): TimerSnapshot {
  if (snapshot.startedAt !== null) return snapshot;
  return { startedAt: now, accumulatedMs: snapshot.accumulatedMs };
}

/** Stop the clock, banking the running span. Pausing a paused timer is a
 *  no-op for the same re-renders-never-re-bank reason: callers pause with
 *  `now = Date.now()` while the timer is long since stopped. */
export function pauseTimer(snapshot: TimerSnapshot, now: number): TimerSnapshot {
  if (snapshot.startedAt === null) return snapshot;
  return {
    startedAt: null,
    accumulatedMs: snapshot.accumulatedMs + Math.max(0, now - snapshot.startedAt),
  };
}

/** Total running time as of `now`; paused time is never added. */
export function timerElapsedMs(snapshot: TimerSnapshot, now: number): number {
  const running = snapshot.startedAt !== null ? Math.max(0, now - snapshot.startedAt) : 0;
  return snapshot.accumulatedMs + running;
}

/** mm:ss below the hour, h:mm:ss after; garbage clamps to 00:00 (the value is
 *  a display of running time — a negative "remaining" must render as debt). */
export function formatStopwatch(ms: number): string {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const two = (v: number) => String(v).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}
