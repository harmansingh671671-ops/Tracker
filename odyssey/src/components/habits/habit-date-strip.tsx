"use client";

import React, { useMemo } from "react";
import { type Habit, type HabitLog } from "@/lib/db";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

interface HabitDateStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  habits: Habit[];
  logsByDate?: Record<string, Record<string, HabitLog>>; // date -> { habitId: HabitLog }
  todayLogs?: Record<string, HabitLog>;
}

// Category color palette matching Odyssey design tokens
const CATEGORY_COLORS: Record<string, string> = {
  Health: "#34d399", // Emerald
  Mindfulness: "#818cf8", // Indigo
  Learning: "#60a5fa", // Sky Blue
  Productivity: "#fbbf24", // Amber
  Social: "#f472b6", // Rose Pink
  growth: "#a78bfa", // Purple
  work: "#5af0b3", // Primary Mint
  health: "#34d399",
};

export function HabitDateStrip({
  selectedDate,
  onSelectDate,
  habits,
  logsByDate = {},
  todayLogs = {},
}: HabitDateStripProps) {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Generate 7 days centered around selectedDate or today
  const days = useMemo(() => {
    const base = new Date(selectedDate || todayStr);
    const result: { dateStr: string; dayNum: number; dayName: string; isToday: boolean; isSelected: boolean }[] = [];

    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dateNum = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${dateNum}`;
      const dayName = d.toLocaleDateString("en-US", { weekday: "narrow" }); // M, T, W, T, F, S, S

      result.push({
        dateStr,
        dayNum: d.getDate(),
        dayName,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
      });
    }
    return result;
  }, [selectedDate, todayStr]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    onSelectDate(`${y}-${m}-${day}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    onSelectDate(`${y}-${m}-${day}`);
  };

  const formattedMonthYear = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }, [selectedDate]);

  return (
    <div className="w-full bg-surface-container-low/90 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-outline/10 shadow-sm space-y-2.5">
      {/* Month & Navigation Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">
            {formattedMonthYear}
          </span>
          {selectedDate === todayStr && (
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-mono font-bold border border-primary/25">
              Today
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevDay}
            className="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-bright text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectDate(todayStr)}
            className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-bright text-on-surface text-[11px] font-mono font-semibold transition-all cursor-pointer active:scale-95"
            title="Jump to Today"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleNextDay}
            className="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-bright text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 7-Day Horizontal Date Strip with HabitDriven Segmented Date Rings */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {days.map((item) => {
          // Calculate habit completions for this date
          const dateLogs = item.dateStr === todayStr ? todayLogs : logsByDate[item.dateStr] || {};
          const totalHabits = habits.length;
          const completedCount = habits.filter((h) => dateLogs[h.id]?.completed).length;
          const isAllCompleted = totalHabits > 0 && completedCount === totalHabits;

          return (
            <button
              key={item.dateStr}
              type="button"
              onClick={() => onSelectDate(item.dateStr)}
              className={`group flex flex-col items-center justify-between py-2 px-1 rounded-xl transition-all duration-200 cursor-pointer select-none relative ${
                item.isSelected
                  ? "bg-primary text-[#003825] font-extrabold shadow-md shadow-primary/20 scale-[1.03] ring-2 ring-primary"
                  : item.isToday
                  ? "bg-surface-container text-primary border border-primary/40 hover:bg-surface-bright"
                  : "bg-surface-container/60 hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline/10"
              }`}
            >
              {/* Day name (M, T, W...) */}
              <span
                className={`text-[10px] font-mono uppercase tracking-wider ${
                  item.isSelected
                    ? "text-[#003825]/80 font-bold"
                    : item.isToday
                    ? "text-primary font-bold"
                    : "text-on-surface-variant/70"
                }`}
              >
                {item.dayName}
              </span>

              {/* Date Number */}
              <span
                className={`text-sm sm:text-base font-mono my-0.5 leading-tight ${
                  item.isSelected
                    ? "text-[#003825] font-black"
                    : item.isToday
                    ? "text-primary font-bold"
                    : "text-on-surface font-semibold"
                }`}
              >
                {item.dayNum}
              </span>

              {/* HabitDriven Segmented Mini-Rings beneath the Date */}
              <div className="flex items-center justify-center gap-0.5 mt-1 min-h-[8px]">
                {totalHabits === 0 ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-outline/20" />
                ) : totalHabits <= 5 ? (
                  habits.map((h) => {
                    const isDone = Boolean(dateLogs[h.id]?.completed);
                    const color = CATEGORY_COLORS[h.category] || "#5af0b3";

                    return (
                      <span
                        key={h.id}
                        title={`${h.name}: ${isDone ? "Completed ✓" : "Pending"}`}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                          item.isSelected
                            ? isDone
                              ? "bg-[#003825] shadow-xs scale-110"
                              : "border border-[#003825]/40 bg-transparent"
                            : isDone
                            ? "shadow-[0_0_6px_rgba(90,240,179,0.6)] scale-110"
                            : "border bg-transparent opacity-60"
                        }`}
                        style={{
                          backgroundColor: item.isSelected
                            ? isDone
                              ? "#003825"
                              : "transparent"
                            : isDone
                            ? color
                            : "transparent",
                          borderColor: item.isSelected
                            ? "#003825"
                            : color,
                        }}
                      />
                    );
                  })
                ) : (
                  // Compact progress pill when > 5 habits
                  <div
                    className={`flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[8.5px] font-mono font-bold ${
                      item.isSelected
                        ? "bg-[#003825]/20 text-[#003825]"
                        : isAllCompleted
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-surface-container-highest text-on-surface-variant"
                    }`}
                  >
                    <span>{completedCount}/{totalHabits}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
