"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
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
  downloadWallpaper,
  shareWallpaper,
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
  CheckCircle2,
  Power,
  ShieldCheck,
  Zap,
  BatteryCharging,
  Layers,
  Sliders,
  Clock,
  Calendar,
  ExternalLink,
  Plus,
  Trash2,
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
  const [deviceGuideTab, setDeviceGuideTab] = useState<"ios" | "android" | "tablet">("ios");
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

  // Hobby writer state
  const [newHobbyName, setNewHobbyName] = useState<string>("");
  const [selectedEmoji, setSelectedEmoji] = useState<string>("🎸");
  const [selectedCategory, setSelectedCategory] = useState<string>("Mindfulness");

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

  // Handler: Add / Write Custom Hobby
  const handleAddHobby = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user?.id || !newHobbyName.trim()) return;
    setIsGenerating(true);
    const hobbyNameToAdd = newHobbyName.trim();
    try {
      await useHabitStore.getState().addHabit({
        userId: user.id,
        name: hobbyNameToAdd,
        icon: selectedEmoji || "🎯",
        category: (selectedCategory as any) || "Mindfulness",
        frequency: "daily",
      });
      setNewHobbyName("");
      await fetchHabits(user.id, selectedDateStr);
      setStatusNotice(`Added "${hobbyNameToAdd}" to your lockscreen hobbies!`);
      setTimeout(() => setStatusNotice(null), 3000);
    } catch {
      setStatusNotice("Failed to save hobby.");
      setTimeout(() => setStatusNotice(null), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Remove / Delete Hobby
  const handleDeleteHobby = async (habitId: string, habitName: string) => {
    if (!user?.id) return;
    try {
      await useHabitStore.getState().deleteHabit(habitId);
      await fetchHabits(user.id, selectedDateStr);
      setStatusNotice(`Removed "${habitName}".`);
      setTimeout(() => setStatusNotice(null), 3000);
    } catch {
      setStatusNotice("Failed to remove hobby.");
      setTimeout(() => setStatusNotice(null), 3000);
    }
  };

  // Handler: Download HD Wallpaper
  const handleDownload = async () => {
    setIsGenerating(true);
    setStatusNotice("Rendering high-res wallpaper...");
    try {
      await downloadWallpaper(wallpaperData, `odyssey-day-${selectedDayNumber}-wallpaper.png`);
      setStatusNotice("Wallpaper downloaded! Open your gallery/photos to set as lockscreen.");
      setTimeout(() => setStatusNotice(null), 4500);
    } catch (err) {
      setStatusNotice("Failed to generate wallpaper. Please try again.");
      setTimeout(() => setStatusNotice(null), 3500);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Native Web Share
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
        setStatusNotice("Ambient Display Active (Screen stay-on enabled)");
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
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Link
            href="/planner"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-bright text-primary text-xs font-mono font-bold cursor-pointer transition-all active:scale-95 border border-outline/15 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Planner</span>
          </Link>

          <span className="text-[11px] font-mono text-on-surface-variant/70 uppercase tracking-wider font-semibold">
            Odyssey Lockscreen Engine
          </span>
        </div>

        {/* Master Enable / Disable Banner */}
        <section
          className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            enabled
              ? "bg-surface-container-high/90 border-emerald-500/30"
              : "bg-surface-container-low border-outline/15 opacity-90"
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                enabled
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : "bg-surface-container text-on-surface-variant border-outline/20"
              }`}
            >
              <Smartphone className="w-5 h-5" />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-on-surface tracking-tight truncate">
                  Lockscreen Schedule Wallpaper
                </h1>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                    enabled
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-surface-container text-on-surface-variant border-outline/20"
                  }`}
                >
                  {enabled ? "ACTIVE" : "PAUSED"}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                {enabled
                  ? "Feature is enabled. Your 24-hour spectrum, hourly schedule cards & hobbies are live."
                  : "Feature is currently disabled. Toggle on to export your daily cadence wallpaper."}
              </p>
            </div>
          </div>

          {/* Master Enable/Disable Toggle Switch */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={toggleEnabled}
              className={`px-4 py-2 rounded-full font-mono text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 border ${
                enabled
                  ? "bg-emerald-500 hover:bg-emerald-600 text-black border-emerald-400/50"
                  : "bg-surface-container-highest hover:bg-surface-bright text-on-surface border-outline/30"
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${enabled ? "text-black" : "text-primary"}`} />
              <span>{enabled ? "Disable Feature" : "Enable Feature"}</span>
            </button>
          </div>
        </section>

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
            <span>Device Guides</span>
          </button>
        </div>

        {/* TAB 1: LIVE WALLPAPER PREVIEW & EXPORT ACTIONS */}
        {activeTab === "preview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
            {/* LEFT CONTROL PANEL (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-3.5 order-2 lg:order-1">
              {/* Day Selector */}
              <div className="p-3.5 rounded-2xl bg-surface-container border border-outline/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-on-surface flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Select Journey Day:</span>
                  </span>
                  <span className="text-[11px] font-mono text-on-surface-variant">
                    {selectedFormattedDate}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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

              {/* Hours Breakdown & Status Panel */}
              <div className="p-3.5 rounded-2xl bg-surface-container border border-outline/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-bold text-on-surface">
                      Hours on Lockscreen:
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {effectiveHoursCount}/24h ({Math.round((effectiveHoursCount / 24) * 100)}%)
                  </span>
                </div>

                {hasCustomBlocks ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      Showing <strong>{selectedBlocks.length} planned blocks</strong> from your
                      schedule on Day {selectedDayNumber}.
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-surface-container-high border border-outline/15 text-xs text-on-surface-variant space-y-2">
                    <div className="flex items-start gap-2 text-[11.5px] leading-relaxed">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        No custom blocks planned in Planner for Day {selectedDayNumber} yet.
                        Showing <strong>full 24-hour sample cadence (8 blocks)</strong> on the
                        preview.
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAutoFillSleep}
                        disabled={isGenerating}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold cursor-pointer transition-all active:scale-95"
                      >
                        + Auto-Fill Sleep (8h)
                      </button>

                      <Link
                        href="/planner"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-bright text-primary border border-outline/20 text-[11px] font-mono font-bold transition-all"
                      >
                        <span>Open Planner</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-on-surface-variant/80 leading-relaxed font-mono">
                  ✨ The wallpaper displays the <strong>24-hour spectrum bar</strong> across the top
                  and <strong>chronological hourly timeline cards</strong> with the active hour
                  glowing in amber.
                </p>
              </div>

              {/* Hobbies & Passions Manager Panel */}
              <div className="p-3.5 rounded-2xl bg-surface-container border border-outline/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono font-bold text-on-surface">
                      Hobbies on Lockscreen:
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {Math.min(4, habits.length)}/4 Active
                  </span>
                </div>

                <p className="text-[11px] text-on-surface-variant/80 leading-relaxed font-mono">
                  {habits.length === 0
                    ? "No hobbies added yet. The hobbies section is completely omitted from your wallpaper. Write up to 4 hobbies below to display them."
                    : `Showing your top ${Math.min(4, habits.length)} custom hobbies. The layout adjusts automatically for 1, 2, 3, or 4 tracks.`}
                </p>

                {/* User's existing hobbies list */}
                {habits.length > 0 && (
                  <div className="space-y-1.5">
                    {habits.slice(0, 4).map((h, idx) => (
                      <div
                        key={h.id || idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-surface-container-high border border-outline/10 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{h.icon || "🎯"}</span>
                          <div className="min-w-0 truncate">
                            <span className="font-bold text-on-surface truncate block">
                              {h.name}
                            </span>
                            <span className="text-[10px] text-on-surface-variant/70">
                              {h.category || "Passion Track"} • {h.currentStreak || 0}d streak 🔥
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                            Slot #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteHobby(h.id, h.name)}
                            className="p-1 rounded-lg text-on-surface-variant/50 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                            title={`Remove "${h.name}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {habits.length > 4 && (
                      <p className="text-[10px] text-on-surface-variant/60 font-mono italic">
                        + {habits.length - 4} more in library (lockscreen displays top 4).
                      </p>
                    )}
                  </div>
                )}

                {/* Write a New Hobby Form */}
                {habits.length < 4 && (
                  <form onSubmit={handleAddHobby} className="space-y-2 pt-1 border-t border-outline/10">
                    <span className="text-[11px] font-mono font-bold text-on-surface flex items-center gap-1">
                      <Plus className="w-3 h-3 text-primary" />
                      <span>Write / Add a Hobby:</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newHobbyName}
                        onChange={(e) => setNewHobbyName(e.target.value)}
                        placeholder="e.g. Acoustic Guitar, 35mm Film, Bouldering..."
                        className="flex-1 bg-surface-container-highest border border-outline/20 rounded-xl px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary font-sans"
                        maxLength={35}
                      />
                      <button
                        type="submit"
                        disabled={!newHobbyName.trim() || isGenerating}
                        className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                          newHobbyName.trim()
                            ? "bg-primary text-on-primary shadow-xs active:scale-95"
                            : "bg-surface-container-high text-on-surface-variant opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>

                    {/* Quick Emoji Buttons */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {["🎸", "✍️", "📷", "🧗", "🏋️", "🏃", "📖", "💧", "🧠", "☀️", "🎨", "💻", "⚡", "🧘"].map(
                        (emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setSelectedEmoji(emoji)}
                            className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                              selectedEmoji === emoji
                                ? "bg-primary/20 border-primary shadow-xs scale-105"
                                : "bg-surface-container-high border-outline/15 hover:bg-surface-bright"
                            }`}
                          >
                            {emoji}
                          </button>
                        )
                      )}
                    </div>
                  </form>
                )}

                <div className="flex items-center justify-end pt-0.5">
                  <Link
                    href="/habits"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:underline"
                  >
                    <span>Manage all in Hobbies Hub</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Preview Customizer Controls */}
              <div className="p-3.5 rounded-2xl bg-surface-container border border-outline/10 space-y-2">
                <span className="text-xs font-mono font-bold text-on-surface flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  <span>Preview Customizer:</span>
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setShowClockGuide(!showClockGuide)}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      showClockGuide
                        ? "bg-primary/10 border-primary/30 text-primary font-bold"
                        : "bg-surface-container-high border-outline/15 text-on-surface-variant"
                    }`}
                    title="Toggle OS clock simulation"
                  >
                    {showClockGuide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{showClockGuide ? "Clock: ON" : "Clean Mode"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIncludeHobbies(!includeHobbies)}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      includeHobbies
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold"
                        : "bg-surface-container-high border-outline/15 text-on-surface-variant"
                    }`}
                    title="Toggle hobbies section"
                  >
                    <span>{includeHobbies ? "Hobbies: ON" : "Hobbies: OFF"}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="space-y-2 pt-1">
                {/* Button 1: Download High-Res PNG */}
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isGenerating || !enabled}
                  className={`w-full py-3 px-4 rounded-xl font-bold font-mono text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    enabled
                      ? "bg-primary hover:bg-primary-fixed text-on-primary shadow-primary/20 active:scale-95"
                      : "bg-surface-container text-on-surface-variant opacity-60 cursor-not-allowed"
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>{isGenerating ? "Rendering..." : `Download Day ${selectedDayNumber} Wallpaper`}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {/* Button 2: Native Web Share */}
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={isGenerating || !enabled}
                    className={`py-2.5 px-3 rounded-xl font-bold font-mono text-xs shadow-md border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      enabled
                        ? "bg-surface-container-high hover:bg-surface-bright text-on-surface border-outline/20 active:scale-95"
                        : "bg-surface-container text-on-surface-variant opacity-60 cursor-not-allowed border-transparent"
                    }`}
                    title="Open system share sheet"
                  >
                    <Share2 className="w-3.5 h-3.5 text-secondary" />
                    <span>Share / Set</span>
                  </button>

                  {/* Button 3: Ambient Always-On Fullscreen Mode */}
                  <button
                    type="button"
                    onClick={handleToggleAmbient}
                    disabled={!enabled}
                    className={`py-2.5 px-3 rounded-xl font-bold font-mono text-xs shadow-md border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      ambientActive
                        ? "bg-amber-400 text-black border-amber-300"
                        : enabled
                        ? "bg-surface-container-high hover:bg-surface-bright text-on-surface border-outline/20 active:scale-95"
                        : "bg-surface-container text-on-surface-variant opacity-60 cursor-not-allowed border-transparent"
                    }`}
                    title="Fullscreen ambient display mode for desk stands"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{ambientActive ? "Exit Ambient" : "Ambient Mode"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT PREVIEW PANEL (lg:col-span-7) */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center order-1 lg:order-2">
              <div className="text-[10px] font-mono text-on-surface-variant/70 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Live Lockscreen Output • All Hours Visible Below</span>
              </div>

              {/* Scaled Mobile Phone Preview */}
              <div className="w-full flex justify-center py-1">
                <WallpaperPreview
                  data={wallpaperData}
                  showClockGuide={showClockGuide}
                  className="scale-[0.92] sm:scale-100 origin-top shadow-2xl"
                />
              </div>

              <span className="text-[10px] font-mono text-on-surface-variant/50 text-center mt-2 max-w-sm">
                Safe clearance zones: 22% top margin for OS clock/widgets &amp; 18% bottom margin for flashlight/camera.
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: WHAT IS IT & FEATURES SHOWCASE */}
        {activeTab === "features" && (
          <div className="space-y-3.5 animate-in fade-in duration-300">
            <div className="p-4 rounded-2xl bg-surface-container-high border border-outline/15 space-y-2">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>What is the Odyssey Cadence Lockscreen?</span>
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                The Odyssey Cadence Lockscreen is a high-density, OLED-optimized visual schedule
                designed to live right on your phone's lockscreen. Rather than forcing you to open
                an app to check what you should be doing, it anchors your daily priorities directly
                into your subconscious every single time you glance at your phone.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Feature 1: Safe-Zone Geometry */}
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline/10 space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-bold text-xs font-mono">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Safe-Zone Clearance</span>
                </div>
                <p className="text-[11.5px] text-on-surface-variant leading-relaxed">
                  Engineered with a 22% top margin and 18% bottom margin. The phone's native clock,
                  carrier, notification previews, flashlight, and camera icons will never obscure
                  your timeline cards.
                </p>
              </div>

              {/* Feature 2: Dynamic Live Anchor */}
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline/10 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Real-Time Active Highlight</span>
                </div>
                <p className="text-[11.5px] text-on-surface-variant leading-relaxed">
                  The active hour shines in warm amber with a subtle energy bar, while past hours
                  show completed checkmarks and future hours sit cleanly in translucent glass cards.
                </p>
              </div>

              {/* Feature 3: AMOLED Battery Saver */}
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline/10 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono">
                  <BatteryCharging className="w-4 h-4 text-emerald-400" />
                  <span>Obsidian OLED (#090A0F)</span>
                </div>
                <p className="text-[11.5px] text-on-surface-variant leading-relaxed">
                  True black pixels shut off completely on AMOLED and Super Retina screens,
                  saving substantial battery power throughout the day.
                </p>
              </div>

              {/* Feature 4: Subconscious Habit Priming */}
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline/10 space-y-1.5">
                <div className="flex items-center gap-2 text-secondary font-bold text-xs font-mono">
                  <Sparkles className="w-4 h-4 text-secondary" />
                  <span>Habits &amp; Passions Grid</span>
                </div>
                <p className="text-[11.5px] text-on-surface-variant leading-relaxed">
                  Includes your top 4 active hobby tracks with live streaks, reminding you to
                  balance deep focus with creative pursuits like writing, guitar, photography, or
                  fitness.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DEVICE-BY-DEVICE SETUP GUIDES */}
        {activeTab === "guides" && (
          <div className="space-y-3.5 animate-in fade-in duration-300">
            {/* Guide Device Selector */}
            <div className="flex items-center p-1 rounded-xl bg-surface-container border border-outline/10 text-xs font-mono font-semibold">
              <button
                type="button"
                onClick={() => setDeviceGuideTab("ios")}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                  deviceGuideTab === "ios"
                    ? "bg-surface text-primary shadow-xs font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Apple iPhone (iOS)
              </button>

              <button
                type="button"
                onClick={() => setDeviceGuideTab("android")}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                  deviceGuideTab === "android"
                    ? "bg-surface text-primary shadow-xs font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Android Phones
              </button>

              <button
                type="button"
                onClick={() => setDeviceGuideTab("tablet")}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                  deviceGuideTab === "tablet"
                    ? "bg-surface text-primary shadow-xs font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                iPad &amp; Desktop
              </button>
            </div>

            {/* iOS Guide */}
            {deviceGuideTab === "ios" && (
              <div className="p-4 rounded-2xl bg-surface-container border border-outline/10 space-y-3">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span>How to Set on iPhone (iOS 16, 17, 18)</span>
                </h3>

                <ol className="space-y-2.5 text-xs text-on-surface-variant list-decimal list-inside leading-relaxed">
                  <li>
                    <strong className="text-on-surface">Download Wallpaper:</strong> Tap the{" "}
                    <span className="text-primary font-bold">"Download Wallpaper (PNG)"</span>{" "}
                    button or tap <span className="text-secondary font-bold">"Share"</span> and save
                    to Photos.
                  </li>
                  <li>
                    <strong className="text-on-surface">Open Lock Screen Customizer:</strong> On your
                    iPhone lockscreen, long-press the screen and tap the blue{" "}
                    <strong className="text-on-surface">"+"</strong> button to add a new wallpaper.
                  </li>
                  <li>
                    <strong className="text-on-surface">Select Photos:</strong> Choose the downloaded
                    Odyssey image from your Photos library.
                  </li>
                  <li>
                    <strong className="text-on-surface">Pinch &amp; Position:</strong> The image is
                    already calibrated with 22% top clearance. Your clock and widgets will sit
                    cleanly in the safe zone without overlapping any cards!
                  </li>
                  <li>
                    <strong className="text-on-surface">Optional Daily Automation:</strong> You can
                    use the Apple Shortcuts app to automatically fetch and update your wallpaper
                    every morning at 6:00 AM!
                  </li>
                </ol>
              </div>
            )}

            {/* Android Guide */}
            {deviceGuideTab === "android" && (
              <div className="p-4 rounded-2xl bg-surface-container border border-outline/10 space-y-3">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>How to Set on Samsung / Google Pixel / Android</span>
                </h3>

                <ol className="space-y-2.5 text-xs text-on-surface-variant list-decimal list-inside leading-relaxed">
                  <li>
                    <strong className="text-on-surface">Download the Image:</strong> Tap{" "}
                    <span className="text-primary font-bold">"Download Wallpaper (PNG)"</span> to
                    save to your Downloads or Gallery.
                  </li>
                  <li>
                    <strong className="text-on-surface">Open Gallery:</strong> Find the downloaded
                    image in your Gallery or Google Photos.
                  </li>
                  <li>
                    <strong className="text-on-surface">Set as Wallpaper:</strong> Tap the three
                    dots (⋮) in the top/bottom corner and choose{" "}
                    <strong className="text-on-surface">"Set as wallpaper"</strong> →{" "}
                    <strong className="text-on-surface">"Lock screen"</strong>.
                  </li>
                  <li>
                    <strong className="text-on-surface">Done:</strong> The fingerprint icon and
                    status bar sit comfortably inside the safe margin.
                  </li>
                </ol>
              </div>
            )}

            {/* Tablet & Desktop Guide */}
            {deviceGuideTab === "tablet" && (
              <div className="p-4 rounded-2xl bg-surface-container border border-outline/10 space-y-3">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-secondary" />
                  <span>Ambient Desk Display &amp; Tablet Setup</span>
                </h3>

                <p className="text-xs text-on-surface-variant leading-relaxed">
                  If you have an iPad, Android tablet, or secondary desktop monitor on your desk:
                </p>

                <ul className="space-y-2 text-xs text-on-surface-variant list-disc list-inside leading-relaxed">
                  <li>
                    <strong className="text-on-surface">Ambient Mode:</strong> Tap{" "}
                    <span className="text-amber-400 font-bold">"Ambient Display Mode"</span> on the
                    Live Wallpaper tab. This puts Odyssey into fullscreen with Screen Wake Lock
                    active so your device stays on as a live desk cadence clock.
                  </li>
                  <li>
                    <strong className="text-on-surface">Download High-Res:</strong> The generated
                    canvas can be downloaded and set as your tablet lockscreen wallpaper directly
                    through Settings.
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Bottom Feedback / Reviews Button */}
        <FeedbackBannerButton className="pt-6" />
      </div>
    </div>
  );
}
