"use client";

import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { type Habit } from "@/lib/db";
import {
  Check,
  Plus,
  Flame,
  CheckCircle2,
  Sun,
  Sunset,
  Moon,
  X,
  Sparkles,
} from "lucide-react";

export default function HabitsPage() {
  const { user, fetchUser } = useUserStore();
  const { habits, todayLogs, fetchHabits, toggleHabitLog, addHabit } = useHabitStore();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New Habit Form
  const [newName, setNewName] = useState("");
  const [newPeriod, setNewPeriod] = useState<"morning" | "afternoon" | "evening">("morning");
  const [newTime, setNewTime] = useState("07:00 AM");
  const [newIcon, setNewIcon] = useState("sparkles");

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    fetchUser().then((u) => {
      if (u) {
        fetchHabits(u.id, today);
      }
    });
  }, [fetchUser, fetchHabits, today]);

  const total = habits.length;
  const completed = habits.filter((h) => todayLogs[h.id]?.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const filteredHabits = useMemo(() => {
    if (activeFilter === "all") return habits;
    return habits.filter((h) => (h.period || "morning") === activeFilter);
  }, [habits, activeFilter]);

  const morningHabits = useMemo(
    () => habits.filter((h) => (h.period || "morning") === "morning"),
    [habits]
  );
  const afternoonHabits = useMemo(
    () => habits.filter((h) => h.period === "afternoon"),
    [habits]
  );
  const eveningHabits = useMemo(
    () => habits.filter((h) => h.period === "evening"),
    [habits]
  );

  const handleToggle = async (habitId: string) => {
    if (!user) return;
    const isNowCompleted = await toggleHabitLog(user.id, habitId, today);
    if (isNowCompleted) {
      setToastMsg("Ritual Completed! +15 XP • +1 Gem");
      setTimeout(() => setToastMsg(null), 2500);
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;

    await addHabit({
      userId: user.id,
      name: newName.trim(),
      icon: newIcon,
      category:
        newPeriod === "morning"
          ? "growth"
          : newPeriod === "afternoon"
          ? "work"
          : "health",
      period: newPeriod,
      timeOfDay: newTime,
      frequency: "daily",
    });

    setNewName("");
    setIsAddModalOpen(false);
    setToastMsg("New Ritual Created!");
    setTimeout(() => setToastMsg(null), 2500);
  };

  const renderHabitCard = (habit: Habit) => {
    const isChecked = !!todayLogs[habit.id]?.completed;

    return (
      <div
        key={habit.id}
        className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 shadow-xs ${
          isChecked
            ? "bg-surface-container-high/60 border-primary/25"
            : "bg-surface-container-low border-outline/15 hover:border-primary/30"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => handleToggle(habit.id)}
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-90 ${
              isChecked
                ? "bg-primary text-on-primary shadow-sm shadow-primary/30"
                : "bg-surface-container-high text-transparent hover:border-primary/40 border border-outline/20"
            }`}
            title={isChecked ? "Mark Incomplete" : "Complete Habit"}
          >
            <Check className={`w-4 h-4 stroke-[3] ${isChecked ? "text-on-primary" : "opacity-0"}`} />
          </button>

          <div className="flex flex-col min-w-0">
            <span
              className={`text-xs sm:text-sm font-semibold truncate leading-snug ${
                isChecked
                  ? "line-through text-on-surface-variant/70"
                  : "text-on-surface"
              }`}
            >
              {habit.name}
            </span>
            <div className="flex items-center gap-2 text-[11px] font-mono text-on-surface-variant mt-0.5">
              <span>{habit.timeOfDay || "Daily"}</span>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                <Flame className="w-3 h-3 fill-amber-400" />
                {habit.currentStreak || 0}d
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleToggle(habit.id)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold shrink-0 cursor-pointer transition-all active:scale-95 ${
            isChecked
              ? "bg-primary/15 text-primary border border-primary/25"
              : "bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline/15"
          }`}
        >
          {isChecked ? "Completed" : "Check In"}
        </button>
      </div>
    );
  };

  return (
    <div className="view-transition min-h-screen bg-surface">
      <div className="flex flex-col w-full max-w-xl sm:max-w-2xl mx-auto px-3 sm:px-4 pb-28 pt-2 space-y-3 touch-pan-y">
        {/* Header Bar: Matching Today and Journey */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-primary">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="text-[11px] uppercase tracking-wider font-semibold font-mono">
                Daily Rituals & Habits
              </span>
            </div>
            <h1 className="text-lg sm:text-xl text-on-surface font-bold tracking-tight mt-0.5">
              Today's Rituals
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-on-primary hover:bg-primary-fixed active:scale-95 transition-all text-xs font-mono font-bold shadow-md shadow-primary/20 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Ritual</span>
          </button>
        </div>

        {/* Momentum & Flow Gauge Card */}
        <section className="rounded-2xl bg-surface-container-low border border-outline/10 p-3.5 sm:p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">
                Ritual Completion
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-primary">
                {completed} / {total} ({percentage}%)
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-400 font-mono text-[11px] font-bold">
                <Flame className="w-3 h-3 fill-amber-400" />
                <span>{user?.streak ?? 0}d</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* 7-Day Weekday Dots */}
          <div className="flex items-center justify-between pt-1 border-t border-outline/10 text-center">
            {(() => {
              const days = ["M", "T", "W", "T", "F", "S", "S"];
              const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0, Sun=6
              const userStreak = user?.streak ?? 0;

              return days.map((day, idx) => {
                const isToday = idx === todayIdx;
                const isCoveredByStreak = idx < todayIdx && todayIdx - idx <= userStreak;
                const isTodayCompleted = isToday && completed > 0;

                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <span
                      className={`text-[10px] font-mono font-semibold ${
                        isToday ? "text-primary font-bold" : "text-on-surface-variant/70"
                      }`}
                    >
                      {day}
                    </span>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all text-xs font-bold ${
                        isToday
                          ? isTodayCompleted
                            ? "bg-primary text-on-primary shadow-xs ring-2 ring-primary/40"
                            : "bg-surface-container border border-dashed border-primary text-primary"
                          : isCoveredByStreak
                          ? "bg-primary/20 text-primary"
                          : "bg-surface-container text-on-surface-variant/40"
                      }`}
                    >
                      {isCoveredByStreak || isTodayCompleted ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : isToday ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      ) : (
                        <span className="w-1 h-1 rounded-full bg-outline/30" />
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </section>

        {/* Filter Chips: All, Morning, Afternoon, Evening */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          {[
            { id: "all", label: `All (${total})` },
            { id: "morning", label: `Morning (${morningHabits.length})` },
            { id: "afternoon", label: `Afternoon (${afternoonHabits.length})` },
            { id: "evening", label: `Evening (${eveningHabits.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1 rounded-full font-mono text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                activeFilter === tab.id
                  ? "bg-primary text-on-primary shadow-xs font-bold"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Habit Sections / Items List */}
        <div className="space-y-3 pt-1">
          {filteredHabits.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-container-low border border-outline/15 text-center space-y-2">
              <p className="text-xs text-on-surface-variant font-mono">
                No rituals found in this category.
              </p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-mono font-bold hover:bg-primary/25 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Ritual</span>
              </button>
            </div>
          ) : (
            <>
              {/* Morning Group */}
              {(activeFilter === "all" || activeFilter === "morning") && morningHabits.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-tertiary">
                      <Sun className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold font-mono uppercase tracking-wider">
                        Morning Rituals
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-on-surface-variant/60">
                      06:00 – 11:00 AM
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {morningHabits.map(renderHabitCard)}
                  </div>
                </div>
              )}

              {/* Afternoon Group */}
              {(activeFilter === "all" || activeFilter === "afternoon") && afternoonHabits.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-primary">
                      <Sunset className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold font-mono uppercase tracking-wider">
                        Afternoon Momentum
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-on-surface-variant/60">
                      12:00 – 05:00 PM
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {afternoonHabits.map(renderHabitCard)}
                  </div>
                </div>
              )}

              {/* Evening Group */}
              {(activeFilter === "all" || activeFilter === "evening") && eveningHabits.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-secondary">
                      <Moon className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold font-mono uppercase tracking-wider">
                        Evening Wind-Down
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-on-surface-variant/60">
                      06:00 – 10:30 PM
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {eveningHabits.map(renderHabitCard)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-primary text-on-primary shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
            <Sparkles className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Create Habit Modal */}
        {isAddModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setIsAddModalOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-surface-container p-5 shadow-2xl border border-outline/20 space-y-3.5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-outline/10 pb-2">
                <div className="flex items-center gap-1.5 text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-on-surface">Create New Ritual</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-7 h-7 rounded-lg bg-surface-bright flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateHabit} className="space-y-3 text-left">
                <div>
                  <label className="text-[11px] font-mono uppercase text-on-surface-variant font-semibold block mb-1">
                    Ritual Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 20m Morning Sun or Cold Shower"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-mono uppercase text-on-surface-variant font-semibold block mb-1">
                      Time Period
                    </label>
                    <select
                      value={newPeriod}
                      onChange={(e) => setNewPeriod(e.target.value as any)}
                      className="w-full px-2.5 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                      <option value="evening">Evening</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase text-on-surface-variant font-semibold block mb-1">
                      Scheduled Time
                    </label>
                    <input
                      type="text"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-xs focus:outline-none focus:border-primary font-mono"
                      placeholder="07:00 AM"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline/10">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-mono font-bold hover:bg-primary-fixed active:scale-95 transition-all shadow-md cursor-pointer"
                  >
                    Create Ritual
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
