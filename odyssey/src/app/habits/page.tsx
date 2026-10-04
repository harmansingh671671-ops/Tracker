"use client";

import { logWarn } from "@/lib/utils/logger";
import { useEffect, useState, useMemo, useRef } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { CreateHabitModal } from "@/components/habits/create-habit-modal";
import { EditHabitModal } from "@/components/habits/edit-habit-modal";
import { HabitHeatmap } from "@/components/habits/habit-heatmap";
import { HabitMonthCalendar } from "@/components/habits/habit-month-calendar";
import { HabitIcon } from "@/components/habits/habit-icon";
import { HabitDateStrip } from "@/components/habits/habit-date-strip";
import { type Habit } from "@/lib/db";
import { triggerStreaksConfetti } from "@/lib/utils/confetti";
import { getHabitColor, isHabitScheduledOnDate, getLocalTodayStr } from "@/lib/utils/habit-colors";
import {
  Plus,
  Flame,
  Check,
  Sparkles,
  Lock,
  LayoutList,
  LayoutGrid,
  CalendarDays,
  Coffee,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type HabitViewMode = "list" | "grid" | "heatmap";

export default function HabitsPage() {
  const { user, fetchUser, addXp, addDiamonds } = useUserStore();
  const {
    habits,
    todayLogs,
    historyLogs,
    temporaryWallet,
    fetchHabits,
    toggleHabitLog,
    addHabit,
    updateHabit,
    deleteHabit,
    loading: habitsLoading,
  } = useHabitStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<HabitViewMode>("list");

  const [todayStr, setTodayStr] = useState<string>(getLocalTodayStr);
  const [selectedDate, setSelectedDate] = useState<string>(getLocalTodayStr);

  const isFutureSelectedDate = selectedDate > todayStr;

  // Long press / tap-and-hold timer refs
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);
  const pressStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Detect midnight / day change and automatically advance today and selectedDate
  useEffect(() => {
    const checkDateChange = () => {
      const currentToday = getLocalTodayStr();
      setTodayStr((prevToday) => {
        if (prevToday !== currentToday) {
          setSelectedDate((prevSelected) => {
            if (prevSelected === prevToday) {
              return currentToday;
            }
            return prevSelected;
          });
          if (user) {
            // force: the day rolled over, so logs for the new day must be read.
            fetchHabits(user.id, currentToday, { force: true });
          }
          return currentToday;
        }
        return prevToday;
      });
    };

    const interval = setInterval(checkDateChange, 3000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkDateChange();
      }
    };
    window.addEventListener("focus", checkDateChange);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkDateChange);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user, fetchHabits]);

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

  // Track scheduled habits count for daily progress stats while keeping natural order
  const scheduledHabits = useMemo(() => {
    return habits.filter((h) => isHabitScheduledOnDate(h, selectedDate));
  }, [habits, selectedDate]);

  const total = scheduledHabits.length || habits.length;
  const completed = habits.filter((h) => {
    return selectedDate === todayStr
      ? Boolean(todayLogs[h.id]?.completed || historyLogs[h.id]?.[selectedDate])
      : Boolean(historyLogs[h.id]?.[selectedDate] ?? todayLogs[h.id]?.completed);
  }).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const formattedSelectedDate = useMemo(() => {
    if (selectedDate === todayStr) return "Today";
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }, [selectedDate, todayStr]);

  const handleToggle = async (
    habitId: string,
    targetDate: string = selectedDate,
    e?: React.MouseEvent | React.TouchEvent
  ) => {
    if (!user) return;
    if (targetDate > todayStr) {
      showToast("Cannot complete habits for future dates.");
      return;
    }

    const isNowCompleted = await toggleHabitLog(user.id, habitId, targetDate);
    const habit = habits.find((h) => h.id === habitId);
    const habitColor = habit ? getHabitColor(habit) : undefined;
    const isScheduled = habit ? isHabitScheduledOnDate(habit, targetDate) : true;

    if (isNowCompleted) {
      let clientX: number | undefined;
      let clientY: number | undefined;
      if (e) {
        if ("clientX" in e && typeof e.clientX === "number") {
          clientX = e.clientX;
          clientY = e.clientY;
        } else if ("touches" in e && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        }
      }
      triggerStreaksConfetti(clientX, clientY, habitColor);
      try {
        if (typeof window !== "undefined" && navigator?.vibrate) {
          navigator.vibrate(40);
        }
      } catch (e) { logWarn("page", "haptic feedback failed", e); }
      await addXp(15);
      await addDiamonds(1);
      await fetchUser();
      showToast(isScheduled ? "Habit completed! +15 XP • +1 💎" : "Rest-day completion registered! (!) +15 XP • +1 💎");
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
    await fetchHabits(user.id, selectedDate, { force: true });
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
    // force: the habit list itself just changed in the database.
    if (user) await fetchHabits(user.id, selectedDate, { force: true });
    showToast("Habit updated.");
  };

  const handleDeleteHabit = async (habitId: string) => {
    await deleteHabit(habitId);
    // force: the habit list itself just changed in the database.
    if (user) await fetchHabits(user.id, selectedDate, { force: true });
    showToast("Habit deleted.");
  };

  // Long press gesture listeners to open habit editing modal
  const startPress = (habit: Habit, e: React.TouchEvent | React.MouseEvent) => {
    if ("button" in e && e.button !== 0) return;
    isLongPressRef.current = false;
    if ("touches" in e && e.touches.length > 0) {
      pressStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if ("clientX" in e) {
      pressStartPosRef.current = { x: e.clientX, y: e.clientY };
    }
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      try {
        if (typeof window !== "undefined" && navigator?.vibrate) {
          navigator.vibrate(50);
        }
      } catch (e) { logWarn("page", "haptic feedback failed", e); }
      setEditingHabit(habit);
    }, 400);
  };

  const movePress = (e: React.TouchEvent | React.MouseEvent) => {
    if (!pressTimerRef.current) return;
    const clientX = "touches" in e && e.touches.length > 0 ? e.touches[0].clientX : "clientX" in e ? e.clientX : 0;
    const clientY = "touches" in e && e.touches.length > 0 ? e.touches[0].clientY : "clientY" in e ? e.clientY : 0;
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

  const handleCardClick = (habit: Habit, e?: React.MouseEvent | React.TouchEvent) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    if (isFutureSelectedDate) {
      showToast("Cannot complete habits for future dates.");
      return;
    }
    handleToggle(habit.id, selectedDate, e);
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
        todayStr={todayStr}
        loading={habitsLoading || !user?.id}
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
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Cross-fades on day change. Implemented with a CSS transition rather
              than a keyed motion element: changing a React `key` remounts the
              node, which leaves it on its initial state and never animates. */}
          <span
            key={formattedSelectedDate + percentage}
            className="text-xs font-mono font-bold text-on-surface animate-in fade-in slide-in-from-top-1 duration-300"
          >
            {formattedSelectedDate}{isFutureSelectedDate ? " (Upcoming)" : ""}: {completed}/{total} ({percentage}%)
          </span>
          {selectedDate !== todayStr && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className="text-[10px] font-mono font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
        </div>

        {/* 3-Mode View Switcher */}
        <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-outline/15 shadow-xs shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-primary text-on-primary font-bold shadow-xs"
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
                ? "bg-primary text-on-primary font-bold shadow-xs"
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
                ? "bg-primary text-on-primary font-bold shadow-xs"
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
        /* 1. LIST VIEW: Full-width interactive cards for selected date */
        /* Each card is keyed by `${selectedDate}-${h.id}` so switching days
           unmounts the old set and mounts a new one, which is what lets the
           enter animation play. The date must be in the KEY, not on the parent
           div: putting key= on the parent remounts the whole subtree including
           AnimatePresence, which suppresses the enter transition and leaves the
           cards stuck at the initial opacity of 0. */
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {habits.map((h) => {
              const isScheduled = isHabitScheduledOnDate(h, selectedDate);
              const isCompleted = selectedDate === todayStr
                ? Boolean(todayLogs[h.id]?.completed || historyLogs[h.id]?.[selectedDate])
                : Boolean(historyLogs[h.id]?.[selectedDate] ?? todayLogs[h.id]?.completed);
              const habitColor = getHabitColor(h);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    layout: { type: "spring", stiffness: 350, damping: 28 },
                    opacity: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                    scale: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                    y: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                  }}
                  key={`${selectedDate}-${h.id}`}
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
                  onClick={(e) => handleCardClick(h, e)}
                  className={`group flex flex-col p-3.5 rounded-2xl cursor-pointer transition-colors duration-200 select-none border active:scale-[0.99] shadow-xs ${
                    isCompleted
                      ? "bg-surface-container-low/90 shadow-sm"
                      : isFutureSelectedDate
                      ? "bg-surface-container opacity-85 border-outline/10"
                      : !isScheduled
                      ? "bg-surface-container/60 hover:bg-surface-container opacity-80 border-dashed border-outline/20"
                      : "bg-surface-container hover:bg-surface-container-high border-outline/10"
                  }`}
                  style={{
                    borderColor: isCompleted
                      ? isScheduled
                        ? `${habitColor}50`
                        : `${habitColor}35`
                      : undefined,
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                          isCompleted
                            ? "border group-hover:scale-105"
                            : "bg-surface-container-high group-hover:scale-105"
                        }`}
                        style={{
                          backgroundColor: isCompleted
                            ? isScheduled
                              ? `${habitColor}20`
                              : `${habitColor}14`
                            : undefined,
                          borderColor: isCompleted
                            ? `${habitColor}${isScheduled ? "40" : "25"}`
                            : undefined,
                        }}
                      >
                        <HabitIcon icon={h.icon} name={h.name} className="w-5 h-5" style={{ color: habitColor }} />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-sm font-semibold truncate ${
                              isCompleted ? "text-on-surface line-through opacity-80" : "text-on-surface"
                            }`}
                          >
                            {h.name}
                          </h4>
                          {!isScheduled && (
                            <span className="px-1.5 py-0.2 rounded-md bg-surface-container-highest text-on-surface-variant text-[9.5px] font-mono font-bold shrink-0">
                              Rest Day
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-on-surface-variant font-mono">
                          <span className="font-semibold" style={{ color: habitColor }}>{h.category || "Routine"}</span>
                          <span>•</span>
                          <span className="text-amber-400 flex items-center gap-0.5">
                            <Flame className="w-3 h-3" />
                            {h.currentStreak || 1}d
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Completion Action Ring / Solid Circle */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFutureSelectedDate) {
                            showToast("Cannot complete habits for future dates.");
                            return;
                          }
                          handleToggle(h.id, selectedDate, e);
                        }}
                        title={
                          isFutureSelectedDate
                            ? "Cannot complete habits for future dates"
                            : isCompleted
                            ? isScheduled
                              ? "Completed (tap to undo)"
                              : "Unscheduled Completed (!) • Tap to undo"
                            : !isScheduled
                            ? "Rest Day (tap to register)"
                            : "Tap to complete"
                        }
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                          isFutureSelectedDate ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                        } ${
                          isCompleted
                            ? "text-white shadow-sm scale-105"
                            : isFutureSelectedDate
                            ? "bg-transparent"
                            : !isScheduled
                            ? "bg-transparent hover:scale-105 opacity-75"
                            : "bg-transparent hover:scale-105"
                        }`}
                        style={{
                          backgroundColor: isCompleted
                            ? isScheduled
                              ? habitColor
                              : `${habitColor}70`
                            : "transparent",
                          borderColor: isFutureSelectedDate && !isCompleted
                            ? `${habitColor}60`
                            : !isScheduled && !isCompleted
                            ? `${habitColor}70`
                            : habitColor,
                          borderWidth: isCompleted ? "0px" : !isScheduled ? "1.5px" : "2.5px",
                          borderStyle: !isScheduled && !isCompleted ? "dashed" : "solid",
                          boxShadow: isCompleted
                            ? `0 0 10px ${habitColor}${isScheduled ? "66" : "35"}`
                            : undefined,
                        }}
                      >
                        <AnimatePresence mode="wait">
                          {isCompleted ? (
                            <motion.div
                              key={isScheduled ? "check" : "excl"}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="flex items-center justify-center"
                            >
                              {isScheduled ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : (
                                <span className="font-black text-xs leading-none">!</span>
                              )}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Inline Monthly Calendar preview */}
                  <HabitMonthCalendar
                    habitId={h.id}
                    name={h.name}
                    targetDays={h.targetDays}
                    targetDaysPerWeek={h.targetDaysPerWeek}
                    category={h.category}
                    selectedDate={selectedDate}
                    todayStr={todayStr}
                    onSelectDate={(newDate) => setSelectedDate(newDate)}
                    onToggleDate={(dateStr, e) => handleToggle(h.id, dateStr, e)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : viewMode === "grid" ? (
        /* 2. GRID VIEW: 2-Column Compact mobile cards for selected date */
        <div className="grid grid-cols-2 gap-2.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {habits.map((h) => {
              const isScheduled = isHabitScheduledOnDate(h, selectedDate);
              const isCompleted = selectedDate === todayStr
                ? Boolean(todayLogs[h.id]?.completed || historyLogs[h.id]?.[selectedDate])
                : Boolean(historyLogs[h.id]?.[selectedDate] ?? todayLogs[h.id]?.completed);
              const habitColor = getHabitColor(h);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0.85, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    layout: { type: "spring", stiffness: 350, damping: 28 },
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 },
                  }}
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
                  onClick={(e) => handleCardClick(h, e)}
                  className={`p-3 rounded-2xl flex flex-col justify-between gap-2.5 border transition-colors duration-200 cursor-pointer active:scale-95 select-none ${
                    isCompleted
                      ? "bg-surface-container-low shadow-sm"
                      : isFutureSelectedDate
                      ? "bg-surface-container opacity-85 border-outline/15"
                      : !isScheduled
                      ? "bg-surface-container/60 hover:bg-surface-container opacity-80 border-dashed border-outline/20"
                      : "bg-surface-container hover:bg-surface-container-high border-outline/15"
                  }`}
                  style={{
                    borderColor: isCompleted
                      ? isScheduled
                        ? `${habitColor}50`
                        : `${habitColor}35`
                      : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCompleted ? "border" : "bg-surface-container-high"
                      }`}
                      style={{
                        backgroundColor: isCompleted
                          ? isScheduled
                            ? `${habitColor}20`
                            : `${habitColor}14`
                          : undefined,
                        borderColor: isCompleted
                          ? `${habitColor}${isScheduled ? "40" : "25"}`
                          : undefined,
                      }}
                    >
                      <HabitIcon icon={h.icon} name={h.name} className="w-4 h-4" style={{ color: habitColor }} />
                    </div>

                    <div
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFutureSelectedDate) {
                          showToast("Cannot complete habits for future dates.");
                          return;
                        }
                        handleToggle(h.id, selectedDate, e);
                      }}
                      title={
                        isFutureSelectedDate
                          ? "Cannot complete habits for future dates"
                          : isCompleted
                          ? isScheduled
                            ? "Completed (tap to undo)"
                            : "Unscheduled Completed (!) • Tap to undo"
                          : !isScheduled
                          ? "Rest Day (tap to register)"
                          : "Tap to complete"
                      }
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isFutureSelectedDate ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                      } ${
                        isCompleted
                          ? "text-white shadow-xs scale-105"
                          : isFutureSelectedDate
                          ? "bg-transparent"
                          : !isScheduled
                          ? "bg-transparent hover:scale-105 opacity-75"
                          : "bg-transparent hover:scale-105"
                      }`}
                      style={{
                        backgroundColor: isCompleted
                          ? isScheduled
                            ? habitColor
                            : `${habitColor}70`
                          : "transparent",
                        borderColor: isFutureSelectedDate && !isCompleted
                          ? `${habitColor}60`
                          : !isScheduled && !isCompleted
                          ? `${habitColor}70`
                          : habitColor,
                        borderWidth: isCompleted ? "0px" : !isScheduled ? "1.5px" : "2px",
                        borderStyle: !isScheduled && !isCompleted ? "dashed" : "solid",
                        boxShadow: isCompleted
                          ? `0 0 8px ${habitColor}${isScheduled ? "66" : "35"}`
                          : undefined,
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {isCompleted ? (
                          <motion.div
                            key={isScheduled ? "check" : "excl"}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center justify-center"
                          >
                            {isScheduled ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : (
                              <span className="font-black text-[11px] leading-none">!</span>
                            )}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 justify-between">
                      <h4
                        className={`text-xs font-semibold truncate ${
                          isCompleted ? "line-through text-on-surface-variant" : "text-on-surface"
                        }`}
                      >
                        {h.name}
                      </h4>
                      {!isScheduled && (
                        <span className="px-1 py-0.2 rounded bg-surface-container-highest text-on-surface-variant text-[8.5px] font-mono font-bold shrink-0">
                          Rest
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono mt-1 text-on-surface-variant">
                      <span className="truncate font-semibold" style={{ color: habitColor }}>{h.category || "General"}</span>
                      <span className="text-amber-400 font-bold shrink-0 flex items-center gap-0.5">
                        <Flame className="w-3 h-3" />
                        {h.currentStreak || 1}d
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* 3. HEATMAP VIEW: 2-Column Quad-like Matrices */
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {habits.map((h) => {
              const isScheduled = isHabitScheduledOnDate(h, selectedDate);
              const isCompleted = selectedDate === todayStr
                ? Boolean(todayLogs[h.id]?.completed || historyLogs[h.id]?.[selectedDate])
                : Boolean(historyLogs[h.id]?.[selectedDate] ?? todayLogs[h.id]?.completed);
              const habitColor = getHabitColor(h);
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0.85, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    layout: { type: "spring", stiffness: 350, damping: 28 },
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 },
                  }}
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
                  className={`p-3 sm:p-3.5 rounded-2xl bg-surface-container-low border shadow-xs transition-colors duration-200 select-none flex flex-col justify-between hover:bg-surface-container-high/40 active:scale-[0.98] ${
                    !isScheduled ? "border-dashed border-outline/20 opacity-90" : "border-outline/15"
                  }`}
                  style={{
                    borderColor: isScheduled ? `${habitColor}35` : undefined,
                    boxShadow: isCompleted ? `0 0 10px ${habitColor}12` : undefined,
                  }}
                >
                  {/* Quad Card Header */}
                  <div className="flex items-start justify-between gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `${habitColor}18`,
                          borderColor: `${habitColor}35`,
                        }}
                      >
                        <HabitIcon icon={h.icon} name={h.name} className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" style={{ color: habitColor }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-on-surface truncate leading-tight" title={h.name}>
                          {h.name}
                        </h4>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-on-surface-variant">
                          <span className="truncate font-semibold" style={{ color: habitColor }}>
                            {h.category || "Routine"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <span className="text-amber-400 font-bold text-[10px] font-mono flex items-center gap-0.5">
                        <Flame className="w-3 h-3" />
                        {h.currentStreak || 1}d
                      </span>
                      {!isScheduled && (
                        <span className="px-1 py-0.2 rounded bg-surface-container-highest text-on-surface-variant text-[8px] font-mono font-bold">
                          Rest
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quad Compact Heatmap */}
                  <HabitHeatmap
                    habitId={h.id}
                    name={h.name}
                    targetDays={h.targetDays}
                    targetDaysPerWeek={h.targetDaysPerWeek}
                    category={h.category}
                    selectedDate={selectedDate}
                    compact={true}
                    todayStr={todayStr}
                    onSelectDate={(newDate) => setSelectedDate(newDate)}
                    onToggleDate={(dateStr, e) => handleToggle(h.id, dateStr, e)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Habit Modal */}
      {editingHabit && (
        <EditHabitModal
          habit={editingHabit}
          isOpen={true}
          initialTab="history"
          selectedDate={selectedDate}
          todayStr={todayStr}
          onSelectDate={(newDate) => setSelectedDate(newDate)}
          onClose={() => setEditingHabit(null)}
          onSave={handleUpdateHabit}
          onDelete={handleDeleteHabit}
        />
      )}

      {/* Create Habit Modal with Template Library */}
      <CreateHabitModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateHabit}
        existingHabitNames={habits.map((h) => h.name)}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-primary text-on-primary px-4 py-2 rounded-full font-mono text-xs font-bold shadow-lg shadow-primary/25 animate-in fade-in zoom-in duration-200">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
