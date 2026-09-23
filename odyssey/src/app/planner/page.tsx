"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { db, type ScheduleBlock } from "@/lib/db";
import { getJourneyDayNumber, getDateForJourneyDay } from "@/lib/utils/journey";
import { syncCurrentScheduleToNative } from "@/lib/utils/android-bridge";
import { EditHourModal } from "@/components/planner/edit-hour-modal";
import { DistributionModal } from "@/components/planner/distribution-modal";
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

  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [currentHour, setCurrentHour] = useState<number>(() => new Date().getHours());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const d = p.get("date");
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    }
    return getLocalDateStr();
  });
  const [todayStr, setTodayStr] = useState<string>(() => getLocalDateStr());
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDistributionModalOpen, setIsDistributionModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [editingHour, setEditingHour] = useState<number>(9);

  // Sync selectedDate if query param changes or on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const d = p.get("date");
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        setSelectedDate(d);
      }
    }
  }, []);

  // Live timer for current minute, hour, and date change
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentHour(now.getHours());
      setTodayStr(getLocalDateStr(now));
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

  // Build full 24 hours array (Unscheduled hours remain EMPTY - no fake titles)
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

      return {
        hour: h,
        startTime: sTime,
        endTime: eTime,
        block: matching || null,
        title: matching ? matching.title : "", // KEEP EMPTY IF NOT WRITTEN BY USER!
        category: matching ? matching.category : "",
        isCustom: !!matching,
        status: matching?.status || "pending",
      };
    });
  }, [blocks]);

  // 7-day horizontal selector strip centered around the selected date's week
  const weekDays = useMemo(() => {
    const [y, m, dNum] = (selectedDate || todayStr).split("-").map(Number);
    const refDate = new Date(y, m - 1, dNum);
    const dayOfWeek = (refDate.getDay() + 6) % 7; // Mon=0..Sun=6
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(refDate);
      d.setDate(refDate.getDate() - dayOfWeek + i);
      const dateStr = getLocalDateStr(d);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.getDate();
      const isToday = dateStr === todayStr;
      return { dateStr, dayName, dayNum, isToday };
    });
  }, [selectedDate, todayStr]);

  const isSelectedToday = selectedDate === todayStr;
  const isSelectedPastDay = selectedDate < todayStr;

  // Category summary counts - strictly from user scheduled blocks!
  const categoryStats = useMemo(() => {
    let focusH = 0;
    let vitalityH = 0;
    let syncH = 0;
    let renewalH = 0;
    let restH = 0;

    full24Hours.forEach((h) => {
      if (!h.isCustom) return; // Do NOT count unwritten hours!
      const c = (h.category || "").toLowerCase();
      if (c.includes("sleep") || c.includes("rest")) restH++;
      else if (c.includes("vitality") || c.includes("habit")) vitalityH++;
      else if (c.includes("sync") || c.includes("meeting")) syncH++;
      else if (c.includes("renewal") || c.includes("buffer")) renewalH++;
      else focusH++;
    });

    const plannedTotal = focusH + vitalityH + syncH + renewalH + restH;
    return { focusH, vitalityH, syncH, renewalH, restH, plannedTotal };
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

  const getCatStyle = (cat: string, isCustom: boolean) => {
    if (!isCustom || !cat) {
      return {
        label: "Open Slot",
        Icon: Plus,
        color: "text-on-surface-variant/40",
        badgeBg: "bg-surface-container-lowest border-outline/10 text-on-surface-variant/40",
        cardBorder: "border-dashed border-outline/15 hover:border-primary/40",
        cardBg: "bg-surface-container-lowest/30 hover:bg-surface-container-lowest/70",
        accent: "border-outline/10",
      };
    }
    const c = cat.toLowerCase();
    if (c.includes("sleep") || c.includes("rest")) {
      return {
        label: "Rest & Sleep",
        Icon: Moon,
        color: "text-indigo-400",
        badgeBg: "bg-indigo-500/15 border-indigo-500/30 text-indigo-400",
        cardBorder: "border-indigo-500/35 hover:border-indigo-500/60",
        cardBg: "bg-indigo-950/25 hover:bg-indigo-950/35",
        accent: "border-indigo-500/40",
      };
    }
    if (c.includes("vitality") || c.includes("habit")) {
      return {
        label: "Vitality",
        Icon: Heart,
        color: "text-emerald-400",
        badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
        cardBorder: "border-emerald-500/35 hover:border-emerald-500/60",
        cardBg: "bg-emerald-950/25 hover:bg-emerald-950/35",
        accent: "border-emerald-500/40",
      };
    }
    if (c.includes("sync") || c.includes("meeting")) {
      return {
        label: "Active Sync",
        Icon: MessageSquare,
        color: "text-sky-400",
        badgeBg: "bg-sky-500/15 border-sky-500/30 text-sky-400",
        cardBorder: "border-sky-500/35 hover:border-sky-500/60",
        cardBg: "bg-sky-950/25 hover:bg-sky-950/35",
        accent: "border-sky-500/40",
      };
    }
    if (c.includes("renewal") || c.includes("buffer")) {
      return {
        label: "Renewal",
        Icon: Coffee,
        color: "text-amber-400",
        badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
        cardBorder: "border-amber-500/35 hover:border-amber-500/60",
        cardBg: "bg-amber-950/25 hover:bg-amber-950/35",
        accent: "border-amber-500/40",
      };
    }
    return {
      label: "Deep Work",
      Icon: Brain,
      color: "text-primary",
      badgeBg: "bg-primary/15 border-primary/30 text-primary",
      cardBorder: "border-primary/35 hover:border-primary/60",
      cardBg: "bg-[#0d1d24] hover:bg-[#12252e]",
      accent: "border-primary/40",
    };
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-20 pt-2 space-y-4">
      {/* Non-Today Indicator Banner */}
      {!isSelectedToday && (
        <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-surface-container-low border border-primary/20 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 font-mono text-on-surface-variant text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-[11px] font-mono font-bold hover:bg-primary/30 active:scale-95 transition-all cursor-pointer"
          >
            Back to Today
          </button>
        </div>
      )}

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

      {/* 24-Hour Category Distribution Box (Tappable for breakdown pop-up) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsDistributionModalOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsDistributionModalOpen(true);
          }
        }}
        className="p-3.5 rounded-2xl bg-surface-container-low border border-outline/10 hover:border-outline/25 active:scale-[0.99] transition-all cursor-pointer space-y-2.5 group"
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-on-surface flex items-center gap-1.5 group-hover:text-primary transition-colors">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Daily Schedule</span>
          </span>
          <div className="flex items-center gap-1 font-mono text-on-surface-variant text-[11px]">
            <span>Scheduled: {categoryStats.plannedTotal} Hours</span>
            <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant/60 group-hover:text-primary transition-colors" />
          </div>
        </div>

        {/* Proportional Balance Bar */}
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
      </div>

      {/* 24-Hour Chrono Stream Timeline (Blocked by category type, no central cutting line) */}
      <div className="flex flex-col">
        {full24Hours.map((slot, index) => {
          const isCurrent = isSelectedToday && slot.hour === currentHour;
          const isPast = isSelectedPastDay || (isSelectedToday && slot.hour < currentHour);
          const cat = getCatStyle(slot.category, slot.isCustom);
          const CatIcon = cat.Icon;

          const prevSlot = index > 0 ? full24Hours[index - 1] : null;
          const nextSlot = index < 23 ? full24Hours[index + 1] : null;

          const isSameBlockAsPrev = Boolean(
            slot.isCustom &&
            prevSlot?.isCustom &&
            (slot.block?.id === prevSlot?.block?.id || (slot.category === prevSlot?.category && slot.title === prevSlot?.title))
          );
          const isSameBlockAsNext = Boolean(
            slot.isCustom &&
            nextSlot?.isCustom &&
            (slot.block?.id === nextSlot?.block?.id || (slot.category === nextSlot?.category && slot.title === nextSlot?.title))
          );

          let roundStyle = "rounded-2xl my-1";
          if (isSameBlockAsPrev && isSameBlockAsNext) {
            roundStyle = "rounded-none border-t-0 border-b-0 -mt-px";
          } else if (isSameBlockAsPrev && !isSameBlockAsNext) {
            roundStyle = "rounded-b-2xl rounded-t-none border-t-0 -mt-px mb-2";
          } else if (!isSameBlockAsPrev && isSameBlockAsNext) {
            roundStyle = "rounded-t-2xl rounded-b-none border-b-0 mt-2";
          }

          return (
            <div
              key={slot.hour}
              onClick={() => handleOpenHour(slot.hour, slot.block)}
              className={`group flex items-center gap-3 p-3 cursor-pointer transition-all active:scale-[0.99] border ${cat.cardBorder} ${cat.cardBg} ${roundStyle} ${
                isCurrent
                  ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(90,240,179,0.22)] bg-[#172033] relative z-20"
                  : ""
              }`}
            >
              {/* Left Side: Hour Time Indicator (ONLY time displayed) */}
              <div className="flex flex-col items-center justify-center shrink-0 w-12 text-center">
                <span className={`text-xs font-mono font-bold ${isCurrent ? "text-primary" : slot.isCustom ? "text-on-surface" : "text-on-surface-variant/50"}`}>
                  {String(slot.hour).padStart(2, "0")}:00
                </span>
                {isCurrent && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary text-[#003825] font-bold mt-0.5 shadow-sm">
                    NOW
                  </span>
                )}
              </div>

              {/* Status Dot / Category Icon */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cat.badgeBg}`}
              >
                <CatIcon className="w-4 h-4" />
              </div>

              {/* Title and Category Tag (NO duplicate time below title) */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {slot.isCustom && slot.title ? (
                    <h4 className={`text-sm font-semibold truncate ${isCurrent ? "text-white font-bold" : "text-on-surface"}`}>
                      {slot.title}
                    </h4>
                  ) : (
                    <h4 className="text-xs font-mono text-on-surface-variant/40 italic">
                      Empty Slot
                    </h4>
                  )}
                  {slot.isCustom && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </div>

                {/* Subtext: ONLY category / tag, NO duplicate start-end time below */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  {slot.isCustom ? (
                    <>
                      <span className={`text-[10px] font-mono font-semibold ${cat.color}`}>
                        {cat.label}
                      </span>
                      {slot.block?.description && (
                        <>
                          <span className="text-on-surface-variant/30">•</span>
                          <span className="text-[10px] font-mono text-on-surface-variant truncate">
                            {slot.block.description}
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] font-mono text-on-surface-variant/35 group-hover:text-primary transition-colors flex items-center gap-1">
                      + Tap to schedule
                    </span>
                  )}
                </div>
              </div>

              {/* Completion Indicator */}
              {slot.block?.status === "completed" ? (
                <div className="shrink-0 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : slot.isCustom ? (
                <div className="shrink-0 text-on-surface-variant/30 group-hover:text-primary transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>


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

      {/* Distribution Detail Pop-up */}
      <DistributionModal
        isOpen={isDistributionModalOpen}
        onClose={() => setIsDistributionModalOpen(false)}
        dateStr={selectedDate}
        categoryStats={categoryStats}
        blocks={blocks}
      />
    </div>
  );
}
