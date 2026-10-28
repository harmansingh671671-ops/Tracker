import { describe, it, expect } from "vitest";
import { encodeShareLink, decodeShareLink } from "./habit-share";

/**
 * B1 share-link contract (owner scope 2026-10-28: add-all + preview + sharing).
 *
 * The habit rides INSIDE the link — this app is local-first with no accounts
 * and no server, so the link is the only transport. The codec must therefore
 * be round-trip stable, tolerant of junk without ever throwing, and must never
 * resurrect a habit that was not actually encoded.
 */

const FULL = {
  name: "Read 20 pages",
  icon: "📚",
  category: "Mindful Focus",
  targetDays: [2, 4, 6],
  timeOfDay: "evening" as const,
  type: "counted" as const,
  unit: "pages",
  targetValue: 20,
  emergencyVersion: 5,
};

describe("encodeShareLink", () => {
  it("produces a https link to the habits screen carrying the import token", () => {
    const link = encodeShareLink({ name: "Morning walk" }, "https://odyssey.app");
    expect(link.startsWith("https://odyssey.app/habits?import=")).toBe(true);
    expect(link.split("import=")[1]).not.toMatch(/[+/=]/); // url-safe token alphabet
  });

  it("defaults the origin to the running app when not given", () => {
    const link = encodeShareLink({ name: "Morning walk" });
    expect(link.startsWith("/habits?import=")).toBe(true);
  });
});

describe("decodeShareLink round trips", () => {
  it("restores every field of a full habit from the full link", () => {
    const link = encodeShareLink(FULL, "https://odyssey.app");
    const got = decodeShareLink(link);
    expect(got).toMatchObject({
      name: "Read 20 pages",
      icon: "📚",
      category: "Mindful Focus",
      targetDays: [2, 4, 6],
      timeOfDay: "evening",
      type: "counted",
      unit: "pages",
      targetValue: 20,
      emergencyVersion: 5,
    });
  });

  it("accepts the bare import token as well as the full url", () => {
    const link = encodeShareLink(FULL, "https://odyssey.app");
    const token = link.split("import=")[1] as string;
    expect(decodeShareLink(token)).toMatchObject({ name: "Read 20 pages" });
  });

  it("unicode names survive the byte round trip", () => {
    const got = decodeShareLink(encodeShareLink({ name: " neighborhood stroll 🌆" }, "https://x.test"));
    expect(got?.name).toBe("neighborhood stroll 🌆");
  });

  it("a simple habit decodes without counted-only fields", () => {
    const got = decodeShareLink(encodeShareLink({ name: "Meditate", timeOfDay: "morning" }, "https://x.test"));
    expect(got).toMatchObject({ name: "Meditate", timeOfDay: "morning", type: "simple" });
    expect(got?.unit).toBeUndefined();
    expect(got?.targetValue).toBeUndefined();
  });

  it("a shared quit habit stays a quit habit", () => {
    const got = decodeShareLink(
      encodeShareLink({ name: "Quit scrolling", type: "avoid", unit: "pages", targetValue: 9 }, "https://x.test")
    );
    expect(got?.type).toBe("avoid");
    expect(got?.unit).toBeUndefined(); // an avoid habit has no counters
    expect(got?.targetValue).toBeUndefined();
  });
});

describe("decodeShareLink sanitises hostile input", () => {
  it("returns null for total garbage instead of throwing", () => {
    expect(decodeShareLink("not a link at all !!!!")).toBeNull();
    expect(decodeShareLink("")).toBeNull();
  });

  it("returns null when the token encodes nothing usable (no name)", () => {
    const link = encodeShareLink({ name: "x" }, "https://x.test").split("import=")[1] as string;
    const mangled = "AQ" + link.slice(2); // corrupt the base64 payload
    expect(decodeShareLink(mangled)).toBeNull();
  });

  it("keeps a habit whose json is valid but fields are junk — sanitised", () => {
    const link = encodeShareLink(
      { name: "*", targetDays: [9, -3], timeOfDay: "brunch" as never, unit: "  " },
      "https://x.test"
    );
    const got = decodeShareLink(link);
    expect(got).toBeTruthy();
    expect(got?.timeOfDay).toBe("anytime");
    expect(got?.targetDays).toEqual([1, 2, 3, 4, 5]); // weekdays, never an empty week
    expect(got?.name.length).toBeLessThanOrEqual(60);
  });

  it("drops absurd target values and negative emergency minimums", () => {
    const got = decodeShareLink(
      encodeShareLink({ name: "x", targetValue: -5, emergencyVersion: 0 }, "https://x.test")
    );
    expect(got?.targetValue).toBeUndefined();
    expect(got?.emergencyVersion).toBeUndefined();
  });

  it("never returns a name longer than 60 chars", () => {
    const got = decodeShareLink(encodeShareLink({ name: "a".repeat(200) }, "https://x.test"));
    expect(got?.name.length).toBe(60);
  });
});
