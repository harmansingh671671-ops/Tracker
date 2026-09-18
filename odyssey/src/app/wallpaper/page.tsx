"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { useWallpaperStore } from "@/lib/stores/wallpaper-store";
import { db, type ScheduleBlock } from "@/lib/db";
import { getJourneyDayNumber, getDateForJourneyDay } from "@/lib/utils/journey";
import { getRankInfo, calculateRank } from "@/lib/utils/gamification";
import { WallpaperPreview } from "@/components/wallpaper/wallpaper-preview";
import { FeedbackBannerButton } from "@/components/feedback/feedback-modal";
import {
  downloadWallpaper,
  shareWallpaper,
  resolveHobbyEmoji,
  type WallpaperData,
} from "@/lib/utils/wallpaper-generator";
import {
  ArrowLeft,
  Sparkles,
  Download,
  Share2,
  Maximize2,
  Smartphone,
  Eye,
  EyeOff,
  Power,
  ShieldCheck,
  Zap,
  Clock,
  Calendar,
  Layers,
  HelpCircle,
} from "lucide-react";

export default function WallpaperPage() {
  const { user, fetchUser } = useUserStore();
  const {
    enabled,
    showClockGuide,
    includeHobbies,
    setEnabled,
    setShowClockGuide,
    setIncludeHobbies,
    toggleEnabled,
  } = useWallpaperStore();

  const { habits, fetchHabits } = useHabitStore();

  const [activeTab, setActiveTab] = useState<"preview" | "features" | "guides">("preview");
  const [deviceGuideTab, setDeviceGuideTab] = useState<"automatic" | "ios" | "android" | "tablet">("automatic");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [ambientActive, setAmbientActive] = useState<boolean>(false);

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

  // Active hour preview override (null = follow live clock)
  const [previewHour, setPreviewHour] = useState<number | null>(null);
  const currentActualHour = useMemo(() => new Date().getHours(), []);
  const effectiveHour = previewHour !== null ? previewHour : currentActualHour;

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user?.id) {
      fetchHabits(user.id, selectedDateStr);
    }
  }, [user?.id, selectedDateStr, fetchHabits]);

  // Load selected day's blocks from Dexie
  const loadDayBlocks = useCallback(async () => {
    if (!user?.id) return;
    try {
      const blocks = await db.scheduleBlocks
        .where("[userId+date]")
        .equals([user.id, selectedDateStr])
        .sortBy("startTime");

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
    } catch {}
  }, [user?.id, selectedDateStr]);

  useEffect(() => {
    loadDayBlocks();
  }, [loadDayBlocks]);

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
      plannedHours,
      dateStr: selectedDateStr,
      formattedDate: selectedFormattedDate,
      blocks: selectedBlocks,
      habits,
      showClockGuide,
      includeHobbies,
      activeHour: previewHour !== null ? previewHour : undefined,
    };
  }, [
    activeChapter,
    selectedDayNumber,
    rankInfo,
    user?.level,
    plannedHours,
    selectedDateStr,
    selectedFormattedDate,
    selectedBlocks,
    habits,
    showClockGuide,
    includeHobbies,
    previewHour,
  ]);

  // Handler: 1-click Auto Fill Sleep
  const handleAutoFillSleep = async () => {
    if (!user?.id) return;
    setIsGenerating(true);
    setStatusNotice("Auto-filling 8h Obsidian Rest block...");
    try {
      await useScheduleStore.getState().autoFillSleep(user.id, selectedDateStr);
      await loadDayBlocks();
      setStatusNotice(`Added 8h sleep (22:30 → 06:30) to Day ${selectedDayNumber}!`);
      setTimeout(() => setStatusNotice(null), 3500);
    } catch {
      setStatusNotice("Failed to auto-fill schedule block.");
      setTimeout(() => setStatusNotice(null), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Download HD Wallpaper
  const handleDownload = async () => {
    setIsGenerating(true);
    setStatusNotice("Rendering high-res lockscreen wallpaper...");
    try {
      await downloadWallpaper(wallpaperData, `odyssey-day-${selectedDayNumber}-wallpaper.png`);
      setStatusNotice("Wallpaper downloaded! Clean OLED safe zone ready for your phone clock.");
      setTimeout(() => setStatusNotice(null), 4500);
    } catch (err) {
      setStatusNotice("Failed to generate wallpaper. Please try again.");
      setTimeout(() => setStatusNotice(null), 3500);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Native Web Share ("Set as Wallpaper" direct)
  const handleShare = async () => {
    setIsGenerating(true);
    setStatusNotice("Opening system share sheet...");
    try {
      const shared = await shareWallpaper(wallpaperData);
      if (shared) {
        setStatusNotice("Choose 'Use as Wallpaper' from your system options.");
      } else {
        setStatusNotice("Saved image to downloads!");
      }
      setTimeout(() => setStatusNotice(null), 4000);
    } catch {
      setStatusNotice("Download ready.");
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
      } catch {}
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

  return (
    <div className="view-transition min-h-screen bg-surface">
      <div className="flex flex-col w-full max-w-5xl xl:max-w-6xl mx-auto px-3 sm:px-6 pb-28 pt-2 space-y-4">
        {/* Navigation Top Bar with Functional Engine Toggle */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Link
            href="/planner"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-bright text-primary text-xs font-mono font-bold cursor-pointer transition-all active:scale-95 border border-outline/15 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Planner</span>
          </Link>

          {/* Master Enable/Disable Button that genuinely pauses/activates the engine */}
          <button
            type="button"
            onClick={toggleEnabled}
            className={`px-3 py-1.5 rounded-full font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
              enabled
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                : "bg-surface-container-high text-on-surface-variant border-outline/25 hover:text-on-surface hover:bg-surface-bright"
            }`}
            title={enabled ? "Click to pause wallpaper generation" : "Click to activate wallpaper engine"}
          >
            <Power className={`w-3.5 h-3.5 ${enabled ? "text-emerald-400" : "text-on-surface-variant"}`} />
            <span>{enabled ? "Engine: Active (Click to Pause)" : "Engine: Paused (Click to Enable)"}</span>
          </button>
        </div>

        {/* Status Notice Toast / Alert */}
        {statusNotice && (
          <div className="p-3 rounded-xl bg-primary text-on-primary text-xs font-mono font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="truncate">{statusNotice}</span>
          </div>
        )}

        {/* IF DISABLED: Show clean, purposeful Inactive State */}
        {!enabled ? (
          <div className="p-8 sm:p-12 rounded-3xl bg-surface-container border border-outline/15 text-center flex flex-col items-center justify-center gap-4 my-6 shadow-sm animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center text-on-surface-variant border border-outline/20 shadow-inner">
              <Power className="w-8 h-8 text-amber-400" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h2 className="text-lg font-bold text-on-surface">Lockscreen Wallpaper Engine is Paused</h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                The lockscreen wallpaper generator is currently turned off. Activate the engine to customize your 24-hour dynamic timeline, inspect hourly cadence, and export your daily lockscreen.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(true)}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-fixed text-on-primary font-mono text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Activate Wallpaper Engine</span>
            </button>
          </div>
        ) : (
          <>
            {/* Section Tabs: Live Preview vs Feature Overview vs Device Setup Guides */}
            <div className="flex items-center p-1 rounded-xl bg-surface-container border border-outline/10 text-xs font-mono font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "preview"
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
                className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "features"
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
                className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "guides"
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
                        return (
                          <button
                            key={dayNum}
                            type="button"
                            onClick={() => setSelectedDayNumber(dayNum)}
                            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold shrink-0 transition-all cursor-pointer ${
                              isSelected
                                ? "bg-primary text-on-primary shadow-sm"
                                : isToday
                                ? "bg-primary/15 text-primary border border-primary/30"
                                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline/10"
                            }`}
                          >
                            Day {dayNum} {isToday && "(Today)"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Live Hour Centering & Time Scrubber */}
                  <div className="p-3.5 rounded-2xl bg-surface-container border border-outline/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-mono font-bold text-on-surface">
                          Active Center Hour:
                        </span>
                      </div>

                      {previewHour === null ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          LIVE CLOCK
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPreviewHour(null)}
                          className="text-[10px] font-mono font-bold text-amber-300 bg-amber-400/20 hover:bg-amber-400/30 px-2 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1 transition-all cursor-pointer"
                          title="Snap back to current live clock"
                        >
                          <Zap className="w-2.5 h-2.5 text-amber-300" />
                          <span>Sync Live ({String(currentActualHour).padStart(2, "0")}:00)</span>
                        </button>
                      )}
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-container-high border border-outline/15 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-on-surface-variant text-[11px]">Center Block:</span>
                        <span className="font-bold text-amber-300 bg-black/60 px-2.5 py-0.5 rounded-md border border-amber-400/30 shadow-inner">
                          {String(effectiveHour).padStart(2, "0")}:00 → {String((effectiveHour + 1) % 24).padStart(2, "0")}:00
                        </span>
                      </div>

                      {/* 24-Hour Slider */}
                      <div className="space-y-1">
                        <input
                          type="range"
                          min={0}
                          max={23}
                          step={1}
                          value={effectiveHour}
                          onChange={(e) => setPreviewHour(parseInt(e.target.value, 10))}
                          className="w-full accent-amber-400 cursor-pointer h-2 bg-surface-container-highest rounded-lg appearance-none"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-on-surface-variant/60">
                          <span>00:00</span>
                          <span>06:00</span>
                          <span>12:00</span>
                          <span>18:00</span>
                          <span>23:00</span>
                        </div>
                      </div>
                    </div>
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
                        className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          includeHobbies
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-surface-container-high text-on-surface-variant border-outline/20"
                        }`}
                      >
                        {includeHobbies ? "Visible (ON)" : "Hidden (OFF)"}
                      </button>
                    </div>

                    {includeHobbies && (
                      habits.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {habits.slice(0, 4).map((h, idx) => (
                            <div
                              key={h.id || idx}
                              className="flex items-center gap-2 p-2 rounded-xl bg-surface-container-high border border-outline/10 text-xs font-mono"
                            >
                              <span className="text-base shrink-0">{resolveHobbyEmoji(h.icon, h.name)}</span>
                              <span className="font-bold text-on-surface truncate">{h.name}</span>
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
                      className={`px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        showClockGuide
                          ? "bg-primary/15 border-primary/30 text-primary"
                          : "bg-surface-container-high border-outline/15 text-on-surface-variant"
                      }`}
                    >
                      {showClockGuide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{showClockGuide ? "Preview Guide ON" : "Clean Background"}</span>
                    </button>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="space-y-2 pt-1">
                    {/* Primary Button: Download Wallpaper (OLED Clean, NO BAKED-IN CLOCK) */}
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={isGenerating}
                      className="w-full py-3 px-4 rounded-xl font-bold font-mono text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer bg-primary hover:bg-primary-fixed text-on-primary shadow-primary/20 active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isGenerating ? "Rendering HD Wallpaper..." : `Download Lockscreen Wallpaper`}</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Secondary 1: Native Share ("Set as Wallpaper" directly) */}
                      <button
                        type="button"
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="py-2.5 px-3 rounded-xl font-bold font-mono text-xs shadow-md border flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-surface-container-high hover:bg-surface-bright text-on-surface border-outline/20 active:scale-95"
                        title="Opens system share sheet directly with 'Set as Wallpaper'"
                      >
                        <Share2 className="w-3.5 h-3.5 text-secondary" />
                        <span>Share / Set</span>
                      </button>

                      {/* Secondary 2: Always-On Ambient Display */}
                      <button
                        type="button"
                        onClick={handleToggleAmbient}
                        className={`py-2.5 px-3 rounded-xl font-bold font-mono text-xs shadow-md border flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                          ambientActive
                            ? "bg-amber-400 text-black border-amber-300"
                            : "bg-surface-container-high hover:bg-surface-bright text-on-surface border-outline/20"
                        }`}
                        title="Always-on live desk clock mode"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>{ambientActive ? "Exit Ambient" : "Ambient Mode"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT PREVIEW PANEL (lg:col-span-7) */}
                <div className="lg:col-span-7 flex flex-col items-center justify-center order-1 lg:order-2">
                  <div className="w-full flex justify-center py-1">
                    <WallpaperPreview
                      data={wallpaperData}
                      showClockGuide={showClockGuide}
                      activeHourOverride={previewHour}
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
                      The downloaded wallpaper leaves the top 22% and bottom 18% completely clean OLED dark so your phone's native clock, notifications, flashlight, and camera never overlap with the schedule.
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
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer font-bold ${
                      deviceGuideTab === "automatic"
                        ? "bg-surface text-primary shadow-xs"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    ⚡ Automatic Setup
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceGuideTab("ios")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer font-bold ${
                      deviceGuideTab === "ios"
                        ? "bg-surface text-primary shadow-xs"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Apple iOS
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceGuideTab("android")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer font-bold ${
                      deviceGuideTab === "android"
                        ? "bg-surface text-primary shadow-xs"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Android
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceGuideTab("tablet")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer font-bold ${
                      deviceGuideTab === "tablet"
                        ? "bg-surface text-primary shadow-xs"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Ambient Display
                  </button>
                </div>

                {/* AUTOMATIC SETUP EXPLANATION */}
                {deviceGuideTab === "automatic" && (
                  <div className="p-4 rounded-2xl bg-surface-container border border-outline/10 space-y-3">
                    <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Can the wallpaper be set automatically?</span>
                    </h3>

                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Web browsers (Chrome, Safari, Firefox) run in a sandboxed security model that forbids websites from silently modifying your device's system settings or wallpapers without user permission.
                    </p>

                    <div className="space-y-2 pt-1 text-xs">
                      <div className="p-3 rounded-xl bg-surface-container-high border border-outline/15 space-y-1">
                        <span className="font-bold text-primary font-mono block">1. One-Tap Share / Set (No Gallery Searching)</span>
                        <p className="text-on-surface-variant">
                          Tap <strong>"Share / Set"</strong> on the Live Wallpaper tab. This directly opens your device's system share sheet where you can tap <strong>"Use as Wallpaper"</strong> in 1 click without manually digging through your gallery.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-container-high border border-outline/15 space-y-1">
                        <span className="font-bold text-amber-300 font-mono block">2. Live Ambient Mode (Zero Downloads)</span>
                        <p className="text-on-surface-variant">
                          Tap <strong>"Ambient Mode"</strong> on your phone or desk stand. Odyssey stays awake in fullscreen as a live, dynamic desk clock with your centered schedule updating every minute in real time.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-container-high border border-outline/15 space-y-1">
                        <span className="font-bold text-emerald-400 font-mono block">3. iOS Shortcuts Daily Automation</span>
                        <p className="text-on-surface-variant">
                          On iPhone, open the built-in <strong>Shortcuts</strong> app → <strong>Automation</strong> → <strong>Daily at 06:00 AM</strong> → <strong>Set Lock Screen Wallpaper</strong> to automatically sync your wallpaper every morning.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* iOS Guide */}
                {deviceGuideTab === "ios" && (
                  <div className="p-4 rounded-2xl bg-surface-container border border-outline/10 space-y-2 text-xs text-on-surface-variant">
                    <h3 className="text-sm font-bold text-on-surface">iPhone Lockscreen Setup</h3>
                    <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                      <li>Tap <strong>Share / Set</strong> or <strong>Download Wallpaper</strong>.</li>
                      <li>On the share sheet, tap <strong>"Use as Wallpaper"</strong>.</li>
                      <li>Pinch to fit: the top 22% safe space leaves your clock and widgets unobstructed.</li>
                      <li>Tap <strong>"Set as Wallpaper Pair"</strong> or <strong>"Customize Lock Screen"</strong>.</li>
                    </ol>
                  </div>
                )}

                {/* Android Guide */}
                {deviceGuideTab === "android" && (
                  <div className="p-4 rounded-2xl bg-surface-container border border-outline/10 space-y-2 text-xs text-on-surface-variant">
                    <h3 className="text-sm font-bold text-on-surface">Android Lockscreen Setup</h3>
                    <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                      <li>Tap <strong>Share / Set</strong> or <strong>Download Wallpaper</strong>.</li>
                      <li>Choose <strong>"Set as wallpaper"</strong> → <strong>"Lock screen"</strong>.</li>
                      <li>The clean safe margins prevent any overlap with status icons or fingerprint sensors.</li>
                    </ol>
                  </div>
                )}

                {/* Tablet / Ambient */}
                {deviceGuideTab === "tablet" && (
                  <div className="p-4 rounded-2xl bg-surface-container border border-outline/10 space-y-2 text-xs text-on-surface-variant">
                    <h3 className="text-sm font-bold text-on-surface">Desk Stand Ambient Display</h3>
                    <p className="leading-relaxed">
                      Tap <strong>"Ambient Mode"</strong> on any tablet or phone placed on a charging stand. It utilizes Screen Wake Lock to stay on as a continuous, live, centered schedule clock throughout your workday.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Bottom Feedback / Reviews Button */}
        <FeedbackBannerButton className="pt-4" />
      </div>
    </div>
  );
}
