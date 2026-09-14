"use client";

import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { type Habit } from "@/lib/db";

export default function HabitsPage() {
  const { user, fetchUser } = useUserStore();
  const { habits, todayLogs, fetchHabits, toggleHabitLog, addHabit } = useHabitStore();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New Habit Form
  const [newName, setNewName] = useState("");
  const [newPeriod, setNewPeriod] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [newTime, setNewTime] = useState("07:00 AM");
  const [newIcon, setNewIcon] = useState("water_drop");

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

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
  
  // Circumference for r=20 is 2 * PI * 20 = 125.66
  const dashOffset = 125.66 - (125.66 * percentage) / 100;

  const filteredHabits = useMemo(() => {
    if (activeFilter === "all") return habits;
    return habits.filter((h) => (h.period || 'morning') === activeFilter);
  }, [habits, activeFilter]);

  const morningHabits = useMemo(() => habits.filter(h => (h.period || 'morning') === 'morning'), [habits]);
  const afternoonHabits = useMemo(() => habits.filter(h => h.period === 'afternoon'), [habits]);
  const eveningHabits = useMemo(() => habits.filter(h => h.period === 'evening'), [habits]);

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
      category: newPeriod === 'morning' ? 'growth' : newPeriod === 'afternoon' ? 'work' : 'health',
      period: newPeriod,
      timeOfDay: newTime,
      frequency: 'daily',
    });

    setNewName("");
    setIsAddModalOpen(false);
    setToastMsg("New Ritual Created! Stay in Odyssey.");
    setTimeout(() => setToastMsg(null), 2500);
  };

  const renderHabitCard = (habit: Habit) => {
    const isChecked = !!todayLogs[habit.id]?.completed;

    return (
      <div
        key={habit.id}
        className="habit-card bg-surface-container rounded-xl p-space-md shadow-sm flex items-center justify-between gap-space-sm border border-outline/10 hover:border-primary/30 transition-all"
      >
        <div className="flex items-center gap-space-sm min-w-0">
          <button
            onClick={() => handleToggle(habit.id)}
            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90 ${
              isChecked
                ? "bg-primary text-on-primary shadow-sm shadow-primary/30"
                : "bg-surface-container-highest text-transparent hover:bg-surface-bright"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] font-bold">check</span>
          </button>
          <div className="flex flex-col min-w-0">
            <span
              className={`habit-title font-body-md text-body-md text-on-surface font-medium truncate ${
                isChecked ? "line-through opacity-75 text-on-surface-variant" : ""
              }`}
            >
              {habit.name}
            </span>
            <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
              <span>{habit.timeOfDay || "Daily"}</span>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-tertiary-container">
                <span
                  className="material-symbols-outlined text-[14px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  local_fire_department
                </span>
                {habit.currentStreak}d
              </span>
            </div>
          </div>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold flex-shrink-0 ${
            isChecked
              ? "bg-primary/10 text-primary"
              : "bg-surface-container-high text-on-surface-variant"
          }`}
        >
          {isChecked ? "Complete" : "In Progress"}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex flex-col w-full px-margin pb-28 gap-space-lg relative">
        {/* Momentum Card */}
        <div className="bg-surface-container rounded-xl p-space-md shadow-md flex flex-col gap-space-md relative overflow-hidden border border-outline/10">
          <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-md">
              {/* Circular Gauge */}
              <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="4"
                    className="text-surface-variant"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray="125.66"
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="text-primary transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-headline-sm text-headline-sm text-primary font-bold tracking-tighter">
                    {percentage}%
                  </span>
                  <span className="font-label-sm text-[9px] text-on-surface-variant -mt-1 font-semibold uppercase">
                    Flow
                  </span>
                </div>
              </div>

              {/* Title Info */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
                    Today's Rhythm
                  </span>
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {completed} of {total} daily rituals fulfilled
                </span>
              </div>
            </div>

            {/* Streak Pill */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-surface-container-high text-tertiary-container shadow-sm flex-shrink-0">
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_fire_department
              </span>
              <span className="font-label-md text-label-md font-bold">
                {user?.streak ?? 0}d
              </span>
            </div>
          </div>

          {/* Weekday Row */}
          <div className="flex items-center justify-between pt-space-xs px-1 border-t border-outline/10">
            {(() => {
              const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
              const todayIdx = (new Date().getDay() + 6) % 7; // Mon = 0, Sun = 6
              const userStreak = user?.streak ?? 0;

              return days.map((day, idx) => {
                const isToday = idx === todayIdx;
                const isCoveredByStreak = idx < todayIdx && (todayIdx - idx) <= userStreak;
                const isTodayCompleted = isToday && completed > 0;

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <span
                      className={`font-label-sm text-label-sm font-medium ${
                        isToday ? "text-primary font-bold" : "text-on-surface-variant"
                      }`}
                    >
                      {day}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        isToday
                          ? isTodayCompleted
                            ? "bg-primary text-on-primary font-bold shadow-md shadow-primary/20 ring-2 ring-primary/40"
                            : "bg-surface-container-highest border-2 border-dashed border-primary text-primary font-bold"
                          : isCoveredByStreak
                          ? "bg-primary/15 text-primary shadow-xs"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {isCoveredByStreak || isTodayCompleted ? (
                        <span className="material-symbols-outlined text-[15px] font-bold">check</span>
                      ) : isToday ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-outline/40" />
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Filter Stream Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-semibold transition-all whitespace-nowrap ${
              activeFilter === "all"
                ? "bg-primary text-on-primary shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            All Rituals ({total})
          </button>
          <button
            onClick={() => setActiveFilter("morning")}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-medium transition-all whitespace-nowrap ${
              activeFilter === "morning"
                ? "bg-primary text-on-primary font-semibold shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Morning ({morningHabits.length})
          </button>
          <button
            onClick={() => setActiveFilter("afternoon")}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-medium transition-all whitespace-nowrap ${
              activeFilter === "afternoon"
                ? "bg-primary text-on-primary font-semibold shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Afternoon ({afternoonHabits.length})
          </button>
          <button
            onClick={() => setActiveFilter("evening")}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-medium transition-all whitespace-nowrap ${
              activeFilter === "evening"
                ? "bg-primary text-on-primary font-semibold shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Evening ({eveningHabits.length})
          </button>
        </div>

        {/* Rituals List */}
        <div className="flex flex-col gap-space-xl">
          {/* Morning Section */}
          {(activeFilter === "all" || activeFilter === "morning") && morningHabits.length > 0 && (
            <section className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-tertiary">
                    wb_twilight
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Morning Rituals
                  </span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  06:00 – 09:00 AM
                </span>
              </div>
              <div className="flex flex-col gap-space-xs">
                {morningHabits.map(renderHabitCard)}
              </div>
            </section>
          )}

          {/* Afternoon Section */}
          {(activeFilter === "all" || activeFilter === "afternoon") && afternoonHabits.length > 0 && (
            <section className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-tertiary-container">
                    wb_sunny
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Afternoon Momentum
                  </span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  12:00 – 03:00 PM
                </span>
              </div>
              <div className="flex flex-col gap-space-xs">
                {afternoonHabits.map(renderHabitCard)}
              </div>
            </section>
          )}

          {/* Evening Section */}
          {(activeFilter === "all" || activeFilter === "evening") && eveningHabits.length > 0 && (
            <section className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    nightlight
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Evening Wind-down
                  </span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  08:00 – 10:30 PM
                </span>
              </div>
              <div className="flex flex-col gap-space-xs">
                {eveningHabits.map(renderHabitCard)}
              </div>
            </section>
          )}
        </div>

        {/* Floating Add Ritual Button */}
        <div className="fixed bottom-24 left-0 right-0 px-margin flex justify-center z-40 pointer-events-none">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-on-primary shadow-xl shadow-primary/20 active:scale-95 transition-all hover:bg-primary-fixed"
          >
            <span className="material-symbols-outlined text-[20px] font-bold">add</span>
            <span className="font-label-lg text-label-lg font-bold tracking-tight">
              Create New Ritual
            </span>
          </button>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-primary text-on-primary shadow-2xl flex items-center gap-2 transition-all">
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              celebration
            </span>
            <span className="font-label-md text-label-md font-bold">{toastMsg}</span>
          </div>
        )}

        {/* Create Habit Modal */}
        {isAddModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setIsAddModalOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-surface-container p-6 shadow-2xl border border-outline/20 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Create New Ritual
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateHabit} className="space-y-3">
                <div>
                  <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold block mb-1">
                    Ritual Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 20m Meditation or Cold Shower"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold block mb-1">
                      Time Period
                    </label>
                    <select
                      value={newPeriod}
                      onChange={(e) => setNewPeriod(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                      <option value="evening">Evening</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold block mb-1">
                      Scheduled Time
                    </label>
                    <input
                      type="text"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      placeholder="e.g. 07:00 AM"
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold block mb-1">
                    Icon
                  </label>
                  <div className="flex gap-2">
                    {['water_drop', 'air', 'menu_book', 'psychology', 'fitness_center', 'wb_sunny', 'nightlight'].map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setNewIcon(ic)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          newIcon === ic
                            ? "bg-primary text-on-primary ring-2 ring-primary"
                            : "bg-surface-container-low text-on-surface-variant hover:bg-surface-bright"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{ic}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all mt-2"
                >
                  Save Daily Ritual
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
