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

/**
 * The category a block with NO stored category is painted as, by clock hour.
 *
 * This is a DISPLAY default, never a value to save (owner rule: the app must
 * not assume a category). It lives here so the quick schedule's painter and
 * its merge read the same table — a blank block at 22:00 shows "Rest & Sleep",
 * and the merge has to agree with what the user can see.
 */
export const defaultCategoryForHour = (hour: number): ScheduleCategoryKey => {
  if (hour < 7 || hour >= 23) return "sleep";
  if (hour === 7 || hour === 8) return "vitality";
  if (hour === 12 || hour === 13) return "renewal";
  return "work";
};

/**
 * The category a row actually shows: the stored value folded into its family,
 * or the hour default when nothing is stored.
 *
 * Merging compares THIS, not the raw stored string. A blank block at 23:00 and
 * a block stored `sleep` both read "Rest & Sleep" on screen, so refusing to
 * merge them was a bug the user could see: identical cards that would not join.
 */
export const effectiveCategoryKey = (
  category: string | null | undefined,
  hour: number
): ScheduleCategoryKey => {
  const raw = (category || "").trim();
  return raw ? canonicalCategoryKey(raw) : defaultCategoryForHour(hour);
};
