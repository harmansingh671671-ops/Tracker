"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { CreateHabitModal } from "@/components/habits/create-habit-modal";
import { EditHabitModal } from "@/components/habits/edit-habit-modal";
import { HabitHeatmap } from "@/components/habits/habit-heatmap";
import { HabitIcon } from "@/components/habits/habit-icon";
import { type Habit } from "@/lib/db";
import {
  Plus,
  Flame,
  Check,
  Sparkles,
  Lock,
  CheckCircle2,
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
    updateHabit,
    deleteHabit,
  } = useHabitStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Long press / tap-and-hold timer refs
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);
  const pressStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
      showToast("Habit completed! +15 XP • +1 💎 Vaulted");
    }
  };

  const handleCreateHabit = async (data: {
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
      targetDays: data.targetDays || [1, 2, 3, 4, 5, 6, 7],
      icon: data.icon,
      period: data.timeOfDay === "anytime" ? undefined : data.timeOfDay,
      archivedAt: undefined,
    });
    await fetchHabits(user.id, today);
    showToast("New habit created! +30 XP • +5 💎 added");
  };

  const handleUpdateHabit = async (
    habitId: string,
    updates: {
      name: string;
      icon: string;
      category: any;
      frequency: "daily" | "weekly";
      targetDaysPerWeek: number;
      targetDays?: number[];
      period?: "morning" | "afternoon" | "evening";
    }
  ) => {
    await updateHabit(habitId, updates);
    if (user) await fetchHabits(user.id, today);
    showToast("Habit updated.");
  };

  const handleDeleteHabit = async (habitId: string) => {
    await deleteHabit(habitId);
    if (user) await fetchHabits(user.id, today);
    showToast("Habit deleted.");
  };

  // Long press gesture listeners
  const startPress = (habit: Habit, e: React.TouchEvent | React.MouseEvent) => {
    isLongPressRef.current = false;
    if ("touches" in e) {
      pressStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      pressStartPosRef.current = { x: e.clientX, y: e.clientY };
    }
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setEditingHabit(habit);
    }, 500);
  };

  const movePress = (e: React.TouchEvent | React.MouseEvent) => {
    if (!pressTimerRef.current) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const dist = Math.hypot(clientX - pressStartPosRef.current.x, clientY - pressStartPosRef.current.y);
    if (dist > 12) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const endPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleCardClick = (habit: Habit) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    handleToggle(habit.id);
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
          <h2 className="text-xl font-bold tracking-tight text-on-surface">Daily Habits</h2>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </button>
      </div>

      {/* Reward Vault Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-high p-4 flex flex-col gap-2 border border-outline/10 shadow-sm">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-secondary">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase">Reward Vault</span>
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

      {/* Habits List */}
      <div className="space-y-3">
        {habits.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface-container-low border border-outline/10 text-center space-y-3">
            <span className="text-3xl">🎯</span>
            <h3 className="text-base font-bold text-on-surface">No Habits Yet</h3>
            <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
              Build positive momentum by creating your first daily routine.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="py-2.5 px-5 rounded-full bg-primary text-on-primary text-xs font-bold cursor-pointer"
            >
              Add First Habit
            </button>
          </div>
        ) : (
          habits.map((h) => {
            const isCompleted = !!todayLogs[h.id]?.completed;
            return (
              <div
                key={h.id}
                onTouchStart={(e) => startPress(h, e)}
                onTouchMove={movePress}
                onTouchEnd={endPress}
                onTouchCancel={endPress}
                onMouseDown={(e) => startPress(h, e)}
                onMouseMove={movePress}
                onMouseUp={endPress}
                onMouseLeave={endPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setEditingHabit(h);
                }}
                onClick={() => handleCardClick(h)}
                className={`group flex flex-col p-4 rounded-2xl cursor-pointer transition-all duration-200 select-none border active:scale-[0.99] ${
                  isCompleted
                    ? "bg-surface-container-low/90 border-primary/40 shadow-sm"
                    : "bg-surface-container hover:bg-surface-container-high border-outline/10"
                }`}
              >
                {/* Main Card Header */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Habit Icon Avatar */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform ${
                        isCompleted
                          ? "bg-primary/20 border border-primary/30"
                          : "bg-surface-container-high group-hover:scale-105"
                      }`}
                    >
                      <HabitIcon icon={h.icon} name={h.name} className="w-5 h-5 text-primary" />
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
                        <span className="text-primary font-medium">{h.category || "Routine"}</span>
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
                  </div>
                </div>

                {/* Heatmap Calendar with 10 columns covering ~month */}
                <HabitHeatmap
                  habitId={h.id}
                  targetDays={h.targetDays}
                  targetDaysPerWeek={h.targetDaysPerWeek}
                  category={h.category}
                />
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
        onSave={handleCreateHabit}
      />

      {/* Edit Habit Modal */}
      <EditHabitModal
        habit={editingHabit}
        isOpen={!!editingHabit}
        onClose={() => setEditingHabit(null)}
        onSave={handleUpdateHabit}
        onDelete={handleDeleteHabit}
      />
    </div>
  );
}

