"use client";

import { useMemo } from "react";
import {
  X,
  Clock,
  Brain,
  Zap,
  Users,
  Coffee,
  Moon,
  ChevronRight,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { type ScheduleBlock } from "@/lib/db";

interface CategoryStats {
  focusH: number;
  vitalityH: number;
  syncH: number;
  renewalH: number;
  restH: number;
  plannedTotal: number;
}

interface DistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  categoryStats: CategoryStats;
  blocks?: ScheduleBlock[];
}

export function DistributionModal({
  isOpen,
  onClose,
  dateStr,
  categoryStats,
  blocks = [],
}: DistributionModalProps) {
  const formattedDate = useMemo(() => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [dateStr]);

  const openHours = 24 - categoryStats.plannedTotal;
  const plannedPercent = Math.round((categoryStats.plannedTotal / 24) * 100);

  const categories = [
    {
      id: "focus",
      label: "Deep Work & Focus",
      shortLabel: "Focus",
      hours: categoryStats.focusH,
      color: "text-primary",
      dot: "bg-primary",
      badge: "bg-primary/15 text-primary border-primary/30",
      cardBg: "bg-primary/5 border-primary/20",
      Icon: Brain,
    },
    {
      id: "vitality",
      label: "Vitality & Health",
      shortLabel: "Vitality",
      hours: categoryStats.vitalityH,
      color: "text-emerald-400",
      dot: "bg-emerald-400",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      cardBg: "bg-emerald-950/20 border-emerald-500/20",
      Icon: Zap,
    },
    {
      id: "sync",
      label: "Sync & Collaboration",
      shortLabel: "Sync",
      hours: categoryStats.syncH,
      color: "text-sky-400",
      dot: "bg-sky-400",
      badge: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      cardBg: "bg-sky-950/20 border-sky-500/20",
      Icon: Users,
    },
    {
      id: "renewal",
      label: "Renewal & Mindful Buffer",
      shortLabel: "Renewal",
      hours: categoryStats.renewalH,
      color: "text-amber-400",
      dot: "bg-amber-400",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      cardBg: "bg-amber-950/20 border-amber-500/20",
      Icon: Coffee,
    },
    {
      id: "sleep",
      label: "Rest & Slumber",
      shortLabel: "Rest",
      hours: categoryStats.restH,
      color: "text-indigo-400",
      dot: "bg-indigo-500",
      badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
      cardBg: "bg-indigo-950/20 border-indigo-500/20",
      Icon: Moon,
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-surface-container-high border border-outline/20 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-14 -right-14 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-14 -left-14 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-primary font-mono font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface tracking-tight">
              Day Schedule Distribution
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Card with Proportional Bar */}
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-on-surface-variant">Total Planned</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-primary">
                {categoryStats.plannedTotal} / 24 Hours
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold">
                {plannedPercent}%
              </span>
            </div>
          </div>

          {/* Color Breakdown Strip */}
          <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden flex gap-0.5">
            {categoryStats.plannedTotal > 0 ? (
              <>
                <div style={{ width: `${(categoryStats.focusH / 24) * 100}%` }} className="bg-primary h-full" title="Focus" />
                <div style={{ width: `${(categoryStats.vitalityH / 24) * 100}%` }} className="bg-emerald-400 h-full" title="Vitality" />
                <div style={{ width: `${(categoryStats.syncH / 24) * 100}%` }} className="bg-sky-400 h-full" title="Sync" />
                <div style={{ width: `${(categoryStats.renewalH / 24) * 100}%` }} className="bg-amber-400 h-full" title="Renewal" />
                <div style={{ width: `${(categoryStats.restH / 24) * 100}%` }} className="bg-indigo-500 h-full" title="Rest" />
              </>
            ) : (
              <div className="w-full h-full bg-surface-container-highest/60" />
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant pt-0.5">
            <span>{categoryStats.plannedTotal}h scheduled</span>
            <span>{openHours}h uncommitted</span>
          </div>
        </div>

        {/* Category Breakdown List */}
        <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
          {categories.map((cat) => {
            const IconComponent = cat.Icon;
            const pct = Math.round((cat.hours / 24) * 100);
            const isZero = cat.hours === 0;

            // Find matching blocks for this category to list tasks
            const catBlocks = blocks.filter((b) => {
              const c = (b.category || "").toLowerCase();
              if (cat.id === "focus") return !c.includes("sleep") && !c.includes("rest") && !c.includes("vitality") && !c.includes("sync") && !c.includes("renewal") && !c.includes("buffer");
              if (cat.id === "vitality") return c.includes("vitality") || c.includes("habit");
              if (cat.id === "sync") return c.includes("sync") || c.includes("meeting");
              if (cat.id === "renewal") return c.includes("renewal") || c.includes("buffer");
              if (cat.id === "sleep") return c.includes("sleep") || c.includes("rest");
              return false;
            });

            return (
              <div
                key={cat.id}
                className={`p-3 rounded-2xl border transition-all ${
                  isZero ? "bg-surface-container-low/40 border-outline/5 opacity-60" : `${cat.cardBg}`
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${cat.badge}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-on-surface truncate">
                        {cat.label}
                      </h4>
                      <span className="text-[10px] font-mono text-on-surface-variant">
                        {pct}% of day
                      </span>
                    </div>
                  </div>

                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${cat.badge}`}>
                    {cat.hours} {cat.hours === 1 ? "Hour" : "Hours"}
                  </span>
                </div>

                {/* Task list chips if any */}
                {catBlocks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-white/5">
                    {catBlocks.map((b) => (
                      <span
                        key={b.id}
                        className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-container text-on-surface truncate max-w-[200px]"
                        title={`${b.startTime}-${b.endTime}: ${b.title}`}
                      >
                        <span className="text-on-surface-variant">{b.startTime}</span>
                        <span className="truncate">{b.title}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Open Slots Indicator */}
          <div className="p-3 rounded-2xl bg-surface-container-lowest/50 border border-dashed border-outline/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-on-surface-variant">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-on-surface">Open / Unscheduled</h4>
                <span className="text-[10px] font-mono text-on-surface-variant">
                  {Math.round((openHours / 24) * 100)}% free
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container">
              {openHours} {openHours === 1 ? "Hour" : "Hours"}
            </span>
          </div>
        </div>

        {/* Footer Close Action */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface font-semibold text-xs transition-colors cursor-pointer text-center"
        >
          Close
        </button>
      </div>
    </div>
  );
}
