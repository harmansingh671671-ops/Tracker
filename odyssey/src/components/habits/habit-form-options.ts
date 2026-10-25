import { type HabitCategory } from "@/lib/db";

/**
 * The option lists both habit forms share (B2, 2026-10-25).
 *
 * These three constants were previously duplicated verbatim in
 * create-habit-modal.tsx and edit-habit-modal.tsx, which is how the icon grids
 * had already drifted (h-11 vs h-12 tiles). One source, both forms — the same
 * reason the unit picker is one component. Values are unchanged; nothing
 * saved or displayed differs.
 */

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const EMOJIS = [
  { emoji: "🧘", label: "Meditate" },
  { emoji: "💧", label: "Hydration" },
  { emoji: "🏋️", label: "Workout" },
  { emoji: "📖", label: "Reading" },
  { emoji: "💻", label: "Coding" },
  { emoji: "✍️", label: "Journaling" },
  { emoji: "🎸", label: "Music" },
  { emoji: "🏃", label: "Running" },
  { emoji: "☀️", label: "Morning" },
  { emoji: "🌙", label: "Sleep" },
  { emoji: "🚶", label: "Walking" },
  { emoji: "🍎", label: "Nutrition" },
  { emoji: "⚡", label: "Vitality" },
  { emoji: "🌿", label: "Nature" },
  { emoji: "🎯", label: "Focus" },
  { emoji: "☕", label: "Recharge" },
  { emoji: "🧠", label: "Study" },
  { emoji: "🔥", label: "Discipline" },
  { emoji: "🎨", label: "Art" },
  { emoji: "🧹", label: "Organize" },
];

// P0-T3: typed as HabitCategory so the form and the schema cannot drift apart
// again. These four ARE the canonical list — the previous divergence is exactly
// what forced the `| (string & {})` escape hatch off `Habit.category`.
export const DOMAINS: { id: HabitCategory; label: string; color: string; bg: string }[] = [
  { id: "Mindful Focus", label: "Mindful Focus", color: "text-secondary border-secondary/30", bg: "bg-secondary-container text-on-secondary-container" },
  { id: "Vitality & Fitness", label: "Vitality & Fitness", color: "text-primary border-primary/30", bg: "bg-primary text-on-primary" },
  { id: "Renewal & Health", label: "Renewal & Health", color: "text-tertiary border-tertiary/30", bg: "bg-tertiary-container text-on-tertiary-container" },
  { id: "Craft & Skill", label: "Craft & Skill", color: "text-slate-300 border-slate-500/30", bg: "bg-surface-container-high text-on-surface" },
];

export const TIME_ANCHORS = [
  { id: "morning", label: "Morning", sub: "06:00 - 12:00" },
  { id: "afternoon", label: "Afternoon", sub: "12:00 - 18:00" },
  { id: "evening", label: "Evening", sub: "18:00 - 23:00" },
  { id: "anytime", label: "Anytime", sub: "Flexible flow" },
] as const;

export const PRIORITIES = [
  { id: "critical", label: "Critical", emoji: "🔴" },
  { id: "focus", label: "Focus", emoji: "🟡" },
  { id: "optional", label: "Optional", emoji: "🟢" },
] as const;

/** The ten swatch colour values, shared so create and edit offer the same set. */
export const HABIT_SWATCH_COLORS = [
  "#10B981", "#2563EB", "#8B5CF6", "#F59E0B", "#06B6D4", "#EC4899", "#9333EA", "#EF4444", "#84CC16", "#F97316",
];
