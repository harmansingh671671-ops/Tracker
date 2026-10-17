/**
 * Which category value a schedule-block edit should write.
 *
 * ## Why this is a module and not an `if` in the component
 *
 * `day-schedule/page.tsx` seeds each hour's category from **state** that was
 * populated out of the stored block's value, and that seed step is lossy for
 * anything outside the five values its picker offers — it maps through a
 * *display* vocabulary. So writing the seeded value back on every save meant
 * **editing a block's title silently recategorised it**: a row stored `habits`
 * came back as `vitality`, a row stored `buffer` as `renewal`.
 *
 * Bucketing is a **display** concern and belongs on the way in, not on the way
 * out. Storing the bucket makes the display grouping the source of truth for
 * the data.
 *
 * ## `toJourneyBucket` has no caller, and that is deliberate
 *
 * It records the four-bucket scheme that `journey-day-schedule.tsx` used. That
 * component was **orphaned** — exported and imported by nothing since September
 * 2026, superseded by the `/day-schedule` route — and was deleted rather than
 * left as 1,178 invisible lines carrying a duplicate of this exact trap.
 *
 * So this function now has **no production caller**. It is kept anyway, and
 * tested, for one reason: the four-way fold is the mechanism behind `BUG-12`, and
 * the whole failure was that the fold was invisible — named in a component
 * nobody mounted, doing a lossy conversion nobody wrote a test for. Keeping it
 * here, **named, exported and asserted**, means anyone reviving that grouping
 * has to import it and read why it must not be written back. Delete it the day a
 * four-bucket scheme is either genuinely wired up or definitively abandoned.
 */

/**
 * The four values the orphaned journey grouping collapsed to.
 *
 * Three of the five categories the pickers offer have no bucket here, which is
 * precisely why it could not be used as a storage vocabulary.
 */
export const JOURNEY_BUCKETS = ["work", "habits", "buffer", "sleep"] as const;
export type JourneyBucket = (typeof JOURNEY_BUCKETS)[number];

/**
 * Folds a stored category into the nearest four-bucket group, for **display**.
 *
 * Never call this to decide what to save — that is what silently destroyed data.
 * Its return value belongs in a `<select>`'s `value`, not in a database write.
 */
export function toJourneyBucket(category: string, title?: string): JourneyBucket {
  const c = (category || "").toLowerCase();
  const t = (title || "").toLowerCase();
  if (c.includes("sleep") || c.includes("rest") || t.includes("sleep") || t.includes("slumber")) return "sleep";
  if (c.includes("work") || c.includes("study") || t.includes("study") || t.includes("deep work") || t.includes("focus")) return "work";
  if (c.includes("habit") || c.includes("health") || c.includes("vitality") || t.includes("gym") || t.includes("workout")) return "habits";
  return "buffer";
}

/**
 * What to write as `category` when a block's edit is saved.
 *
 * **Untouched means unchanged.** The stored value is returned verbatim, so a
 * value the screen cannot display is preserved rather than overwritten with
 * something it can.
 *
 * `touched` is passed in rather than inferred from `stored === chosen`, and that
 * is the load-bearing detail. Value comparison is wrong in both directions:
 * a block stored as `buffer` opens showing `buffer`, so a user who visits
 * `sleep` and then re-selects `buffer` has made a real choice that comparison
 * would score as "no change" — and it would be discarded. Only the
 * interaction itself can answer "did the user mean this?".
 *
 * An explicitly emptied category is honoured as the user clearing it, rather
 * than being treated as absent and silently restoring the old value.
 */
export function resolveEditedCategory(args: {
  stored: string;
  touched: boolean;
  chosen: string;
}): string {
  const { stored, touched, chosen } = args;
  return touched ? chosen : stored;
}
