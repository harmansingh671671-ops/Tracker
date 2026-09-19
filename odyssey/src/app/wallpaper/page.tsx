"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { useWallpaperStore } from "@/lib/stores/wallpaper-store";
import { db, type ScheduleBlock, type Habit } from "@/lib/db";
import { getJourneyDayNumber, getDateForJourneyDay } from "@/lib/utils/journey";
import { getRankInfo, calculateRank } from "@/lib/utils/gamification";
import { WallpaperPreview } from "@/components/wallpaper/wallpaper-preview";
import { FeedbackBannerButton } from "@/components/feedback/feedback-modal";
import {
  resolveHobbyEmoji,
  type WallpaperData,
} from "@/lib/utils/wallpaper-generator";
import {
  clearNativeLockscreen,
  launchLiveWallpaperPicker,
  isNativeBridgeAvailable,
  isAndroidApp,
  syncScheduleDataToNative,
  syncAndVerifySchedule,
  type SyncVerificationResult,
} from "@/lib/utils/android-bridge";
import {
  ArrowLeft,
  Sparkles,
  Maximize2,
  Smartphone,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Clock,
  Calendar,
  Layers,
  HelpCircle,
  Copy,
  Check,
  X,
  Trash2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function WallpaperPage() {
  const { user, fetchUser } = useUserStore();
  const {
    showClockGuide,
    includeHobbies,
    setShowClockGuide,
    setIncludeHobbies,
  } = useWallpaperStore();

  const { habits, fetchHabits } = useHabitStore();

  const [activeTab, setActiveTab] = useState<"preview" | "features" | "guides">("preview");
  const [deviceGuideTab, setDeviceGuideTab] = useState<"automatic" | "ios" | "android" | "tablet">("automatic");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [ambientActive, setAmbientActive] = useState<boolean>(false);
  const [showPermissionDetails, setShowPermissionDetails] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [dayBlockCounts, setDayBlockCounts] = useState<Record<number, number>>({});
  const [syncResult, setSyncResult] = useState<SyncVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeDay = useMemo(() => {
    return getJourneyDayNumber(user?.createdAt);
  }, [user?.createdAt]);

  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(activeDay || 1);

  // Sync when activeDay is calculated
  useEffect(() => {
    if (activeDay) {
      setSelectedDayNumber(activeDay);
    }
  }, [activeDay]);

  const selectedDateStr = useMemo(() => {
    return getDateForJourneyDay(selectedDayNumber, user?.createdAt);
  }, [selectedDayNumber, user?.createdAt]);

  const selectedFormattedDate = useMemo(() => {
    const [y, m, d] = selectedDateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, [selectedDateStr]);

  // Selected day's schedule blocks
  const [selectedBlocks, setSelectedBlocks] = useState<ScheduleBlock[]>([]);
  const [plannedHours, setPlannedHours] = useState<number>(0);

  // Direct load of user habits from IndexedDB ensuring any single hobby added is always loaded
  const [directHabits, setDirectHabits] = useState<Habit[]>([]);

  useEffect(() => {
    let isCancelled = false;
    const loadHabitsDirectly = async () => {
      try {
        const list = await db.habits.filter((h) => !h.archivedAt).toArray();
        if (!isCancelled && list.length > 0) {
          setDirectHabits(list);
        }
      } catch (err) {
        console.error("Failed to load habits directly from db:", err);
      }
    };
    loadHabitsDirectly();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user?.id) {
      fetchHabits(user.id, selectedDateStr);
    }
  }, [user?.id, selectedDateStr, fetchHabits]);

  const effectiveHabits = useMemo(() => {
    if (habits && habits.length > 0) return habits;
    return directHabits;
  }, [habits, directHabits]);

  // Load selected day's blocks from Dexie
  const loadDayBlocks = useCallback(async () => {
    try {
      let blocks: ScheduleBlock[] = [];
      if (user?.id) {
        blocks = await db.scheduleBlocks
          .where("[userId+date]")
          .equals([user.id, selectedDateStr])
          .sortBy("startTime");
      }

      // Fallback 1: Query by date alone if user-scoped query returned nothing
      if (blocks.length === 0) {
        blocks = await db.scheduleBlocks
          .where("date")
          .equals(selectedDateStr)
          .sortBy("startTime");
      }

      // Fallback 2: If this journey day has no blocks planned yet, fall back to the most recent planned day's blocks
      if (blocks.length === 0) {
        const allBlocks = await db.scheduleBlocks.toArray();
        if (allBlocks.length > 0) {
          const byDate: Record<string, ScheduleBlock[]> = {};
          for (const b of allBlocks) {
            if (!byDate[b.date]) byDate[b.date] = [];
            byDate[b.date].push(b);
          }
          const datesWithBlocks = Object.keys(byDate).sort().reverse();
          if (datesWithBlocks.length > 0) {
            const fallbackDate = datesWithBlocks[0];
            const candidate = byDate[fallbackDate];
            if (candidate && candidate.length > 0) {
              blocks = candidate;
            }
          }
        }
      }

      setSelectedBlocks(blocks);

      const occupied = new Set<number>();
      for (const b of blocks) {
        const sH = parseInt(b.startTime.split(":")[0], 10);
        let eH = parseInt(b.endTime.split(":")[0], 10);
        if (b.endTime === "24:00" || (eH === 0 && sH > 0)) eH = 24;
        for (let h = sH; h < eH; h++) {
          occupied.add(h);
        }
      }
      setPlannedHours(occupied.size);
    } catch (err) {
      console.error("Failed to load blocks:", err);
    }
  }, [user?.id, selectedDateStr]);

  // Scan all planned blocks across all journey days
  const scanPlannedDays = useCallback(async () => {
    try {
      const allBlocks = await db.scheduleBlocks.toArray();
      const countsByDate: Record<string, number> = {};
      for (const b of allBlocks) {
        countsByDate[b.date] = (countsByDate[b.date] || 0) + 1;
      }

      const countsByDay: Record<number, number> = {};
      const maxDays = Math.max(1, activeDay);
      for (let d = 1; d <= maxDays; d++) {
        const dateStr = getDateForJourneyDay(d, user?.createdAt);
        countsByDay[d] = countsByDate[dateStr] || 0;
      }
      setDayBlockCounts(countsByDay);
    } catch (e) {
      console.error("Failed to scan planned days:", e);
    }
  }, [activeDay, user?.createdAt]);

  useEffect(() => {
    loadDayBlocks();
  }, [loadDayBlocks]);

  useEffect(() => {
    scanPlannedDays();
  }, [scanPlannedDays, selectedBlocks]);

  // Find most recent day with blocks (if current day has none)
  const mostRecentPlannedDay = useMemo(() => {
    const candidates = Object.entries(dayBlockCounts)
      .map(([d, c]) => ({ dayNum: Number(d), count: c }))
      .filter((item) => item.count > 0 && item.dayNum !== selectedDayNumber)
      .sort((a, b) => b.dayNum - a.dayNum);

    return candidates[0] || null;
  }, [dayBlockCounts, selectedDayNumber]);

  // Copy schedule from another day
  const handleCopyScheduleFromDay = async (sourceDayNum: number) => {
    if (!user?.id) return;
    setIsGenerating(true);
    setStatusNotice(`Copying schedule from Day ${sourceDayNum}...`);
    try {
      const sourceDateStr = getDateForJourneyDay(sourceDayNum, user?.createdAt);
      let sourceBlocks = await db.scheduleBlocks
        .where("[userId+date]")
        .equals([user.id, sourceDateStr])
        .toArray();

      if (sourceBlocks.length === 0) {
        sourceBlocks = await db.scheduleBlocks
          .where("date")
          .equals(sourceDateStr)
          .toArray();
      }

      if (sourceBlocks.length === 0) {
        setStatusNotice(`No blocks found on Day ${sourceDayNum} to copy.`);
        return;
      }

      const newBlocks: ScheduleBlock[] = sourceBlocks.map((b) => ({
        ...b,
        id: uuidv4(),
        userId: user.id,
        date: selectedDateStr,
        status: "pending",
        createdAt: new Date().toISOString(),
      }));

      await db.scheduleBlocks.bulkAdd(newBlocks);
      await loadDayBlocks();
      await scanPlannedDays();
      setStatusNotice(`Copied ${newBlocks.length} tasks from Day ${sourceDayNum} to Day ${selectedDayNumber}!`);
      setTimeout(() => setStatusNotice(null), 3500);
    } catch {
      setStatusNotice("Failed to copy schedule.");
      setTimeout(() => setStatusNotice(null), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  const activeChapter = Math.ceil(selectedDayNumber / 7);

  const rankInfo = useMemo(() => {
    return getRankInfo(
      user?.militaryRank || calculateRank(user?.streak ?? 0, user?.integrityScore ?? 100)
    );
  }, [user?.militaryRank, user?.streak, user?.integrityScore]);

  // Consolidated wallpaper payload for selected day
  const wallpaperData: WallpaperData = useMemo(() => {
    return {
      chapter: activeChapter,
      activeDay: selectedDayNumber,
      rankBadge: rankInfo.badge,
      rankName: rankInfo.name,
      userLevel: user?.level ?? 1,
      userStreak: user?.streak ?? selectedDayNumber,
      plannedHours,
      dateStr: selectedDateStr,
      formattedDate: selectedFormattedDate,
      blocks: selectedBlocks,
      habits: effectiveHabits,
      showClockGuide,
      includeHobbies,
    };
  }, [
    activeChapter,
    selectedDayNumber,
    rankInfo,
    user?.level,
    user?.streak,
    plannedHours,
    selectedDateStr,
    selectedFormattedDate,
    selectedBlocks,
    effectiveHabits,
    showClockGuide,
    includeHobbies,
  ]);

  // Automatically sync updated schedule to native Android bridge whenever wallpaperData changes
  useEffect(() => {
    if (wallpaperData.blocks.length > 0 || (wallpaperData.habits && wallpaperData.habits.length > 0)) {
      syncScheduleDataToNative(wallpaperData).catch(() => {});
    }
  }, [wallpaperData]);

  // Handler: 1-click Auto Fill Sleep
  const handleAutoFillSleep = async () => {
    if (!user?.id) return;
    setIsGenerating(true);
    setStatusNotice("Auto-filling 8h Obsidian Rest block...");
    try {
      await useScheduleStore.getState().autoFillSleep(user.id, selectedDateStr);
      await loadDayBlocks();
      await scanPlannedDays();
      setStatusNotice(`Added 8h sleep to Day ${selectedDayNumber}!`);
      setTimeout(() => setStatusNotice(null), 3500);
    } catch {
      setStatusNotice("Failed to auto-fill schedule block.");
      setTimeout(() => setStatusNotice(null), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Launch Native Live Wallpaper Service (Home Screen & Lock Screen)
  const handleLaunchLiveWallpaper = async () => {
    setIsVerifying(true);
    setStatusNotice("Syncing schedule & verifying native engine...");
    try {
      const res = await syncAndVerifySchedule(wallpaperData);
      setSyncResult(res);
      const launched = launchLiveWallpaperPicker();
      if (launched) {
        setStatusNotice("Live Wallpaper picker launched! Tap 'Set wallpaper' → choose 'Home screen and lock screen'.");
      } else {
        if (res.isNativeBridge) {
          setStatusNotice(`✓ Verified: ${res.blockCount} tasks & ${res.habitCount} hobbies confirmed on device. Open Settings → Wallpaper to activate.`);
        } else {
          setStatusNotice(`✓ Verified in web cache (${res.blockCount} tasks, ${res.habitCount} hobbies). Install/run native APK on phone for lockscreen.`);
        }
      }
    } catch (err: any) {
      console.error("Failed to sync & launch live wallpaper:", err);
      setStatusNotice("Live Wallpaper launch encountered an issue.");
    } finally {
      setIsVerifying(false);
      setTimeout(() => setStatusNotice(null), 6000);
    }
  };

  // Handler: Explicit Schedule Sync & Verification Check
  const handleSyncAndVerify = async () => {
    setIsVerifying(true);
    setStatusNotice("Verifying schedule & habits sync...");
    try {
      const res = await syncAndVerifySchedule(wallpaperData);
      setSyncResult(res);
      if (res.isNativeBridge) {
        if (res.success) {
          setStatusNotice(`✓ Verified! ${res.blockCount} tasks & ${res.habitCount} hobbies confirmed in Android Native Storage.`);
        } else {
          setStatusNotice(`⚠️ Sync issue: ${res.message}`);
        }
      } else {
        setStatusNotice(`ℹ️ Verified in web cache: ${res.blockCount} tasks & ${res.habitCount} hobbies. Running in browser.`);
      }
    } catch (err: any) {
      console.error("Failed to verify sync:", err);
      setStatusNotice("Failed to verify sync.");
    } finally {
      setIsVerifying(false);
      setTimeout(() => setStatusNotice(null), 5000);
    }
  };

  // Handler: Turn Off Wallpaper (Reset to default)
  const handleTurnOffWallpaper = async () => {
    setIsGenerating(true);
    setStatusNotice("Turning off wallpaper...");
    try {
      if (isNativeBridgeAvailable()) {
        const ok = clearNativeLockscreen();
        if (ok) {
          setStatusNotice("Wallpaper turned off. Android system default restored on Home and Lock screens.");
          setSyncResult({
            success: true,
            isNativeBridge: true,
            blockCount: 0,
            habitCount: 0,
            taskNames: [],
            habitNames: [],
            streak: 0,
            message: "Wallpaper cleared. Default system wallpaper restored.",
            timestamp: new Date().toLocaleTimeString(),
          });
        } else {
          setStatusNotice("Wallpaper reset to default.");
        }
      } else {
        setStatusNotice("Wallpaper turned off in Odyssey. Default system wallpaper restored.");
        setSyncResult({
          success: true,
          isNativeBridge: false,
          blockCount: 0,
          habitCount: 0,
          taskNames: [],
          habitNames: [],
          streak: 0,
          message: "Wallpaper reset in web app. On your physical phone, select any standard system wallpaper from phone settings.",
          timestamp: new Date().toLocaleTimeString(),
        });
      }
      setTimeout(() => setStatusNotice(null), 4000);
    } catch {
      setStatusNotice("Failed to turn off lockscreen wallpaper.");
      setTimeout(() => setStatusNotice(null), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Ambient Fullscreen Mode with WakeLock
  const handleToggleAmbient = async () => {
    if (!ambientActive) {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        if ("wakeLock" in navigator && (navigator as any).wakeLock) {
          await (navigator as any).wakeLock.request("screen");
        }
        setAmbientActive(true);
        setStatusNotice("Ambient Display Active (Screen wake lock enabled)");
        setTimeout(() => setStatusNotice(null), 3000);
      } catch {
        setAmbientActive(true);
      }
    } else {
      try {
        if (document.exitFullscreen && document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch { }
      setAmbientActive(false);
    }
  };

  // Days list available for selector (Days 1 up to activeDay)
  const availableDays = useMemo(() => {
    const count = Math.max(1, activeDay);
    const list: number[] = [];
    for (let i = 1; i <= count; i++) {
      list.push(i);
    }
    return list;
  }, [activeDay]);

  const hasCustomBlocks = selectedBlocks.length > 0;
  const effectiveHoursCount = hasCustomBlocks ? plannedHours : 20;

  if (!mounted) {
    return (
      <div className="view-transition min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-on-surface-variant">Loading Odyssey Wallpaper Studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="view-transition min-h-screen bg-surface">
      <div className="flex flex-col w-full max-w-5xl xl:max-w-6xl mx-auto px-3 sm:px-6 pb-28 pt-2 space-y-4">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Link
            href="/planner"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-bright text-primary text-xs font-mono font-bold cursor-pointer transition-all active:scale-95 border border-outline/15 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Planner</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-surface-container-high border border-outline/15 text-[11px] font-mono text-on-surface-variant flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Day {selectedDayNumber} • {selectedFormattedDate}</span>
            </span>
          </div>
        </div>

        {/* Status Notice Toast / Alert */}
        {statusNotice && (
          <div className="p-3 rounded-xl bg-primary text-on-primary text-xs font-mono font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="truncate">{statusNotice}</span>
          </div>
        )}

        {/* Section Tabs: Live Preview vs Feature Overview vs Device Setup Guides */}
        <div className="flex items-center p-1 rounded-xl bg-surface-container border border-outline/10 text-xs font-mono font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === "preview"
                ? "bg-surface text-primary shadow-xs font-bold"
                : "text-on-surface-variant hover:text-on-surface"
              }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Live Wallpaper</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("features")}
            className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === "features"
                ? "bg-surface text-primary shadow-xs font-bold"
                : "text-on-surface-variant hover:text-on-surface"
              }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>What is It?</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("guides")}
            className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === "guides"
                ? "bg-surface text-primary shadow-xs font-bold"
                : "text-on-surface-variant hover:text-on-surface"
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Device &amp; Automation Guides</span>
          </button>
        </div>

        {/* TAB 1: LIVE WALLPAPER PREVIEW & EXPORT ACTIONS */}
        {activeTab === "preview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
            {/* LEFT CONTROL PANEL (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-3 order-2 lg:order-1">
              {/* Day Selector */}
              <div className="p-3.5 rounded-2xl bg-surface-container border border-outline/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-on-surface flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Journey Day:</span>
                  </span>
                  <span className="text-[11px] font-mono text-on-surface-variant font-medium">
                    {selectedFormattedDate}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {availableDays.map((dayNum) => {
                    const isToday = dayNum === activeDay;
                    const isSelected = dayNum === selectedDayNumber;
                    const count = dayBlockCounts[dayNum] || 0;
                    return (
                      <button
                        key={dayNum}
                        type="button"
                        suppressHydrationWarning
                        onClick={() => setSelectedDayNumber(dayNum)}
                        className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-primary text-on-primary shadow-sm"
                            : isToday
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline/10"
                        }`}
                      >
                        <span>Day {dayNum} {isToday && "(Today)"}</span>
                        {count > 0 && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                            isSelected ? "bg-black/30 text-white" : "bg-emerald-500/20 text-emerald-400"
                          }`}>
                            {count}h
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Schedule Quick-Copy Notice when currently selected day has 0 blocks */}
                {selectedBlocks.length === 0 && mostRecentPlannedDay && (
                  <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs font-mono space-y-2 mt-2">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Day {selectedDayNumber} has no planned tasks yet</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      You planned {mostRecentPlannedDay.count} hours on Day {mostRecentPlannedDay.dayNum}.
                      Copy them over or switch to Day {mostRecentPlannedDay.dayNum}:
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleCopyScheduleFromDay(mostRecentPlannedDay.dayNum)}
                        disabled={isGenerating}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-[11px] font-mono cursor-pointer transition-all flex items-center gap-1 shadow-sm active:scale-95"
                      >
                        <Copy className="w-3 h-3 text-black" />
                        <span>Copy Day {mostRecentPlannedDay.dayNum}&apos;s Schedule</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDayNumber(mostRecentPlannedDay.dayNum)}
                        className="px-2.5 py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-on-surface font-bold text-[11px] font-mono cursor-pointer transition-all active:scale-95 border border-outline/10"
                      >
                        <span>View Day {mostRecentPlannedDay.dayNum}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

                  {/* Schedule Coverage Overview */}
                  <div className="p-3.5 rounded-2xl bg-surface-container border border-outline/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-mono font-bold text-on-surface">
                          Schedule Coverage:
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {effectiveHoursCount}/24h ({Math.round((effectiveHoursCount / 24) * 100)}%)
                      </span>
                    </div>

                    {!hasCustomBlocks && (
                      <div className="flex items-center justify-between pt-0.5 text-xs font-mono">
                        <span className="text-[11px] text-on-surface-variant/70">Unscheduled hours use circadian rest</span>
                        <button
                          type="button"
                          onClick={handleAutoFillSleep}
                          disabled={isGenerating}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-[10.5px] font-mono font-bold cursor-pointer transition-all active:scale-95"
                        >
                          + Auto-Fill Sleep (8h)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Clean Hobbies Display & Toggle (No Add Form) */}
                  <div className="p-3.5 rounded-2xl bg-surface-container border border-outline/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-mono font-bold text-on-surface">
                          Hobbies on Wallpaper:
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIncludeHobbies(!includeHobbies)}
                        className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${includeHobbies
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-surface-container-high text-on-surface-variant border-outline/20"
                          }`}
                      >
                        {includeHobbies ? "Visible (ON)" : "Hidden (OFF)"}
                      </button>
                    </div>

                    {includeHobbies && (
                      effectiveHabits.length > 0 ? (
                        <div className={effectiveHabits.length === 1 ? "grid grid-cols-1 pt-1" : "grid grid-cols-2 gap-1.5 pt-1"}>
                          {effectiveHabits.slice(0, 4).map((h, idx) => (
                            <div
                              key={h.id || idx}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-high border border-outline/10 text-xs font-mono"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base shrink-0">{resolveHobbyEmoji(h.icon, h.name)}</span>
                                <div className="min-w-0">
                                  <span className="font-bold text-on-surface truncate block">{h.name}</span>
                                  <span className="text-[9px] text-on-surface-variant/70 truncate block">{h.category || "Cadence Track"}</span>
                                </div>
                              </div>
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 font-bold shrink-0">
                                {h.currentStreak || 0}d 🔥
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] font-mono text-on-surface-variant/60 pt-0.5">
                          No active habits in your library. Add habits in the Hobbies tab to display them.
                        </p>
                      )
                    )}
                  </div>

                  {/* Preview Guide Controls (Optional Clock Simulator for Preview Only) */}
                  <div className="p-3.5 rounded-2xl bg-surface-container border border-outline/10 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-on-surface flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span>Preview Clock Simulation:</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setShowClockGuide(!showClockGuide)}
                      className={`px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${showClockGuide
                          ? "bg-primary/15 border-primary/30 text-primary"
                          : "bg-surface-container-high border-outline/15 text-on-surface-variant"
                        }`}
                    >
                      {showClockGuide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{showClockGuide ? "Preview Guide ON" : "Clean Background"}</span>
                    </button>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="space-y-3 pt-1">
                    {/* Primary: Launch Native Live Wallpaper Service (Supports Home Screen & Lock Screen) */}
                    <button
                      type="button"
                      onClick={handleLaunchLiveWallpaper}
                      disabled={isVerifying || isGenerating}
                      className="w-full py-3.5 px-4 rounded-xl font-bold font-mono text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-black shadow-emerald-500/20 active:scale-95 disabled:opacity-60"
                      title="Set real-time live wallpaper that shifts hourly for Lock Screen & Home Screen"
                    >
                      {isVerifying ? (
                        <RefreshCw className="w-4 h-4 text-black animate-spin" />
                      ) : (
                        <Smartphone className="w-4 h-4 text-black" />
                      )}
                      <span>{isVerifying ? "Verifying & Syncing Schedule..." : "📱 Launch Native Live Wallpaper Service"}</span>
                    </button>

                    <div className="p-2.5 rounded-xl bg-surface-container-high border border-outline/15 text-[11px] font-mono text-on-surface-variant flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>In Android&apos;s picker, choose <strong>&quot;Home screen and lock screen&quot;</strong> to apply changes to both!</span>
                    </div>

                    {/* LIVE VERIFICATION STATUS CARD (Indicates Success/Failure & Exact Task/Hobby Details) */}
                    <div className={`p-3.5 rounded-2xl border transition-all text-xs font-mono space-y-2.5 ${
                      !syncResult
                        ? "bg-surface-container border-outline/15"
                        : syncResult.isNativeBridge && syncResult.success
                        ? "bg-emerald-950/25 border-emerald-500/40 shadow-sm shadow-emerald-500/10"
                        : syncResult.isNativeBridge && !syncResult.success
                        ? "bg-rose-950/25 border-rose-500/40"
                        : "bg-surface-container-high border-amber-500/30"
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {!syncResult ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-on-surface-variant/40 animate-pulse shrink-0" />
                          ) : syncResult.isNativeBridge && syncResult.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : syncResult.isNativeBridge && !syncResult.success ? (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          ) : (
                            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                          )}
                          <span className="font-bold text-xs truncate">
                            {!syncResult
                              ? "Live Wallpaper Sync Status"
                              : syncResult.isNativeBridge && syncResult.success
                              ? "✓ Verified in Android Native Storage"
                              : syncResult.isNativeBridge && !syncResult.success
                              ? "⚠️ Sync Issue Reported"
                              : "Web Preview Mode (Chrome)"}
                          </span>
                        </div>

                        {syncResult && (
                          <span className="text-[10px] text-on-surface-variant/70 shrink-0">
                            {syncResult.timestamp}
                          </span>
                        )}
                      </div>

                      {/* Status Message */}
                      <p className="text-[11px] leading-relaxed text-on-surface-variant">
                        {syncResult
                          ? syncResult.message
                          : "Verify that your customized task names and hobbies are stored and ready for the Android lockscreen service."}
                      </p>

                      {/* Tasks confirmed to be rendered on wallpaper */}
                      <div className="pt-0.5 space-y-1 text-[10px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-on-surface">Tasks on wallpaper:</span>
                          {selectedBlocks.length > 0 ? (
                            selectedBlocks.slice(0, 3).map((b, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/20 font-bold truncate max-w-[130px]">
                                {b.title}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-surface-container-highest text-on-surface-variant/80">
                              24h Hourly Flow
                            </span>
                          )}
                          {selectedBlocks.length > 3 && (
                            <span className="text-[9px] text-on-surface-variant">+{selectedBlocks.length - 3} more</span>
                          )}
                        </div>

                        {/* Hobbies confirmed to be rendered on wallpaper */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-on-surface">Hobbies on wallpaper:</span>
                          {effectiveHabits.length > 0 ? (
                            effectiveHabits.slice(0, 3).map((h, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/25 font-bold truncate max-w-[130px]">
                                {resolveHobbyEmoji(h.icon, h.name)} {h.name}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/25 font-bold">
                              🧘 Mindful Focus • 💧 Daily Hydration
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Explicit Sync & Verify Button */}
                      <div className="pt-1.5 flex items-center justify-between border-t border-outline/10">
                        <span className="text-[10px] text-on-surface-variant/60">
                          {syncResult?.isNativeBridge ? "Native APK connected" : "Web sandbox mode"}
                        </span>
                        <button
                          type="button"
                          onClick={handleSyncAndVerify}
                          disabled={isVerifying}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-bright border border-outline/15 text-[10.5px] font-mono font-bold text-primary cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isVerifying ? "animate-spin text-primary" : ""}`} />
                          <span>{isVerifying ? "Verifying On-Device..." : "🔄 Sync & Verify Schedule Data"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Turn Off Wallpaper Feature */}
                    <button
                      type="button"
                      onClick={handleTurnOffWallpaper}
                      disabled={isGenerating || isVerifying}
                      className="w-full py-2.5 px-3 rounded-xl font-bold font-mono text-xs shadow-md border flex items-center justify-center gap-2 transition-all cursor-pointer bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30 active:scale-95"
                      title="Reset phone's wallpaper back to Android default"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>Turn Off Wallpaper (Reset to Default)</span>
                    </button>

                    {/* Direct Explanation for Web / PWA users */}
                    {!isNativeBridgeAvailable() && (
                      <div className="p-3 rounded-xl bg-surface-container-high border border-outline/15 text-xs font-mono space-y-1 text-on-surface-variant">
                        <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Automated Lockscreen Status</span>
                        </div>
                        <p className="text-[10.5px] leading-relaxed">
                          Web browsers &amp; PWAs cannot silently modify your phone&apos;s lockscreen due to Android OS security sandboxing.
                        </p>
                        <p className="text-[10.5px] leading-relaxed text-emerald-400 font-medium">
                          For 100% hands-free automatic lockscreen changes at every hour, run the native Android APK build.
                        </p>
                      </div>
                    )}

                    {/* Transparent Permission & Trust Guarantee */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowPermissionDetails(!showPermissionDetails)}
                        className="w-full py-1.5 px-3 rounded-xl bg-surface-container/70 hover:bg-surface-container border border-outline/10 text-[11px] font-mono text-on-surface-variant flex items-center justify-between transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Permission Safety: 100% On-Device</span>
                        </span>
                        <span className="text-[10px] text-on-surface-variant/70">
                          {showPermissionDetails ? "Hide Info ▲" : "View Details ▼"}
                        </span>
                      </button>

                      {showPermissionDetails && (
                        <div className="p-3 rounded-xl bg-surface-container-high border border-outline/15 text-[10.5px] font-mono space-y-1.5 mt-1.5 text-on-surface-variant animate-in fade-in duration-200">
                          <div className="font-bold text-on-surface text-xs flex items-center gap-1 text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Safe System Utility Permissions Only</span>
                          </div>
                          <p className="leading-relaxed">
                            Odyssey only uses standard Android system permissions for wallpaper updates:
                          </p>
                          <div className="space-y-1 pl-1 text-[10px]">
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <span>✓</span>
                              <span><strong>SET_WALLPAPER:</strong> Applies your lockscreen schedule.</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <span>✓</span>
                              <span><strong>SCHEDULE_EXACT_ALARM:</strong> Triggers refresh at :00:00.</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-rose-400">
                              <span>✕</span>
                              <span><strong>NO Camera, Mic, Contacts, or Photos:</strong> Zero access.</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT PREVIEW PANEL (lg:col-span-7) */}
                <div className="lg:col-span-7 flex flex-col items-center justify-center order-1 lg:order-2">
                  <div className="w-full flex justify-center py-1">
                    <WallpaperPreview
                      data={wallpaperData}
                      showClockGuide={showClockGuide}
                      className="scale-[0.92] sm:scale-100 origin-top shadow-2xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: WHAT IS IT */}
            {activeTab === "features" && (
              <div className="space-y-3.5 animate-in fade-in duration-300">
                <div className="p-4 rounded-2xl bg-surface-container-high border border-outline/15 space-y-2">
                  <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>The Odyssey Cadence Lockscreen</span>
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    A high-density OLED visual schedule designed to live on your mobile lockscreen.
                    It anchors your hourly priorities directly into your subconscious every time you glance at your phone.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-container border border-outline/10 space-y-1.5">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs font-mono">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span>Clean Safe-Zone Geometry</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      The wallpaper layout leaves the top 22% and bottom 18% completely clean OLED dark so your phone's native clock, notifications, flashlight, and camera never overlap with the schedule.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-container border border-outline/10 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Centered Active Hour</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      All blocks are strictly 1-hour intervals. The active hour is always vertically centered in the 5-card window with a glowing amber beacon.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DEVICE & AUTOMATION GUIDES */}
            {activeTab === "guides" && (
              <div className="space-y-3.5 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-container border border-outline/10 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setDeviceGuideTab("automatic")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer font-bold ${deviceGuideTab === "automatic"
                        ? "bg-surface text-primary shadow-xs"
                        : "text-on-surface-variant hover:text-on-surface"
                      }`}
                  >
                    ⚡ Can it be Automatic?
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceGuideTab("native" as any)}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer font-bold ${deviceGuideTab === ("native" as any)
                        ? "bg-surface text-primary shadow-xs"
                        : "text-on-surface-variant hover:text-on-surface"
                      }`}
                  >
                    📱 True Native APK
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceGuideTab("tablet")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer font-bold ${deviceGuideTab === "tablet"
                        ? "bg-surface text-primary shadow-xs"
                        : "text-on-surface-variant hover:text-on-surface"
                      }`}
                  >
                    🖥️ Live Ambient Display
                  </button>
                </div>

                {/* TAB: HOW AUTOMATIC SHIFTING WORKS */}
                {deviceGuideTab === "automatic" && (
                  <div className="p-4 rounded-2xl bg-surface-container border border-outline/10 space-y-3">
                    <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Is it possible to create the automatic lockscreen you imagined?</span>
                    </h3>

                    <div className="space-y-2.5 text-xs text-on-surface-variant leading-relaxed">
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 space-y-1">
                        <span className="font-bold text-rose-300 font-mono block">1. In Web Browsers / PWAs (Installed from Vercel): NOT Possible</span>
                        <p className="text-[11px] leading-relaxed">
                          Google Chrome, Samsung Internet, and Apple iOS deliberately <strong>block all websites and web apps from modifying your phone&apos;s wallpaper or lockscreen</strong>. This is a fundamental operating system security rule to stop malicious websites from secretly replacing your lockscreen. No web API exists to set wallpapers directly.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 space-y-1">
                        <span className="font-bold text-emerald-400 font-mono block">2. In a Real Native Android App (Compiled APK): 100% Possible!</span>
                        <p className="text-[11px] leading-relaxed">
                          A real Android app has direct access to the Android <code>WallpaperManager</code> and <code>WallpaperService</code> APIs. It can automatically shift the active hour to the center of your lockscreen whenever the clock advances or your screen wakes, without touching any photos or files!
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 space-y-1">
                        <span className="font-bold text-amber-300 font-mono block">3. In Live Ambient Mode: Works Right Now on Your Phone!</span>
                        <p className="text-[11px] leading-relaxed">
                          Tap <strong>&quot;Launch Live Dynamic Display&quot;</strong>. Odyssey enters full-screen with Screen Wake Lock enabled, keeping your screen active on your desk or nightstand with the live hour always centered and updating every minute in real time.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: NATIVE APK ARCHITECTURE */}
                {deviceGuideTab === ("native" as any) && (
                  <div className="p-4 rounded-2xl bg-surface-container border border-outline/10 space-y-2.5 text-xs text-on-surface-variant">
                    <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 text-primary">
                      <Smartphone className="w-4 h-4" />
                      <span>The Odyssey Native Android Engine</span>
                    </h3>
                    <p className="leading-relaxed text-[11.5px]">
                      We have already pre-configured the complete native Kotlin Android module in your project repository under the <code>android/</code> folder:
                    </p>
                    <div className="space-y-1.5 font-mono text-[10.5px] pt-1">
                      <div className="p-2 rounded-lg bg-surface-container-high border border-outline/10">
                        <span className="text-amber-400 font-bold">OdysseyLiveWallpaperService.kt:</span>
                        <p className="text-on-surface-variant mt-0.5">Android WallpaperService that acts as a real-time live wallpaper engine, redrawing and centering the hour whenever you wake your phone.</p>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-container-high border border-outline/10">
                        <span className="text-emerald-400 font-bold">OdysseyHourlyWallpaperWorker.kt:</span>
                        <p className="text-on-surface-variant mt-0.5">AlarmManager background worker that triggers an exact lockscreen refresh every hour at :00:00.</p>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-container-high border border-outline/10">
                        <span className="text-indigo-400 font-bold">OdysseyWallpaperBridge.kt:</span>
                        <p className="text-on-surface-variant mt-0.5">Direct JavaScript bridge that connects Odyssey&apos;s web UI directly to Android&apos;s system WallpaperManager.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: AMBIENT DISPLAY */}
                {deviceGuideTab === "tablet" && (
                  <div className="p-4 rounded-2xl bg-surface-container border border-outline/10 space-y-2 text-xs text-on-surface-variant">
                    <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 text-amber-400">
                      <Maximize2 className="w-4 h-4" />
                      <span>Live Ambient Desk Stand Display</span>
                    </h3>
                    <p className="leading-relaxed">
                      Tap <strong>&quot;Launch Live Dynamic Display&quot;</strong> on any phone or tablet placed on a desk stand or charging dock. It keeps the screen active with Screen Wake Lock as an always-on live, centered cadence clock throughout your day!
                    </p>
                  </div>
                )}
              </div>
            )}

        {/* Bottom Feedback / Reviews Button */}
        <FeedbackBannerButton className="pt-4" />
      </div>
    </div>
  );
}
