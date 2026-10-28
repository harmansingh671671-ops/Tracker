import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getPlannerCatStyle } from "./planner-category-style";

/**
 * B5 / BUG-1 (in-app half) — the drift-proof colour test.
 *
 * BUG-1's record: the planner and the day-schedule kept TWO private palettes
 * for schedule categories, and they had already drifted (day-schedule folded
 * `admin` into Sync/sky while the planner painted it Work/violet; the two
 * screens also disagreed on the work label). The planner's half was already
 * extracted to `planner-category-style.ts`; the day-schedule still held its own
 * near-duplicate `getCatStyle`, which is where the drift lived.
 *
 * This file pins the ONE source:
 * 1. every storable category resolves to one hue, in dot / glow / border;
 * 2. a branch's dot and its glow can never name different rgb triplets;
 * 3. the day-schedule screen delegates here instead of keeping its own map.
 *
 * The wallpaper's palette is Phase 5 (BUG-1 stays open there) and is
 * deliberately out of scope, as are `allocation-bar` and the two pickers,
 * whose hues already agree and whose upgrade trigger is recorded in
 * main_plan.md.
 */

/** The hue each resolved category must paint, in every shape a consumer uses. */
const RESOLVED_HUES = {
  work: { dot: "bg-primary", glow: "rgba(108,0,255", border: "border-l-primary" },
  vitality: { dot: "bg-emerald-500", glow: "rgba(52,211,153", border: "border-l-emerald-500" },
  sync: { dot: "bg-sky-500", glow: "rgba(56,189,248", border: "border-l-sky-500" },
  renewal: { dot: "bg-amber-500", glow: "rgba(251,191,36", border: "border-l-amber-500" },
  sleep: { dot: "bg-indigo-500", glow: "rgba(99,102,241", border: "border-l-indigo-500" },
} as const;

/** Every storable spelling -> the resolved branch it must land in. */
const STORABLE_INPUTS: Array<[string, keyof typeof RESOLVED_HUES]> = [
  ["work", "work"],
  ["vitality", "vitality"],
  ["sync", "sync"],
  ["renewal", "renewal"],
  ["sleep", "sleep"],
  ["habits", "vitality"], // legacy rows, folded for display (see db.ts)
  ["buffer", "renewal"], // legacy
  ["admin", "sync"], // the drift this test exists to kill
  ["SLEEP", "sleep"], // matching is case-insensitive on both screens
];

describe("getPlannerCatStyle — the one schedule-category colour source", () => {
  it("resolves every storable category to one hue across dot, glow and border", () => {
    for (const [input, resolved] of STORABLE_INPUTS) {
      const cat = getPlannerCatStyle(input, true);
      expect(cat.dotClass, `dot for "${input}"`).toContain(RESOLVED_HUES[resolved].dot);
      expect(cat.accentGlow, `glow for "${input}"`).toContain(RESOLVED_HUES[resolved].glow);
      expect(cat.leftBorder, `border for "${input}"`).toContain(RESOLVED_HUES[resolved].border);
    }
  });

  it("paints an empty or non-custom block as uncoloured Open", () => {
    for (const [cat, isCustom] of [
      ["", true],
      ["work", false],
      [undefined, undefined],
    ] as Array<[string | undefined, boolean | undefined]>) {
      const style = getPlannerCatStyle(cat ?? "", isCustom ?? false);
      expect(style.key).toBe("open");
      expect(style.dotClass).toBe("bg-surface-container-highest");
      expect(style.accentGlow).toBe("");
      expect(style.leftBorder).toBe("border-l-transparent");
    }
  });

  it("never lets a branch's dot and glow name different rgb triplets", () => {
    for (const id of ["work", "vitality", "sync", "renewal", "sleep"] as const) {
      const cat = getPlannerCatStyle(id, true);
      const dotRgb = cat.dotClass.match(/rgba\((\d+,\d+,\d+)/);
      const glowRgb = cat.accentGlow.match(/rgba\((\d+,\d+,\d+)/);
      expect(dotRgb, `dot rgb for ${id}`).not.toBeNull();
      expect(glowRgb, `glow rgb for ${id}`).not.toBeNull();
      expect(glowRgb?.[1]).toBe(dotRgb?.[1]);
    }
  });

  it("carries the resolved key and both label spellings every consumer needs", () => {
    for (const [input, resolved] of STORABLE_INPUTS) {
      const cat = getPlannerCatStyle(input, true);
      expect(cat.key, `key for "${input}"`).toBe(resolved);
      expect(cat.label.length).toBeGreaterThan(0);
      expect(cat.shortLabel.length).toBeGreaterThan(0);
    }
    // The reconciled work label: the planner's picker and hour cards already
    // said "Deep Focus"; day-schedule's cards, picker and the allocation
    // legend's "Deep Work" follow it (display-only — the stored id is `work`).
    expect(getPlannerCatStyle("work", true).label).toBe("Deep Focus");
    expect(getPlannerCatStyle("work", true).shortLabel).toBe("Focus");
    expect(getPlannerCatStyle("sleep", true).label).toBe("Rest & Sleep");
  });
});

describe("the day-schedule screen reads the one source (BUG-1 guard)", () => {
  const pageSrc = readFileSync(
    join(process.cwd(), "src", "app", "day-schedule", "page.tsx"),
    "utf8",
  );

  it("no longer defines its own getCatStyle colour map", () => {
    expect(pageSrc).not.toMatch(/export (const|function) getCatStyle/);
  });

  it("delegates to the shared planner-category-style module", () => {
    expect(pageSrc).toMatch(/planner-category-style/);
  });
});
