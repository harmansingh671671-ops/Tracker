import { type Habit } from "@/lib/db";

// Vibrant, bold category color palette inspired by HabitDriven
export const BOLD_CATEGORY_COLORS: Record<string, string> = {
  // 1. Vitality & Fitness & Health
  "Vitality & Fitness": "#10B981", // Emerald 500
  "Vitality": "#10B981",
  "vitality": "#10B981",
  "Fitness": "#10B981",
  "fitness": "#10B981",
  "Health": "#10B981",
  "health": "#10B981",
  "Wellness": "#10B981",
  "wellness": "#10B981",
  "Workout": "#10B981",
  "workout": "#10B981",
  "Gym": "#10B981",
  "gym": "#10B981",
  "Running": "#10B981",
  "Nutrition": "#10B981",

  // 2. Craft & Skill & Learning & Study
  "Craft & Skill": "#2563EB", // Royal Blue 600
  "Craft": "#2563EB",
  "craft": "#2563EB",
  "Skill": "#2563EB",
  "skill": "#2563EB",
  "Learning": "#2563EB",
  "learning": "#2563EB",
  "Study": "#2563EB",
  "study": "#2563EB",
  "Reading": "#2563EB",
  "reading": "#2563EB",
  "Knowledge": "#2563EB",
  "Code": "#2563EB",
  "Coding": "#2563EB",

  // 3. Mindful Focus & Meditation & Sleep
  "Mindful Focus": "#8B5CF6", // Violet 500
  "Mindfulness": "#8B5CF6",
  "mindfulness": "#8B5CF6",
  "Meditation": "#8B5CF6",
  "meditation": "#8B5CF6",
  "Reflection": "#8B5CF6",
  "Sleep": "#8B5CF6",
  "sleep": "#8B5CF6",

  // 4. Renewal & Health & Recovery & Recharge
  "Renewal & Health": "#F59E0B", // Amber 500
  "Renewal": "#F59E0B",
  "renewal": "#F59E0B",
  "Recovery": "#F59E0B",
  "recovery": "#F59E0B",
  "Recharge": "#F59E0B",
  "recharge": "#F59E0B",
  "Rest": "#F59E0B",

  // 5. Productivity & Deep Work & Work & Focus
  "Productivity": "#06B6D4", // Cyan 500
  "productivity": "#06B6D4",
  "Deep Work": "#06B6D4",
  "Deep Work & Focus": "#06B6D4",
  "Work": "#06B6D4",
  "work": "#06B6D4",
  "Career": "#06B6D4",
  "career": "#06B6D4",
  "Focus": "#06B6D4",
  "focus": "#06B6D4",
  "Discipline": "#06B6D4",

  // 6. Social & Relationships & Tribe
  "Social & Relationships": "#EC4899", // Pink 500
  "Social": "#EC4899",
  "social": "#EC4899",
  "Relationships": "#EC4899",
  "relationships": "#EC4899",
  "Tribe": "#EC4899",
  "Family": "#EC4899",
  "Friends": "#EC4899",

  // 7. Growth & Routine
  "Growth": "#9333EA", // Purple 600
  "growth": "#9333EA",
  "Routine": "#7C3AED",
  "routine": "#7C3AED",
  "General": "#6366F1",
  "general": "#6366F1",
};

// Deterministic bold vibrant fallback palette
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
 * Returns a consistent bold color for a habit based on category keywords or a deterministic name hash.
 * Guaranteed to return the exact same color across all components and screens.
 */
export function getHabitColor(
  habit: { category?: string; name?: string; id?: string },
  _unusedLegacyIndex?: number
): string {
  if (habit.category) {
    const cat = habit.category.toLowerCase().trim();

    // 1. Exact match
    for (const [key, color] of Object.entries(BOLD_CATEGORY_COLORS)) {
      if (key.toLowerCase() === cat) return color;
    }

    // 2. Keyword heuristic match
    if (
      cat.includes("vitality") ||
      cat.includes("fitness") ||
      cat.includes("health") ||
      cat.includes("gym") ||
      cat.includes("workout") ||
      cat.includes("run") ||
      cat.includes("nutrition")
    ) {
      return BOLD_CATEGORY_COLORS["Vitality & Fitness"];
    }

    if (
      cat.includes("craft") ||
      cat.includes("skill") ||
      cat.includes("learn") ||
      cat.includes("study") ||
      cat.includes("read") ||
      cat.includes("code") ||
      cat.includes("book")
    ) {
      return BOLD_CATEGORY_COLORS["Craft & Skill"];
    }

    if (
      cat.includes("mind") ||
      cat.includes("meditat") ||
      cat.includes("reflect") ||
      cat.includes("sleep") ||
      cat.includes("zen")
    ) {
      return BOLD_CATEGORY_COLORS["Mindful Focus"];
    }

    if (
      cat.includes("renewal") ||
      cat.includes("recharge") ||
      cat.includes("recover") ||
      cat.includes("rest")
    ) {
      return BOLD_CATEGORY_COLORS["Renewal & Health"];
    }

    if (
      cat.includes("productiv") ||
      cat.includes("work") ||
      cat.includes("focus") ||
      cat.includes("career") ||
      cat.includes("task") ||
      cat.includes("discipline")
    ) {
      return BOLD_CATEGORY_COLORS["Productivity"];
    }

    if (
      cat.includes("social") ||
      cat.includes("relation") ||
      cat.includes("friend") ||
      cat.includes("family") ||
      cat.includes("tribe") ||
      cat.includes("love")
    ) {
      return BOLD_CATEGORY_COLORS["Social & Relationships"];
    }

    if (cat.includes("growth") || cat.includes("habit")) {
      return BOLD_CATEGORY_COLORS["Growth"];
    }
  }

  // 3. Deterministic hash based on habit name or id (index is intentionally omitted so color is constant everywhere)
  const str = (habit.name || habit.id || "habit").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % BOLD_HABIT_PALETTE.length;
  return BOLD_HABIT_PALETTE[colorIndex];
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


