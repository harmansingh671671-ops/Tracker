import { describe, it, expect } from "vitest";
import { resolveEditedCategory, toJourneyBucket, JOURNEY_BUCKETS } from "./schedule-category-edit";
import { SCHEDULE_CATEGORIES, normalizeCategory } from "../db";

/**
 * `ScheduleBlock.category` is typed `ScheduleCategory | (string & {})`.
 *
 * The escape hatch is **load-bearing, and the type it sits on is fiction.**
 * Narrowing it is the task; this file is the evidence for why that is a
 * product decision rather than a patch, and it records what is known-broken so
 * the breakage stays visible instead of being discovered again.
 */

/** The 5 ids both category pickers offer (`day-schedule` CATEGORY_OPTIONS and
 *  `edit-hour-modal` CATEGORIES — identical ids, two different labels). */
const PICKER_IDS = ["work", "vitality", "sync", "renewal", "sleep"] as const;

/**
 * `day-schedule/page.tsx:192` -- the LIVE screen's normaliser. Takes an hour as
 * well and infers a category from it when the stored one is empty. Returns one
 * of the 5 picker ids, so it cannot round-trip `habits` or `buffer`.
 *
 * Copied rather than imported: it lives in a page component, and this file must
 * stay importable without React.
 */
function dayScheduleNormalizer(cat?: string, hour?: number): string {
  if (!cat) {
    if (hour !== undefined) {
      if (hour < 7 || hour >= 23) return "sleep";
      if (hour === 7 || hour === 8) return "vitality";
      if (hour === 12 || hour === 13) return "renewal";
      return "work";
    }
    return "work";
  }
  const c = cat.toLowerCase();
  if (c.includes("sleep") || c.includes("rest")) return "sleep";
  if (c.includes("vitality") || c.includes("habit") || c.includes("health")) return "vitality";
  if (c.includes("sync") || c.includes("meet") || c.includes("social") || c.includes("admin")) return "sync";
  if (c.includes("renewal") || c.includes("buffer") || c.includes("leisure")) return "renewal";
  return "work";
}

// =========================================================================
describe("resolveEditedCategory", () => {
  // ---------------------------------------------------------------------
  // THE FIX, on the LIVE path. `app/day-schedule/page.tsx` used to write back a
  // *display* normaliser's output whenever the user edited a block's TITLE.
  //
  // The same bug existed in `journey-day-schedule.tsx`, which additionally
  // overwrote `tag` (a habit id) with a category label. That component was
  // orphaned -- imported by nothing since September 2026 -- and has since been
  // deleted, so `toJourneyBucket` below now has no production caller. It is
  // retained, named and tested on purpose; see the module doc comment.
  // ---------------------------------------------------------------------
  it("preserves a category it cannot display when the user did not touch the dropdown", () => {
    for (const stored of PICKER_IDS) {
      // The dialog opens on `toJourneyBucket(stored)`, which for three of these
      // is a DIFFERENT bucket. If the user only fixed a typo and saved, the
      // stored value must come back byte-identical.
      expect(resolveEditedCategory({ stored, touched: false, chosen: toJourneyBucket(stored) })).toBe(stored);
    }
  });

  // The LIVE screen's normaliser is `day-schedule/page.tsx:192`, which folds
  // `habits`->`vitality` and `buffer`->`renewal`. Those rows exist in real
  // databases -- an imported backup is bulk-added verbatim, and earlier builds
  // wrote them -- so the fold is not hypothetical.
  it("preserves legacy values the live screen's normaliser would fold away", () => {
    expect(dayScheduleNormalizer("habits")).toBe("vitality");
    expect(dayScheduleNormalizer("buffer")).toBe("renewal");
    for (const stored of ["habits", "buffer"]) {
      expect(
        resolveEditedCategory({ stored, touched: false, chosen: dayScheduleNormalizer(stored) })
      ).toBe(stored);
    }
  });

  it("is identity for every value the live picker can write, so the bug is invisible", () => {
    // This is WHY it survived: for the values the picker produces, the lossy
    // fold is a no-op. It only bites on values the picker cannot produce.
    for (const picked of PICKER_IDS) {
      expect(dayScheduleNormalizer(picked)).toBe(picked);
      expect(resolveEditedCategory({ stored: picked, touched: false, chosen: dayScheduleNormalizer(picked) })).toBe(picked);
    }
  });

  it("writes the user's explicit choice when they did touch the dropdown", () => {
    expect(resolveEditedCategory({ stored: "sync", touched: true, chosen: "sleep" })).toBe("sleep");
    expect(resolveEditedCategory({ stored: "work", touched: true, chosen: "buffer" })).toBe("buffer");
  });

  it("honours re-selecting the bucket the dialog already showed", () => {
    // The case where value-comparison would be WRONG. A block stored as `buffer`
    // opens showing `buffer`; the user visits `sleep` and picks `buffer` back.
    // That is a deliberate choice, but `stored === chosen`, so any
    // "did it change?" test scores it as untouched and throws the choice away.
    expect(resolveEditedCategory({ stored: "buffer", touched: true, chosen: "buffer" })).toBe("buffer");
    expect(resolveEditedCategory({ stored: "sleep", touched: true, chosen: "sleep" })).toBe("sleep");
  });

  it("honours an explicitly emptied category instead of restoring the old one", () => {
    // Not treating "" as absent: if the user clears it, that is the value.
    expect(resolveEditedCategory({ stored: "work", touched: true, chosen: "" })).toBe("");
  });

  it("never invents a value when nothing was touched", () => {
    expect(resolveEditedCategory({ stored: "", touched: false, chosen: "buffer" })).toBe("");
    expect(resolveEditedCategory({ stored: "vitality", touched: false, chosen: "sleep" })).toBe("vitality");
  });
});

// =========================================================================
describe("toJourneyBucket (display only, no production caller)", () => {
  it("always returns one of the four buckets", () => {
    for (const c of [...PICKER_IDS, ...SCHEDULE_CATEGORIES, "", "nonsense", "  "]) {
      expect(JOURNEY_BUCKETS).toContain(toJourneyBucket(c));
    }
  });

  it("cannot represent 3 of the 5 categories the pickers offer", () => {
    // Not a defect in this function -- folding is what a display grouping is
    // for. It is a defect the moment the result is written back, which is what
    // the `resolveEditedCategory` tests above pin shut.
    const lossy = PICKER_IDS.filter((p) => toJourneyBucket(p) !== p);
    expect(lossy).toEqual(["vitality", "sync", "renewal"]);
  });

  it("still buckets on the title when the category is unhelpful", () => {
    // Only the keywords the function actually lists count. An earlier version
    // of this test expected "wind down" -> sleep; it matches none of
    // sleep/slumber/study/deep work/focus/gym/workout, so `buffer` is correct
    // and the expectation was the wrong premise, not the code.
    expect(toJourneyBucket("", "lights out, sleep")).toBe("sleep");
    expect(toJourneyBucket("", "gym")).toBe("habits");
    expect(toJourneyBucket("", "study session")).toBe("work");
    expect(toJourneyBucket("", "read a chapter")).toBe("buffer");
  });
});

// =========================================================================
// KNOWN-BROKEN, NOT FIXED. `it.fails` documents the defect and fails LOUDLY the
// moment someone fixes it, which is the signal to delete the `.fails` and move
// the assertion up into a normal test. It is the difference between a recorded
// defect and a silently forgotten one.
// =========================================================================
describe("KNOWN-BROKEN: SCHEDULE_CATEGORIES does not describe this app", () => {
  // The schema declares 8 Title Case categories. The pickers write 5 lowercase
  // ids. The two lists share NOTHING in spelling, so the union plus the escape
  // hatch constrains nothing at all -- worse than no type, because it reads
  // like validation.
  it.fails("declares only categories a picker can produce", () => {
    const writable = new Set<string>(PICKER_IDS);
    expect(SCHEDULE_CATEGORIES.filter((c) => !writable.has(c.toLowerCase()))).toEqual([]);
  });

  it.fails("declares every category a picker produces", () => {
    const declared = new Set<string>(SCHEDULE_CATEGORIES.map((c) => c.toLowerCase()));
    expect(PICKER_IDS.filter((c) => !declared.has(c))).toEqual([]);
  });

  it.fails("agrees with the vocabulary the export/import JSON round-trips", () => {
    // `profile-settings-sheet` bulkAdds a backup file verbatim, so whatever is
    // in the database must be a value the type admits. Today it is not.
    expect(SCHEDULE_CATEGORIES).toContain("sync" as never);
  });
});

describe("KNOWN-BROKEN: the exported normalizeCategory is a no-op in real use", () => {
  it.fails("maps a picker-written category onto a declared one", () => {
    // `normalizeCategory` returns its input unchanged for `vitality`, `sync` and
    // `renewal` because none of them is in SCHEDULE_CATEGORIES. It looks like a
    // success -- the value comes back -- while constraining nothing. The habit
    // side was split out of this function in P0-T3 for exactly this reason.
    const identity = ["vitality", "sync", "renewal"].every((v) => normalizeCategory(v) === v);
    expect(identity).toBe(false);
  });
});
