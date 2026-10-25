import { describe, it, expect } from "vitest";
import {
  freshTimer,
  isTimerRunning,
  startTimer,
  pauseTimer,
  timerElapsedMs,
  formatStopwatch,
} from "./session-timer";

describe("freshTimer", () => {
  it("starts at zero and not running", () => {
    const t = freshTimer();
    expect(isTimerRunning(t)).toBe(false);
    expect(timerElapsedMs(t, 9000)).toBe(0);
  });
});

describe("startTimer / pauseTimer (wall-clock accounting)", () => {
  it("running elapsed grows linearly with the clock", () => {
    const t = startTimer(freshTimer(), 10_000);
    expect(isTimerRunning(t)).toBe(true);
    expect(timerElapsedMs(t, 12_500)).toBe(2_500);
    expect(timerElapsedMs(t, 40_000)).toBe(30_000);
  });

  it("pausing freezes the clock; resuming accrues on top", () => {
    let t = startTimer(freshTimer(), 10_000);
    t = pauseTimer(t, 20_000); // 10s of running banked
    expect(isTimerRunning(t)).toBe(false);
    expect(timerElapsedMs(t, 500_000)).toBe(10_000); // backgrounded time never counts

    t = startTimer(t, 500_000);
    expect(timerElapsedMs(t, 505_000)).toBe(15_000);
  });

  it("start on an already-running timer never double-accrues", () => {
    let t = startTimer(freshTimer(), 10_000);
    t = startTimer(t, 15_000); // idempotent
    expect(timerElapsedMs(t, 20_000)).toBe(10_000);
  });

  it("pause on an already-paused timer changes nothing", () => {
    const t = pauseTimer(startTimer(freshTimer(), 10_000), 13_000);
    const again = pauseTimer(t, 99_999);
    expect(timerElapsedMs(again, 99_999)).toBe(3_000);
    expect(again.accumulatedMs).toBe(3_000);
  });

  it("elapsed is never negative, however the clock is sampled", () => {
    const t = startTimer(freshTimer(), 10_000);
    expect(timerElapsedMs(t, 9_999)).toBe(0);
    expect(timerElapsedMs(freshTimer(), 0)).toBe(0);
  });
});

describe("formatStopwatch", () => {
  it("shows minutes:seconds below an hour", () => {
    expect(formatStopwatch(0)).toBe("00:00");
    expect(formatStopwatch(59_999)).toBe("00:59");
    expect(formatStopwatch(60_000)).toBe("01:00");
    expect(formatStopwatch(65_000)).toBe("01:05");
    expect(formatStopwatch(5_400_000 - 1000)).toBe("1:29:59");
  });

  it("shows hours once the hour rolls over", () => {
    expect(formatStopwatch(3_600_000)).toBe("1:00:00");
    expect(formatStopwatch(3_601_000)).toBe("1:00:01");
    expect(formatStopwatch(7_425_000)).toBe("2:03:45");
  });

  it("clamps garbage to 00:00 rather than showing debt", () => {
    expect(formatStopwatch(-1)).toBe("00:00");
    expect(formatStopwatch(NaN)).toBe("00:00");
    expect(formatStopwatch(Infinity)).toBe("00:00");
  });
});
