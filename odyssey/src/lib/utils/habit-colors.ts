import { type Habit, HABIT_CATEGORIES, normalizeHabitCategory } from "@/lib/db";

/**
 * Canonical habit colour, keyed on the four domains (P0-T3).
 *
 * This map used to carry **70 keys for 44 distinct values**. `getHabitColor`
 * compared `key.toLowerCase() === category.toLowerCase()`, so **26 of those keys
 * could never match** — every lowercase duplicate sat behind a Title Case twin
 * that matched first. They read as coverage and provided none.
 *
 * All four colours are unchanged from before, so no habit changes colour by
 * moving onto the canonical vocabulary.
 */
export const BOLD_CATEGORY_COLORS: Record<(typeof HABIT_CATEGORIES)[number], string> = {
  "Vitality & Fitness": "#10B981", // Emerald 500
  "Craft & Skill": "#2563EB", // Royal Blue 600
  "Mindful Focus": "#8B5CF6", // Violet 500
  "Renewal & Health": "#F59E0B", // Amber 500
};

// Deterministic bold vibrant fallback palette, used when a habit has no
// recognisable category.
export const BOLD_HABIT_PALETTE = [
  "#10B981", // Emerald Green
  "#2563EB", // Royal Blue
  "#8B5CF6", // Bold Violet
  "#F59E0B", // Bold Amber
  "#06B6D4", // Bold Cyan
  "#EC4899", // Hot Pink
  "#9333EA", // Purple
  "#EF4444", // Crimson Red
  "#84CC16", // Lime Green
  "#F97316", // Bold Orange
];

/**
 * Returns a consistent colour for a habit, derived from its category.
 *
 * P0-T3 replaced a 70-key alias table plus seven keyword-heuristic branches with
 * three steps: normalise, look up, hash. `normalizeHabitCategory` already owns
 * the legacy vocabulary, and the four domains *are* the map, so the aliases
 * were duplicating a table that already existed.
 *
 * The same guarantee as before: the identical colour on every component and
 * screen.
 *
 * The keyword heuristics are gone deliberately. They matched substrings such as
 * `cat.includes("zen")` in categories that no write path can produce, and a
 * substring match against a user's own label is how a habit ends up green for
 * reasons nobody can explain.
 */
export function getHabitColor(
  habit: { category?: string; name?: string; id?: string },
  _unusedLegacyIndex?: number
): string {
  // 1. Canonical domain.
  if (habit.category) {
    const domain = normalizeHabitCategory(habit.category) as keyof typeof BOLD_CATEGORY_COLORS;
    const color = BOLD_CATEGORY_COLORS[domain];
    if (color) return color;
  }

  // 2. Deterministic hash on name or id, so an unrecognised or missing category
  //    still yields a stable colour instead of a flat default.
  const str = (habit.name || habit.id || "habit").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % BOLD_HABIT_PALETTE.length;
  return BOLD_HABIT_PALETTE[colorIndex];
}

/**
 * The category text to show for a habit.
 *
 * CONS-1. Three surfaces each had their own fallback — `"Routine"` twice and
 * `"General"` once — and **none of those are canonical domains**. They are
 * leftovers from the retired six-category vocabulary, and because they are
 * *labels* rather than values they did not fail to typecheck: the app could
 * display a category that exists nowhere in the schema while painting the
 * habit with a colour derived from a completely different rule (a legacy
 * `"General"` resolves to Craft & Skill's blue, while `"Routine"` is not in the
 * map at all and falls to the name hash, so the same missing category produced
 * two different colours on two screens).
 *
 * One shared helper removes the third opinion. An uncategorised habit says so
 * plainly rather than being given a category name it does not have.
 */
export const UNCATEGORISED_LABEL = "Uncategorised";

export function habitCategoryLabel(habit: { category?: string }): string {
  const raw = String(habit.category ?? "").trim();
  if (!raw) return UNCATEGORISED_LABEL;

  // Normalise, so the LABEL and the COLOUR cannot disagree. An un-migrated row
  // still holding "health" would otherwise be labelled "health" while being
  // painted in Vitality & Fitness emerald -- the exact mismatch CONS-1 is
  // about, just relocated from the label to the pair.
  const normalised = normalizeHabitCategory(raw);
  // normalizeHabitCategory deliberately preserves a value it does not
  // recognise, because a user's own category text is their data. So only adopt
  // the result when it actually resolved to a canonical domain; otherwise show
  // what the user wrote.
  return (HABIT_CATEGORIES as readonly string[]).includes(normalised) ? normalised : raw;
}

/**
 * Resolves the effective scheduled days of the week (1=Mon, ..., 7=Sun) for a habit.
 */
export function getHabitScheduledDays(habit: {
  targetDays?: number[];
  targetDaysPerWeek?: number;
}): number[] {
  if (habit.targetDays && habit.targetDays.length > 0) {
    return habit.targetDays;
  }
  const target = habit.targetDaysPerWeek ?? 7;
  if (target === 7) return [1, 2, 3, 4, 5, 6, 7];
  if (target === 5) return [1, 2, 3, 4, 5];
  if (target === 3) return [1, 3, 5];
  if (target > 0 && target < 7) {
    return Array.from({ length: target }, (_, i) => i + 1);
  }
  return [1, 2, 3, 4, 5, 6, 7];
}

/**
 * Returns the current local calendar date string formatted as YYYY-MM-DD.
 */
export function getLocalTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Checks whether a habit is scheduled / eligible on a given date string (YYYY-MM-DD).
 */
export function isHabitScheduledOnDate(
  habit: { targetDays?: number[]; targetDaysPerWeek?: number },
  dateStr: string
): boolean {
  if (!dateStr) return true;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const jsDay = dateObj.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const dayOfWeek = jsDay === 0 ? 7 : jsDay; // 1=Mon, ..., 7=Sun
  const scheduledDays = getHabitScheduledDays(habit);
  return scheduledDays.includes(dayOfWeek);
}