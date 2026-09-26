"use client";

import { useState, useEffect, useMemo } from "react";
import { type Habit } from "@/lib/db";
import { useHabitStore } from "@/lib/stores/habit-store";
import { useUserStore } from "@/lib/stores/user-store";
import {
  X,
  Check,
  Trash2,
  AlertTriangle,
  History,
  Sliders,
  Flame,
  Trophy,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
} from "lucide-react";

interface EditHabitModalProps {
  habit: Habit | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    habitId: string,
    updates: {
      name: string;
      icon: string;
      category: any;
      frequency: "daily" | "weekly";
      targetDaysPerWeek: number;
      period?: "morning" | "afternoon" | "evening";
    }
  ) => void;
  onDelete: (habitId: string) => void;
}

const EMOJIS = [
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

const DOMAINS = [
  { id: "Mindful Focus", label: "Mindful Focus", color: "text-secondary border-secondary/30", bg: "bg-secondary-container text-on-secondary-container" },
  { id: "Vitality & Fitness", label: "Vitality & Fitness", color: "text-primary border-primary/30", bg: "bg-primary text-on-primary" },
  { id: "Renewal & Health", label: "Renewal & Health", color: "text-tertiary border-tertiary/30", bg: "bg-tertiary-container text-on-tertiary-container" },
  { id: "Craft & Skill", label: "Craft & Skill", color: "text-slate-300 border-slate-500/30", bg: "bg-surface-container-high text-on-surface" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function EditHabitModal({ habit, isOpen, onClose, onSave, onDelete }: EditHabitModalProps) {
  const { user } = useUserStore();
  const { historyLogs, toggleHabitLog } = useHabitStore();

  const [activeTab, setActiveTab] = useState<"history" | "edit">("history");

  // Form states for Edit Tab
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🧘");
  const [domain, setDomain] = useState("Vitality & Fitness");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "evening" | "anytime">("morning");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Month navigation state for History Tab
  const [historyYear, setHistoryYear] = useState(() => new Date().getFullYear());
  const [historyMonth, setHistoryMonth] = useState(() => new Date().getMonth());

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    if (habit) {
      setName(habit.name || "");
      setIcon(habit.icon || "🧘");
      setDomain(habit.category || "Vitality & Fitness");
      const target = habit.targetDaysPerWeek || 7;
      if (target === 7) setSelectedDays([1, 2, 3, 4, 5, 6, 7]);
      else if (target === 5) setSelectedDays([1, 2, 3, 4, 5]);
      else if (target === 3) setSelectedDays([1, 3, 5]);
      else setSelectedDays(Array.from({ length: target }, (_, i) => i + 1));

      if (habit.period) {
        setTimeOfDay(habit.period);
      } else {
        setTimeOfDay("anytime");
      }
      setIsConfirmingDelete(false);

      const now = new Date();
      setHistoryYear(now.getFullYear());
      setHistoryMonth(now.getMonth());
    }
  }, [habit]);

  // History Calendar calculation
  const historyCalendar = useMemo(() => {
    if (!habit) return { monthLabel: "", days: [], completedInMonth: 0, totalDaysInMonth: 30 };

    const totalDays = new Date(historyYear, historyMonth + 1, 0).getDate();
    const dateForLabel = new Date(historyYear, historyMonth, 1);
    const monthLabel = dateForLabel.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const list: Array<{
      dateStr: string;
      dayNumber: number;
      weekday: string;
      isToday: boolean;
      isFuture: boolean;
      isCompleted: boolean;
    }> = [];

    for (let d = 1; d <= totalDays; d++) {
      const monthPadded = String(historyMonth + 1).padStart(2, "0");
      const dayPadded = String(d).padStart(2, "0");
      const dateStr = `${historyYear}-${monthPadded}-${dayPadded}`;
      const isToday = dateStr === today;
      const isFuture = dateStr > today;
      const isCompleted = !!historyLogs[habit.id]?.[dateStr];

      const dObj = new Date(historyYear, historyMonth, d);
      list.push({
        dateStr,
        dayNumber: d,
        weekday: dObj.toLocaleDateString("en-US", { weekday: "short" }),
        isToday,
        isFuture,
        isCompleted,
      });
    }

    const completedInMonth = list.filter((d) => d.isCompleted).length;

    return {
      monthLabel,
      days: list,
      completedInMonth,
      totalDaysInMonth: totalDays,
    };
  }, [habit, historyYear, historyMonth, historyLogs, today]);

  // All completed dates for this habit
  const completedLogDates = useMemo(() => {
    if (!habit) return [];
    const habitLogs = historyLogs[habit.id] || {};
    return Object.entries(habitLogs)
      .filter(([_, completed]) => completed)
      .map(([date]) => date)
      .sort((a, b) => b.localeCompare(a));
  }, [habit, historyLogs]);

  if (!isOpen || !habit) return null;

  const handlePrevMonth = () => {
    if (historyMonth === 0) {
      setHistoryMonth(11);
      setHistoryYear((y) => y - 1);
    } else {
      setHistoryMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const now = new Date();
    if (historyYear === now.getFullYear() && historyMonth >= now.getMonth()) {
      return; // Cannot navigate to future months
    }
    if (historyMonth === 11) {
      setHistoryMonth(0);
      setHistoryYear((y) => y + 1);
    } else {
      setHistoryMonth((m) => m + 1);
    }
  };

  const handleToggleHistoryDate = async (dateStr: string, isFuture: boolean) => {
    if (isFuture || !user || !habit) return;
    await toggleHabitLog(user.id, habit.id, dateStr);
  };

  const toggleDay = (idx: number) => {
    if (selectedDays.includes(idx)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== idx));
      }
    } else {
      setSelectedDays([...selectedDays, idx].sort());
    }
  };

  const applyPreset = (preset: "everyday" | "weekdays" | "3x") => {
    if (preset === "everyday") setSelectedDays([1, 2, 3, 4, 5, 6, 7]);
    else if (preset === "weekdays") setSelectedDays([1, 2, 3, 4, 5]);
    else setSelectedDays([1, 3, 5]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || habit.name;
    onSave(habit.id, {
      name: finalName,
      icon,
      category: domain,
      frequency: "daily",
      targetDaysPerWeek: selectedDays.length,
      period: timeOfDay === "anytime" ? undefined : timeOfDay,
    });
    onClose();
  };

  const handleDeleteClick = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
    } else {
      onDelete(habit.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-container-lowest/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-surface-container rounded-t-[32px] sm:rounded-[32px] border border-outline/15 shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-6 duration-300">
        {/* Header Bar */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-1.5 rounded-full bg-outline/20 mb-3" />
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{habit.icon}</span>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-on-surface truncate max-w-[220px]">
                  {habit.name}
                </h2>
                <p className="text-[11px] text-on-surface-variant font-mono">
                  {habit.category || "Daily Habit"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2-Segmented Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-surface-container-low rounded-2xl border border-outline/10">
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "history"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Habit History</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "edit"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Edit Details</span>
          </button>
        </div>

        {/* TAB 1: HISTORY VIEW */}
        {activeTab === "history" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline/10 flex flex-col items-center justify-center text-center">
                <span className="text-amber-400 font-bold font-mono text-base flex items-center gap-1">
                  <Flame className="w-4 h-4" />
                  {habit.currentStreak || 0}d
                </span>
                <span className="text-[10px] font-mono text-on-surface-variant uppercase mt-0.5">
                  Current
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline/10 flex flex-col items-center justify-center text-center">
                <span className="text-secondary font-bold font-mono text-base flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  {habit.longestStreak || 0}d
                </span>
                <span className="text-[10px] font-mono text-on-surface-variant uppercase mt-0.5">
                  Best Streak
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline/10 flex flex-col items-center justify-center text-center">
                <span className="text-primary font-bold font-mono text-base flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  {habit.totalCompletions || 0}
                </span>
                <span className="text-[10px] font-mono text-on-surface-variant uppercase mt-0.5">
                  Completed
                </span>
              </div>
            </div>

            {/* Interactive Month Heatmap Calendar Card */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-on-surface">
                    {historyCalendar.monthLabel}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-90 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-90 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 10-Column Calendar Matrix Starting at 1st of Month */}
              <div className="grid grid-cols-10 gap-1 sm:gap-1.5 w-full pt-1">
                {historyCalendar.days.map((day) => (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => handleToggleHistoryDate(day.dateStr, day.isFuture)}
                    disabled={day.isFuture}
                    title={`${day.dateStr} (${day.weekday}): ${
                      day.isCompleted ? "Completed ✓" : day.isFuture ? "Upcoming" : "Not completed"
                    }${day.isToday ? " • Today" : ""}`}
                    className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-mono transition-all select-none ${
                      day.isCompleted
                        ? `bg-primary text-on-primary font-bold shadow-xs shadow-primary/30 border border-primary/40 hover:brightness-110 active:scale-90 cursor-pointer ${
                            day.isToday ? "ring-2 ring-primary/80 ring-offset-1 ring-offset-surface-container-low" : ""
                          }`
                        : day.isToday
                        ? "bg-surface-container text-primary border-2 border-primary/80 font-bold hover:bg-surface-bright active:scale-90 cursor-pointer"
                        : day.isFuture
                        ? "bg-surface-container-lowest/40 text-on-surface-variant/20 border border-outline/5 cursor-default"
                        : "bg-surface-container-lowest/80 text-on-surface-variant/40 border border-outline/10 hover:border-outline/30 hover:bg-surface-container/60 hover:text-on-surface-variant active:scale-90 cursor-pointer"
                    }`}
                  >
                    <span className="leading-none">{day.dayNumber}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant pt-1">
                <span>Month Total: {historyCalendar.completedInMonth} days</span>
                <span className="text-primary font-semibold">Tap any day to toggle log</span>
              </div>
            </div>

            {/* Recent Completed Log List */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline/10 space-y-2.5">
              <span className="text-xs font-bold text-on-surface block">
                Completion Log ({completedLogDates.length} total)
              </span>

              {completedLogDates.length === 0 ? (
                <p className="text-xs text-on-surface-variant font-mono py-2">
                  No completions recorded yet. Complete today to start your streak!
                </p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {completedLogDates.slice(0, 15).map((dateStr) => {
                    const [y, m, d] = dateStr.split("-").map(Number);
                    const dObj = new Date(y, m - 1, d);
                    const formatted = dObj.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                    const isToday = dateStr === today;
                    return (
                      <div
                        key={dateStr}
                        className="flex items-center justify-between p-2 rounded-xl bg-surface-container text-xs font-mono border border-outline/5"
                      >
                        <span className="flex items-center gap-1.5 text-on-surface">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          <span>{formatted}</span>
                          {isToday && (
                            <span className="px-1.5 py-0.2 bg-primary/20 text-primary text-[9px] font-bold rounded-full">
                              TODAY
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-primary font-bold">+15 XP • +1 💎</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: EDIT HABIT VIEW */}
        {activeTab === "edit" && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-200">
            {/* Habit Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant font-medium">HABIT NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morning Cold Hydration & Mobility"
                className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline-variant rounded-2xl py-3.5 px-4 border border-outline/15 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm text-sm font-semibold transition-all"
              />
            </div>

            {/* Emoji & Icon Grid */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant font-medium">SELECT AN ICON</label>
              <div className="grid grid-cols-5 gap-2 p-2 bg-surface-container-low rounded-2xl border border-outline/10">
                {EMOJIS.map((item) => (
                  <button
                    key={item.emoji}
                    type="button"
                    onClick={() => setIcon(item.emoji)}
                    className={`h-12 flex items-center justify-center rounded-xl text-xl transition-all active:scale-90 ${
                      icon === item.emoji
                        ? "bg-primary/20 border border-primary/50 shadow-md scale-105"
                        : "bg-surface-container hover:bg-surface-bright"
                    }`}
                    title={item.label}
                  >
                    <span>{item.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Domain Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant font-medium">LIFE DOMAIN</label>
              <div className="grid grid-cols-2 gap-2">
                {DOMAINS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDomain(d.id)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
                      domain === d.id
                        ? `${d.bg} shadow-md`
                        : "bg-surface-container hover:bg-surface-bright text-on-surface border border-outline/10"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    <span className="truncate">{d.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency & Target Weekdays */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-on-surface">Target Schedule</span>
                <span className="font-mono text-primary font-bold">{selectedDays.length} days / week</span>
              </div>

              {/* Presets */}
              <div className="flex gap-1.5 p-1 bg-surface-container rounded-xl">
                <button
                  type="button"
                  onClick={() => applyPreset("everyday")}
                  className={`flex-1 py-1 text-center rounded-lg text-xs font-medium transition-colors ${
                    selectedDays.length === 7 ? "bg-surface-container-high text-primary font-bold" : "text-on-surface-variant"
                  }`}
                >
                  Everyday
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("weekdays")}
                  className={`flex-1 py-1 text-center rounded-lg text-xs font-medium transition-colors ${
                    selectedDays.length === 5 && !selectedDays.includes(6) ? "bg-surface-container-high text-primary font-bold" : "text-on-surface-variant"
                  }`}
                >
                  Weekdays
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("3x")}
                  className={`flex-1 py-1 text-center rounded-lg text-xs font-medium transition-colors ${
                    selectedDays.length === 3 ? "bg-surface-container-high text-primary font-bold" : "text-on-surface-variant"
                  }`}
                >
                  3x Week
                </button>
              </div>

              {/* Weekday Chips */}
              <div className="flex justify-between items-center pt-1">
                {WEEKDAYS.map((dName, idx) => {
                  const dayNum = idx + 1;
                  const isSelected = selectedDays.includes(dayNum);
                  return (
                    <button
                      key={dName}
                      type="button"
                      onClick={() => toggleDay(dayNum)}
                      className={`w-9 h-9 rounded-full text-xs font-mono font-bold flex items-center justify-center transition-transform active:scale-90 ${
                        isSelected
                          ? "bg-primary text-on-primary shadow-sm shadow-primary/30"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {dName[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Anchor */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant font-medium">TIME ANCHOR</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "morning", label: "Morning", sub: "06:00 - 12:00" },
                  { id: "afternoon", label: "Afternoon", sub: "12:00 - 18:00" },
                  { id: "evening", label: "Evening", sub: "18:00 - 23:00" },
                  { id: "anytime", label: "Anytime", sub: "Flexible flow" },
                ].map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setTimeOfDay(slot.id as any)}
                    className={`p-3 rounded-xl text-left flex flex-col gap-0.5 transition-all ${
                      timeOfDay === slot.id
                        ? "bg-primary/15 border border-primary/40 shadow-sm"
                        : "bg-surface-container text-on-surface-variant border border-outline/10 opacity-70"
                    }`}
                  >
                    <span className={`text-xs font-semibold ${timeOfDay === slot.id ? "text-primary" : "text-on-surface"}`}>
                      {slot.label}
                    </span>
                    <span className="text-[10px] font-mono">{slot.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons: Save and Delete */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                className="w-full py-4 px-6 rounded-2xl bg-primary text-on-primary font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteClick}
                className={`w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isConfirmingDelete
                    ? "bg-error text-on-error border border-error shadow-md animate-pulse"
                    : "bg-surface-container-high/60 text-error/80 hover:text-error hover:bg-error/10 border border-error/20"
                }`}
              >
                {isConfirmingDelete ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>Tap Again to Confirm Delete</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Habit</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
