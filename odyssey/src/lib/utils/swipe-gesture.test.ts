import { describe, it, expect } from "vitest";
import {
  SWIPE_COMMIT_PX,
  decideGestureAxis,
  swipeDirection,
  halfTargetFloor,
} from "./swipe-gesture";

describe("decideGestureAxis (B4 round 2: the axis is decided once, early)", () => {
  it("stays undecided before the 8px slop", () => {
    expect(decideGestureAxis(0, 0)).toBeNull();
    expect(decideGestureAxis(7.99, 0)).toBeNull();
  });

  it("locks horizontal when the first travel is horizontal", () => {
    expect(decideGestureAxis(10, 9)).toBe("x");
    expect(decideGestureAxis(12, 0)).toBe("x");
  });

  it("locks vertical when the first travel is vertical — that is a scroll", () => {
    expect(decideGestureAxis(9, 10)).toBe("y");
    expect(decideGestureAxis(0, 12)).toBe("y");
  });

  it("breaks a tied first move toward horizontal (swipe intent)", () => {
    expect(decideGestureAxis(10, 10)).toBe("x");
  });
});

describe("swipeDirection (B4 round 2: commits directly on the locked axis)", () => {
  it("commits left and right at the 40px threshold once locked horizontal", () => {
    expect(swipeDirection("x", -40)).toBe("left");
    expect(swipeDirection("x", -120)).toBe("left");
    expect(swipeDirection("x", 40)).toBe("right");
    expect(swipeDirection("x", 120)).toBe("right");
    expect(SWIPE_COMMIT_PX).toBe(40);
  });

  it("rejects a locked-horizontal swipe shorter than the threshold", () => {
    expect(swipeDirection("x", 0)).toBeNull();
    expect(swipeDirection("x", 39)).toBeNull();
    expect(swipeDirection("x", -39)).toBeNull();
  });

  it("never commits when the axis locked vertical — that gesture is a scroll", () => {
    expect(swipeDirection("y", -500)).toBeNull();
    expect(swipeDirection("y", 120)).toBeNull();
  });

  it("never commits while the axis is still undecided", () => {
    expect(swipeDirection(null, -120)).toBeNull();
  });

  it("commits a swipe whose finger drifted vertically mid-gesture — no hold needed", () => {
    // This is the owner case: a casual swipe drifts up/down as the list
    // scrolls; the lock already decided "x", so only the final dx counts.
    expect(swipeDirection("x", -60)).toBe("left");
  });
});

describe("halfTargetFloor (owner decision: round DOWN)", () => {
  it("floors half the target", () => {
    expect(halfTargetFloor(20)).toBe(10);
    expect(halfTargetFloor(15)).toBe(7);
    expect(halfTargetFloor(3)).toBe(1);
    expect(halfTargetFloor(2)).toBe(1);
  });

  it("reaches 0 for a target of 1 — the card hides the +X rectangle then", () => {
    expect(halfTargetFloor(1)).toBe(0);
  });

  it("returns 0 for a missing, non-finite or non-positive target", () => {
    expect(halfTargetFloor(undefined)).toBe(0);
    expect(halfTargetFloor(0)).toBe(0);
    expect(halfTargetFloor(-5)).toBe(0);
    expect(halfTargetFloor(Number.NaN)).toBe(0);
    expect(halfTargetFloor(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
