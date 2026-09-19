"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Smartphone, Shield, Flame, Gem, User } from "lucide-react";
import { useUserStore } from "@/lib/stores/user-store";
import { getRankInfo, calculateRank } from "@/lib/utils/gamification";

export function Header() {
  const { user, fetchUser } = useUserStore();
  const [showProfile, setShowProfile] = useState(false);
  const rankInfo = getRankInfo(user?.militaryRank || calculateRank(user?.streak ?? 0, user?.integrityScore ?? 100));

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <>
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl border-b border-outline/10">
        <div className="h-12 sm:h-14 px-2.5 sm:px-4 max-w-xl sm:max-w-2xl mx-auto flex items-center justify-between gap-1.5">
          {/* Logo Title */}
          <div className="flex items-center">
            <span className="text-base sm:text-lg text-on-surface font-bold tracking-tight">
              Odyssey
            </span>
          </div>

          {/* 4 Status Chips - Ultra-compact, sleek, perfectly fitting mobile */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* 1. Shield / Level */}
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-container-high border border-outline/10 text-secondary"
              title={`Level ${user?.level ?? 1}`}
            >
              <Shield className="w-3 h-3 text-secondary shrink-0" />
              <span className="text-[10px] font-bold font-mono leading-none">
                L{user?.level ?? 1}
              </span>
            </div>

            {/* 2. Fire / Streak */}
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-container-high border border-outline/10 text-amber-400"
              title={`Streak: ${user?.streak ?? 0} days`}
            >
              <Flame className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[10px] font-bold font-mono leading-none">
                {user?.streak ?? 0}
              </span>
            </div>

            {/* 3. Diamond / Gems */}
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-container-high border border-outline/10 text-primary"
              title={`Diamonds: ${user?.diamonds ?? 0}`}
            >
              <Gem className="w-3 h-3 text-primary shrink-0" />
              <span className="text-[10px] font-bold font-mono leading-none">
                {user?.diamonds ?? 0}
              </span>
            </div>

            {/* 4. Profile Avatar Button */}
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="w-6 h-6 rounded-full bg-surface-container-high hover:bg-surface-bright flex items-center justify-center shrink-0 transition-colors border border-outline/20 text-primary"
              title="Profile & Badges"
            >
              <User className="w-3.5 h-3.5 text-primary shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* Profile quick modal */}
      {showProfile && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-end p-4 pt-20"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-surface-container p-5 shadow-2xl border border-outline/20 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  <span>{rankInfo.badge}</span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-[15px] font-bold text-on-surface">
                    {rankInfo.name}
                  </h4>
                  <span className="text-[12px] text-on-surface-variant">Level {user?.level ?? 1} • {rankInfo.division} Tier</span>
                </div>
              </div>
              <button
                onClick={() => setShowProfile(false)}
                className="w-7 h-7 rounded-full bg-surface-bright flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline/10">
                <span className="text-[11px] text-on-surface-variant block">Discipline Score</span>
                <span className="text-base font-bold text-primary">{user?.integrityScore ?? 100}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline/10">
                <span className="text-[11px] text-on-surface-variant block">Streak Freezes</span>
                <span className="text-base font-bold text-tertiary">{user?.streakFreezeCount ?? 0}</span>
              </div>
            </div>

            <div>
              <span className="font-label-sm text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider block mb-1.5">
                Unlocked Badges
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(user?.unlockedBadges || ['Newbie Scribe']).map((badge) => (
                  <span
                    key={badge}
                    className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface text-[11px] font-medium border border-outline/20 flex items-center gap-1"
                  >
                    <span>🎖️</span>
                    <span>{badge}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-outline/10 space-y-2">
              <Link
                href="/wallpaper"
                onClick={() => setShowProfile(false)}
                className="w-full py-2 px-3 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface text-[12px] font-medium flex items-center justify-between transition-colors border border-outline/15 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span>Lockscreen Wallpaper</span>
                </div>
                <span className="text-[10px] font-mono text-primary font-bold">Open →</span>
              </Link>

              <button
                onClick={async () => {
                  if (window.confirm('Reset all progress to zero (Level 1, 0 XP, 0 Diamonds, 0 Streak)?')) {
                    await useUserStore.getState().resetToZero();
                    setShowProfile(false);
                    window.location.reload();
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-surface-container-highest hover:bg-error/20 text-error text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors border border-outline/20"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                <span>Reset All to Zero</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

