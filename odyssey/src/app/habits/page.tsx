"use client";

import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { CreateHabitModal } from "@/components/habits/create-habit-modal";
import {
  Plus,
  Flame,
  Check,
  Sparkles,
  Lock,
  CheckCircle2,
  Trash2,
  Clock,
} from "lucide-react";

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

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
  } = useHabitStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    fetchUser().then((u) => {
      if (u) {
        fetchHabits(u.id, today);
      }
    });
  }, [fetchUser, fetchHabits, today]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const total = habits.length;
  const completed = habits.filter((h) => todayLogs[h.id]?.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleToggle = async (habitId: string) => {
    if (!user) return;
    const isNowCompleted = await toggleHabitLog(user.id, habitId, today);
    if (isNowCompleted) {
      showToast("Ritual completed! +15 XP • +1 💎 Vaulted");
    }
  };

  const handleCreateRitual = async (data: {
    name: string;
    icon: string;
    category: string;
    frequency: number;
    targetDays: number[];
    timeOfDay?: "morning" | "afternoon" | "evening" | "anytime";
  }) => {
    if (!user) return;
    await addHabit({
      userId: user.id,
      name: data.name,
      category: data.category as any,
      frequency: "daily",
      targetDaysPerWeek: data.targetDays?.length || 7,
      icon: data.icon,
      period: data.timeOfDay === "anytime" ? undefined : data.timeOfDay,
      archivedAt: undefined,
    });
    await fetchHabits(user.id, today);
    showToast("New ritual created! +30 XP • +5 💎 added");
  };

  const handleDeleteRitual = async (e: React.MouseEvent, habitId: string) => {
    e.stopPropagation();
    await deleteHabit(habitId);
    showToast("Habit ritual deleted.");
  };

  // Today's day index (0=Mon, 6=Sun)
  const currentDayIndex = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-16 pt-2 space-y-5">
      {/* Header Action Row */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-on-surface">Daily Rituals</h2>
          <p className="text-xs text-on-surface-variant">Daily habits & mindful routines</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md shadow-primary/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </button>
      </div>

      {/* Tomorrow's Reward Vault Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-high p-4 flex flex-col gap-2 border border-outline/10 shadow-sm">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-secondary">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase">Tomorrow's Reward Vault</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 bg-surface-container px-2.5 py-0.5 rounded-full text-primary font-mono text-xs font-semibold">
              <Sparkles className="w-3 h-3" />
              +{45 + (temporaryWallet?.todayAccruedXp || 0)} XP
            </span>
            <span className="flex items-center gap-1 bg-surface-container px-2.5 py-0.5 rounded-full text-secondary font-mono text-xs font-semibold">
              💎 +{12 + (temporaryWallet?.todayAccruedDiamonds || 0)}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-on-surface-variant leading-tight">
          Complete daily rituals to unlock full bonus yields at tomorrow's sunrise.
        </p>
      </div>

      {/* Habit Completion Overview Card */}
      <div className="rounded-2xl bg-surface-container p-4 flex flex-col gap-3.5 border border-outline/10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
              Today's Progress
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold font-mono text-on-surface">
                {completed} of {total}
              </span>
              <span className="text-xs font-mono text-primary font-semibold">
                ({percentage}%)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-high px-3 py-1.5 rounded-full text-amber-400 font-mono text-xs font-bold border border-outline/10">
            <Flame className="w-4 h-4" />
            <span>{user?.streak || 1}d Streak</span>
          </div>
        </div>

        {/* Progress Track */}
        <div className="w-full bg-surface-container-lowest h-2.5 rounded-full overflow-hidden p-0.5 border border-outline/5">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500 shadow-sm shadow-primary/50"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* 7-Day Mini Circle Progress Dots */}
        <div className="flex items-center justify-between pt-1 text-center">
          {WEEK_DAYS.map((letter, idx) => {
            const isToday = idx === currentDayIndex;
            const isPast = idx < currentDayIndex;
            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                    isToday
                      ? "bg-primary text-on-primary shadow-sm shadow-primary/30"
                      : isPast
                      ? "bg-primary/20 text-primary"
                      : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {isPast || (isToday && completed > 0) ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    letter
                  )}
                </span>
                <span
                  className={`text-[10px] font-mono ${
                    isToday ? "text-primary font-bold" : "text-on-surface-variant"
                  }`}
                >
                  {letter}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rituals List */}
      <div className="space-y-2.5">
        {habits.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface-container-low border border-outline/10 text-center space-y-3">
            <span className="text-3xl">🧘</span>
            <h3 className="text-base font-bold text-on-surface">No Rituals Yet</h3>
            <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
              Build positive momentum by creating your first daily mindful ritual.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="py-2.5 px-5 rounded-full bg-primary text-on-primary text-xs font-bold"
            >
              Add First Ritual
            </button>
          </div>
        ) : (
          habits.map((h) => {
            const isCompleted = !!todayLogs[h.id]?.completed;
            return (
              <div
                key={h.id}
                onClick={() => handleToggle(h.id)}
                className={`group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all active:scale-[0.99] border ${
                  isCompleted
                    ? "bg-surface-container-low/80 border-primary/40 shadow-sm"
                    : "bg-surface-container hover:bg-surface-container-high border-outline/10"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Emoji Avatar */}
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 transition-transform ${
                      isCompleted
                        ? "bg-primary/20 border border-primary/30"
                        : "bg-surface-container-high group-hover:scale-105"
                    }`}
                  >
                    <span>{h.icon || "🎯"}</span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-sm font-semibold truncate ${
                          isCompleted ? "text-on-surface line-through opacity-80" : "text-white"
                        }`}
                      >
                        {h.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-on-surface-variant font-mono">
                      <span className="text-primary font-medium">{h.category || "Ritual"}</span>
                      <span>•</span>
                      <span className="text-amber-400 flex items-center gap-0.5">
                        <Flame className="w-3 h-3" />
                        {h.currentStreak || 1}d
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 ml-2">
                  <span className="text-[11px] font-mono text-primary font-bold hidden sm:inline">
                    +15 XP
                  </span>

                  {/* Toggle Checkmark Circle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(h.id);
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                      isCompleted
                        ? "bg-primary text-on-primary shadow-md shadow-primary/30"
                        : "bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline/15"
                    }`}
                  >
                    <Check className={`w-5 h-5 font-bold ${isCompleted ? "stroke-[3]" : ""}`} />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteRitual(e, h.id)}
                    className="p-1 text-on-surface-variant/40 hover:text-error transition-colors"
                    title="Delete ritual"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="p-3 rounded-xl bg-primary-container text-on-primary-container text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Create Habit Modal */}
      <CreateHabitModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateRitual}
      />
    </div>
  );
}
