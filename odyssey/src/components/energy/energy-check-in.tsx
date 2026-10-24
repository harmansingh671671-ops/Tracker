"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Zap, X } from "lucide-react";
import { db } from "@/lib/db";
import { useUserStore } from "@/lib/stores/user-store";
import { localDateStr } from "@/lib/utils/local-date";
import { logWarn, readString, writeString } from "@/lib/utils/logger";
import {
  ENERGY_LEVELS,
  energyLogId,
  energySkipKey,
  normaliseEnergyLevel,
  shouldShowEnergyCheckIn,
} from "@/lib/utils/energy-check-in";

/**
 * S25 — the once-a-day energy prompt.
 *
 * Mounted by the app shell on every screen except onboarding and the day
 * editor. It asks at most once per local day: a logged answer closes it for the
 * day, and "Skip for today" writes only a per-day preference. There is no timer
 * — the check runs on mount and when the app becomes visible again, which is
 * exactly when "a new day started" can become true.
 */
export function EnergyCheckIn() {
  const { user } = useUserStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Once this session has answered or skipped, a read already in flight must not
  // reopen the prompt: `cancelled` covers unmount, this covers "settled".
  const settledRef = useRef(false);

  const userId = user?.id;

  const checkToday = useCallback(async (): Promise<boolean> => {
    if (!userId || settledRef.current) return false;
    const today = localDateStr();

    // The logger's wrapper, not localStorage directly: it is the project's one
    // guarded storage path (quota, private mode), and lint enforces it.
    if (readString(energySkipKey(today)) === "1") return false;

    try {
      const [todayLog, habitCount] = await Promise.all([
        db.energyLogs.get(energyLogId(userId, today)),
        db.habits.where("userId").equals(userId).count(),
      ]);

      return shouldShowEnergyCheckIn({
        profileReady: true,
        habitCount,
        hasLogToday: Boolean(todayLog),
        skippedToday: false,
      });
    } catch (err) {
      logWarn("energy", "Could not read today's energy state", err);
      return false;
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      // The setter lives in the promise callback, not in the effect body, so a
      // slow read can never cascade renders and a torn-down effect never opens it.
      void checkToday().then((shouldShow) => {
        if (cancelled || settledRef.current || !shouldShow) return;
        setError(null);
        setIsOpen(true);
      });
    };

    run();
    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkToday]);

  const handleSkip = () => {
    settledRef.current = true;
    // A preference write can fail (private mode, quota). The ref still ends the
    // asking for this session; only a relaunch could ask again.
    writeString(energySkipKey(localDateStr()), "1");
    setIsOpen(false);
  };

  const handlePick = async (value: number) => {
    if (!userId || isSaving) return;
    const level = normaliseEnergyLevel(value);
    if (!level) return;

    const today = localDateStr();
    setIsSaving(true);
    setError(null);
    try {
      await db.energyLogs.put({
        id: energyLogId(userId, today),
        userId,
        date: today,
        level,
        loggedAt: new Date().toISOString(),
      });
      settledRef.current = true;
      setIsOpen(false);
    } catch (err) {
      // Keep the sheet open: closing here would drop the answer on the floor.
      logWarn("energy", "Could not save today's energy level", err);
      setError("Couldn't save — try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-300">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="energy-check-in-title"
        className="relative w-full max-w-md bg-surface-container-high border border-outline/15 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-left overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-primary/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary font-mono text-xs font-bold">
            <Zap className="w-3.5 h-3.5" />
            <span>Daily Check-in</span>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            aria-label="Skip for today"
            className="p-2 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 id="energy-check-in-title" className="text-lg sm:text-xl font-bold text-on-surface tracking-tight">
            How&apos;s your energy today?
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            One tap, logged for today. Skip it and we won&apos;t ask again today.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {ENERGY_LEVELS.map((level) => (
            <button
              key={level.level}
              type="button"
              disabled={isSaving}
              onClick={() => void handlePick(level.level)}
              aria-label={`Energy level ${level.level}: ${level.label}`}
              className="min-h-16 flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-outline/15 bg-surface-container hover:bg-surface-container-highest hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors cursor-pointer disabled:opacity-60"
            >
              <span className="text-xl leading-none" aria-hidden="true">
                {level.emoji}
              </span>
              <span className="text-[10px] font-semibold text-on-surface">{level.label}</span>
              <span className="text-[9px] font-mono text-on-surface-variant">{level.level}/5</span>
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="text-xs font-semibold text-error">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSkip}
          className="w-full py-2.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          Skip for today
        </button>
      </div>
    </div>
  );
}
