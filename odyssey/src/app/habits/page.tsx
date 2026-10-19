"use client";

import { logWarn, readString, writeString } from "@/lib/utils/logger";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { CreateHabitModal } from "@/components/habits/create-habit-modal";
import { EditHabitModal } from "@/components/habits/edit-habit-modal";
import { HabitGitHubHeatmap } from "@/components/habits/habit-github-heatmap";
import { GridHabitCard } from "@/components/habits/grid-habit-card";
import { HabitListCard } from "@/components/habits/habit-list-card";
import { HabitIcon } from "@/components/habits/habit-icon";
import { HabitDateStrip } from "@/components/habits/habit-date-strip";
import { HabitsEmptyState } from "@/components/habits/habits-empty-state";
import { type HabitCategory, type Habit } from "@/lib/db";
import { triggerStreaksConfetti } from "@/lib/utils/confetti";
import { getHabitColor, isHabitScheduledOnDate, getLocalTodayStr, habitCategoryLabel } from "@/lib/utils/habit-colors";
import { useSharedClock } from "@/lib/utils/shared-clock";
import { getDayHabitProgress } from "@/lib/utils/habit-progress";
import { isHabitComplete, getCompletionRecord } from "@/lib/utils/habit-completion";
import { getCompletionToast, getDaysDoneLabel, isDaysDoneActive } from "@/lib/utils/warm-copy";
import { consumeNewAchievements } from "@/lib/utils/achievements";
import {
  XP_CREATION_DIAMONDS,
  XP_CREATION_XP,
  XP_PER_COMPLETION,
  XP_PERFECT_DAY_BONUS,
} from "@/lib/utils/reward-rules";
import {
  Plus,
  Flame,
  Sparkles,
  Lock,
  LayoutList,
  LayoutGrid,
  CalendarDays,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type HabitViewMode = "list" | "grid" | "heatmap";

/** Where the Habits view-mode preference is stored — `B6` requires a "saved preference". */
const HABITS_VIEW_STORAGE_KEY = "odyssey_habits_view";

export default function HabitsPage() {
  const { user, fetchUser, addXp, addDiamonds } = useUserStore();
  // PERF-8b: the id as a scalar keeps the memoised rows' handler props stable
  // when the profile object itself is replaced (an XP award, a settings save).
  const userId = user?.id ?? null;
  const {
    habits,
    todayLogs,
    historyLogs,
    historyValues,
    lastCompletedAt,
    daysDoneByHabit,
    temporaryWallet,
    fetchHabits,
    fetchTemporaryWallet,
    settleElapsedRewards,
    toggleHabitLog,
    setHabitLogValue,
    markHabitSlip,
    addHabit,
    updateHabit,
    deleteHabit,
    loading: habitsLoading,
    loadedUserId,
  } = useHabitStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // `B6`: the view mode is a *saved preference*, and the heatmap is the default
  // (the owner's choice — a long-history view on opening the screen). The stored
  // value is applied once the client has hydrated, because reading
  // `localStorage` during the first render would make the server and client
  // markup disagree.
  const [viewMode, setViewModeState] = useState<HabitViewMode>("heatmap");
  const setViewMode = useCallback((next: HabitViewMode) => {
    setViewModeState(next);
    writeString(HABITS_VIEW_STORAGE_KEY, next);
  }, []);
  const [valueInputHabit, setValueInputHabit] = useState<{ habit: Habit; log: { completed?: boolean; value?: number } | undefined; date: string } | null>(null);
  const [valueInputAmount, setValueInputAmount] = useState("");

  const [todayStr, setTodayStr] = useState<string>(getLocalTodayStr);
  const [selectedDate, setSelectedDate] = useState<string>(getLocalTodayStr);

  const isFutureSelectedDate = selectedDate > todayStr;

  // `B6`: apply the saved view once the client has hydrated. Deferred with
  // `queueMicrotask` rather than set synchronously — the same fix `M14` used for
  // the rank dialog — because a synchronous `setState` in an effect cascades a
  // second render pass. A brief flash of the default heatmap is the accepted
  // cost of not reading storage during render.
  useEffect(() => {
    queueMicrotask(() => {
      const saved = readString(HABITS_VIEW_STORAGE_KEY, "");
      if (saved === "list" || saved === "grid" || saved === "heatmap") {
        setViewModeState(saved);
      }
    });
  }, []);

  /**
   * Declared before the effects below that call it, which is what the React
   * Compiler lint rule requires. `useCallback` keeps its identity stable so the
   * settlement effect's dependency list does not re-fire on every render.
   */
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const openValueInput = useCallback((
    habit: Habit,
    log: { completed?: boolean; value?: number } | undefined,
    date: string
  ) => {
    if (isFutureSelectedDate) return;
    const storeValue = useHabitStore.getState().historyValues?.[habit.id]?.[date];
    const mergedLog = {
      ...log,
      value: typeof log?.value === "number" ? log.value : (typeof storeValue === "number" ? storeValue : log?.value),
    };
    setValueInputHabit({ habit, log: mergedLog, date });
    setValueInputAmount(String(typeof mergedLog?.value === "number" ? mergedLog.value : 0));
  }, [isFutureSelectedDate]);

  const closeValueInput = useCallback(() => {
    setValueInputHabit(null);
    setValueInputAmount("");
  }, []);

  const submitValueInput = useCallback(async () => {
    if (!valueInputHabit) return;
    const { habit, date } = valueInputHabit;
    const value = parseInt(valueInputAmount, 10);
    if (isNaN(value) || value < 0) {
      showToast("Enter a valid number");
      return;
    }
    if (loadedUserId && setHabitLogValue) {
      await setHabitLogValue(loadedUserId, habit.id, date, value);
    }
    closeValueInput();
    showToast(`Logged ${value} ${habit.unit ?? "units"}`);
  }, [valueInputHabit, valueInputAmount, loadedUserId, setHabitLogValue, showToast, closeValueInput]);

  // Long press / tap-and-hold timer refs
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);
  const pressStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drag gesture refs for counted habits progress bar
  const isDraggingRef = useRef<boolean>(false);
  const dragStartYRef = useRef<number>(0);
  const dragStartValueRef = useRef<number>(0);
  const dragHabitIdRef = useRef<string | null>(null);
  const dragTargetValueRef = useRef<number | null>(null);

  // Detect midnight / day change and automatically advance today and selectedDate
  const prevTodayRef = useRef(todayStr);
  const now = useSharedClock();

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
          return currentToday;
        }
        return prevToday;
      });
    };

    // The shared clock ticks once per minute; check on each tick.
    checkDateChange();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkDateChange();
      }
    };
    window.addEventListener("focus", checkDateChange);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", checkDateChange);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [now, user, fetchHabits]);

  // Refresh logs for the day that just rolled over. Running fetchHabits here
  // (after render) instead of inside the setTodayStr updater avoids updating
  // HabitDateStrip while HabitsPage is still rendering.
  // fetchHabits is idempotent and short-circuits when nothing changed, so this
  // is cheap on no-op days; initial load is handled by the selectedDate effect.
  useEffect(() => {
    if (!user || todayStr === prevTodayRef.current) return;
    fetchHabits(user.id, todayStr, { force: true });
    prevTodayRef.current = todayStr;
  }, [todayStr, user, fetchHabits]);

  /**
   * Settle elapsed rewards (ADR 0002).
   *
   * The app cannot run at 00:00 if it is closed, so "paid at midnight" means
   * paid the first moment the app is alive after the date rolls over. This runs
   * on three triggers, all of which are the same thing -- the app being open
   * across a day boundary:
   *   - mount, which catches a day that passed while the app was closed
   *   - the existing day-change detector, which catches a rollover while open
   *   - window focus, which covers the app being backgrounded over midnight
   *
   * Idempotent, so the overlap between these three is harmless.
   */
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const settle = async () => {
      try {
        const result = await settleElapsedRewards(user.id);
        if (cancelled || !result.didSettle) return;
        // One toast for the whole catch-up. A user returning after a week away
        // should not get seven separate notifications.
        showToast(
          result.settledDays === 1
            ? `Yesterday settled: +${result.xp} XP • +${result.diamonds} 💎`
            : `${result.settledDays} days settled: +${result.xp} XP • +${result.diamonds} 💎`
        );
      } catch (e) {
        // A failed settlement must not break the screen. It stays owed, and the
        // next trigger retries it.
        logWarn("habits", "reward settlement failed", e);
      }
    };

    void settle();

    const onVisible = () => {
      if (document.visibilityState === "visible") void settle();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.id, settleElapsedRewards, showToast]);

  useEffect(() => {
    fetchUser().then((u) => {
      if (u) {
        fetchHabits(u.id, selectedDate);
      }
    });
  }, [fetchUser, fetchHabits, selectedDate]);

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

  const handleToggle = useCallback(
    async (
      habitId: string,
      targetDate: string = selectedDate,
      e?: React.MouseEvent | React.TouchEvent
    ) => {
      if (!userId) return;
      if (targetDate > todayStr) {
        showToast("Cannot complete habits for future dates.");
        return;
      }

      // PERF-8b: the pre-toggle reads come from the store snapshot at call
      // time, not from this render's closure, so this callback stays
      // referentially stable and the memoised habit rows do not have to
      // re-render on every store write. Calling `getState()` BEFORE
      // `toggleHabitLog` sees the same values the previous render read.
      const before = useHabitStore.getState();
      const habit = before.habits.find((h) => h.id === habitId);
      // Captured before the toggle: after it, the store's counter already includes
      // this day, so the milestone check would never see the crossing.
      const prevDaysDone = before.daysDoneByHabit[habitId] ?? 0;
      const isNowCompleted = await toggleHabitLog(userId, habitId, targetDate);
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

      // No XP is credited here. Rewards accrue in the vault and are paid on
      // rollover (ADR 0002). Crediting the profile at the moment of the tick AND
      // settling the same day's accrual later was paying every completion twice.
      await fetchTemporaryWallet(userId);

      // Read the *store*, not the `habits`/`historyLogs` captured in this
      // closure: those are the values from before the toggle, so asking them
      // whether the day is now complete would always answer "one short". The
      // store has already been updated by toggleHabitLog.
      const live = useHabitStore.getState();
      const justCompletedTheDay = getDayHabitProgress(
        live.habits,
        targetDate,
        todayStr,
        live.todayLogs,
        live.historyLogs
      ).isAllCompleted;

      // M15 -- achievement micro-narratives. Only fires on a genuine upward
      // crossing of a days-done milestone, and only once per habit per milestone.
      const newDaysDone = live.daysDoneByHabit[habitId] ?? prevDaysDone;
      const unlocked = consumeNewAchievements(habitId, prevDaysDone, newDaysDone);
      if (unlocked.length > 0) {
        unlocked.forEach((a, i) => {
          window.setTimeout(() => showToast(`${a.title} — ${a.narrative}`), i * 4200);
        });
      }

      // M13 -- the toast copy lives in a tested module so the rules (never claim
      // more than happened, never call pending XP earned) are enforced once.
      showToast(
        getCompletionToast(
          justCompletedTheDay ? "perfect-day" : isScheduled ? "scheduled" : "rest-day",
          { xpPerCompletion: XP_PER_COMPLETION, perfectDayBonus: XP_PERFECT_DAY_BONUS }
        )
      );
    } else {
      await fetchTemporaryWallet(userId);
      showToast(getCompletionToast("reverted", {
        xpPerCompletion: XP_PER_COMPLETION,
        perfectDayBonus: XP_PERFECT_DAY_BONUS,
      }));
    }
    },
    // `selectedDate` is only the default-parameter fallback; it belongs in the
    // list so a day change does not hand the rows a stale callback.
    // `userId` (scalar) instead of `user`: an XP award replaces the user
    // object, and churning this identity would re-render every memoised row.
    [userId, todayStr, selectedDate, showToast, toggleHabitLog, fetchTemporaryWallet]
  );

  const handleCreateHabit = async (data: {
    name: string;
    icon: string;
    category: HabitCategory;
    frequency: number;
    targetDays: number[];
    timeOfDay?: "morning" | "afternoon" | "evening" | "anytime";
    priority?: "critical" | "focus" | "optional";
    cue?: string;
    reward?: string;
    emergencyVersion?: string;
    type?: "simple" | "counted" | "avoid";
    unit?: string;
    targetValue?: number;
    color?: string;
  }) => {
    if (!user) return;
    await addHabit({
      userId: user.id,
      name: data.name,
      category: data.category,
      frequency: "daily",
      targetDaysPerWeek: data.targetDays?.length || 7,
      targetDays: data.targetDays || [1, 2, 3, 4, 5, 6, 7],
      icon: data.icon,
      period: data.timeOfDay === "anytime" ? undefined : data.timeOfDay,
      priority: data.priority,
      cue: data.cue,
      reward: data.reward,
      emergencyVersion: data.emergencyVersion,
      type: data.type,
      unit: data.unit,
      targetValue: data.targetValue,
      color: data.color,
      archivedAt: undefined,
    });
    // One-off rewards for creating a habit. Deliberately NOT routed through the
    // vault: nothing was completed, so there is no day for it to accrue against.
    // It stays an immediate credit.
    await addXp(XP_CREATION_XP);
    await addDiamonds(XP_CREATION_DIAMONDS);
    await fetchUser();
    await fetchTemporaryWallet(user.id);
    await fetchHabits(user.id, selectedDate, { force: true });
    showToast(`Your journey with "${data.name}" begins now. First milestone: 3 days done. +${XP_CREATION_XP} XP • +${XP_CREATION_DIAMONDS} 💎 added`);
  };

  const handleUpdateHabit = async (
    habitId: string,
    updates: {
      name: string;
      icon: string;
      category: HabitCategory;
      frequency: "daily" | "weekly";
      targetDaysPerWeek: number;
      targetDays?: number[];
      period?: "morning" | "afternoon" | "evening";
      priority?: "critical" | "focus" | "optional";
       cue?: string;
       reward?: string;
       emergencyVersion?: string;
    type?: "simple" | "counted" | "avoid";
       unit?: string;
       targetValue?: number;
       color?: string;
     }
  ) => {
    await updateHabit(habitId, {
      name: updates.name,
      icon: updates.icon,
      category: updates.category,
      frequency: updates.frequency,
      targetDaysPerWeek: updates.targetDaysPerWeek,
      targetDays: updates.targetDays,
      period: updates.period,
      priority: updates.priority,
       cue: updates.cue,
       reward: updates.reward,
       emergencyVersion: updates.emergencyVersion,
       type: updates.type,
       unit: updates.unit,
       targetValue: updates.targetValue,
       color: updates.color,
     });
    if (user) await fetchHabits(user.id, selectedDate, { force: true });
    showToast("Habit updated.");
  };

  const handleDeleteHabit = async (habitId: string) => {
    await deleteHabit(habitId);
    // force: the habit list itself just changed in the database.
    if (user) await fetchHabits(user.id, selectedDate, { force: true });
    showToast("Habit deleted.");
  };

  // A quit habit's day is one of three things: clean (the run grows), a slip (the run
  // ends), or cleared. Tapping the active choice clears the day, which is the only way
  // back from a mis-tap without opening the edit sheet.
  const handleAvoidClean = useCallback(async (habit: Habit, date: string, isClean: boolean) => {
    if (!userId || isFutureSelectedDate) return;
    if (isClean) await toggleHabitLog(userId, habit.id, date);
    else await markHabitSlip(userId, habit.id, date, false);
  }, [userId, isFutureSelectedDate, toggleHabitLog, markHabitSlip]);

  const handleAvoidSlip = useCallback(async (habit: Habit, date: string, isSlipped: boolean) => {
    if (!userId || isFutureSelectedDate) return;
    await markHabitSlip(userId, habit.id, date, !isSlipped);
  }, [userId, isFutureSelectedDate, markHabitSlip]);

  // Long press gesture listeners to open habit editing modal.
  // PERF-8b: `useCallback` because these are props of the memoised habit
  // rows; refs and a stable setState keep them identity-stable.
  const startPress = useCallback((habit: Habit, e: React.TouchEvent | React.MouseEvent) => {
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
  }, [setEditingHabit]);

  const movePress = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!pressTimerRef.current) return;
    const clientX = "touches" in e && e.touches.length > 0 ? e.touches[0].clientX : "clientX" in e ? e.clientX : 0;
    const clientY = "touches" in e && e.touches.length > 0 ? e.touches[0].clientY : "clientY" in e ? e.clientY : 0;
    const dist = Math.hypot(clientX - pressStartPosRef.current.x, clientY - pressStartPosRef.current.y);
    if (dist > 12) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const endPress = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  // Drag gesture handlers for counted habits progress bar
  const handleDragStart = useCallback((habit: Habit, e: React.MouseEvent | React.TouchEvent, currentValue: number) => {
    if (isFutureSelectedDate) return;
    e.stopPropagation();
    isDraggingRef.current = true;
    dragHabitIdRef.current = habit.id;
    dragStartValueRef.current = currentValue;
    dragTargetValueRef.current = habit.targetValue ?? null;
    dragStartYRef.current = "touches" in e ? e.touches[0].clientY : e.clientY;
  }, [isFutureSelectedDate]);

const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current || dragHabitIdRef.current === null) return;
    e.preventDefault();
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartYRef.current - clientY; // positive = dragged up
    const step = Math.round(deltaY / 8); // 8px per step
    const newValue = Math.max(0, Math.min(dragTargetValueRef.current ?? 100, dragStartValueRef.current + step));

    if (user?.id && dragHabitIdRef.current) {
      setHabitLogValue(user.id, dragHabitIdRef.current, selectedDate, newValue);
    }
  }, [user, selectedDate, setHabitLogValue]);

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    dragHabitIdRef.current = null;
    dragStartValueRef.current = 0;
    dragTargetValueRef.current = null;
  }, []);

  // Attach global drag listeners
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => handleDragMove(e);
    const onEnd = () => handleDragEnd();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  // Handle click on date pill - increment counted habits by 1
  const handleDateClick = useCallback((date: string) => {
    if (isFutureSelectedDate) return;
    if (!user?.id) return;
    habits.forEach((h) => {
      if ((h.type ?? "simple") === "counted" && isHabitScheduledOnDate(h, date)) {
        const storeValue = useHabitStore.getState().historyValues?.[h.id]?.[date];
        const current = typeof storeValue === "number" ? storeValue : 0;
        setHabitLogValue(user.id, h.id, date, current + 1);
      }
    });
  }, [habits, isFutureSelectedDate, user, setHabitLogValue]);

  // Handle long press on date pill - fill to target for counted habits
  const handleDateLongPress = useCallback((date: string) => {
    if (isFutureSelectedDate) return;
    if (!user?.id) return;
    habits.forEach((h) => {
      if ((h.type ?? "simple") === "counted" && h.targetValue && isHabitScheduledOnDate(h, date)) {
        setHabitLogValue(user.id, h.id, date, h.targetValue);
      }
    });
    showToast("Target completed for all counted habits");
  }, [habits, isFutureSelectedDate, user, setHabitLogValue, showToast]);

  const handleCardClick = useCallback(async (habit: Habit, e?: React.MouseEvent | React.TouchEvent) => {
      if (isLongPressRef.current) {
        isLongPressRef.current = false;
        return;
      }
      if (isFutureSelectedDate) {
        showToast("Cannot complete habits for future dates.");
        return;
      }
      if ((habit.type ?? "simple") === "counted") {
        const storeValue = useHabitStore.getState().historyValues?.[habit.id]?.[selectedDate];
        const log = { completed: true, value: typeof storeValue === "number" ? storeValue : 0 };
        openValueInput(habit, log, selectedDate);
        return;
      }
      handleToggle(habit.id, selectedDate, e);
    }, [isFutureSelectedDate, selectedDate, showToast, openValueInput, handleToggle]);

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
        onDateClick={handleDateClick}
        onDateLongPress={handleDateLongPress}
      />




      {/* Reward Vault Banner

          Shows what TODAY has earned and not yet paid. The previous version added
          a flat 45 XP and 12 diamonds to this figure, which made the vault claim
          a balance the user had not earned; it now shows only real accruals.

          Nothing here is claimable yet: the day's rewards settle into the profile
          at rollover (ADR 0002), which is why the copy says "pending". */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-high p-3.5 flex items-center justify-between gap-2 border border-outline/10 shadow-sm">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-2 text-secondary">
          <Lock className="w-4 h-4" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase">Vault</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 bg-surface-container px-2.5 py-0.5 rounded-full text-primary font-mono text-xs font-semibold">
            <Sparkles className="w-3 h-3" />
            +{temporaryWallet?.todayAccruedXp || 0} XP
          </span>
          <span className="flex items-center gap-1 bg-surface-container px-2.5 py-0.5 rounded-full text-secondary font-mono text-xs font-semibold">
            💎 +{temporaryWallet?.todayAccruedDiamonds || 0}
          </span>
        </div>
      </div>

      {/* View Switcher Header (List vs Grid vs Heatmap) & Stats Summary */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Cross-fades on day change. Implemented with a CSS transition rather
              than a keyed motion element: changing a React `key` remounts the
              node, which leaves it on its initial state and never animates.

              With no habits at all there is no denominator, so printing
              "0/0 (0%)" would be a confident false zero — the same class of
              lie the M9 header placeholder exists to avoid. Say so plainly
              instead. */}
          <span
            key={formattedSelectedDate + percentage}
            className="text-xs font-mono font-bold text-on-surface animate-in fade-in slide-in-from-top-1 duration-300"
          >
            {habits.length === 0 ? (
              <>Nothing scheduled yet</>
            ) : (
              <>
                {formattedSelectedDate}
                {isFutureSelectedDate ? " (Upcoming)" : ""}: {completed}/{total} ({percentage}%)
              </>
            )}
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
        <HabitsEmptyState onAddFirst={() => setIsCreateModalOpen(true)} />
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
                const log = getCompletionRecord(h, selectedDate, todayStr, { todayLogs, historyLogs, historyValues });
                const isCompleted = isHabitComplete(h, log);
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
                  <HabitListCard
                    habit={h}
                    selectedDate={selectedDate}
                    todayStr={todayStr}
                    isFutureSelectedDate={isFutureSelectedDate}
                    todayRecord={todayLogs[h.id]}
                    historyRecord={historyLogs[h.id]}
                    valueRecord={historyValues[h.id]}
                    daysDone={daysDoneByHabit[h.id] ?? 0}
                    lastDoneAt={lastCompletedAt[h.id]}
                    userId={userId}
                    onSelectDate={setSelectedDate}
                    onToggle={handleToggle}
                    onAvoidClean={handleAvoidClean}
                    onAvoidSlip={handleAvoidSlip}
                    onDragStart={handleDragStart}
                    showToast={showToast}
                    setHabitLogValue={setHabitLogValue}
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
            {habits.map((h) => (
              <GridHabitCard
                key={h.id}
                habit={h}
                selectedDate={selectedDate}
                todayStr={todayStr}
                isFutureSelectedDate={isFutureSelectedDate}
                todayLogs={todayLogs}
                historyLogs={historyLogs}
                historyValues={historyValues}
                userId={user?.id ?? null}
                setHabitLogValue={setHabitLogValue}
                showToast={showToast}
                handleCardClick={handleCardClick}
                handleToggle={handleToggle}
                onAvoidClean={(isClean) => handleAvoidClean(h, selectedDate, isClean)}
                onAvoidSlip={(isSlipped) => handleAvoidSlip(h, selectedDate, isSlipped)}
                handleDragStart={handleDragStart}
                startPress={startPress}
                movePress={movePress}
                endPress={endPress}
                setEditingHabit={setEditingHabit}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* 3. HEATMAP VIEW (`B6`): one scrollable long-history matrix per habit,
           full width. The compact 70-day matrix showed ~10 weeks, which is not
           "long history"; the 52-week matrix is, and it scrolls. */
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
                  className={`p-3 sm:p-3.5 rounded-2xl bg-surface-container-low border shadow-xs transition-colors duration-200 select-none flex flex-col justify-between hover:bg-surface-container-high/40 active:scale-[0.98] border-l-4 ${
                    !isScheduled ? "border-dashed border-outline/20 opacity-90" : "border-outline/15"
                  } ${
                    h.priority === "critical" ? "border-l-red-500" :
                    h.priority === "focus" ? "border-l-amber-500" :
                    h.priority === "optional" ? "border-l-emerald-500" : "border-l-transparent"
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
                            {habitCategoryLabel(h)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                        {/* Same honest-zero rule: no icon with an empty count. */}
                        {(h.type === "avoid" || getDaysDoneLabel(daysDoneByHabit[h.id] ?? 0) !== "") && (
                          <span className={`font-bold text-[10px] font-mono flex items-center gap-0.5 ${h.type === "avoid" ? "text-error" : isDaysDoneActive(daysDoneByHabit[h.id] ?? 0) ? "text-amber-400" : "text-on-surface-variant/60"}`}>
                            {h.type === "avoid" ? <X className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
                            {h.type === "avoid" ? `${getDaysDoneLabel(daysDoneByHabit[h.id] ?? 0) || "0d"} clean` : getDaysDoneLabel(daysDoneByHabit[h.id] ?? 0)}
                          </span>
                        )}
                        {h.type === "avoid" && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border border-error/40 text-error">
                            Quit
                          </span>
                        )}
                        {h.priority && (
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                            h.priority === "critical" ? "border-red-500/40 text-red-500" :
                            h.priority === "focus" ? "border-amber-500/40 text-amber-500" :
                            "border-emerald-500/40 text-emerald-500"
                          }`}>
                            {h.priority === "critical" ? "🔴 Critical" : h.priority === "focus" ? "🟡 Focus" : "🟢 Optional"}
                          </span>
                        )}
                      {!isScheduled && (
                        <span className="px-1 py-0.2 rounded bg-surface-container-highest text-on-surface-variant text-[8px] font-mono font-bold">
                          Rest
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Long-history matrix (`B6`): 52 weeks, horizontally scrollable. */}
                  <HabitGitHubHeatmap
                    habitId={h.id}
                    name={h.name}
                    targetDays={h.targetDays}
                    targetDaysPerWeek={h.targetDaysPerWeek}
                    category={h.category}
                    type={h.type}
                    targetValue={h.targetValue}
                    selectedDate={selectedDate}
                    todayStr={todayStr}
                    showStats={false}
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

      {/* Value Input Popup for Counted Habits */}
      <AnimatePresence mode="wait">
        {valueInputHabit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/85"
            onClick={closeValueInput}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="w-full max-w-sm bg-surface-container rounded-2xl border border-outline/15 shadow-2xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-on-surface">Set Amount</h3>
                <button
                  type="button"
                  onClick={closeValueInput}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  <span className="font-mono text-lg">×</span>
                </button>
              </div>
              <div className="mb-4">
                <p className="text-sm font-semibold text-on-surface mb-1">{valueInputHabit.habit.name}</p>
                <p className="text-xs text-on-surface-variant">
                  Target: {valueInputHabit.habit.targetValue} {valueInputHabit.habit.unit ?? "units"} / day
                </p>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                value={valueInputAmount}
                onChange={(e) => setValueInputAmount(e.target.value)}
                autoFocus
                className="w-full mb-4 rounded-xl bg-surface-container-low border border-outline/10 px-4 py-3 text-lg font-mono text-on-surface text-center focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="0"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeValueInput}
                  className="flex-1 py-3 px-4 rounded-xl bg-surface-container-high text-on-surface-variant font-semibold transition-colors hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitValueInput}
                  className="flex-1 py-3 px-4 rounded-xl bg-primary text-on-primary font-semibold shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-primary text-on-primary px-4 py-2 rounded-full font-mono text-xs font-bold shadow-lg shadow-primary/25 animate-in fade-in zoom-in duration-200">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
