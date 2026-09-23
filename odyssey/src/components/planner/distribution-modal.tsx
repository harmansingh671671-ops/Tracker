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

  const openHours = Math.max(0, 24 - categoryStats.plannedTotal);
  const plannedPercent = Math.min(100, Math.round((categoryStats.plannedTotal / 24) * 100));

  const items = useMemo(() => {
    const filterCatBlocks = (catId: string) => {
      return blocks.filter((b) => {
        const c = (b.category || "").toLowerCase();
        if (catId === "focus") return !c.includes("sleep") && !c.includes("rest") && !c.includes("vitality") && !c.includes("sync") && !c.includes("renewal") && !c.includes("buffer");
        if (catId === "vitality") return c.includes("vitality") || c.includes("habit");
        if (catId === "sync") return c.includes("sync") || c.includes("meeting");
        if (catId === "renewal") return c.includes("renewal") || c.includes("buffer");
        if (catId === "sleep") return c.includes("sleep") || c.includes("rest");
        return false;
      });
    };

    const list = [
      {
        id: "focus",
        label: "Focus",
        subtitle: "Deep Work",
        hours: categoryStats.focusH,
        pct: Math.round((categoryStats.focusH / 24) * 100),
        badge: "bg-primary/15 text-primary border-primary/30",
        cardBg: "bg-primary/5 border-primary/20",
        Icon: Brain,
        blocks: filterCatBlocks("focus"),
      },
      {
        id: "vitality",
        label: "Vitality",
        subtitle: "Health & Habits",
        hours: categoryStats.vitalityH,
        pct: Math.round((categoryStats.vitalityH / 24) * 100),
        badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        cardBg: "bg-emerald-950/20 border-emerald-500/20",
        Icon: Zap,
        blocks: filterCatBlocks("vitality"),
      },
      {
        id: "sync",
        label: "Sync",
        subtitle: "Meetings & Collab",
        hours: categoryStats.syncH,
        pct: Math.round((categoryStats.syncH / 24) * 100),
        badge: "bg-sky-500/15 text-sky-400 border-sky-500/30",
        cardBg: "bg-sky-950/20 border-sky-500/20",
        Icon: Users,
        blocks: filterCatBlocks("sync"),
      },
      {
        id: "renewal",
        label: "Renewal",
        subtitle: "Buffer & Rest",
        hours: categoryStats.renewalH,
        pct: Math.round((categoryStats.renewalH / 24) * 100),
        badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        cardBg: "bg-amber-950/20 border-amber-500/20",
        Icon: Coffee,
        blocks: filterCatBlocks("renewal"),
      },
      {
        id: "sleep",
        label: "Rest",
        subtitle: "Sleep & Slumber",
        hours: categoryStats.restH,
        pct: Math.round((categoryStats.restH / 24) * 100),
        badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
        cardBg: "bg-indigo-950/20 border-indigo-500/20",
        Icon: Moon,
        blocks: filterCatBlocks("sleep"),
      },
      {
        id: "open",
        label: "Open",
        subtitle: "Unscheduled",
        hours: openHours,
        pct: Math.round((openHours / 24) * 100),
        badge: "bg-surface-container-high text-on-surface-variant border-outline/20",
        cardBg: "bg-surface-container-lowest/40 border-dashed border-outline/20",
        Icon: Clock,
        blocks: [],
      },
    ];

    // Only show types that have > 0 hours for this day
    return list.filter((item) => item.hours > 0);
  }, [categoryStats, blocks, openHours]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-container-lowest/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-surface-container rounded-t-[32px] sm:rounded-[32px] border border-outline/15 shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-6 duration-300"
      >
        {/* Top Drag Handle & Title Bar (Matching Profile & Settings Sheet) */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-1.5 rounded-full bg-outline/20 mb-3" />
          <div className="w-full flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-primary font-mono font-semibold mb-0.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-on-surface">Schedule Distribution</h2>
              <p className="text-xs text-on-surface-variant">Breakdown of planned hours and activities</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overview Banner Card (Styled like Profile Level/XP Card) */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-4 border border-outline/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider">Planned Total</span>
                <div className="text-base font-bold text-on-surface">
                  {categoryStats.plannedTotal} <span className="text-xs font-normal text-on-surface-variant">/ 24 Hours</span>
                </div>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-primary/20 text-primary border border-primary/30">
              {plannedPercent}% Planned
            </span>
          </div>

          {/* Color Breakdown Strip */}
          <div className="space-y-1.5 pt-1">
            <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden flex gap-0.5">
              {categoryStats.plannedTotal > 0 ? (
                <>
                  <div style={{ width: `${(categoryStats.focusH / 24) * 100}%` }} className="bg-primary h-full transition-all duration-300" title="Focus" />
                  <div style={{ width: `${(categoryStats.vitalityH / 24) * 100}%` }} className="bg-emerald-400 h-full transition-all duration-300" title="Vitality" />
                  <div style={{ width: `${(categoryStats.syncH / 24) * 100}%` }} className="bg-sky-400 h-full transition-all duration-300" title="Sync" />
                  <div style={{ width: `${(categoryStats.renewalH / 24) * 100}%` }} className="bg-amber-400 h-full transition-all duration-300" title="Renewal" />
                  <div style={{ width: `${(categoryStats.restH / 24) * 100}%` }} className="bg-indigo-500 h-full transition-all duration-300" title="Rest" />
                </>
              ) : (
                <div className="w-full h-full bg-surface-container-highest/60" />
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
              <span>{categoryStats.plannedTotal} Hours planned</span>
              <span>{openHours} Hours free</span>
            </div>
          </div>
        </div>

        {/* 2-Column Grid Distribution Cards */}
        {items.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {items.map((item, idx) => {
              const IconComp = item.Icon;
              const isLastOdd = items.length % 2 === 1 && idx === items.length - 1;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                    isLastOdd ? "col-span-2" : "col-span-1"
                  } ${item.cardBg}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${item.badge}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${item.badge}`}>
                        {item.hours}h
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-on-surface truncate">{item.label}</h4>
                      <p className="text-[10px] text-on-surface-variant truncate">{item.subtitle}</p>
                      <span className="text-[10px] font-mono text-on-surface-variant/80 mt-0.5 block">
                        {item.pct}% of day
                      </span>
                    </div>
                  </div>

                  {/* Task preview chips */}
                  {item.blocks.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1">
                      {item.blocks.slice(0, 2).map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high/80 text-on-surface truncate"
                          title={`${b.startTime}: ${b.title}`}
                        >
                          <span className="text-on-surface-variant shrink-0">{b.startTime}</span>
                          <span className="truncate">{b.title}</span>
                        </div>
                      ))}
                      {item.blocks.length > 2 && (
                        <div className="text-[9px] font-mono text-on-surface-variant px-1">
                          +{item.blocks.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-surface-container-low border border-outline/10 text-center space-y-1">
            <p className="text-xs font-semibold text-on-surface">No hours planned</p>
            <p className="text-[11px] text-on-surface-variant">Tap hours on the schedule to plan your day</p>
          </div>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-semibold text-xs transition-colors cursor-pointer text-center"
        >
          Close
        </button>
      </div>
    </div>
  );
}
