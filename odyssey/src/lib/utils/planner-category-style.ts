import {
  Clock,
  Moon,
  Heart,
  MessageSquare,
  Coffee,
  Brain,
  type LucideIcon,
} from "lucide-react";

export interface CategoryStyle {
  label: string;
  Icon: LucideIcon;
  color: string;
  badgeBg: string;
  cardBorder: string;
  cardBg: string;
  leftBorder: string;
  accentGlow: string;
}

/**
 * Category styling for one hour block in the Planner.
 *
 * Every value carries an explicit light and dark pair. Light mode uses
 * 50-scale tint and 600-scale text shade; dark keeps original values.
 */
export function getPlannerCatStyle(cat: string, isCustom: boolean): CategoryStyle {
  if (!isCustom || !cat) {
    return {
      label: "Open Slot",
      Icon: Clock,
      color: "text-on-surface-variant/60 dark:text-on-surface-variant/40",
      badgeBg:
        "bg-surface-container-lowest border border-outline/20 text-on-surface-variant/60 dark:border-outline/[0.06] dark:text-on-surface-variant/40",
      cardBorder:
        "border-dashed border-outline/25 hover:border-primary/50 dark:border-outline/[0.08] dark:hover:border-primary/40",
      cardBg:
        "bg-surface-container-low/70 hover:bg-surface-container-low dark:bg-surface-container-low/40 dark:hover:bg-surface-container-low/70",
      leftBorder: "border-l-transparent",
      accentGlow: "",
    };
  }
  const c = cat.toLowerCase();
  if (c.includes("sleep") || c.includes("rest")) {
    return {
      label: "Rest & Sleep",
      Icon: Moon,
      color: "text-indigo-600 dark:text-indigo-400",
      badgeBg:
        "bg-indigo-500/15 border border-indigo-500/35 text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-400",
      cardBorder:
        "border-indigo-500/30 hover:border-indigo-500/60 dark:border-indigo-500/25 dark:hover:border-indigo-500/50",
      cardBg:
        "bg-indigo-50/70 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30",
      leftBorder: "border-l-indigo-500",
      accentGlow: "shadow-[0_0_16px_rgba(99,102,241,0.15)]",
    };
  }
  if (c.includes("vitality") || c.includes("habit") || c.includes("health")) {
    return {
      label: "Vitality",
      Icon: Heart,
      color: "text-emerald-600 dark:text-emerald-400",
      badgeBg:
        "bg-emerald-500/15 border border-emerald-500/35 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400",
      cardBorder:
        "border-emerald-500/30 hover:border-emerald-500/60 dark:border-emerald-500/25 dark:hover:border-emerald-500/50",
      cardBg:
        "bg-emerald-50/70 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30",
      leftBorder: "border-l-emerald-500",
      accentGlow: "shadow-[0_0_16px_rgba(52,211,153,0.15)]",
    };
  }
  if (c.includes("sync") || c.includes("meeting") || c.includes("social")) {
    return {
      label: "Active Sync",
      Icon: MessageSquare,
      color: "text-sky-600 dark:text-sky-400",
      badgeBg:
        "bg-sky-500/15 border border-sky-500/35 text-sky-600 dark:border-sky-500/30 dark:text-sky-400",
      cardBorder:
        "border-sky-500/30 hover:border-sky-500/60 dark:border-sky-500/25 dark:hover:border-sky-500/50",
      cardBg:
        "bg-sky-50/70 hover:bg-sky-50 dark:bg-sky-950/20 dark:hover:bg-sky-950/30",
      leftBorder: "border-l-sky-500",
      accentGlow: "shadow-[0_0_16px_rgba(56,189,248,0.15)]",
    };
  }
  if (c.includes("renewal") || c.includes("buffer") || c.includes("leisure")) {
    return {
      label: "Renewal",
      Icon: Coffee,
      color: "text-amber-700 dark:text-amber-400",
      badgeBg:
        "bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:border-amber-500/30 dark:text-amber-400",
      cardBorder:
        "border-amber-500/35 hover:border-amber-500/65 dark:border-amber-500/25 dark:hover:border-amber-500/50",
      cardBg:
        "bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30",
      leftBorder: "border-l-amber-500",
      accentGlow: "shadow-[0_0_16px_rgba(251,191,36,0.15)]",
    };
  }
  return {
    label: "Deep Focus",
    Icon: Brain,
    color: "text-primary",
    badgeBg: "bg-primary/15 border border-primary/30 text-primary",
    cardBorder:
      "border-primary/35 hover:border-primary/60 dark:border-primary/25 dark:hover:border-primary/50",
    cardBg:
      "bg-primary/5 hover:bg-primary/10 dark:bg-background/80 dark:hover:bg-background/90",
    leftBorder: "border-l-primary",
    accentGlow: "shadow-[0_0_16px_rgba(108,0,255,0.15)]",
  };
}
