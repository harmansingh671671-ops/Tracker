/**
 * The five families every schedule category folds into.
 *
 * Stored category values are looser than the five ids the pickers offer: older
 * builds and imported backups wrote `rest`, `health`, `admin`, `buffer`,
 * `meetings`. Comparing those strings raw made "same category" depend on
 * spelling — which is why identical-text sleep rows stored as `sleep` and
 * `rest` never merged while two unrelated tasks in the same category did.
 *
 * This is the fold for **deciding** (merging, grouping), not for painting:
 * `getPlannerCatStyle` still owns colours and labels.
 */
export const SCHEDULE_CATEGORY_KEYS = [
  "work",
  "vitality",
  "sync",
  "renewal",
  "sleep",
] as const;

export type ScheduleCategoryKey = (typeof SCHEDULE_CATEGORY_KEYS)[number];

/** Fold any stored spelling into the family it displays as. Unknown → work. */
export const canonicalCategoryKey = (
  category?: string | null
): ScheduleCategoryKey => {
  const c = (category || "").toLowerCase();
  if (c.includes("sleep") || c.includes("rest")) return "sleep";
  if (c.includes("vitality") || c.includes("habit") || c.includes("health"))
    return "vitality";
  if (
    c.includes("sync") ||
    c.includes("meet") ||
    c.includes("social") ||
    c.includes("admin")
  )
    return "sync";
  if (c.includes("renewal") || c.includes("buffer") || c.includes("leisure"))
    return "renewal";
  return "work";
};
