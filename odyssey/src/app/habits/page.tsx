"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { CreateHabitModal } from "@/components/habits/create-habit-modal";
import { EditHabitModal } from "@/components/habits/edit-habit-modal";
import { HabitHeatmap } from "@/components/habits/habit-heatmap";
import { HabitIcon } from "@/components/habits/habit-icon";
import { HabitDateStrip } from "@/components/habits/habit-date-strip";
import { type Habit } from "@/lib/db";
import {
  Plus,
  Flame,
  Check,
  Sparkles,
  Lock,
  CheckCircle2,
  LayoutList,
  LayoutGrid,
  CalendarDays,
  MoreVertical,
  Calendar,
} from "lucide-react";

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

type HabitViewMode = "list" | "grid" | "heatmap";

export default function HabitsPage() {
  const { user, fetchUser, addXp, addDiamonds } = useUserStore();
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
  const [viewMode, setViewMode] = useState<HabitViewMode>("list");

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Long press / tap-and-hold timer refs
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);
  const pressStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    fetchUser().then((u) => {
      if (u) {
        fetchHabits(u.id, selectedDate);
      }
    });
  }, [fetchUser, fetchHabits, selectedDate]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const total = habits.length;
  const completed = habits.filter((h) => todayLogs[h.id]?.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleToggle = async (habitId: string) => {
    if (!user) return;
    const isNowCompleted = await toggleHabitLog(user.id, habitId, selectedDate);
    if (isNowCompleted) {
      await addXp(15);
      await addDiamonds(1);
      await fetchUser();
      showToast("Habit completed! +15 XP • +1 💎");
    } else {
      await addXp(-15);
      await addDiamonds(-1);
      await fetchUser();
      showToast("Habit reverted.");
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
    await addXp(30);
    await addDiamonds(5);
    await fetchUser();
    await fetchHabits(user.id, selectedDate);
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
    if (user) await fetchHabits(user.id, selectedDate);
    showToast("Habit updated.");
  };

  const handleDeleteHabit = async (habitId: string) => {
    await deleteHabit(habitId);
    if (user) await fetchHabits(user.id, selectedDate);
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

  return (
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-20 pt-2 space-y-4">
      {/* Top Header Action Row */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-on-surface">Habits &amp; Routines</h1>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </button>
      </div>

      {/* HabitDriven Segmented Date Strip with completion rings */}
      <HabitDateStrip
        selectedDate={selectedDate}
        onSelectDate={(newDate) => setSelectedDate(newDate)}
        habits={habits}
        todayLogs={todayLogs}
      />

      {/* Reward Vault Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-high p-3.5 flex items-center justify-between gap-2 border border-outline/10 shadow-sm">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-2 text-secondary">
          <Lock className="w-4 h-4" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase">Vault</span>
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

      {/* View Switcher Header (List vs Grid vs Heatmap) & Stats Summary */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-bold text-on-surface">
            {completed}/{total} Completed ({percentage}%)
          </span>
        </div>

        {/* HabitBee 3-Mode View Switcher */}
        <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-outline/15 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-primary text-[#003825] font-bold shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="List View"
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">List</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-primary text-[#003825] font-bold shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("heatmap")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              viewMode === "heatmap"
                ? "bg-primary text-[#003825] font-bold shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="Heatmap View"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Heatmap</span>
          </button>
        </div>
      </div>

      {/* Main Content Area Based on View Mode */}
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
      ) : viewMode === "list" ? (
        /* 1. LIST VIEW: Full-width interactive cards */
        <div className="space-y-2.5">
          {habits.map((h) => {
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
                className={`group flex flex-col p-3.5 rounded-2xl cursor-pointer transition-all duration-200 select-none border active:scale-[0.99] shadow-xs ${
                  isCompleted
                    ? "bg-surface-container-low/90 border-primary/40 shadow-sm"
                    : "bg-surface-container hover:bg-surface-container-high border-outline/10"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
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

                  {/* Completion Action Checkbox */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? "bg-primary text-[#003825] shadow-xs shadow-primary/40 scale-105"
                          : "border-2 border-outline/30 hover:border-primary text-transparent"
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  </div>
                </div>

                {/* Inline Monthly Heatmap preview */}
                <HabitHeatmap
                  habitId={h.id}
                  targetDays={h.targetDays}
                  targetDaysPerWeek={h.targetDaysPerWeek}
                  category={h.category}
                />
              </div>
            );
          })}
        </div>
      ) : viewMode === "grid" ? (
        /* 2. GRID VIEW: 2-Column Compact mobile cards (HabitBee style) */
        <div className="grid grid-cols-2 gap-2.5">
          {habits.map((h) => {
            const isCompleted = !!todayLogs[h.id]?.completed;
            return (
              <div
                key={h.id}
                onClick={() => handleCardClick(h)}
                className={`p-3 rounded-2xl flex flex-col justify-between gap-2.5 border transition-all cursor-pointer active:scale-95 select-none ${
                  isCompleted
                    ? "bg-surface-container-low border-primary/40 shadow-sm"
                    : "bg-surface-container hover:bg-surface-container-high border-outline/15"
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isCompleted ? "bg-primary/20 border border-primary/30" : "bg-surface-container-high"
                    }`}
                  >
                    <HabitIcon icon={h.icon} name={h.name} className="w-4 h-4 text-primary" />
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? "bg-primary text-[#003825] shadow-xs"
                        : "border border-outline/30 hover:border-primary"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                  </div>
                </div>

                <div>
                  <h4
                    className={`text-xs font-semibold truncate ${
                      isCompleted ? "line-through text-on-surface-variant" : "text-on-surface"
                    }`}
                  >
                    {h.name}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] font-mono mt-1 text-on-surface-variant">
                    <span className="text-primary truncate">{h.category || "General"}</span>
                    <span className="text-amber-400 font-bold shrink-0 flex items-center gap-0.5">
                      <Flame className="w-3 h-3" />
                      {h.currentStreak || 1}d
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 3. HEATMAP VIEW: Consolidated full-month matrices */
        <div className="space-y-3">
          {habits.map((h) => (
            <div
              key={h.id}
              className="p-3.5 rounded-2xl bg-surface-container-low border border-outline/15 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <HabitIcon icon={h.icon} name={h.name} className="w-4 h-4 text-primary shrink-0" />
                  <h4 className="text-xs font-bold text-on-surface truncate">{h.name}</h4>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    <Flame className="w-3 h-3" />
                    {h.currentStreak || 1}d streak
                  </span>
                </div>
              </div>

              <HabitHeatmap
                habitId={h.id}
                targetDays={h.targetDays}
                targetDaysPerWeek={h.targetDaysPerWeek}
                category={h.category}
              />
            </div>
          ))}
        </div>
      )}

      {/* Edit Habit Modal */}
      {editingHabit && (
        <EditHabitModal
          habit={editingHabit}
          isOpen={true}
          onClose={() => setEditingHabit(null)}
          onSave={handleUpdateHabit}
          onDelete={handleDeleteHabit}
        />
      )}

      {/* Create Habit Modal */}
      <CreateHabitModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateHabit}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-primary text-[#003825] px-4 py-2 rounded-full font-mono text-xs font-bold shadow-lg shadow-primary/25 animate-in fade-in zoom-in duration-200">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
