"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Smartphone } from "lucide-react";
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
              <svg className="w-3 h-3 text-secondary shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
              <span className="text-[10px] font-bold font-mono leading-none">
                L{user?.level ?? 1}
              </span>
            </div>

            {/* 2. Fire / Streak */}
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-container-high border border-outline/10 text-amber-400"
              title={`Streak: ${user?.streak ?? 0} days`}
            >
              <svg className="w-3 h-3 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.61 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM12 20c-3.31 0-6-2.69-6-6 0-1.53.58-2.93 1.53-3.99.19.46.47.88.85 1.22 1.43 1.28 3.62 1.37 5.15.22 1.25-.94 1.77-2.55 1.41-4.05 1.95 1.68 3.06 4.14 3.06 6.6 0 3.31-2.69 6-6 6z"/>
              </svg>
              <span className="text-[10px] font-bold font-mono leading-none">
                {user?.streak ?? 0}
              </span>
            </div>

            {/* 3. Diamond / Gems */}
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-container-high border border-outline/10 text-primary"
              title={`Diamonds: ${user?.diamonds ?? 0}`}
            >
              <svg className="w-3 h-3 text-primary shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5L2 9l10 12L22 9l-3-6zM9 5h6v3H9V5zm-4.47 4l1.5-3h2.38L6.8 9H4.53zm3.17 2h8.6l-4.3 8.6L7.7 11zm8.77-2l-1.61-3h2.38l1.5 3h-2.27z"/>
              </svg>
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
              <svg className="w-3.5 h-3.5 text-primary shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
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

