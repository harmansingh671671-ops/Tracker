import { describe, it, expect } from "vitest";
import { swipeDirection, halfTargetFloor } from "./swipe-gesture";

describe("swipeDirection (B4)", () => {
  it("commits left and right at the 56px threshold", () => {
    expect(swipeDirection(-56, 0)).toBe("left");
    expect(swipeDirection(-120, 0)).toBe("left");
    expect(swipeDirection(56, 0)).toBe("right");
    expect(swipeDirection(120, 0)).toBe("right");
  });

  it("rejects short drags — they fall through to the tap handler", () => {
    expect(swipeDirection(0, 0)).toBeNull();
    expect(swipeDirection(55, 0)).toBeNull();
    expect(swipeDirection(-55, 0)).toBeNull();
  });

  it("rejects vertical drags — that is a list scroll, not a gesture", () => {
    expect(swipeDirection(0, 60)).toBeNull();
    expect(swipeDirection(0, -60)).toBeNull();
  });

  it("rejects diagonals where the vertical component catches up", () => {
    // |dy| * 1.2 beats |dx| in both of these
    expect(swipeDirection(56, -56)).toBeNull();
    expect(swipeDirection(-56, 56)).toBeNull();
  });

  it("commits a wide horizontal drag that also has vertical drift", () => {
    expect(swipeDirection(100, 60)).toBe("right");
    expect(swipeDirection(-100, 60)).toBe("left");
  });
});

describe("halfTargetFloor (B4, owner decision: round DOWN)", () => {
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
