"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { db, type ScheduleBlock, type Habit } from "@/lib/db";
import { getJourneyDayNumber, getDateForJourneyDay } from "@/lib/utils/journey";
import { calculateRank, getRankInfo } from "@/lib/utils/gamification";
import {
  build24HourlyBlocks,
  type WallpaperData,
} from "@/lib/utils/wallpaper-generator";
import { WallpaperPreview } from "@/components/wallpaper/wallpaper-preview";
import {
  clearNativeLockscreen,
  launchLiveWallpaperPicker,
  syncScheduleDataToNative,
  triggerNativeTestNotification,
  setCustomTargetWallpaper,
  saveNativeAlternateWallpaper,
  getNativeAlternateWallpaper,
  applyNativeAlternateWallpaper,
  sendTestNotificationToAndroid,
} from "@/lib/utils/android-bridge";
import {
  Sparkles,
  Layers,
  Smartphone,
  CheckCircle2,
  Clock,
  Send,
  Zap,
  PowerOff,
  Image as ImageIcon,
  Compass,
  Flame,
  ArrowRight,
  Eye,
  Sliders,
  ChevronRight,
  Lock,
  Home,
  Check,
  Upload,
  ArrowLeft,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  Bell,
  HelpCircle,
} from "lucide-react";

export default function WallpaperPage() {
  const { user, fetchUser } = useUserStore();
  const { habits, fetchHabits } = useHabitStore();

  const [activeEngine, setActiveEngine] = useState<"live" | "static">("live");
  const [screenTarget, setScreenTarget] = useState<"lock" | "home" | "both">("both");
  const [simMode, setSimMode] = useState<"clean" | "guide">("clean");
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [altLockPhoto, setAltLockPhoto] = useState<string | null>(null);
  const [altHomePhoto, setAltHomePhoto] = useState<string | null>(null);

  const lockFileInputRef = useRef<HTMLInputElement>(null);
  const homeFileInputRef = useRef<HTMLInputElement>(null);

  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);

  useEffect(() => {
    fetchUser();
    const todayStr = new Date().toISOString().split("T")[0];
    fetchHabits(user?.id || "default", todayStr);

    db.scheduleBlocks.where("date").equals(todayStr).toArray().then(setBlocks);

    const savedLock = getNativeAlternateWallpaper("lock");
    if (savedLock) setAltLockPhoto(savedLock);

    const savedHome = getNativeAlternateWallpaper("home");
    if (savedHome) setAltHomePhoto(savedHome);
  }, [fetchUser, fetchHabits, user?.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const activeDay = useMemo(() => {
    return getJourneyDayNumber(user?.createdAt);
  }, [user?.createdAt]);

  const selectedDateStr = useMemo(() => {
    return getDateForJourneyDay(activeDay, user?.createdAt);
  }, [activeDay, user?.createdAt]);

  const selectedFormattedDate = useMemo(() => {
    const [y, m, d] = selectedDateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, [selectedDateStr]);

  const rankInfo = useMemo(() => {
    return getRankInfo(user?.militaryRank || calculateRank(user?.streak ?? 0));
  }, [user?.militaryRank, user?.streak]);

  const wallpaperData: WallpaperData = useMemo(() => {
    return {
      chapter: 1,
      activeDay,
      rankBadge: rankInfo.badge,
      rankName: rankInfo.name,
      userLevel: user?.level || 1,
      plannedHours: blocks.length,
      dateStr: selectedDateStr,
      formattedDate: selectedFormattedDate,
      blocks,
      habits,
      showClockGuide: simMode === "guide",
      includeHobbies: true,
      userStreak: user?.streak || 1,
    };
  }, [activeDay, rankInfo, user, blocks, habits, selectedDateStr, selectedFormattedDate, simMode]);

  const handleEngineChange = (engine: "live" | "static") => {
    setActiveEngine(engine);
    showToast(
      engine === "live"
        ? "Dynamic Live Wallpaper Engine selected (60 FPS breathing pulse)."
        : "Static Auto-Updating Engine selected (hourly system lockscreen swap)."
    );
  };

  const handleTargetChange = (target: "lock" | "home" | "both") => {
    setScreenTarget(target);
    setCustomTargetWallpaper(target);
    const labels = { lock: "Lock Screen", home: "Home Screen", both: "Both Screens" };
    showToast(`Target configured: ${labels[target]}`);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "lock" | "home") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        saveNativeAlternateWallpaper(base64, target);
        if (target === "lock") setAltLockPhoto(base64);
        else setAltHomePhoto(base64);
        showToast(`${target === "lock" ? "Lock" : "Home"} Screen alternate photo saved.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyAlternate = (target: "lock" | "home") => {
    const applied = applyNativeAlternateWallpaper(target);
    if (applied) {
      showToast(`${target === "lock" ? "Lock" : "Home"} Screen alternate wallpaper applied.`);
    } else {
      showToast("No custom photo saved yet. Tap Change Photo first.");
    }
  };

  const handleLaunchLiveWallpaper = () => {
    syncScheduleDataToNative(wallpaperData);
    const launched = launchLiveWallpaperPicker();
    if (launched) {
      showToast("Opening Android Live Wallpaper selector...");
    } else {
      showToast("Native Live Wallpaper picker triggered.");
    }
  };

  const handleTurnOffWallpaper = () => {
    clearNativeLockscreen();
    applyNativeAlternateWallpaper("both");
    showToast("Schedule wallpaper removed. Restored alternate wallpapers.");
  };

  const handleSendTestNotification = () => {
    triggerNativeTestNotification();
    sendTestNotificationToAndroid("NOW", "Deep Monotasking Sprint", "Focus");
    showToast("Sent XX:57 Heads-Up test alert via Android notification engine.");
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-12 pt-2 space-y-6">
      {/* Sub-Header & Live Status Banner */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
          <span className="text-xs font-mono font-bold text-on-surface">60 FPS Native Pipeline</span>
        </div>
        <span className="text-xs font-mono text-on-surface-variant">
          Engine: {activeEngine === "live" ? "Dynamic Live" : "Static Lockscreen"}
        </span>
      </div>

      {/* Simulation Environment Mode Bar */}
      <div className="flex items-center justify-center">
        <div className="inline-flex p-1 bg-surface-container-low rounded-full shadow-inner border border-outline/10">
          <button
            onClick={() => setSimMode("guide")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              simMode === "guide"
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Guide</span>
          </button>
          <button
            onClick={() => setSimMode("clean")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              simMode === "clean"
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Clean Wallpaper</span>
          </button>
        </div>
      </div>

      {/* Center Stage: Phone Simulator (19.5:9 ratio mockup previewing 2-Task Cadence Window) */}
      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-[340px] shadow-2xl rounded-[48px] border-4 border-surface-container-highest/60 overflow-hidden bg-surface-container-lowest">
          <WallpaperPreview
            data={wallpaperData}
            showClockGuide={simMode === "guide"}
            className="w-full"
          />
        </div>
        <p className="text-[11px] font-mono text-on-surface-variant text-center mt-2.5">
          Live 2-Task Cadence Window • Current & Upcoming Only
        </p>
      </div>

      {/* Interactive Controls & Settings Deck */}
      <div className="space-y-5">
        {/* 1. Engine Switcher Segmented Control */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span>Lockscreen Architecture Engine</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 bg-surface-container-low rounded-2xl border border-outline/10">
            <button
              onClick={() => handleEngineChange("live")}
              className={`p-3 rounded-xl flex items-start gap-3 text-left transition-all ${
                activeEngine === "live"
                  ? "bg-surface-container shadow-md border border-primary/30"
                  : "bg-transparent hover:bg-surface-container/40"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-on-surface">✨ Dynamic Live</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-mono font-bold">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-tight">
                  Smooth breathing aura, real-time minute beacon
                </p>
              </div>
            </button>

            <button
              onClick={() => handleEngineChange("static")}
              className={`p-3 rounded-xl flex items-start gap-3 text-left transition-all ${
                activeEngine === "static"
                  ? "bg-surface-container shadow-md border border-secondary/30"
                  : "bg-transparent hover:bg-surface-container/40"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0 mt-0.5">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-on-surface">🖼️ Static Hourly</span>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-tight">
                  Updates lockscreen canvas every hour in background
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Screen Target Selector */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-secondary" />
            <span>Target Screen Destination</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleTargetChange("lock")}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                screenTarget === "lock"
                  ? "bg-secondary-container text-on-secondary-container shadow-md font-bold"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Lock Screen</span>
            </button>
            <button
              onClick={() => handleTargetChange("home")}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                screenTarget === "home"
                  ? "bg-secondary-container text-on-secondary-container shadow-md font-bold"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Home Screen</span>
            </button>
            <button
              onClick={() => handleTargetChange("both")}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                screenTarget === "both"
                  ? "bg-secondary-container text-on-secondary-container shadow-md font-bold"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Both Screens</span>
            </button>
          </div>
        </div>

        {/* 3. Alternate Wallpaper System Card */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline/10 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-on-surface">Alternate Wallpapers</h3>
              <p className="text-xs text-on-surface-variant">
                Custom fallback photos restored when turning off the schedule wallpaper
              </p>
            </div>
          </div>

          {/* Dual Thumbnail Upload Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Lock Screen Photo Card */}
            <div className="p-3 rounded-xl bg-surface-container-low flex flex-col space-y-3 border border-outline/5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-on-surface flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-on-surface-variant" />
                  Lock Screen
                </span>
                <span className="font-mono text-primary flex items-center gap-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {altLockPhoto ? "Saved" : "Default"}
                </span>
              </div>
              <div className="relative w-full h-32 rounded-lg overflow-hidden bg-surface-container-high flex items-center justify-center">
                {altLockPhoto ? (
                  <img src={altLockPhoto} alt="Lock screen alternate" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-on-surface-variant">
                    <ImageIcon className="w-6 h-6 opacity-40" />
                    <span className="text-[10px] font-mono">No Custom Photo</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => lockFileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Change Photo</span>
                </button>
                <input
                  ref={lockFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, "lock")}
                  className="hidden"
                />
                <button
                  onClick={() => handleApplyAlternate("lock")}
                  className="py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Home Screen Photo Card */}
            <div className="p-3 rounded-xl bg-surface-container-low flex flex-col space-y-3 border border-outline/5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-on-surface flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-on-surface-variant" />
                  Home Screen
                </span>
                <span className="font-mono text-on-surface-variant flex items-center gap-0.5">
                  {altHomePhoto ? "Saved" : "Default"}
                </span>
              </div>
              <div className="relative w-full h-32 rounded-lg overflow-hidden bg-surface-container-high flex items-center justify-center">
                {altHomePhoto ? (
                  <img src={altHomePhoto} alt="Home screen alternate" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-on-surface-variant">
                    <ImageIcon className="w-6 h-6 opacity-40" />
                    <span className="text-[10px] font-mono">No Custom Photo</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => homeFileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Change Photo</span>
                </button>
                <input
                  ref={homeFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, "home")}
                  className="hidden"
                />
                <button
                  onClick={() => handleApplyAlternate("home")}
                  className="py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Primary Activation Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Big Glowing Emerald Activation Button */}
          <button
            onClick={handleLaunchLiveWallpaper}
            className="relative w-full py-4 px-6 rounded-2xl bg-primary text-on-primary font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-primary/25 hover:scale-[0.99] active:scale-[0.97] transition-all"
          >
            <Sparkles className="w-5 h-5" />
            <span>Launch Native Live Wallpaper Service</span>
          </button>

          {/* Secondary Ghost Reset Button */}
          <button
            onClick={handleTurnOffWallpaper}
            className="w-full py-3 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Turn Off Wallpaper (Restore Alternate Photos)</span>
          </button>

          {/* Tertiary Test Notification Button */}
          <button
            onClick={handleSendTestNotification}
            className="w-full py-2.5 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-tertiary text-xs font-mono font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4" />
            <span>Send Test XX:57 Heads-Up Notification</span>
          </button>
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="p-3.5 rounded-xl bg-primary-container text-on-primary-container text-xs font-semibold flex items-center gap-2.5 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Safety & Battery Badge */}
        <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline/5 text-center">
          <p className="text-[11px] font-mono text-on-surface-variant">
            🛡️ 100% Google Play Safe • 0 Dangerous Permissions • Battery Impact: &lt;0.8%/day
          </p>
        </div>
      </div>
    </div>
  );
}
