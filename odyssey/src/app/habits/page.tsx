"use client";

import { logWarn, readString, writeString } from "@/lib/utils/logger";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useUserStore } from "@/lib/stores/user-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { CreateHabitModal } from "@/components/habits/create-habit-modal";
import { EditHabitModal } from "@/components/habits/edit-habit-modal";
import { HabitReviewCard } from "@/components/habits/habit-review-card";
import { PausedHabitRow } from "@/components/habits/paused-habit-row";
import { ArchivedHabitsSection } from "@/components/habits/archived-habits-section";
import { HabitGitHubHeatmap } from "@/components/habits/habit-github-heatmap";
import { HabitListCard } from "@/components/habits/habit-list-card";
import { KeystoneBadge } from "@/components/habits/keystone-badge";
import { HabitsSkeleton } from "@/components/habits/habits-skeleton";
import { HabitIcon } from "@/components/habits/habit-icon";
import { HabitDateStrip } from "@/components/habits/habit-date-strip";
import { HabitsEmptyState } from "@/components/habits/habits-empty-state";
import { type HabitCategory, type Habit } from "@/lib/db";
import { triggerStreaksConfetti } from "@/lib/utils/confetti";
import { getHabitColor, isHabitScheduledOnDate, getLocalTodayStr, habitCategoryLabel } from "@/lib/utils/habit-colors";
import {
  isPauseActive,
  isHabitStale,
  lastTouchedDate,
  pauseDaysLeft,
} from "@/lib/utils/habit-lifecycle";
import { useSharedClock } from "@/lib/utils/shared-clock";
import { getDayHabitProgress } from "@/lib/utils/habit-progress";
import { isHabitComplete, getCompletionRecord } from "@/lib/utils/habit-completion";
import { getCompletionToast, getDaysDoneLabel, isDaysDoneActive } from "@/lib/utils/warm-copy";
import { orderHabitsForDisplay, resolveKeystoneHabit } from "@/lib/utils/keystone";
import { useDaysDoneMilestones } from "@/components/habits/use-days-done-milestones";
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
  CalendarDays,
  X,
  Archive,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HabitGestureCard } from "@/components/habits/habit-gesture-card";
import { HabitSessionModal } from "@/components/habits/habit-session-modal";
import { clampCountedValue } from "@/lib/utils/habit-units";
import { halfTargetFloor } from "@/lib/utils/swipe-gesture";

// B4 (2026-10-20, owner instruction): the grid view was removed — grid cards
// are now list rows, so list and heatmap are the whole switcher.
type HabitViewMode = "list" | "heatmap";

/** Where the Habits view-mode preference is stored — `B6` requires a "saved preference". */
const HABITS_VIEW_STORAGE_KEY = "odyssey_habits_view";

/**
 * B13: the 14-day review's dismiss marker. It stores WHICH habit ids were
 * dismissed (not a date), so the review card only re-opens when a NEW habit
 * crosses the 14 quiet days — resuming or pausing a dismissed one does not
 * resurrect the same annoyance.
 */
const REVIEW_DISMISS_STORAGE_KEY = "odyssey_b13_review";

// PERF-5 -- the dialog primitive kit is ~20 KB gzipped and this screen draws no
// dialog on first paint, so it must not be part of the route's first load. Same
// pattern as `rank-up-dialog` in `header.tsx`; the page also mounts this only
// once a milestone fires, so the chunk is fetched at that moment, not at hydrate.
const MilestoneDialog = dynamic(
  () => import("@/components/gamification/milestone-dialog").then((m) => m.MilestoneDialog),
  { ssr: false }
);

export default function HabitsPage() {
  const { user, fetchUser, updateUser, addXp, addDiamonds } = useUserStore();
  // PERF-8b: the id as a scalar keeps the memoised rows' handler props stable
  // when the profile object itself is replaced (an XP award, a settings save).
  const userId = user?.id ?? null;  const {
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
    pauseHabit,
    resumeHabit,
    restoreHabit,
    destroyHabit,
    fetchArchivedHabits,
    loading: habitsLoading,
    loadedUserId,
  } = useHabitStore();

  // S24: one popup per crossed day milestone, whatever surface wrote the day.
  const { celebration: milestone, dismiss: dismissMilestone } =
    useDaysDoneMilestones(daysDoneByHabit, habits);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  /** `initialTab` for the edit sheet -- the session page opens it on "edit",
   *  every other open path (swipe-left, tap) opens on "history". */
  const [editingTab, setEditingTab] = useState<"history" | "edit">("history");
  /** The counted habit whose session page (timer/counter) is open. */
  const [sessionHabit, setSessionHabit] = useState<Habit | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // `B6` + M25: the view mode is a *saved preference*, and the heatmap is the
  // default (the owner's choice — a long-history view on opening the screen).
  // The stored value is applied once the client has hydrated, because reading
  // `localStorage` during the first render would make the server and client
  // markup disagree. M25: the first render assumes NOTHING (not even the
  // heatmap default) — the old default-then-correct swap mounted every matrix
  // TWICE and flashed heatmap-then-list; `null` shows the skeleton instead.
  const [viewMode, setViewModeState] = useState<HabitViewMode | null>(null);
  const setViewMode = useCallback((next: HabitViewMode) => {
    setViewModeState(next);
    writeString(HABITS_VIEW_STORAGE_KEY, next);
  }, []);
  const [valueInputHabit, setValueInputHabit] = useState<{ habit: Habit; log: { completed?: boolean; value?: number } | undefined; date: string } | null>(null);
  const [valueInputAmount, setValueInputAmount] = useState("");

  // B13 — the archive drawer state. `null` rows mean "not read yet"; the icon
  // shows its badge as soon as the read lands.
  const [archivedHabits, setArchivedHabits] = useState<Habit[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  // Dismissed review ids, `null` until the client marker is read (SSR-safe:
  // an `useState(localStorage...)` initializer would desync server markup).
  const [dismissedStaleIds, setDismissedStaleIds] = useState<string[] | null>(null);

  const [todayStr, setTodayStr] = useState<string>(getLocalTodayStr);
  const [selectedDate, setSelectedDate] = useState<string>(getLocalTodayStr);

  const isFutureSelectedDate = selectedDate > todayStr;

  // `B6` + M25: apply the saved view once the client has hydrated, and resolve
  // it before ANY card content renders (the skeleton gate above). Deferred with
  // `queueMicrotask` rather than set synchronously — the same fix `M14` used
  // for the rank dialog — because a synchronous `setState` in an effect
  // cascades a second render pass. An unset preference resolves to the
  // heatmap default at this point, which is where the default belongs.
  useEffect(() => {
    queueMicrotask(() => {
      const saved = readString(HABITS_VIEW_STORAGE_KEY, "");
      // "grid" falls back to list: the grid view was removed for B4 (2026-10-20).
      if (saved === "list" || saved === "grid") {
        setViewModeState("list");
      } else if (saved === "heatmap") {
        setViewModeState("heatmap");
      } else {
        setViewModeState("heatmap");
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

  // B13 — read the review dismiss marker once, after hydration (SSR safety:
  // never inside an useState initializer). Deferred with `queueMicrotask` —
  // the same pattern the view-mode effect uses — because a synchronous
  // setState in an effect cascades a second render pass.
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = readString(REVIEW_DISMISS_STORAGE_KEY, "");
        if (raw !== "") {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setDismissedStaleIds(parsed.filter((x): x is string => typeof x === "string"));
          } else {
            setDismissedStaleIds([]);
          }
        } else {
          setDismissedStaleIds([]);
        }
      } catch (e) {
        logWarn("habits", "review dismiss marker unreadable", e);
        setDismissedStaleIds([]);
      }
    });
  }, []);

  const refreshArchived = useCallback(async () => {
    if (!loadedUserId) return;
    try {
      const rows = await fetchArchivedHabits(loadedUserId);
      setArchivedHabits(rows);
    } catch (e) {
      logWarn("habits", "archive read failed", e);
    }
  }, [loadedUserId, fetchArchivedHabits]);

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (alive) void refreshArchived();
    });
    return () => {
      alive = false;
    };
  }, [refreshArchived]);

  // Track scheduled habits count for daily progress stats while keeping natural order
  const scheduledHabits = useMemo(() => {
    return habits.filter((h) => isHabitScheduledOnDate(h, selectedDate));
  }, [habits, selectedDate]);

  // S19 — the keystone leads both views; a stale or archived id changes nothing.
  // B13: paused habits sort to the BOTTOM of this list (keystone.ts), and the
  // views below render them as quiet rows instead of full cards.
  const orderedHabits = useMemo(
    () => orderHabitsForDisplay(habits, user?.keystoneHabitId),
    [habits, user?.keystoneHabitId]
  );

  // B13 — split the display list: full cards first, paused quiet-rows last.
  const pausedHabits = useMemo(
    () => orderedHabits.filter((h) => isPauseActive(h.pausedUntil, todayStr)),
    [orderedHabits, todayStr]
  );
  const activeHabits = useMemo(
    () => orderedHabits.filter((h) => !isPauseActive(h.pausedUntil, todayStr)),
    [orderedHabits, todayStr]
  );

  // B13 — the 14-day review's candidates: every non-paused, non-archived habit
  // whose last ANY-log day (or, for one never touched, its created day) is 14+
  // days ago. A partial counted fill still counts as a touch — the review only
  // speaks about habits that got NOTHING for two weeks.
  const staleHabits = useMemo(() => {
    if (loadedUserId !== userId || !userId) return [];
    return habits.filter((h) => {
      if (h.archivedAt) return false;
      if (isPauseActive(h.pausedUntil, todayStr)) return false;
      const logDates = Object.keys(historyLogs[h.id] ?? {});
      const last = lastTouchedDate(logDates.map((date) => ({ date })));
      return isHabitStale(last, h.createdAt, todayStr);
    });
    // isHabitStale/lastTouchedDate are imported pure functions, not reactive.
  }, [habits, historyLogs, todayStr, userId, loadedUserId]);

  const offeredStaleHabits = useMemo(() => {
    if (dismissedStaleIds === null) return [];
    return staleHabits.filter((h) => !dismissedStaleIds.includes(h.id));
  }, [staleHabits, dismissedStaleIds]);

  const dismissStale = useCallback((ids: string[]) => {
    const merged = Array.from(new Set([...(dismissedStaleIds ?? []), ...ids]));
    setDismissedStaleIds(merged);
    try {
      writeString(REVIEW_DISMISS_STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      logWarn("habits", "review dismiss marker not persisted", e);
    }
  }, [dismissedStaleIds]);

  const total = scheduledHabits.length || habits.length;
  const completed = habits.filter((h) => {
    return selectedDate === todayStr
      ? Boolean(todayLogs[h.id]?.completed || historyLogs[h.id]?.[selectedDate])
      : Boolean(historyLogs[h.id]?.[selectedDate] ?? todayLogs[h.id]?.completed);
  }).length;

  // The session page edits today's count through the same store path as the
  // card's water bar, so its "value so far" is read the same way advantageously.
  const sessionValue = useMemo(() => {
    if (!sessionHabit) return 0;
    const log = getCompletionRecord(sessionHabit, selectedDate, todayStr, {
      todayLogs,
      historyLogs,
      historyValues,
    });
    return typeof log?.value === "number" ? log.value : 0;
  }, [sessionHabit, selectedDate, todayStr, todayLogs, historyLogs, historyValues]);
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

      // M15/S24 -- milestone celebrations are NOT toasts any more: the popup
      // queue in `useDaysDoneMilestones` reads the store's days-done map, so it
      // also covers the surfaces this handler never runs for (heatmap cell,
      // inline calendar, counted stepper, edit modal).

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
    const created = await addHabit({
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
    // S19 — the first habit becomes the keystone (the empty state promises it);
    // later habits never steal the pin from a habit that already holds it.
    if (!user.keystoneHabitId) await updateUser({ keystoneHabitId: created.id });
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
    // The session page may be under this sheet with the OLD habit object
    // (unit, target). Refresh it from the live store; a deleted habit gets
    // `null` here, which unmounts the session rather than showing a ghost.
    const live = useHabitStore.getState();
    setSessionHabit((prev) => (prev ? live.habits.find((h) => h.id === prev.id) ?? null : null));
  };

  const handleDeleteHabit = async (habitId: string) => {
    await deleteHabit(habitId);
    // force: the habit list itself just changed in the database.
    if (user) await fetchHabits(user.id, selectedDate, { force: true });
    showToast("Habit deleted.");
    // A deleted habit can be the one under a session page — that page has
    // nothing to write into anymore, so it closes.
    setSessionHabit((prev) => (prev?.id === habitId ? null : prev));
  };

  // B13 — pause / resume / let go / restore. Each one refetches with force
  // (the list itself changed in the database) and refreshes the archive read.
  const handlePauseHabit = useCallback(
    async (habitId: string, days: number) => {
      await pauseHabit(habitId, days);
      // The habit is off the expectations list; the review must not reactivate
      // only because it resumed — its quiet stretch was already dismissed.
      dismissStale([habitId]);
      if (userId) await fetchHabits(userId, selectedDate, { force: true });
      showToast(`Paused for ${days} day${days === 1 ? "" : "s"}.`);
    },
    [pauseHabit, dismissStale, userId, fetchHabits, selectedDate, showToast]
  );

  const handleResumeHabit = useCallback(
    async (habitId: string) => {
      await resumeHabit(habitId);
      dismissStale([habitId]);
      if (userId) await fetchHabits(userId, selectedDate, { force: true });
      showToast("Habit resumed.");
    },
    [resumeHabit, dismissStale, userId, fetchHabits, selectedDate, showToast]
  );

  const handleLetGoHabit = useCallback(
    async (habit: Habit) => {
      // `deleteHabit` is a soft-archive: the habit and ALL of its history stay
      // in the database, restorable from the archive drawer.
      await deleteHabit(habit.id);
      if (userId) await fetchHabits(userId, selectedDate, { force: true });
      void refreshArchived();
      showToast("Habit let go — bring it back anytime from the archive.");
      setSessionHabit((prev) => (prev?.id === habit.id ? null : prev));
    },
    [deleteHabit, userId, fetchHabits, selectedDate, refreshArchived, showToast]
  );

  const handleRestoreHabit = useCallback(
    async (habitId: string) => {
      await restoreHabit(habitId);
      if (userId) await fetchHabits(userId, selectedDate, { force: true });
      await refreshArchived();
      showToast("Habit restored.");
    },
    [restoreHabit, userId, fetchHabits, selectedDate, refreshArchived, showToast]
  );

  const handleDeleteForever = useCallback(
    async (habitId: string) => {
      await destroyHabit(habitId);
      if (userId) await fetchHabits(userId, selectedDate, { force: true });
      await refreshArchived();
      showToast("Habit and its history deleted.");
    },
    [destroyHabit, userId, fetchHabits, selectedDate, refreshArchived, showToast]
  );

  const handleArchiveIconClick = useCallback(() => {
    if (archivedHabits.length === 0) {
      showToast("Nothing archived yet");
      return;
    }
    setShowArchived((v) => !v);
  }, [archivedHabits.length, showToast]);

  // B13 — the pause state the edit sheet renders. Read from the LIVE store
  // habit so a pause made inside the sheet updates it immediately, kept as a
  // scalar so the modal's `habit` prop itself never changes identity (the
  // sheet's form-seed guard depends on stable identity; a replaced object
  // would reset unsaved edits).
  const editingPausedLeft = useMemo(() => {
    if (!editingHabit) return null;
    const live = habits.find((h) => h.id === editingHabit.id);
    if (!live || !isPauseActive(live.pausedUntil, todayStr)) return null;
    return live.pausedUntil ? pauseDaysLeft(live.pausedUntil, todayStr) : null;
  }, [editingHabit, habits, todayStr]);

  // S19 — designation only ever MOVES the pin (choosing another habit rewrites
  // the id; archiving retires it), so there is no clear path and no toast on
  // success. A failed write is reported: the chip appears only if it landed.
  const handleSetKeystone = useCallback(
    async (habitId: string) => {
      try {
        await updateUser({ keystoneHabitId: habitId });
      } catch {
        showToast("Couldn't save your keystone — try again.");
      }
    },
    [updateUser, showToast]
  );

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

  // PERF-19: the heatmap's delegated tap-to-toggle now arrives with the
  // habitId first, so ONE stable callback can serve every matrix on the page
  // instead of a fresh closure per card per render (which would defeat the
  // matrix's React.memo).
  const handleHeatmapCellToggle = useCallback(
    (habitId: string, dateStr: string, e: React.MouseEvent | React.TouchEvent) =>
      handleToggle(habitId, dateStr, e),
    [handleToggle]
  );

  // B4 gesture handlers — consumed by `HabitGestureCard`, which replaces the
  // removed hold-to-edit plumbing above.
  //
  // Hold, or a committed swipe-right on a simple habit: mark the habit FULLY
  // done for the selected day.
  //
  // Hold on a COUNTED habit changed owner-side (2026-10-25): it now opens the
  // session page (timer for time units, counter otherwise) instead of
  // completing — `onHold` in the gesture hook routes it here and `onComplete`
  // never fires for counted cards. Swipe-right still locks a counted card and
  // reveals its fill options, so nothing else about counted gestures moved.
  // Streaks, counters and confetti all move inside the store exactly as they
  // do for a tap.
  const handleHoldComplete = useCallback(
    async (habit: Habit) => {
      if (!userId) return;
      if (isFutureSelectedDate) {
        showToast("Cannot complete habits for future dates.");
        return;
      }
      const type = habit.type ?? "simple";
      // Quit habits complete through the clean/slip pair, never a "done" mark.
      if (type === "avoid") return;
      if (type === "counted") {
        const target = habit.targetValue ?? 0;
        if (!(target > 0)) {
          showToast("Add a target amount to this habit first");
          return;
        }
        await setHabitLogValue(userId, habit.id, selectedDate, target);
        showToast(`Filled to ${target} ${habit.unit ?? "units"}`);
        return;
      }
      // Simple: read the store snapshot at call time (the `handleToggle`
      // pattern) so this callback stays referentially stable. Repeating the
      // hold must not undo — a repeat is a no-op, undo lives on the ring tap.
      const before = useHabitStore.getState();
      const isAlreadyDone =
        selectedDate === todayStr
          ? Boolean(before.todayLogs[habit.id]?.completed || before.historyLogs[habit.id]?.[selectedDate])
          : Boolean(before.historyLogs[habit.id]?.[selectedDate] ?? before.todayLogs[habit.id]?.completed);
      if (isAlreadyDone) {
        showToast("Already completed");
        return;
      }
      await handleToggle(habit.id, selectedDate);
    },
    [userId, isFutureSelectedDate, selectedDate, todayStr, setHabitLogValue, showToast, handleToggle]
  );

  // The three rectangles a counted habit's swipe-right reveals.
  const handleCountedSwipeAction = useCallback(
    async (habit: Habit, kind: "all" | "half" | "one") => {
      if (!userId) return;
      if (isFutureSelectedDate) {
        showToast("Cannot complete habits for future dates.");
        return;
      }
      const unit = habit.unit ?? "units";
      const target = habit.targetValue ?? 0;
      const storeValue = useHabitStore.getState().historyValues?.[habit.id]?.[selectedDate];
      const base = typeof storeValue === "number" ? storeValue : 0;
      if (kind === "all") {
        if (!(target > 0)) {
          showToast("Add a target amount to this habit first");
          return;
        }
        await setHabitLogValue(userId, habit.id, selectedDate, target);
        showToast(`Filled to ${target} ${unit}`);
        return;
      }
      // +X is half the target, rounded DOWN (owner decision); values cap at
      // the target so a repeat can never overshoot it.
      const step = kind === "half" ? halfTargetFloor(habit.targetValue) : 1;
      if (step < 1) return;
      await setHabitLogValue(
        userId,
        habit.id,
        selectedDate,
        target > 0 ? Math.min(target, base + step) : base + step
      );
      showToast(`Logged +${step} ${unit}`);
    },
    [userId, isFutureSelectedDate, selectedDate, setHabitLogValue, showToast]
  );

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

  // Hold on a counted habit → the session page (timer/counter). A counted
  // habit WITHOUT a target still opens: the page explains and links to edit.
  const handleSessionOpen = useCallback(
    (habit: Habit) => {
      if (isFutureSelectedDate) {
        showToast("Cannot complete habits for future dates.");
        return;
      }
      setSessionHabit(habit);
    },
    [isFutureSelectedDate, showToast]
  );

  const handleCardClick = useCallback(async (habit: Habit, e?: React.MouseEvent | React.TouchEvent) => {
      // B4: the old isLongPressRef guard for hold-to-edit lived here; the
      // gesture card now suppresses the click a hold/swipe synthesizes itself.
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
          {/* B13 — the archive icon. The COUNT is the only permanent signal: the
              section itself renders only when there is something to show and
              the icon was tapped. An empty archive says so plainly. */}
          <button
            type="button"
            onClick={handleArchiveIconClick}
            title={archivedHabits.length === 0 ? "Archive" : `Archive — ${archivedHabits.length} habit${archivedHabits.length === 1 ? "" : "s"}`}
            aria-label={`Archive (${archivedHabits.length})`}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
              showArchived
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface border-outline/15"
            }`}
          >
            <Archive className="w-4 h-4" />
            {archivedHabits.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-on-primary text-[8px] font-bold font-mono rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-[3px]">
                {archivedHabits.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Habit</span>
          </button>
        </div>
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

      {/* B13 — the 14-day quiet review. Ask-first: it offers Pause / Let go /
          Keep per quiet habit and never touches data by itself. It mounts only
          once habits are loaded AND the client marker has been read, so the
          server never paints it and a dismissed set is honored from frame 0. */}
      {dismissedStaleIds !== null && (
        <AnimatePresence>
          {offeredStaleHabits.length > 0 && (
            <HabitReviewCard
              staleHabits={offeredStaleHabits}
              onPause={(id, days) => void handlePauseHabit(id, days)}
              onLetGo={(h) => void handleLetGoHabit(h)}
              onKeep={(id) => dismissStale([id])}
              onDismissAll={() => dismissStale(offeredStaleHabits.map((h) => h.id))}
            />
          )}
        </AnimatePresence>
      )}

      {/* View Switcher Header (List / Heatmap) & Stats Summary */}
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

        {/* View Switcher (List / Heatmap). B4, owner instruction 2026-10-20:
            the Grid card was merged into the list view, so the switcher is two
            modes. A stored "grid" preference falls back to List on restore. */}
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

      {/* Main Content Area Based on View Mode. M25 skeleton-first: until the
          saved view preference is resolved AND the store has data (or the
          empty verdict is certain) no card content mounts — so the screen
          never paints the default heatmap, then the saved view, and never
          flashes the empty state before real habits arrive. Revisits with
          cached habits skip this entirely. */}
      {viewMode === null || !userId || (habits.length === 0 && habitsLoading) ? (
        <HabitsSkeleton />
      ) : habits.length === 0 ? (
        <HabitsEmptyState onAddFirst={() => setIsCreateModalOpen(true)} />
      ) : viewMode === "list" ? (
        /* 1. LIST VIEW: Full-width interactive cards for selected date */
        /* Each card is keyed by `${selectedDate}-${h.id}` so switching days
           unmounts the old set and mounts a new one, which is what lets the
           enter animation play. The date must be in the KEY, not on the parent
           div: putting key= on the parent remounts the whole subtree including
AnimatePresence, which suppresses the enter transition and leaves the
            cards stuck at the initial opacity of 0. */
         /* overflow-x-clip: a locked counted card translates past the row's
             right edge (`HabitGestureCard` round 4); without the clip the
             transformed card would widen the document's scrollable area and
             the whole page could be panned sideways. */
         <div className="space-y-2.5 overflow-x-clip">
            <AnimatePresence mode="popLayout" initial={false}>
{activeHabits.map((h) => {
                const isScheduled = isHabitScheduledOnDate(h, selectedDate);
                const log = getCompletionRecord(h, selectedDate, todayStr, { todayLogs, historyLogs, historyValues });
                const isCompleted = isHabitComplete(h, log);
                const habitColor = getHabitColor(h);

              return (
                <HabitGestureCard
                  key={`${selectedDate}-${h.id}`}
                  habit={h}
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
                  onCardClick={handleCardClick}
                  onEdit={setEditingHabit}
                  onComplete={handleHoldComplete}
                  onHold={handleSessionOpen}
                  onCountedAction={handleCountedSwipeAction}
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
                    isKeystone={h.id === user?.keystoneHabitId}
                    onSelectDate={setSelectedDate}
                    onToggle={handleToggle}
                    onAvoidClean={handleAvoidClean}
                    onAvoidSlip={handleAvoidSlip}
                    onDragStart={handleDragStart}
                    showToast={showToast}
                    setHabitLogValue={setHabitLogValue}
                  />
                </HabitGestureCard>
              );
            })}
            </AnimatePresence>

            {/* B13 — paused habits: visible, at the bottom, no expectations.
                A simple identity row with the days-left chip and Resume; not a
                swipeable card, because nothing on it can be progressed. */}
            {pausedHabits.length > 0 && (
              <div className="space-y-2.5 pt-1" aria-label="Paused habits">
                <AnimatePresence mode="popLayout" initial={false}>
                  {pausedHabits.map((h) => (
                    <motion.div
                      key={`paused-${h.id}`}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    >
                      <PausedHabitRow
                        habit={h}
                        todayStr={todayStr}
                        onResume={(id) => void handleResumeHabit(id)}
                        onOpen={setEditingHabit}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
      ) : (
        /* 2. HEATMAP VIEW (`B6`, windowed `M25`): one 16-week matrix per habit
           with ‹/› paging instead of the year-wide inner scroller. */
        <div className="space-y-2.5 overflow-x-clip">
          <AnimatePresence mode="popLayout" initial={false}>
            {activeHabits.map((h) => {
              const isScheduled = isHabitScheduledOnDate(h, selectedDate);
              const isCompleted = selectedDate === todayStr
                ? Boolean(todayLogs[h.id]?.completed || historyLogs[h.id]?.[selectedDate])
                : Boolean(historyLogs[h.id]?.[selectedDate] ?? todayLogs[h.id]?.completed);
              const habitColor = getHabitColor(h);
              return (
                <HabitGestureCard
                  key={h.id}
                  habit={h}
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
                  onEdit={setEditingHabit}
                  onComplete={handleHoldComplete}
                  onHold={handleSessionOpen}
                  onCountedAction={handleCountedSwipeAction}
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
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="text-xs font-bold text-on-surface truncate leading-tight" title={h.name}>
                            {h.name}
                          </h4>
                          {h.id === user?.keystoneHabitId && <KeystoneBadge />}
                        </div>
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

                  {/* Long-history matrix, windowed + paged (`B6`, `M25`).
                      Wrap it in a spacer that STOPS the legacy pointer events:
                      a touch on the matrix must never start (or commit) a
                      card swipe or arm a card hold — the page itself stays
                      the scroll target, since the matrix has no inner
                      scroller (a swipe from the card's header area still
                      works, B4 round 2). */}
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    /* And the contextmenu the phone synthesizes on a
                       long-press — a matrix cell's hold has ALWAYS been the
                       tap-to-toggle per-date function (owner 2026-10-26), so
                       without this the cell's long-press bubbled into the
                       card's own hold path and opened the edit sheet. */
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
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
                      onSelectDate={setSelectedDate}
                      onToggleDate={handleHeatmapCellToggle}
                    />
                  </div>
                </HabitGestureCard>
              );
            })}
            </AnimatePresence>

            {/* B13 — paused habits in the heatmap view get the same quiet rows. */}
            {pausedHabits.length > 0 && (
              <div className="space-y-2.5 pt-1" aria-label="Paused habits">
                <AnimatePresence mode="popLayout" initial={false}>
                  {pausedHabits.map((h) => (
                    <motion.div
                      key={`paused-heatmap-${h.id}`}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    >
                      <PausedHabitRow
                        habit={h}
                        todayStr={todayStr}
                        onResume={(id) => void handleResumeHabit(id)}
                        onOpen={setEditingHabit}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
      )}

      {/* B13 — the archive drawer. Rendered only when there is something in it
          AND the header icon was tapped; restored rows drop out as they come
          back, and delete-forever is the only way a habit's history is lost. */}
      {showArchived && archivedHabits.length > 0 && (
        <ArchivedHabitsSection
          archivedHabits={archivedHabits}
          onRestore={(id) => void handleRestoreHabit(id)}
          onDeleteForever={(id) => void handleDeleteForever(id)}
        />
      )}

      {/* Counted-habit session page (timer / counter), opened by press-and-hold
          on a counted card in either view. */}
      {sessionHabit && (
        <HabitSessionModal
          key={sessionHabit.id}
          habit={sessionHabit}
          currentValue={sessionValue}
          isFutureSelectedDate={isFutureSelectedDate}
          onSetValue={(value) => {
            if (!userId || isFutureSelectedDate) return;
            void setHabitLogValue(userId, sessionHabit.id, selectedDate, clampCountedValue(value));
          }}
          showToast={showToast}
          /* Keeps the session mounted: the edit sheet stacks above it, so a
             running timer survives the detour and the page is still there
             when the sheet closes. */
          onRequestEdit={() => {
            setEditingHabit(sessionHabit);
            setEditingTab("edit");
          }}
          onClose={() => setSessionHabit(null)}
        />
      )}

      {/* Edit Habit Modal */}
      {editingHabit && (
        <EditHabitModal
          habit={editingHabit}
          isOpen={true}
          initialTab={editingTab}
          selectedDate={selectedDate}
          todayStr={todayStr}
          onSelectDate={(newDate) => setSelectedDate(newDate)}
          onClose={() => {
            setEditingHabit(null);
            setEditingTab("history");
          }}
          onSave={handleUpdateHabit}
          onDelete={handleDeleteHabit}
          isKeystone={editingHabit.id === user?.keystoneHabitId}
          keystoneHabitName={resolveKeystoneHabit(habits, user?.keystoneHabitId)?.name}
          onSetKeystone={handleSetKeystone}
          onPause={(days) => void handlePauseHabit(editingHabit.id, days)}
          onResume={() => void handleResumeHabit(editingHabit.id)}
          pausedDaysLeft={editingPausedLeft}
        />
      )}

      {/* S24 -- day-milestone popup, mounted only while one is queued so the
          dialog kit is not part of this route's first load (PERF-5). */}
      {milestone && (
        <MilestoneDialog entry={milestone} onClose={dismissMilestone} />
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
