/**
 * Which category value a schedule-block edit should write.
 *
 * ## Why this is a module and not an `if` in the component
 *
 * `journey-day-schedule.tsx` has **four** buckets (`work` / `habits` / `buffer` /
 * `sleep`) while the pickers on Day Schedule and in the planner write **five**
 * (`work` / `vitality` / `sync` / `renewal` / `sleep`). Three of the five a user
 * can pick have no bucket on that screen, so its `normalizeCategory` folded them:
 *
 * | stored      | Journey shows     |
 * |-------------|-------------------|
 * | `vitality`  | Habits & Vitality |
 * | `sync`      | Buffer & Breaks   |
 * | `renewal`   | Buffer & Breaks   |
 *
 * The edit dialog seeded its `<select>` from that folded value and then **saved
 * whatever came back out** — so opening a block to fix a typo in its title, and
 * pressing save, rewrote `sync` to `buffer` permanently. No error, no
 * confirmation, and the mislabel is visible the moment the dialog opens.
 *
 * Bucketing is a *display* concern and belongs on the way in, not on the way
 * out. Storing the bucket means the display grouping becomes the source of
 * truth for the data.
 */

/** The four values `journey-day-schedule` groups by. */
export const JOURNEY_BUCKETS = ["work", "habits", "buffer", "sleep"] as const;
export type JourneyBucket = (typeof JOURNEY_BUCKETS)[number];

/**
 * Folds a stored category into the nearest Journey bucket, for **display only**.
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
 * What to write as `category` when the edit dialog is saved.
 *
 * **Untouched means unchanged.** The stored value is returned verbatim, so a
 * value this screen cannot display is preserved rather than overwritten with the
 * nearest bucket it *can*.
 *
 * `touched` is passed in rather than inferred from `stored === chosen`, and that
 * is the load-bearing detail. Value comparison is wrong in both directions:
 * a block stored as `buffer` opens showing `buffer`, so a user who visits
 * `sleep` and then re-selects `buffer` has made a real choice that comparison
 * would score as "no change" — and it would be discarded. Only the
 * interaction itself can answer "did the user mean this?".
 *
 * An explicitly emptied category is honoured as the user typing it, rather than
 * being treated as absent and silently restoring the old value.
 */
export function resolveEditedCategory(args: {
  stored: string;
  touched: boolean;
  chosen: string;
}): string {
  const { stored, touched, chosen } = args;
  return touched ? chosen : stored;
}
