"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, X } from "lucide-react";
import type { InboxItem } from "@/lib/db";
import { suggestStartHour, upcomingDays } from "@/lib/utils/inbox";
import { labelFromMinutes } from "@/lib/utils/block-resize";

/**
 * B14 — "Add to plan": the picker that turns a captured thought into a real
 * schedule block. The user picks the day and the starting hour (owner choice,
 * Option A); the block is one hour long, untitled beyond the capture itself,
 * and lands with no category so the schedule screens infer one for display
 * exactly as they do for planner-typed blocks.
 */

/** The strip shows a week; a capture is a near-term decision, not a calendar. */
const DAY_COUNT = 7;

interface InboxPlanModalProps {
  item: InboxItem;
  onClose: () => void;
  onConfirm: (item: InboxItem, dateStr: string, startHour: number) => Promise<void>;
}

export function InboxPlanModal({ item, onClose, onConfirm }: InboxPlanModalProps) {
  // This modal mounts only on a user tap inside a client-only section, so
  // reading the device clock here cannot hit an SSR hydration frame.
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const days = useMemo(() => upcomingDays(DAY_COUNT, todayStr), [todayStr]);
  const [dateStr, setDateStr] = useState(todayStr);
  // The initial hour is device-derived, but this modal only mounts after a
  // user tap inside a client-only section — there is no SSR frame to mismatch.
  const [startHour, setStartHour] = useState(() => suggestStartHour(todayStr, todayStr, new Date()));
  const [saving, setSaving] = useState(false);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, h) => h), []);
  const startTime = labelFromMinutes(startHour * 60);
  const endTime = labelFromMinutes(Math.min(startHour + 1, 24) * 60);

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onConfirm(item, dateStr, startHour);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-label={`Plan "${item.title}"`}
        className="w-full sm:max-w-md bg-surface-container-low rounded-t-3xl sm:rounded-3xl border border-primary/20 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
              Add to plan
            </p>
            <p className="text-sm font-bold text-on-surface truncate mt-0.5">{item.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-outline/15 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Day strip */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant/60 px-1">
            Which day
          </span>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => (
              <button
                key={day.date}
                type="button"
                onClick={() => setDateStr(day.date)}
                aria-pressed={dateStr === day.date}
                aria-label={day.isToday ? `Today, ${day.date}` : `${day.weekday} ${day.dayOfMonth}`}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition-colors cursor-pointer ${
                  dateStr === day.date
                    ? "bg-primary text-on-primary border-primary/50 font-bold"
                    : "bg-surface-container border-outline/15 text-on-surface-variant hover:border-primary/40 hover:text-on-surface"
                }`}
              >
                <span className="text-[9px] font-mono leading-none opacity-80">{day.weekday}</span>
                <span className="text-sm font-mono leading-tight">{day.dayOfMonth}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hour picker */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant/60 px-1">
            Start hour
          </span>
          <div className="grid grid-cols-6 gap-1.5">
            {hours.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setStartHour(h)}
                aria-pressed={startHour === h}
                aria-label={`${String(h).padStart(2, "0")}:00`}
                className={`h-9 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
                  startHour === h
                    ? "bg-primary text-on-primary border-primary/50 font-bold"
                    : "bg-surface-container border-outline/15 text-on-surface-variant hover:border-primary/40 hover:text-on-surface"
                }`}
              >
                {String(h).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] font-mono text-on-surface-variant/70 px-1">
          {dateStr} · {startTime}–{endTime} · 1 hour
        </p>

        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <CalendarPlus className="w-4 h-4" />
          {saving ? "Adding…" : "Add to plan"}
        </button>
      </div>
    </div>
  );
}
