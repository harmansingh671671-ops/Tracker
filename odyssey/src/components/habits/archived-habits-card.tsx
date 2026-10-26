"use client";

import { useEffect, useState, useCallback } from "react";
import { Archive } from "lucide-react";
import { type Habit } from "@/lib/db";
import { useHabitStore } from "@/lib/stores/habit-store";
import { useUserStore } from "@/lib/stores/user-store";
import { ArchivedHabitsSection } from "./archived-habits-section";
import { getLocalTodayStr } from "@/lib/utils/habit-colors";

/**
 * B13 (owner instruction 2026-10-26): the archive lives HERE, on the profile
 * page — not on the habits screen. Restore is followed by a FORCE habits
 * refetch, because the habits store is a session-long singleton and its
 * non-force read early-returns, so the restored habit would otherwise not
 * appear until the day changed.
 */
export function ArchivedHabitsCard() {
  const { fetchArchivedHabits, restoreHabit, destroyHabit, fetchHabits, loadedUserId, todayLogsDate } =
    useHabitStore();
  const { user } = useUserStore();
  // `loadedUserId` covers a visit after the habits screen; the profile's own
  // `user.id` covers a COLD visit to /profile, where the habits store was
  // never loaded — the archive must not depend on which page was seen first.
  const archiveUserId = loadedUserId || user?.id || "";
  const [archived, setArchived] = useState<Habit[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const refresh = useCallback(async () => {
    if (!archiveUserId) return;
    try {
      const rows = await fetchArchivedHabits(archiveUserId);
      setArchived(rows);
    } catch {
      // The badge count simply stays as-is; read-only surface, nothing breaks.
    }
  }, [archiveUserId, fetchArchivedHabits]);

  useEffect(() => {
    // queueMicrotask: the same post-hydration pattern the habits page uses —
    // avoid a synchronous setState inside the effect body.
    let alive = true;
    queueMicrotask(() => {
      if (alive) void refresh();
    });
    return () => {
      alive = false;
    };
  }, [refresh]);

  const handleRestore = useCallback(
    async (habitId: string) => {
      await restoreHabit(habitId);
      if (archiveUserId) {
        await fetchHabits(archiveUserId, todayLogsDate || getLocalTodayStr(), { force: true });
      }
      await refresh();
      showToast("Habit restored.");
    },
    [restoreHabit, archiveUserId, todayLogsDate, fetchHabits, refresh, showToast]
  );

  const handleDeleteForever = useCallback(
    async (habitId: string) => {
      await destroyHabit(habitId);
      await refresh();
      showToast("Habit and its history deleted.");
    },
    [destroyHabit, refresh, showToast]
  );

  return (
    <section
      className="rounded-3xl bg-surface-container-low border border-outline/15 p-4 sm:p-5 shadow-sm space-y-3"
      aria-label="Archived habits"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-primary font-bold text-sm">
          <Archive className="w-4 h-4" />
          <span>Archive</span>
        </div>
        <span className="text-[11px] font-mono text-on-surface-variant">
          {archived.length} {archived.length === 1 ? "habit" : "habits"}
        </span>
      </div>

      {archived.length === 0 ? (
        <p className="text-[11px] font-mono text-on-surface-variant/80 leading-relaxed">
          Nothing archived yet. Habits you let go come here with all their history — a
          restored habit goes straight back exactly as it was.
        </p>
      ) : (
        <ArchivedHabitsSection archivedHabits={archived} onRestore={handleRestore} onDeleteForever={handleDeleteForever} />
      )}

      {toastMsg && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-surface-container-highest text-on-surface text-[11px] font-mono font-bold shadow-md border border-outline/15"
        >
          {toastMsg}
        </div>
      )}
    </section>
  );
}
