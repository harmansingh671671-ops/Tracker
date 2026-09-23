"use client";

import React from "react";
import {
  Brain,
  Dumbbell,
  Droplet,
  BookOpen,
  Code2,
  PenTool,
  Music,
  Activity,
  Sun,
  Moon,
  Flame,
  Sparkles,
  Coffee,
  Heart,
  Target,
  Zap,
  Apple,
  Footprints,
  Leaf,
  CheckCircle2,
} from "lucide-react";

// Mapping of string identifiers to Lucide icons
const LUCIDE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dumbbell: Dumbbell,
  gym: Dumbbell,
  workout: Dumbbell,
  fitness: Dumbbell,
  lift: Dumbbell,
  water: Droplet,
  droplet: Droplet,
  hydrate: Droplet,
  hydration: Droplet,
  book: BookOpen,
  read: BookOpen,
  reading: BookOpen,
  study: BookOpen,
  code: Code2,
  coding: Code2,
  dev: Code2,
  terminal: Code2,
  journal: PenTool,
  journaling: PenTool,
  write: PenTool,
  writing: PenTool,
  music: Music,
  guitar: Music,
  song: Music,
  run: Activity,
  running: Activity,
  jog: Activity,
  walk: Footprints,
  walking: Footprints,
  steps: Footprints,
  sun: Sun,
  morning: Sun,
  dawn: Sun,
  moon: Moon,
  sleep: Moon,
  bed: Moon,
  rest: Moon,
  flame: Flame,
  fire: Flame,
  streak: Flame,
  sparkles: Sparkles,
  magic: Sparkles,
  coffee: Coffee,
  tea: Coffee,
  break: Coffee,
  heart: Heart,
  health: Heart,
  vitality: Heart,
  meditate: Brain,
  meditation: Brain,
  mind: Brain,
  brain: Brain,
  zen: Brain,
  yoga: Brain,
  apple: Apple,
  food: Apple,
  diet: Apple,
  nutrition: Apple,
  nature: Leaf,
  leaf: Leaf,
  target: Target,
  goal: Target,
  zap: Zap,
  energy: Zap,
};

// Emoji keywords fallback map
const EMOJI_KEYWORD_MAP: [string[], string][] = [
  [["meditat", "mind", "zen", "yoga", "breath", "brain"], "🧘"],
  [["water", "hydro", "hydrate", "drink"], "💧"],
  [["gym", "fitness", "workout", "lift", "dumbbell"], "🏋️"],
  [["read", "book", "study", "learn"], "📖"],
  [["code", "terminal", "dev", "program", "software"], "💻"],
  [["write", "writing", "journal", "note"], "✍️"],
  [["music", "guitar", "song", "piano", "instrument"], "🎸"],
  [["run", "running", "jog", "cardio"], "🏃"],
  [["walk", "steps", "footsteps"], "🚶"],
  [["sun", "morning", "dawn", "wake", "prime"], "☀️"],
  [["sleep", "bed", "rest", "night", "slumber", "wind down"], "🌙"],
  [["eat", "food", "nutrition", "diet", "meal", "apple"], "🍎"],
  [["nature", "outside", "fresh air", "walk in park"], "🌿"],
  [["energy", "vitality", "power", "bolt"], "⚡"],
  [["fire", "streak", "heat"], "🔥"],
  [["clean", "declutter", "tidy", "organize"], "🧹"],
  [["coffee", "tea", "recharge"], "☕"],
];

export function resolveHabitIconString(icon?: string, name?: string): { isEmoji: boolean; value: string } {
  const raw = (icon || "").trim();
  const rawName = (name || "").toLowerCase().trim();

  if (raw) {
    // Check if it's already an emoji (contains non-ASCII characters or emoji symbols)
    const isAlphanumericOnly = /^[a-zA-Z0-9_\-\s]+$/.test(raw);
    if (!isAlphanumericOnly) {
      return { isEmoji: true, value: raw };
    }

    // Check if it's a known Lucide icon name
    const normalizedKey = raw.toLowerCase().replace(/[\s\-_]/g, "");
    for (const [k] of Object.entries(LUCIDE_ICON_MAP)) {
      if (k === normalizedKey || normalizedKey.includes(k)) {
        return { isEmoji: false, value: k };
      }
    }

    // Check if it matches an emoji keyword
    for (const [keywords, emoji] of EMOJI_KEYWORD_MAP) {
      if (keywords.some((kw) => normalizedKey.includes(kw))) {
        return { isEmoji: true, value: emoji };
      }
    }
  }

  // Fallback to searching the habit name
  if (rawName) {
    for (const [keywords, emoji] of EMOJI_KEYWORD_MAP) {
      if (keywords.some((kw) => rawName.includes(kw))) {
        return { isEmoji: true, value: emoji };
      }
    }
    for (const [k] of Object.entries(LUCIDE_ICON_MAP)) {
      if (rawName.includes(k)) {
        return { isEmoji: false, value: k };
      }
    }
  }

  return { isEmoji: true, value: "🎯" };
}

interface HabitIconProps {
  icon?: string;
  name?: string;
  className?: string;
  emojiClassName?: string;
  size?: number;
}

export function HabitIcon({
  icon,
  name,
  className = "w-5 h-5 text-primary",
  emojiClassName = "text-xl leading-none select-none",
}: HabitIconProps) {
  const resolved = resolveHabitIconString(icon, name);

  if (!resolved.isEmoji) {
    const Component = LUCIDE_ICON_MAP[resolved.value] || Target;
    return <Component className={className} />;
  }

  return (
    <span role="img" aria-label={name || "Habit icon"} className={emojiClassName}>
      {resolved.value}
    </span>
  );
}
