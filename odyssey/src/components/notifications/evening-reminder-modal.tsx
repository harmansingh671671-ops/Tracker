"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/stores/user-store";
import { db } from "@/lib/db";
import { Moon, Sparkles, X, ChevronRight } from "lucide-react";

export function EveningReminderModal() {
  const router = useRouter();
  const { user } = useUserStore();
  const [isOpen, setIsOpen] = useState(false);
  const [tomorrowDateStr, setTomorrowDateStr] = useState<string>("");
  const [tomorrowFormatted, setTomorrowFormatted] = useState<string>("");
  const [plannedHours, setPlannedHours] = useState<number>(0);

  const checkTomorrowSchedule = useCallback(async () => {
    if (!user) return;

    // Check if after 20:00 (8:00 PM)
    const now = new Date();
    const currentH = now.getHours();

    // Check if dismissed in this browser session
    const dismissedKey = `odyssey_dismiss_2000_${now.toISOString().split("T")[0]}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(dismissedKey)) {
      return;
    }

    // Tomorrow's date
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    const tomorrowStr = `${yyyy}-${mm}-${dd}`;

    setTomorrowDateStr(tomorrowStr);
    setTomorrowFormatted(
      tomorrow.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    );

    // Query tomorrow's blocks
    const tomorrowBlocks = await db.scheduleBlocks
      .where("[userId+date]")
      .equals([user.id, tomorrowStr])
      .toArray();

    // Calculate total hours
    const hourMap = new Set<number>();
    for (const b of tomorrowBlocks) {
      const [sHStr] = b.startTime.split(":");
      const [eHStr] = b.endTime.split(":");
      const sH = parseInt(sHStr, 10);
      let eH = parseInt(eHStr, 10);
      if (b.endTime === "24:00" || (eH === 0 && sH > 0)) eH = 24;
      for (let h = sH; h < eH; h++) {
        hourMap.add(h);
      }
    }

    const hoursCount = hourMap.size;
    setPlannedHours(hoursCount);

    // Trigger if after 20:00 and schedule is incomplete (< 16 hours planned)
    const isPast2000 = currentH >= 20;
    if (isPast2000 && hoursCount < 16) {
      setIsOpen(true);

      // Attempt native browser notification if granted
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification("Odyssey: Plan Tomorrow's Schedule", {
              body: `It's past 20:00! Your schedule for tomorrow is incomplete (${hoursCount}/24h planned). Lock in your cadence before bed.`,
              icon: "/favicon.ico",
            });
          } catch {
            // Notification silenced or unsupported
          }
        }
      }
    }
  }, [user]);

  useEffect(() => {
    checkTomorrowSchedule();
    // Check every 60 seconds
    const interval = setInterval(checkTomorrowSchedule, 60000);
    return () => clearInterval(interval);
  }, [checkTomorrowSchedule]);

  const handleDismiss = () => {
    setIsOpen(false);
    const now = new Date();
    const dismissedKey = `odyssey_dismiss_2000_${now.toISOString().split("T")[0]}`;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(dismissedKey, "true");
    }
  };

  const handleOpenSchedulePage = () => {
    handleDismiss();
    const tomorrowDayNum = Math.max(1, (user?.streak ?? 0) + 2);
    router.push(`/planner?date=${tomorrowDateStr}&day=${tomorrowDayNum}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-surface-container-high border border-amber-400/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-left overflow-hidden">
        {/* Ambient Background Glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-primary/15 rounded-full blur-2xl pointer-events-none" />

        {/* Header Badge & Close Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 font-mono text-xs font-bold">
            <Moon className="w-3.5 h-3.5" />
            <span>20:00 Cadence Ritual</span>
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
            Plan Tomorrow's Schedule
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            It's past 20:00! Your schedule for{" "}
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
            <span className="text-on-surface-variant font-medium">Tomorrow's Cadence</span>
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
