"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/stores/user-store";
import { db } from "@/lib/db";
import { Moon, Sparkles, X, ChevronRight } from "lucide-react";
import { getJourneyDayNumber } from "@/lib/utils/journey";
import {
  countPlannedHours,
  dismissalKeyFor,
  isPastReminderHour,
  msUntilNextEvaluation,
  shouldOpenReminder,
  // Aliased: the component has a state variable of the same name, and an
  // un-aliased import is shadowed by it — `tomorrowDateStr(now)` below would
  // have resolved to the `string` state and thrown at runtime.
  tomorrowDateStr as getTomorrowDateStr,
} from "@/lib/utils/evening-reminder";

export function EveningReminderModal() {
  const router = useRouter();
  const { user } = useUserStore();
  const [isOpen, setIsOpen] = useState(false);
  const [tomorrowDateStr, setTomorrowDateStr] = useState<string>("");
  const [tomorrowFormatted, setTomorrowFormatted] = useState<string>("");
  const [plannedHours, setPlannedHours] = useState<number>(0);

  const checkTomorrowSchedule = useCallback(async () => {
    if (!user) return;

    const now = new Date();

    // **Cheapest guard first.** Before the hour the modal cannot appear, so there
    // is no reason to touch the database, set state, or re-render at all. The old
    // version read tomorrow's blocks and only then decided not to open anything —
    // twenty wasted hours a day.
    if (!isPastReminderHour(now)) return;

    if (sessionStorage.getItem(dismissalKeyFor(now))) return;

    const tomorrowStr = getTomorrowDateStr(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const tomorrowBlocks = await db.scheduleBlocks
      .where("[userId+date]")
      .equals([user.id, tomorrowStr])
      .toArray();

    const hoursCount = countPlannedHours(tomorrowBlocks);

    // State is written ONLY when the modal will actually open. Previously all
    // three setters ran every minute regardless — a re-render a minute for values
    // nobody was looking at.
    if (!shouldOpenReminder(hoursCount, now)) return;

    setTomorrowDateStr(tomorrowStr);
    setTomorrowFormatted(
      tomorrow.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    );
    setPlannedHours(hoursCount);
    setIsOpen(true);

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new Notification("Odyssey: Plan Tomorrow's Schedule", {
            body: `It's past 20:00! Your schedule for tomorrow is incomplete (${hoursCount}/24h planned). Plan your day before bed.`,
            icon: "/favicon.ico",
          });
        } catch {
          // Notification silenced or unsupported
        }
      }
    }
  }, [user]);

  /**
   * Self-rescheduling timeout at the next moment the answer could change, plus a
   * `visibilitychange` re-check.
   *
   * **This replaces a 60-second `setInterval` that ran for the life of the app** —
   * roughly 1,440 database reads a day while it was open, plus four `setState`
   * calls a minute (`AGENTS.md` rule 16, timer sprawl). Now: before 20:00 it is
   * **one** timer for the whole afternoon; after 20:00 it is per-minute but only
   * inside the window where it can matter; and not at all while the modal is open
   * or the tab is hidden.
   */
  useEffect(() => {
    // No user, nothing to check. Modal open, nothing to gain: the user cannot
    // edit the schedule behind an overlay, so the timer does not merely stop
    // re-checking — it is not created at all.
    if (!user || isOpen) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    // `cancelled` is what makes the race safe. If the modal opens while this
    // evaluation is still awaiting the database, the effect tears down and sets
    // the flag; the `.finally()` below then declines to schedule, so a timer can
    // never be armed behind a closed-over cancelled effect and leak.
    const run = () => {
      if (cancelled) return;
      void checkTomorrowSchedule().finally(() => {
        if (cancelled) return;
        timer = setTimeout(run, msUntilNextEvaluation(new Date()));
      });
    };

    // A suspended tab can miss its boundary entirely — the 20:00 timeout would
    // fire hours late, or the tab may have been throttled past it. Re-evaluating
    // on wake is both cheaper than a short timer firing into a hidden document
    // and more correct than trusting a timer that may never have run.
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (timer) clearTimeout(timer);
      run();
    };

    document.addEventListener("visibilitychange", onVisibility);
    run();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkTomorrowSchedule, user, isOpen]);

  const handleDismiss = () => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      // **Local** day, not `toISOString()`. The key used to be the UTC date while
      // the trigger used the local hour, so for most timezones "dismissed" was
      // written under the wrong day and the modal reappeared the next evening.
      sessionStorage.setItem(dismissalKeyFor(new Date()), "true");
    }
  };

  const handleOpenSchedulePage = () => {
    handleDismiss();
    const tomorrowDayNum = getJourneyDayNumber(user?.createdAt) + 1;
    router.push(`/day-schedule?date=${tomorrowDateStr}&day=${tomorrowDayNum}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-surface-container-high border border-amber-400/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-left overflow-hidden">
        {/* Ambient Background Glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-primary/15 rounded-full blur-2xl pointer-events-none" />

        {/* Header Badge & Close Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 font-mono text-xs font-bold">
            <Moon className="w-3.5 h-3.5" />
            <span>20:00 Evening Plan</span>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-lg sm:text-xl font-bold text-on-surface tracking-tight">
            Plan Tomorrow&apos;s Schedule
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            It&apos;s past 20:00! Your schedule for{" "}
            <span className="font-bold text-on-surface">
              {tomorrowFormatted}
            </span>{" "}
            is incomplete (
            <span className="font-mono font-bold text-amber-400">
              {plannedHours}/24 hrs
            </span>{" "}
            planned). Lock in your blocks now so you start tomorrow with total focus.
          </p>
        </div>

        {/* Quick Status Bar */}
        <div className="p-3 rounded-2xl bg-surface-container border border-outline/15 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-on-surface-variant font-medium">Tomorrow&apos;s Schedule</span>
            <span className="text-amber-400 font-bold">{plannedHours} / 24 hrs</span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary transition-all duration-500"
              style={{ width: `${Math.round((plannedHours / 24) * 100)}%` }}
            />
          </div>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleOpenSchedulePage}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-xs sm:text-sm shadow-xl shadow-primary/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Plan Tomorrow Now</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="py-3 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface-variant text-xs font-semibold transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
