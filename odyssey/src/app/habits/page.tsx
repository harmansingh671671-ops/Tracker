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
  Gift,
  Clock,
  Trash2,
} from "lucide-react";

export default function HabitsPage() {
  const { user, fetchUser } = useUserStore();
  const {
    habits,
    todayLogs,
    temporaryWallet,
    fetchHabits,
    toggleHabitLog,
    addHabit,
    deleteHabit,
    clearAllHabits,
    claimTemporaryWallet,
    simulateYesterdayRewards,
  } = useHabitStore();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New Hobby Form
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

  const hasLegacyStarterHabits = useMemo(() => {
    const legacyNames = [
      "Morning Hydration & Electrolytes",
      "15m Box Breathing & Mobility",
      "Deep Work Sprint (Focus Block)",
      "Sunlight Walk & Movement",
      "Digital Sunset & Reading",
    ];
    return habits.some((h) => legacyNames.includes(h.name));
  }, [habits]);

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
      setToastMsg("Hobby checked in! +15 XP • +1 💎 added to tomorrow's vault");
      setTimeout(() => setToastMsg(null), 2800);
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
    setToastMsg("New Hobby Created!");
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleDeleteHabit = async (habitId: string, habitName: string) => {
    if (!confirm(`Are you sure you want to delete "${habitName}"?`)) return;
    await deleteHabit(habitId);
    setToastMsg(`Deleted "${habitName}"`);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const handleClearStarterHabits = async () => {
    if (!user) return;
    if (!confirm("Clear default starter habits to write your hobbies from scratch?")) return;
    await clearAllHabits(user.id);
    setToastMsg("Starter habits cleared! You have a clean slate.");
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleClaimWallet = async () => {
    if (!user) return;
    const { claimedXp, claimedDiamonds } = await claimTemporaryWallet(user.id, today);
    if (claimedXp > 0 || claimedDiamonds > 0) {
      setToastMsg(`🎉 Claimed +${claimedXp} XP & +${claimedDiamonds} 💎 to your main balance!`);
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleSimulateYesterday = async () => {
    if (!user) return;
    await simulateYesterdayRewards(user.id, today);
    setToastMsg("Simulated yesterday check-ins! Temporary wallet ready to claim.");
    setTimeout(() => setToastMsg(null), 3000);
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
            title={isChecked ? "Mark Incomplete" : "Complete Hobby"}
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

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleToggle(habit.id)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold cursor-pointer transition-all active:scale-95 ${
              isChecked
                ? "bg-primary/15 text-primary border border-primary/25"
                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline/15"
            }`}
          >
            {isChecked ? "Completed" : "Check In"}
          </button>

          <button
            type="button"
            onClick={() => handleDeleteHabit(habit.id, habit.name)}
            title="Delete Hobby"
            className="w-7 h-7 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
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
                Daily Hobbies
              </span>
            </div>
            <h1 className="text-lg sm:text-xl text-on-surface font-bold tracking-tight mt-0.5">
              Today's Hobbies
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-on-primary hover:bg-primary-fixed active:scale-95 transition-all text-xs font-mono font-bold shadow-md shadow-primary/20 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Hobby</span>
          </button>
        </div>

        {/* Temporary Reward Wallet Card */}
        {temporaryWallet.totalXp > 0 || temporaryWallet.totalDiamonds > 0 ? (
          <section className="rounded-2xl bg-gradient-to-br from-amber-500/15 via-surface-container-low to-primary/10 border border-amber-400/35 p-3.5 sm:p-4 shadow-sm space-y-3 animate-in fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                      Temporary Wallet
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                      Ready to Claim
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                    Rewards from your completed hobbies yesterday have matured!
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-bold text-amber-400">
                  +{temporaryWallet.totalXp} XP
                </div>
                <div className="text-[11px] font-mono font-semibold text-primary">
                  +{temporaryWallet.totalDiamonds} 💎
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-400/20">
              <div className="text-[11px] font-mono text-on-surface-variant">
                {temporaryWallet.unclaimedDays.length} past day(s) ready
              </div>
              <button
                type="button"
                onClick={handleClaimWallet}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-mono text-xs font-bold shadow-md shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 fill-black" />
                <span>Claim Rewards (+{temporaryWallet.totalXp} XP • +{temporaryWallet.totalDiamonds} 💎)</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-surface-container-low border border-outline/10 p-3 sm:p-3.5 shadow-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">
                    Tomorrow's Reward Vault
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-semibold">
                    Accruing • Unlocks Tomorrow
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-primary">
                <span>+{temporaryWallet.todayAccruedXp} XP</span>
                <span>•</span>
                <span>+{temporaryWallet.todayAccruedDiamonds} 💎</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant/80 pt-1 border-t border-outline/10">
              <span>
                {completed > 0
                  ? `${completed} hobbies checked in today. Moves to your wallet at midnight!`
                  : "Check in hobbies today to build tomorrow's rewards."}
              </span>
              <button
                type="button"
                onClick={handleSimulateYesterday}
                title="Simulate yesterday check-ins to test claiming"
                className="text-[10px] text-zinc-500 hover:text-primary transition-colors underline cursor-pointer shrink-0 ml-2"
              >
                Simulate Day End
              </button>
            </div>
          </section>
        )}

        {/* Clear starter habits banner if detected */}
        {hasLegacyStarterHabits && (
          <div className="p-2.5 sm:p-3 rounded-xl bg-surface-container-high/60 border border-outline/15 flex items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-on-surface-variant">
              You have preset starter habits in your routine.
            </span>
            <button
              type="button"
              onClick={handleClearStarterHabits}
              className="text-[11px] font-mono font-bold text-red-400 hover:text-red-300 transition-colors underline cursor-pointer shrink-0"
            >
              Clear & Start Fresh
            </button>
          </div>
        )}

        {/* Momentum & Flow Gauge Card */}
        <section className="rounded-2xl bg-surface-container-low border border-outline/10 p-3.5 sm:p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">
                Hobby Completion
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

        {/* Hobby Sections / Items List */}
        <div className="space-y-3 pt-1">
          {habits.length === 0 ? (
            <div className="p-6 sm:p-7 rounded-2xl bg-surface-container-low border border-outline/15 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-on-surface">
                  Start Writing Your Daily Hobbies
                </h3>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                  No default hobbies are locked in. Build your personal daily routine completely from scratch.
                </p>
              </div>

              {/* Inline quick-create form */}
              <form onSubmit={handleCreateHabit} className="max-w-md mx-auto space-y-2.5 pt-2 text-left">
                <div>
                  <label className="text-[11px] font-mono uppercase text-on-surface-variant font-semibold block mb-1">
                    Hobby Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Guitar Practice, 20m Reading, Morning Walk..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline/20 text-on-surface text-xs focus:outline-none focus:border-primary"
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
                      className="w-full px-2.5 py-2 rounded-xl bg-surface-container border border-outline/20 text-on-surface text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="morning">Morning (06:00 - 11:00 AM)</option>
                      <option value="afternoon">Afternoon (12:00 - 05:00 PM)</option>
                      <option value="evening">Evening (06:00 - 10:30 PM)</option>
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
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline/20 text-on-surface text-xs focus:outline-none focus:border-primary font-mono"
                      placeholder="07:00 AM"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary text-on-primary text-xs font-mono font-bold hover:bg-primary-fixed active:scale-95 transition-all shadow-md shadow-primary/20 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add First Hobby</span>
                  </button>
                </div>
              </form>
            </div>
          ) : filteredHabits.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-container-low border border-outline/15 text-center space-y-2">
              <p className="text-xs text-on-surface-variant font-mono">
                No hobbies found in this category.
              </p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-mono font-bold hover:bg-primary/25 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Hobby</span>
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
                        Morning Hobbies
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
                        Afternoon Hobbies
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
                        Evening Hobbies
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

        {/* Create Hobby Modal */}
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
                  <h3 className="text-sm font-bold text-on-surface">Create New Hobby</h3>
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
                    Hobby Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Guitar Practice, 20m Reading, Swimming"
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
                    Create Hobby
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
