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
  Clock,
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

      {/* 1. TOP SAFE ZONE (~36% height for OS Clock & Notifications) */}
      <div className="relative w-full pt-3 px-6 flex flex-col items-center justify-between z-10" style={{ minHeight: "220px" }}>
        {/* Status Bar */}
        <div className="w-full flex items-center justify-between text-xs text-white/35 font-mono pt-1">
          <span className="text-[11px] font-semibold text-white/45 tracking-tight">{timeStr}</span>

          {/* Dynamic Island / Notch Placeholder */}
          <div className="w-22 h-4.5 bg-black/90 border border-white/10 rounded-full flex items-center justify-center gap-1.5 px-2">
            <div className="w-2 h-2 rounded-full bg-white/15" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
          </div>

          <div className="flex items-center gap-1 text-[10px] text-white/40">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <BatteryCharging className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Lockscreen Clock Simulation (Matches real Android lockscreen) */}
        {showClockGuide ? (
          <div className="flex flex-col items-center text-center my-auto pt-2 animate-in fade-in duration-300 w-full">
            <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-white/40 font-mono">
              {data.formattedDate}
            </span>
            <span className="text-5xl sm:text-6xl font-light tracking-tight text-white/50 my-1 font-mono">
              {timeStr}
            </span>

            {/* Simulated notification pill guide */}
            <div className="w-[85%] max-w-[280px] p-2 rounded-2xl bg-slate-800/40 border border-white/10 flex items-center justify-between gap-2 mt-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs">
                  ⚡
                </div>
                <span className="text-[10px] text-white/50 font-sans font-medium">Android System • 1 notif</span>
              </div>
              <span className="text-[9px] text-white/30 font-mono">Just now</span>
            </div>
          </div>
        ) : (
          <div className="my-auto flex flex-col items-center justify-center py-6 text-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/25 border border-white/10 px-3 py-1 rounded-full">
              Clean OLED Clock Safe-Zone
            </span>
          </div>
        )}
      </div>

      {/* 2. HEADER ANCHOR CARD (Positioned right below clock safe zone) */}
      <div className="px-4.5 pt-1.5 z-10 animate-in fade-in duration-300">
        <div className="rounded-2xl p-3 bg-[#13151D]/75 border border-white/10 backdrop-blur-md flex items-center justify-between shadow-lg">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[9.5px] font-mono tracking-[0.2em] uppercase text-slate-400 font-bold">
                ODYSSEY • CH. 0{data.chapter}
              </span>
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                DAY {data.activeDay} OF 365
              </span>
            </div>
            <div className="text-[14px] font-bold text-slate-100 flex items-center gap-1.5">
              <span>{data.rankBadge}</span>
              <span>{data.rankName}</span>
            </div>
            <span className="text-[9.5px] text-slate-400 font-medium">
              Level {String(data.userLevel).padStart(2, "0")} Cadence
            </span>
          </div>

          {/* Minimal Streak Count (Replacing the circular progress gauge) */}
          <div className="flex flex-col items-end justify-center pl-2">
            <div className="flex items-center gap-1 text-amber-300 font-mono font-bold text-base sm:text-lg">
              <span>{data.userStreak ?? data.activeDay}</span>
              <span>🔥</span>
            </div>
            <span className="text-[8px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
              DAYS STREAK
            </span>
          </div>
        </div>
      </div>

      {/* 3. CORE 24-HOUR SPECTRUM BAR */}
      <div className="px-4.5 w-full z-10 mt-2">
        <div className="rounded-xl p-2 px-2.5 bg-[#13151D]/60 border border-white/10 backdrop-blur-md flex flex-col gap-1.5">
          {/* Multi-segmented Timeline Bar (24 individual 1-hour slots) */}
          <div className="relative w-full py-0.5">
            <div className="h-2 w-full bg-slate-900/90 rounded-full flex overflow-hidden border border-white/10 shadow-inner">
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

            {/* Active Time Needle Marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -ml-1 pointer-events-none flex items-center justify-center transition-all duration-300"
              style={{
                left: `${Math.min(
                  98,
                  Math.max(
                    2,
                    ((activeHour + (activeHourOverride !== null ? 0.5 : currentMinute / 60)) / 24) * 100
                  )
                )}%`,
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#090A0F] shadow-[0_0_8px_#F59E0B]" />
            </div>
          </div>

          <div className="flex justify-between items-center text-[8.5px] font-mono text-slate-400 tracking-wider">
            <span className="text-slate-500">00:00</span>
            <span className="text-slate-500">06:00</span>
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-amber-400 animate-ping inline-block" />
              {String(activeHour).padStart(2, "0")}:00 ACTIVE
            </span>
            <span className="text-slate-500">18:00</span>
            <span className="text-slate-500">24:00</span>
          </div>
        </div>
      </div>

      {/* 4. CORE SCHEDULE TIMELINE CARDS (DYNAMICALLY CENTERED ON ACTIVE HOUR) */}
      <div className="px-4.5 py-1.5 flex flex-col gap-1.5 z-10">
        <div className="flex items-center justify-between px-1 py-0.5">
          <span className="text-[9.5px] font-mono tracking-[0.2em] uppercase text-slate-400 font-bold flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-400" />
            SCHEDULE • ACTIVE HOUR CENTERED
          </span>
          <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-400">
            {effectivePlannedHours}/24H PLANNED
          </span>
        </div>

        {centeredWindow.map((block, idx) => {
          const isActive = block.hour === activeHour;
          const isPast =
            (block.hour < activeHour && activeHour - block.hour < 12) ||
            (block.hour > activeHour && block.hour - activeHour > 12);
          const theme = getCategoryTheme(block.category);

          return (
            <div
              key={`${block.hour}-${idx}`}
              className={`rounded-xl p-2 pl-2.5 transition-all flex items-center justify-between border ${
                isActive
                  ? "bg-[#161924] border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.25)] relative overflow-hidden ring-1 ring-amber-400/40"
                  : isPast
                  ? "bg-[#13151D]/50 border-white/5 opacity-70"
                  : "bg-[#13151D]/75 border-white/10"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 shadow-[0_0_10px_#F59E0B]" />
              )}

              <div className="flex items-center gap-2 pl-0.5 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  {isActive ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  ) : (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isPast ? "bg-emerald-400/70" : "bg-slate-600"
                      }`}
                    />
                  )}
                  <span
                    className={`font-mono text-[10.5px] ${
                      isActive ? "font-bold text-amber-200" : "font-medium text-slate-300"
                    }`}
                  >
                    {block.startTime} → {block.endTime}
                  </span>
                </div>

                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${theme.badge}`}
                >
                  {theme.label}
                </span>
              </div>

              <div className="text-[11px] font-semibold text-slate-200 truncate pl-2 flex items-center gap-1.5 ml-auto">
                <span className="truncate max-w-[125px] sm:max-w-[155px] text-right">{block.title}</span>
                {isActive ? (
                  <span className="shrink-0 text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                    NOW
                  </span>
                ) : isPast ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. CADENCE HOBBIES & PASSIONS (Full Width if single, 2x2 Grid if multiple) */}
      {data.includeHobbies !== false && data.habits && data.habits.length > 0 && (() => {
        const userHobbies = data.habits.slice(0, 4);
        const count = userHobbies.length;

        return (
          <div className="px-4.5 pt-1.5 flex flex-col gap-1 z-10 animate-in fade-in duration-300">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-slate-400 font-bold flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                CADENCE • HOBBIES &amp; PASSIONS
              </span>
              <span className="text-[8px] font-mono text-slate-500 font-medium">
                {count} {count === 1 ? "ACTIVE TRACK" : "ACTIVE TRACKS"}
              </span>
            </div>

            <div className={count === 1 ? "grid grid-cols-1" : "grid grid-cols-2 gap-1.5"}>
              {userHobbies.map((h, hIdx) => (
                <div
                  key={h.id || hIdx}
                  className="rounded-xl p-2.5 bg-[#13151D]/75 border border-white/10 flex items-center justify-between gap-2 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{resolveHobbyEmoji(h.icon, h.name)}</span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-100 truncate">
                        {h.name}
                      </div>
                      <div className="text-[8.5px] text-slate-400 truncate">
                        {h.category || "Cadence Track"}
                      </div>
                    </div>
                  </div>
                  <span className="text-[8.5px] font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 font-bold shrink-0">
                    {h.currentStreak || 0}d 🔥
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 7. BOTTOM SAFE ZONE (Matches Real Android Fingerprint & Shortcuts) */}
      <div className="w-full px-7 pb-4 pt-3 mt-auto flex flex-col items-center justify-end z-10">
        <div className="w-full flex items-center justify-between text-white/30 select-none pointer-events-none mb-2">
          {/* Flashlight button */}
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 shadow-sm">
            <Flashlight className="w-4 h-4" />
          </div>

          {/* Real Android in-display fingerprint sensor guide */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center text-white/35 bg-white/[0.02]">
              <Fingerprint className="w-7 h-7" />
            </div>
          </div>

          {/* Camera button */}
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 shadow-sm">
            <Camera className="w-4 h-4" />
          </div>
        </div>

        {/* Subtle Brand Tag */}
        <span className="text-[7.5px] font-mono tracking-[0.25em] text-white/20 uppercase font-semibold">
          ODYSSEY CADENCE LOCKSCREEN
        </span>
      </div>
    </div>
  );
}
