"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/lib/stores/user-store";

export function Header() {
  const { user, fetchUser } = useUserStore();
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <>
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl border-b border-outline/10">
        <div className="h-16 px-gutter flex items-center justify-between gap-space-sm">
          {/* Logo */}
          <div className="flex items-center gap-space-xs">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center p-0.5 shadow-md shadow-primary/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-surface"
              >
                <path d="M2 12c3-4 6-4 9 0s6 4 9 0" />
                <path d="M2 12c3 4 6 4 9 0s6-4 9 0" />
              </svg>
            </div>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
              Odyssey
            </span>
          </div>

          {/* Status Chips */}
          <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-secondary transition-all">
              <span className="material-symbols-outlined text-[15px]">shield</span>
              <span className="font-label-sm text-label-sm font-semibold">
                Lvl {user?.level ?? 1}
              </span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-tertiary-container transition-all">
              <span
                className="material-symbols-outlined text-[15px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_fire_department
              </span>
              <span className="font-label-sm text-label-sm font-semibold">
                {user?.streak ?? 0}
              </span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-primary-container transition-all">
              <span
                className="material-symbols-outlined text-[15px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                diamond
              </span>
              <span className="font-label-sm text-label-sm font-semibold">
                {user?.diamonds ?? 0}
              </span>
            </div>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-bright flex items-center justify-center shrink-0 transition-opacity border border-outline/20"
              title="Profile & Badges"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">person</span>
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
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  <span className="material-symbols-outlined text-[20px]">military_tech</span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-[15px] font-bold text-on-surface">
                    {user?.militaryRank || 'Civilian'}
                  </h4>
                  <span className="text-[12px] text-on-surface-variant">Level {user?.level ?? 1} Cadet</span>
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

            <div className="pt-2 border-t border-outline/10">
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

