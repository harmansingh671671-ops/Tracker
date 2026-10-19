import { describe, it, expect } from "vitest";
import { isLowEndDevice } from "./low-end";

const nav = (over: Record<string, number> = {}) => ({ ...over }) as {
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

describe("isLowEndDevice", () => {
  it("false for a missing navigator", () => {
    expect(isLowEndDevice(undefined)).toBe(false);
    expect(isLowEndDevice(null)).toBe(false);
  });

  it("low on <= 2 GB deviceMemory", () => {
    expect(isLowEndDevice(nav({ deviceMemory: 2 }))).toBe(true);
    expect(isLowEndDevice(nav({ deviceMemory: 1 }))).toBe(true);
  });

  it("not low on > 2 GB deviceMemory", () => {
    expect(isLowEndDevice(nav({ deviceMemory: 4 }))).toBe(false);
    expect(isLowEndDevice(nav({ deviceMemory: 8 }))).toBe(false);
  });

  it("ignores a non-positive deviceMemory and falls back to cores", () => {
    expect(isLowEndDevice(nav({ deviceMemory: 0, hardwareConcurrency: 2 }))).toBe(true);
  });

  it("deviceMemory present wins over hardwareConcurrency", () => {
    expect(isLowEndDevice(nav({ deviceMemory: 8, hardwareConcurrency: 2 }))).toBe(false);
  });

  it("low on <= 2 cores when deviceMemory is unknown", () => {
    expect(isLowEndDevice(nav({ hardwareConcurrency: 2 }))).toBe(true);
    expect(isLowEndDevice(nav({ hardwareConcurrency: 1 }))).toBe(true);
  });

  it("not low on more cores, or when neither property is exposed", () => {
    expect(isLowEndDevice(nav({ hardwareConcurrency: 8 }))).toBe(false);
    expect(isLowEndDevice(nav({}))).toBe(false);
  });
});
