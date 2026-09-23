"use client";

import { useEffect, useState, useMemo } from "react";
import {
  type WallpaperData,
  build24HourlyBlocks,
  getCenteredHourlyWindow,
  resolveHobbyEmoji,
  type HourlyBlock,
} from "@/lib/utils/wallpaper-generator";
import {
  Check,
  Zap,
  Sparkles,
  BatteryCharging,
  Wifi,
  Signal,
  Flame,
  Camera,
  Flashlight,
  CheckCircle2,
  Fingerprint,
} from "lucide-react";

interface WallpaperPreviewProps {
  data: WallpaperData;
  showClockGuide?: boolean;
  activeHourOverride?: number | null;
  scale?: number;
  className?: string;
}

export function WallpaperPreview({
  data,
  showClockGuide = true,
  activeHourOverride = null,
  scale = 1,
  className = "",
}: WallpaperPreviewProps) {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = useMemo(() => {
    const h = String(currentTime.getHours()).padStart(2, "0");
    const m = String(currentTime.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }, [currentTime]);

  const currentHourFloat = useMemo(() => {
    return currentTime.getHours() + currentTime.getMinutes() / 60;
  }, [currentTime]);

  // Active hour (from prop override or live clock)
  const activeHour = useMemo(() => {
    if (activeHourOverride !== null && activeHourOverride !== undefined) {
      return activeHourOverride;
    }
    return currentTime.getHours();
  }, [activeHourOverride, currentTime]);

  const currentMinute = currentTime.getMinutes();
  const minutesLeft = 60 - currentMinute;

  // 24 strictly hourly blocks
  const all24HourlyBlocks = useMemo(() => {
    return build24HourlyBlocks(data.blocks);
  }, [data.blocks]);

  // 5 strictly hourly blocks with active hour dead-center
  const blockCount = 5;

  // Centered rolling window with active hour dead center
  const centeredWindow = useMemo(() => {
    return getCenteredHourlyWindow(all24HourlyBlocks, activeHour, blockCount);
  }, [all24HourlyBlocks, activeHour, blockCount]);

  // Planned hours calculation
  const effectivePlannedHours = useMemo(() => {
    const userPlanned = all24HourlyBlocks.filter((b) => b.isUserDefined).length;
    if (userPlanned > 0) return userPlanned;
    return data.plannedHours > 0 ? data.plannedHours : 18;
  }, [all24HourlyBlocks, data.plannedHours]);

  const plannedPercent = Math.min(100, Math.round((effectivePlannedHours / 24) * 100));

  // Category color mapper
  const getCategoryTheme = (category?: string) => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("sleep") || cat.includes("rest")) {
      return {
        label: "Rest",
        color: "#1E1B4B",
        badge: "bg-purple-900/30 text-purple-300 border-purple-800/40",
      };
    }
    if (cat.includes("habit") || cat.includes("vitality") || cat.includes("gym")) {
      return {
        label: "Vitality",
        color: "#10B981",
        badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      };
    }
    if (cat.includes("sync") || cat.includes("meeting")) {
      return {
        label: "Sync",
        color: "#0284C7",
        badge: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      };
    }
    if (cat.includes("renewal") || cat.includes("buffer")) {
      return {
        label: "Renewal",
        color: "#F59E0B",
        badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      };
    }
    return {
      label: "Deep Focus",
      color: "#6366F1",
      badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    };
  };

  // Icon symbol helper
  const getHobbyIcon = (iconName?: string) => {
    if (!iconName) return "🎯";
    const map: Record<string, string> = {
      water_drop: "💧",
      psychology: "🧠",
      wb_sunny: "☀️",
      air: "🌬️",
      edit_note: "✍️",
      music_note: "🎸",
      photo_camera: "📷",
      landscape: "🧗",
      fitness_center: "🏋️",
      directions_run: "🏃",
      menu_book: "📖",
      bedtime: "🌙",
      code: "💻",
      terminal: "💻",
      bolt: "⚡",
    };
    return map[iconName] || iconName;
  };

  return (
    <div
      className={`relative w-full max-w-[420px] rounded-[44px] sm:rounded-[48px] bg-[#090A0F] text-slate-100 overflow-hidden shadow-2xl border border-white/15 select-none transition-all duration-300 ${className}`}
      style={{
        aspectRatio: "9 / 19.5",
        minHeight: "780px",
      }}
    >
      {/* Pure OLED Ambient Glow Lights */}
      <div className="absolute -top-24 -left-16 w-64 h-64 bg-indigo-950/25 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute top-[40%] -right-20 w-64 h-64 bg-emerald-950/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-slate-900/40 rounded-full blur-[90px] pointer-events-none" />

      {/* 1. TOP SAFE ZONE (~12% height for camera notch & status bar) */}
      <div
        className="relative w-full px-5 flex flex-col items-center justify-between z-10 transition-all duration-300"
        style={{ minHeight: showClockGuide ? "145px" : "48px", paddingTop: "12px" }}
      >
        {/* Status Bar */}
        <div className="w-full flex items-center justify-between text-xs text-white/40 font-mono">
          <span className="text-[11.5px] font-semibold text-white/50 tracking-tight">{timeStr}</span>

          {/* Dynamic Island / Notch Placeholder */}
          <div className="w-20 h-4 bg-black/90 border border-white/10 rounded-full flex items-center justify-center gap-1.5 px-2">
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
          </div>

          <div className="flex items-center gap-1 text-[10.5px] text-white/50">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <BatteryCharging className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Lockscreen Clock Simulation (Only when Clock Guide is toggled ON) */}
        {showClockGuide ? (
          <div className="flex flex-col items-center text-center my-auto pt-1 animate-in fade-in duration-300 w-full">
            <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-white/45 font-mono">
              {data.formattedDate}
            </span>
            <span className="text-4xl sm:text-5xl font-light tracking-tight text-white/60 my-0.5 font-mono">
              {timeStr}
            </span>
            <span className="text-[9px] text-white/35 font-mono">Android System Clock Guide</span>
          </div>
        ) : null}
      </div>

      {/* 2. HEADER ANCHOR CARD (Utilizes the upper screen area with high-radius corners) */}
      <div className="px-4 pt-1 z-10 animate-in fade-in duration-300">
        <div className="rounded-[28px] p-3 sm:p-3.5 bg-[#13151D]/85 border border-white/15 backdrop-blur-md flex items-center justify-between shadow-xl">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono tracking-[0.18em] uppercase text-slate-300 font-bold">
                ODYSSEY • CH. 0{data.chapter}
              </span>
              <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                DAY {data.activeDay} OF 365
              </span>
            </div>
            <div className="text-[15px] sm:text-base font-bold text-white flex items-center gap-1.5 truncate">
              <span>{data.rankBadge}</span>
              <span className="truncate">{data.rankName}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              Level {String(data.userLevel).padStart(2, "0")} Cadence
            </span>
          </div>

          {/* Minimal Streak Count on Right */}
          <div className="flex flex-col items-end justify-center pl-3 shrink-0">
            <div className="flex items-center gap-1 text-amber-300 font-mono font-bold text-lg sm:text-xl">
              <span>{data.userStreak ?? data.activeDay}</span>
              <span>🔥</span>
            </div>
            <span className="text-[8.5px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
              DAYS STREAK
            </span>
          </div>
        </div>
      </div>

      {/* 3. CORE 24-HOUR SPECTRUM BAR */}
      <div className="px-4 w-full z-10 mt-2">
        <div className="rounded-2xl p-2.5 px-3 bg-[#13151D]/75 border border-white/15 backdrop-blur-md flex flex-col gap-1.5 shadow-lg">
          {/* Multi-segmented Timeline Bar (24 individual 1-hour slots) */}
          <div className="relative w-full pt-1 pb-8">
            <div className="h-2.5 w-full bg-slate-900 rounded-full flex overflow-hidden border border-white/15 shadow-inner">
              {all24HourlyBlocks.map((b) => {
                const widthPct = (1 / 24) * 100;
                const theme = getCategoryTheme(b.category);
                const isActiveHour = b.hour === activeHour;
                return (
                  <div
                    key={b.hour}
                    style={{ width: `${widthPct}%`, backgroundColor: theme.color }}
                    className={`border-r border-black/40 h-full transition-all ${
                      isActiveHour ? "brightness-150 contrast-125" : "opacity-80"
                    }`}
                    title={`${b.startTime} - ${b.endTime}: ${b.title} (${theme.label})`}
                  />
                );
              })}
            </div>

            {/* Active Time Needle Marker - Large Radiant Glowing Beacon (Larger than bar!) */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -ml-3 pointer-events-none flex flex-col items-center transition-all duration-300 z-10"
              style={{
                left: `${Math.min(
                  96,
                  Math.max(
                    4,
                    ((activeHour + (activeHourOverride !== null ? 0.5 : currentMinute / 60)) / 24) * 100
                  )
                )}%`,
              }}
            >
              {/* Beacon layers */}
              <div className="flex items-center justify-center relative">
                {/* Tier 1: Soft Ambient Radiant Aura */}
                <div className="absolute w-9 h-9 rounded-full bg-amber-400/25 animate-pulse blur-[3px]" />
                {/* Tier 2: Glowing Halo Ring */}
                <div className="absolute w-6 h-6 rounded-full bg-amber-400/35 border border-amber-300/80 shadow-[0_0_12px_#F59E0B]" />
                {/* Tier 3: Solid Amber Core Body */}
                <div className="relative w-4 h-4 rounded-full bg-amber-400 border-2 border-[#090A0F] shadow-[0_0_10px_#F59E0B] flex items-center justify-center">
                  {/* Tier 4: Specular White Pinpoint */}
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>
              {/* Active hour time label directly below the dot */}
              <span className="mt-[18px] text-[8.5px] font-mono font-bold text-amber-300 tracking-wide whitespace-nowrap bg-[#090A0F]/80 px-1.5 py-0.5 rounded-full border border-amber-400/30 shadow-[0_0_6px_rgba(245,158,11,0.3)]">
                {String(activeHour).padStart(2, "0")}:00
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 2-TASK CADENCE WINDOW (CURRENT TASK & UPCOMING TASK ONLY) */}
      <div className="px-4 pt-1.5 pb-2 flex flex-col gap-2.5 z-10">
        {/* Card 1: Current Task (NOW) */}
        {(() => {
          const curBlock = all24HourlyBlocks[activeHour] || {
            hour: activeHour,
            startTime: `${String(activeHour).padStart(2, "0")}:00`,
            endTime: `${String((activeHour + 1) % 24).padStart(2, "0")}:00`,
            title: "",
            category: "",
            tag: "",
            isUserDefined: false,
          };
          const curTheme = getCategoryTheme(curBlock.category);

          return (
            <div className="rounded-[28px] p-3.5 px-4 transition-all flex flex-col gap-2 bg-[#172033] border-2 border-primary/90 shadow-[0_0_24px_rgba(90,240,179,0.25)] relative overflow-hidden ring-1 ring-primary/40">
              {/* Row 1: "NOW" Pill + Time + Category Pill */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary text-[#003825] shadow-sm">
                    NOW
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-200">
                    {curBlock.startTime} → {curBlock.endTime}
                  </span>
                </div>
                {curBlock.category && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold border shrink-0 ${curTheme.badge}`}>
                    {curTheme.label}
                  </span>
                )}
              </div>

              {/* Row 2: Large Bold Title (Keep empty if not scheduled) */}
              <div className="flex items-center justify-between gap-2 w-full pt-0.5 min-h-[22px]">
                {curBlock.title ? (
                  <span className="text-[15px] font-bold leading-tight text-white truncate" title={curBlock.title}>
                    {curBlock.title}
                  </span>
                ) : (
                  <span className="text-xs font-mono text-slate-500 italic">
                    Unscheduled
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Card 2: Upcoming Task (NEXT) */}
        {(() => {
          const nextHour = (activeHour + 1) % 24;
          const nextBlock = all24HourlyBlocks[nextHour] || {
            hour: nextHour,
            startTime: `${String(nextHour).padStart(2, "0")}:00`,
            endTime: `${String((nextHour + 1) % 24).padStart(2, "0")}:00`,
            title: "",
            category: "",
            tag: "",
            isUserDefined: false,
          };
          const nextTheme = getCategoryTheme(nextBlock.category);

          return (
            <div className="rounded-[24px] p-3.5 px-4 transition-all flex flex-col gap-2 bg-[#131B2E]/90 border border-white/15">
              {/* Row 1: "UPCOMING" Pill + Time + Category Pill */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-[#283548] text-secondary border border-secondary/30">
                    UPCOMING
                  </span>
                  <span className="font-mono text-xs font-medium text-slate-300">
                    {nextBlock.startTime} → {nextBlock.endTime}
                  </span>
                </div>
                {nextBlock.category && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold border shrink-0 ${nextTheme.badge}`}>
                    {nextTheme.label}
                  </span>
                )}
              </div>

              {/* Row 2: Upcoming Title (Keep empty if not scheduled) */}
              <div className="flex items-center justify-between gap-2 w-full pt-0.5 min-h-[20px]">
                {nextBlock.title ? (
                  <span className="text-sm font-semibold leading-tight text-slate-200 truncate" title={nextBlock.title}>
                    {nextBlock.title}
                  </span>
                ) : (
                  <span className="text-xs font-mono text-slate-500 italic">
                    Unscheduled
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 5. CADENCE HOBBIES & PASSIONS (Guaranteed Display - Always Visible, Full Width if single, 2x2 Grid if multiple) */}
      {data.includeHobbies !== false && (() => {
        const userHobbies = (data.habits && data.habits.length > 0)
          ? data.habits.slice(0, 4)
          : [
              { id: "def-1", name: "Mindful Focus", icon: "🧘", currentStreak: data.userStreak || 1, category: "Cadence Track" } as any,
              { id: "def-2", name: "Daily Hydration", icon: "💧", currentStreak: data.userStreak || 1, category: "Vitality Track" } as any,
            ];
        const count = userHobbies.length;

        return (
          <div className="px-4 pt-1 flex flex-col gap-1.5 z-10 animate-in fade-in duration-300">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-slate-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                CADENCE • HOBBIES &amp; PASSIONS
              </span>
              <span className="text-[9px] font-mono text-slate-400 font-medium">
                {count} {count === 1 ? "ACTIVE TRACK" : "ACTIVE TRACKS"}
              </span>
            </div>

            <div className={count === 1 ? "grid grid-cols-1" : "grid grid-cols-2 gap-2"}>
              {userHobbies.map((h, hIdx) => (
                <div
                  key={h.id || hIdx}
                  className="rounded-[24px] p-3 bg-[#13151D]/85 border border-white/15 flex items-center justify-between gap-3 transition-all shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{resolveHobbyEmoji(h.icon, h.name)}</span>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-bold text-white truncate">
                        {h.name}
                      </div>
                      <div className="text-[9.5px] text-slate-400 truncate">
                        {h.category || "Cadence Track"}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 font-bold shrink-0">
                    {h.currentStreak || 0}d 🔥
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 7. BOTTOM SAFE ZONE (Clean space for navigation bar & fingerprint) */}
      <div className="w-full px-7 pb-3 pt-2 mt-auto flex flex-col items-center justify-end z-10">
        <div className="w-full flex items-center justify-between text-white/30 select-none pointer-events-none mb-1">
          {/* Flashlight button */}
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 shadow-sm">
            <Flashlight className="w-4 h-4" />
          </div>

          {/* Real Android in-display fingerprint sensor guide */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center text-white/35 bg-white/[0.02]">
              <Fingerprint className="w-6 h-6" />
            </div>
          </div>

          {/* Camera button */}
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 shadow-sm">
            <Camera className="w-4 h-4" />
          </div>
        </div>

        {/* Subtle Brand Tag */}
        <span className="text-[8px] font-mono tracking-[0.25em] text-white/30 uppercase font-semibold">
          ODYSSEY CADENCE LIVE SERVICE
        </span>
      </div>
    </div>
  );
}
