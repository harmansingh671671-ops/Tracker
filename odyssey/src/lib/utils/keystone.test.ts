import { describe, expect, it } from "vitest";
import type { Habit } from "@/lib/db";
import {
  orderHabitsForDisplay,
  resolveKeystoneHabit,
  withKeystoneOnWallpaper,
} from "./keystone";

/**
 * S19 -- keystone pinning. The keystone is ONE habit per user, stored as a
 * profile reference. These three pure functions are the whole rule: which habit
 * the id resolves to, how the habits list is ordered, and how the wallpaper's
 * rotating four keep a permanent place for it.
 *
 * Fixtures are plain objects; only `id`, `name` and `archivedAt` matter here.
 */
function habit(id: string, name: string, archivedAt?: string): Habit {
  return {
    id,
    userId: "u1",
    name,
    icon: "✨",
    category: "Vitality & Fitness",
    period: "morning",
    frequency: "daily",
    currentStreak: 0,
    longestStreak: 0,
    totalCompletions: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    archivedAt,
  } as Habit;
}

const ids = (habits: Habit[]) => habits.map((h) => h.id);

describe("resolveKeystoneHabit", () => {
  it("returns the habit the id points at", () => {
    const run = habit("h1", "Morning Run");
    expect(resolveKeystoneHabit([habit("h0", "Stretch"), run], "h1")?.id).toBe("h1");
  });

  it("no id means no keystone", () => {
    expect(resolveKeystoneHabit([habit("h0", "Stretch")], undefined)).toBeNull();
    expect(resolveKeystoneHabit([habit("h0", "Stretch")], "")).toBeNull();
  });

  it("a stale id resolves to nothing rather than trusting it (the house rule for vanished references)", () => {
    expect(resolveKeystoneHabit([habit("h0", "Stretch")], "deleted-habit")).toBeNull();
  });

  it("an ARCHIVED keystone resolves to nothing, so archival silently retires the pin", () => {
    expect(resolveKeystoneHabit([habit("h0", "Stretch", "2026-10-01T00:00:00.000Z")], "h0")).toBeNull();
  });
});

describe("orderHabitsForDisplay", () => {
  const a = habit("a", "Alpha");
  const b = habit("b", "Beta");
  const c = habit("c", "Gamma");

  it("puts the keystone first and leaves everyone else in their existing order", () => {
    expect(ids(orderHabitsForDisplay([a, b, c], "b"))).toEqual(["b", "a", "c"]);
  });

  it("without a keystone the order is untouched", () => {
    expect(ids(orderHabitsForDisplay([a, b, c], undefined))).toEqual(["a", "b", "c"]);
  });

  it("a keystone that is missing or archived changes nothing", () => {
    const archived = habit("old", "Old", "2026-10-01T00:00:00.000Z");
    expect(ids(orderHabitsForDisplay([a, b, archived], "old"))).toEqual(["a", "b", "old"]);
    expect(ids(orderHabitsForDisplay([a, b], "nope"))).toEqual(["a", "b"]);
  });

  it("never duplicates the keystone when it is already first", () => {
    expect(ids(orderHabitsForDisplay([a, b], "a"))).toEqual(["a", "b"]);
  });

  it("does not mutate the array it was given", () => {
    const input = [a, b, c];
    orderHabitsForDisplay(input, "c");
    expect(ids(input)).toEqual(["a", "b", "c"]);
  });
});

describe("withKeystoneOnWallpaper", () => {
  const a = habit("a", "Alpha");
  const b = habit("b", "Beta");
  const c = habit("c", "Gamma");
  const d = habit("d", "Delta");
  const e = habit("e", "Epsilon");
  const all = [a, b, c, d, e];

  it("no keystone leaves the wallpaper's rotating pick alone", () => {
    expect(ids(withKeystoneOnWallpaper([b, c, d, e], all, undefined, 4))).toEqual(["b", "c", "d", "e"]);
  });

  it("puts the keystone first even when the picker left it out", () => {
    expect(ids(withKeystoneOnWallpaper([b, c, d, e], all, "a", 4))).toEqual(["a", "b", "c", "d"]);
  });

  it("drops the last pick when the keystone joins a full row -- never five", () => {
    const result = withKeystoneOnWallpaper([b, c, d, e], all, "a", 4);
    expect(result.length).toBe(4);
    expect(ids(result)).not.toContain("e");
  });

  it("moves the keystone to the front when the picker already chose it", () => {
    const result = withKeystoneOnWallpaper([b, c, a, d], all, "a", 4);
    expect(ids(result)).toEqual(["a", "b", "c", "d"]);
    expect(result.length).toBe(4);
  });

  it("fills a short row without padding it out", () => {
    expect(ids(withKeystoneOnWallpaper([b], all, "a", 4))).toEqual(["a", "b"]);
  });

  it("a missing or archived keystone leaves the pick alone", () => {
    const archived = habit("old", "Old", "2026-10-01T00:00:00.000Z");
    expect(ids(withKeystoneOnWallpaper([b, c], [b, c, archived], "old", 4))).toEqual(["b", "c"]);
  });

  it("an empty pick still shows the keystone", () => {
    expect(ids(withKeystoneOnWallpaper([], all, "c", 4))).toEqual(["c"]);
  });

  it("a zero-sized wallpaper row yields nothing, never one overflow", () => {
    expect(withKeystoneOnWallpaper([b], all, "a", 0)).toEqual([]);
  });
});
