"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { db, type ScheduleBlock } from "@/lib/db";
import { getJourneyDayNumber, getDateForJourneyDay } from "@/lib/utils/journey";
import { syncCurrentScheduleToNative } from "@/lib/utils/android-bridge";
import { EditHourModal } from "@/components/planner/edit-hour-modal";
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  Brain,
  Heart,
  MessageSquare,
  Coffee,
  Moon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Flame,
} from "lucide-react";

export default function PlannerPage() {
  const { user, fetchUser } = useUserStore();
  const { habits, fetchHabits } = useHabitStore();

  const [currentHour, setCurrentHour] = useState<number>(() => new Date().getHours());
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [editingHour, setEditingHour] = useState<number>(9);

  // Live timer for current minute and hour
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const loadBlocks = useCallback(async (dateStr: string) => {
    try {
      const dayBlocks = await db.scheduleBlocks.where("date").equals(dateStr).toArray();
      setBlocks(dayBlocks);
    } catch (err) {
      console.error("Failed to load blocks:", err);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchHabits(user?.id || "default", selectedDate);
    loadBlocks(selectedDate);
  }, [selectedDate, fetchUser, fetchHabits, loadBlocks, user?.id]);

  // Build full 24 hours array
  const full24Hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, h) => {
      const sTime = `${String(h).padStart(2, "0")}:00`;
      const eTime = `${String((h + 1) % 24 === 0 ? 24 : h + 1).padStart(2, "0")}:00`;
      const matching = blocks.find((b) => {
        const sH = parseInt(b.startTime.split(":")[0], 10);
        let eH = parseInt(b.endTime.split(":")[0], 10);
        if (b.endTime === "24:00" || (eH === 0 && sH > 0)) eH = 24;
        return h >= sH && h < eH;
      });

      let defaultTitle = "Deep Focus Block";
      let defaultCat = "work";
      if (h < 6 || h >= 23) {
        defaultTitle = h === 23 ? "Wind Down & Sleep" : "Deep Obsidian Rest";
        defaultCat = "sleep";
      } else if (h in [6, 7]) {
        defaultTitle = "Morning Priming & Vitality";
        defaultCat = "vitality";
      } else if (h in [12, 13]) {
        defaultTitle = "Mindful Recovery & Lunch";
        defaultCat = "renewal";
      } else if (h in [17, 18]) {
        defaultTitle = "Active Sync & Movement";
        defaultCat = "sync";
      }

      return {
        hour: h,
        startTime: sTime,
        endTime: eTime,
        block: matching || null,
        title: matching?.title || defaultTitle,
        category: matching?.category || defaultCat,
        isCustom: !!matching,
        status: matching?.status || (h < currentHour ? "completed" : "planned"),
      };
    });
  }, [blocks, currentHour]);

  // 7-day horizontal selector strip
  const weekDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - today.getDay() + 1 + i); // Mon..Sun
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.getDate();
      const isToday = dateStr === today.toISOString().split("T")[0];
      return { dateStr, dayName, dayNum, isToday };
    });
  }, []);

  // Category summary counts
  const categoryStats = useMemo(() => {
    let focusH = 0;
    let vitalityH = 0;
    let syncH = 0;
    let renewalH = 0;
    let restH = 0;

    full24Hours.forEach((h) => {
      const c = h.category.toLowerCase();
      if (c.includes("sleep") || c.includes("rest")) restH++;
      else if (c.includes("vitality") || c.includes("habit")) vitalityH++;
      else if (c.includes("sync") || c.includes("meeting")) syncH++;
      else if (c.includes("renewal") || c.includes("buffer")) renewalH++;
      else focusH++;
    });

    return { focusH, vitalityH, syncH, renewalH, restH };
  }, [full24Hours]);

  const handleOpenHour = (hour: number, block?: ScheduleBlock | null) => {
    setEditingHour(hour);
    setEditingBlock(block || null);
    setIsEditModalOpen(true);
  };

  const handleSaveBlock = async (data: {
    id?: string;
    title: string;
    category: string;
    startTime: string;
    endTime: string;
    date: string;
    status?: "planned" | "completed" | "skipped";
    habitId?: string;
  }) => {
    const blockStatus = data.status === "completed" ? "completed" : data.status === "skipped" ? "missed" : "pending";
    if (data.id) {
      await db.scheduleBlocks.update(data.id, {
        title: data.title,
        category: data.category as any,
        startTime: data.startTime,
        endTime: data.endTime,
        status: blockStatus,
        tag: data.habitId,
      });
    } else {
      await db.scheduleBlocks.add({
        id: crypto.randomUUID(),
        userId: user?.id || "default",
        title: data.title,
        category: data.category as any,
        startTime: data.startTime,
        endTime: data.endTime,
        date: data.date,
        status: blockStatus,
        tag: data.habitId,
        isCommitted: true,
        createdAt: new Date().toISOString(),
      });
    }
    await loadBlocks(selectedDate);
    syncCurrentScheduleToNative();
  };

  const handleDeleteBlock = async (id: string) => {
    await db.scheduleBlocks.delete(id);
    await loadBlocks(selectedDate);
    syncCurrentScheduleToNative();
  };

  const getCatStyle = (cat: string) => {
    const c = (cat || "").toLowerCase();
    if (c.includes("sleep") || c.includes("rest")) {
      return { label: "Rest", Icon: Moon, color: "text-indigo-400", bg: "bg-indigo-500/15 border-indigo-500/30" };
    }
    if (c.includes("vitality") || c.includes("habit")) {
      return { label: "Vitality", Icon: Heart, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" };
    }
    if (c.includes("sync") || c.includes("meeting")) {
      return { label: "Sync", Icon: MessageSquare, color: "text-sky-400", bg: "bg-sky-500/15 border-sky-500/30" };
    }
    if (c.includes("renewal") || c.includes("buffer")) {
      return { label: "Renewal", Icon: Coffee, color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" };
    }
    return { label: "Focus", Icon: Brain, color: "text-primary", bg: "bg-primary/15 border-primary/30" };
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-16 pt-2 space-y-5">
      {/* 7-Day Horizontal Date Selector Strip */}
      <div className="flex items-center justify-between gap-1.5 p-1.5 bg-surface-container-low rounded-2xl border border-outline/10">
        {weekDays.map((day) => {
          const isSelected = selectedDate === day.dateStr;
          return (
            <button
              key={day.dateStr}
              onClick={() => setSelectedDate(day.dateStr)}
              className={`flex-1 py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 transition-all ${
                isSelected
                  ? "bg-primary text-on-primary font-bold shadow-md shadow-primary/20 scale-105"
                  : "hover:bg-surface-container/60 text-on-surface-variant"
              }`}
            >
              <span className="text-[10px] font-mono uppercase">{day.dayName}</span>
              <span className={`text-sm font-bold font-mono ${isSelected ? "text-on-primary" : "text-on-surface"}`}>
                {day.dayNum}
              </span>
              {day.isToday && (
                <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-on-primary" : "bg-primary"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* 24-Hour Category Balance Glance Bar */}
      <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline/10 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-on-surface flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            24h Cadence Distribution
          </span>
          <span className="font-mono text-[11px] text-on-surface-variant">
            {categoryStats.focusH}h Focus • {categoryStats.restH}h Rest
          </span>
        </div>

        {/* Proportional Balance Bar */}
        <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden flex gap-0.5">
          <div style={{ width: `${(categoryStats.focusH / 24) * 100}%` }} className="bg-primary h-full" title="Focus" />
          <div style={{ width: `${(categoryStats.vitalityH / 24) * 100}%` }} className="bg-emerald-400 h-full" title="Vitality" />
          <div style={{ width: `${(categoryStats.syncH / 24) * 100}%` }} className="bg-sky-400 h-full" title="Sync" />
          <div style={{ width: `${(categoryStats.renewalH / 24) * 100}%` }} className="bg-amber-400 h-full" title="Renewal" />
          <div style={{ width: `${(categoryStats.restH / 24) * 100}%` }} className="bg-indigo-500 h-full" title="Rest" />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant px-1 pt-0.5">
          <span className="flex items-center gap-1 text-primary">● Focus</span>
          <span className="flex items-center gap-1 text-emerald-400">● Vitality</span>
          <span className="flex items-center gap-1 text-sky-400">● Sync</span>
          <span className="flex items-center gap-1 text-amber-400">● Renewal</span>
          <span className="flex items-center gap-1 text-indigo-400">● Rest</span>
        </div>
      </div>

      {/* 24-Hour Chrono Stream Timeline */}
      <div className="space-y-2.5 relative">
        {/* Continuous vertical timeline connector line */}
        <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-indigo-500 via-primary to-indigo-500/40 -z-0" />

        {full24Hours.map((slot) => {
          const isCurrent = slot.hour === currentHour;
          const isPast = slot.hour < currentHour;
          const cat = getCatStyle(slot.category);
          const CatIcon = cat.Icon;

          return (
            <div
              key={slot.hour}
              onClick={() => handleOpenHour(slot.hour, slot.block)}
              className={`relative z-10 flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all active:scale-[0.99] border ${
                isCurrent
                  ? "bg-surface-container border-2 border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/30"
                  : slot.isCustom
                  ? "bg-surface-container-low hover:bg-surface-container border-outline/15"
                  : "bg-surface-container-lowest/60 hover:bg-surface-container-low border-outline/5 opacity-80"
              }`}
            >
              {/* Hour Dial Circle */}
              <div className="relative flex flex-col items-center justify-center shrink-0 w-14">
                <span className={`text-xs font-mono font-bold ${isCurrent ? "text-primary" : "text-on-surface"}`}>
                  {String(slot.hour).padStart(2, "0")}:00
                </span>
                {isCurrent && (
                  <span className="text-[9px] font-mono px-1 rounded bg-primary text-on-primary font-bold mt-0.5">
                    NOW
                  </span>
                )}
              </div>

              {/* Status Dot / Category Icon */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cat.bg} ${cat.color}`}
              >
                <CatIcon className="w-4 h-4" />
              </div>

              {/* Title and Category */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-semibold truncate ${isCurrent ? "text-white font-bold" : "text-on-surface"}`}>
                    {slot.title}
                  </h4>
                  {slot.isCustom && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-mono text-on-surface-variant">
                    {slot.startTime} - {slot.endTime}
                  </span>
                  <span className="text-on-surface-variant/40">•</span>
                  <span className={`text-[10px] font-mono font-semibold ${cat.color}`}>
                    {cat.label}
                  </span>
                </div>
              </div>

              {/* Completion Indicator */}
              {slot.block?.status === "completed" || (isPast && !slot.isCustom && slot.category === "sleep") ? (
                <div className="shrink-0 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Floating Add Task Button */}
      <button
        onClick={() => handleOpenHour(currentHour, null)}
        className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-primary text-on-primary shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        title="Plan Hour Block"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Edit Hour Modal Sheet */}
      <EditHourModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveBlock}
        onDelete={handleDeleteBlock}
        initialHour={editingHour}
        initialDate={selectedDate}
        existingBlock={editingBlock}
      />
    </div>
  );
}
