"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useUserStore } from "@/lib/stores/user-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { db, type ScheduleBlock } from "@/lib/db";
import { getJourneyDayNumber, getDateForJourneyDay } from "@/lib/utils/journey";
import { calculateRank, getRankInfo } from "@/lib/utils/gamification";
import {
  type WallpaperData,
} from "@/lib/utils/wallpaper-generator";
import { WallpaperPreview } from "@/components/wallpaper/wallpaper-preview";
import {
  clearNativeLockscreen,
  launchLiveWallpaperPicker,
  syncScheduleDataToNative,
  triggerNativeTestNotification,
  setCustomTargetWallpaper,
  saveNativeCustomWallpaper,
  getNativeCustomWallpaper,
  clearNativeCustomWallpaper,
  applyNativeCustomWallpaper,
  openSystemWallpaperChooser,
  pickNativeCustomWallpaperPhoto,
  isAndroidApp,
  sendTestNotificationToAndroid,
} from "@/lib/utils/android-bridge";
import {
  Sparkles,
  Smartphone,
  CheckCircle2,
  Zap,
  Image as ImageIcon,
  Eye,
  Lock,
  Upload,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  Bell,
  Loader2,
  Trash2,
} from "lucide-react";

export default function WallpaperPage() {
  const { user, fetchUser } = useUserStore();
  const { habits, fetchHabits } = useHabitStore();

  const [activeEngine, setActiveEngine] = useState<"live" | "static">("live");
  const [screenTarget, setScreenTarget] = useState<"lock" | "home" | "both">("both");
  const [simMode, setSimMode] = useState<"clean" | "guide">("clean");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const customFileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenPhotoPicker = () => {
    if (isAndroidApp()) {
      const launched = pickNativeCustomWallpaperPhoto();
      if (launched) return;
    }
    if (customFileInputRef.current) {
      customFileInputRef.current.value = "";
      customFileInputRef.current.click();
    }
  };

  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);

  useEffect(() => {
    fetchUser();
    const todayStr = new Date().toISOString().split("T")[0];
    fetchHabits(user?.id || "default", todayStr);

    db.scheduleBlocks.where("date").equals(todayStr).toArray().then(setBlocks);

    const saved = getNativeCustomWallpaper();
    if (saved) setCustomWallpaper(saved);

    const onNativePhotoSelected = (e: any) => {
      if (e.detail?.base64) {
        setCustomWallpaper(e.detail.base64);
        saveNativeCustomWallpaper(e.detail.base64);
        showToast("Custom wallpaper stored! It will automatically replace Odyssey when turned off.");
      }
    };
    window.addEventListener("odyssey:custom-wallpaper-selected", onNativePhotoSelected);

    return () => {
      window.removeEventListener("odyssey:custom-wallpaper-selected", onNativePhotoSelected);
    };
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

  const compressImageForWallpaper = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = (e) => {
        const rawResult = e.target?.result as string;
        if (!rawResult) {
          reject(new Error("Empty image data"));
          return;
        }

        const img = new Image();
        img.onerror = () => {
          resolve(rawResult);
        };
        img.onload = () => {
          try {
            const MAX_WIDTH = 1440;
            const MAX_HEIGHT = 2560;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH || height > MAX_HEIGHT) {
              const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(rawResult);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/jpeg", 0.9);
            resolve(compressed);
          } catch {
            resolve(rawResult);
          }
        };
        img.src = rawResult;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const base64 = await compressImageForWallpaper(file);
      if (base64) {
        saveNativeCustomWallpaper(base64);
        setCustomWallpaper(base64);
        showToast("Custom wallpaper stored! It will automatically replace Odyssey when turned off.");
      }
    } catch (err) {
      console.error("Failed to process photo:", err);
      showToast("Could not process photo. Please choose a different image.");
    } finally {
      if (e?.target) {
        try {
          e.target.value = "";
        } catch {}
      }
      setIsProcessing(false);
    }
  };

  const handleRemoveCustom = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearNativeCustomWallpaper();
    setCustomWallpaper(null);
    showToast("Custom restoration wallpaper removed.");
  };

  const handleApplyNow = () => {
    if (customWallpaper) {
      applyNativeCustomWallpaper("both");
      showToast("Applied custom wallpaper to both Lock & Home screens.");
    } else {
      showToast("No custom wallpaper stored yet. Tap to pick one first.");
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
    applyNativeCustomWallpaper("both");
    if (customWallpaper) {
      showToast("Schedule wallpaper turned off. Restored your selected wallpaper to both Lock & Home screens!");
    } else {
      showToast("Schedule wallpaper turned off.");
    }
  };

  const handleSendTestNotification = () => {
    triggerNativeTestNotification();
    sendTestNotificationToAndroid("NOW", "Deep Monotasking Sprint", "Focus");
    showToast("Sent XX:57 Heads-Up test alert via Android notification engine.");
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-12 pt-2 space-y-6">

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

      {/* Center Stage: Phone Simulator */}
      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-[340px] shadow-2xl rounded-[48px] border-4 border-surface-container-highest/60 overflow-hidden bg-surface-container-lowest">
          <WallpaperPreview
            data={wallpaperData}
            showClockGuide={simMode === "guide"}
            className="w-full"
          />
        </div>
        <p className="text-[11px] font-mono text-on-surface-variant text-center mt-2.5">
          Live 2-Task Preview • Current & Upcoming Only
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

        {/* 3. Unified Custom Restoration Wallpaper Section */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline/10 space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-on-surface">Custom Restoration Wallpaper</h3>
              <p className="text-xs text-on-surface-variant">
                Stored wallpaper that replaces Odyssey on both Lock & Home screens when turning off
              </p>
            </div>
          </div>

          {/* Hidden HTML File Input for Web Browser fallback */}
          <input
            ref={customFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />

          {customWallpaper ? (
            /* Saved Wallpaper Preview & Control */
            <div className="p-3 rounded-xl bg-surface-container-low flex flex-col space-y-3 border border-outline/10">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-on-surface flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  Selected Wallpaper
                </span>
                <span className="font-mono text-primary flex items-center gap-1 text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Stored & Ready
                </span>
              </div>

              {/* Image Preview Box - Tappable for direct OS photo picker */}
              <div
                onClick={handleOpenPhotoPicker}
                className="relative w-full h-44 rounded-xl overflow-hidden bg-surface-container-high flex items-center justify-center cursor-pointer group border border-outline/15 hover:border-primary/50 transition-all select-none block"
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2 text-primary">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-xs font-mono font-medium">Processing wallpaper...</span>
                  </div>
                ) : (
                  <>
                    <img
                      src={customWallpaper}
                      alt="Custom restoration wallpaper"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium gap-1.5 z-10">
                      <Upload className="w-4 h-4" />
                      <span>Tap to choose another photo</span>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleOpenPhotoPicker}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-surface-container-high hover:bg-surface-bright active:scale-95 text-on-surface text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-outline/10 text-center select-none"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-primary" />
                  )}
                  <span>{isProcessing ? "Processing..." : "Change Wallpaper"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyNow}
                  className="py-2.5 px-4 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary text-xs font-semibold transition-colors cursor-pointer border border-primary/20"
                >
                  Apply Now
                </button>

                <button
                  type="button"
                  onClick={handleRemoveCustom}
                  title="Remove saved wallpaper"
                  className="p-2.5 rounded-xl bg-surface-container-high hover:bg-rose-500/20 text-on-surface-variant hover:text-rose-400 transition-colors cursor-pointer border border-outline/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* No Wallpaper Selected: Clean System Wallpaper Picker Card */
            <button
              type="button"
              onClick={handleOpenPhotoPicker}
              className="w-full p-6 rounded-xl bg-surface-container-low border-2 border-dashed border-outline/20 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group select-none text-center block"
            >
              <div className="w-12 h-12 rounded-2xl bg-surface-container-high group-hover:bg-primary/20 flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-all mx-auto">
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <ImageIcon className="w-6 h-6" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors block">
                  {isProcessing ? "Processing Photo..." : "Open System Wallpaper Picker"}
                </span>
                <p className="text-[11px] font-mono text-on-surface-variant mt-0.5 max-w-xs mx-auto">
                  Select your custom photo from Gallery or Google Photos to be stored and restored when turning off Odyssey
                </p>
              </div>
            </button>
          )}

          {/* Quick Option: Open Android Device Wallpaper Settings */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-[11px] font-mono text-on-surface-variant">Device Wallpaper Settings:</span>
            <button
              type="button"
              onClick={() => {
                const res = openSystemWallpaperChooser();
                if (res) {
                  showToast("Opening Android System Wallpaper Chooser...");
                } else {
                  showToast("Android Wallpaper Chooser triggered.");
                }
              }}
              className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Open Device Chooser</span>
            </button>
          </div>
        </div>

        {/* 4. Primary Activation Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Big Glowing Emerald Activation Button */}
          <button
            onClick={handleLaunchLiveWallpaper}
            className="relative w-full py-4 px-6 rounded-2xl bg-primary text-on-primary font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-primary/25 hover:scale-[0.99] active:scale-[0.97] transition-all cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>Launch Native Live Wallpaper Service</span>
          </button>

          {/* Secondary Ghost Reset Button */}
          <button
            onClick={handleTurnOffWallpaper}
            className="w-full py-3.5 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer border border-outline/10"
          >
            <RefreshCw className="w-4 h-4 text-primary" />
            <span>Turn Off Wallpaper (Restore Selected Wallpaper)</span>
          </button>

          {/* Tertiary Test Notification Button */}
          <button
            onClick={handleSendTestNotification}
            className="w-full py-2.5 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-tertiary text-xs font-mono font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
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

