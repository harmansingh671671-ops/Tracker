"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Flame } from "lucide-react";
import { useUserStore } from "@/lib/stores/user-store";
import { ProfileSettingsSheet } from "./profile-settings-sheet";

export function Header() {
  const { user, fetchUser } = useUserStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <>
      <header className="fixed top-0 w-full z-40 pt-safe bg-surface/85 backdrop-blur-xl border-b border-outline/10">
        <div className="h-14 px-3 sm:px-4 max-w-xl sm:max-w-2xl mx-auto flex items-center justify-between gap-2">
          {/* Logo Title */}
          <div className="flex items-center">
            <Link
              href="/planner"
              className="flex items-center gap-2.5 text-base sm:text-lg text-on-surface font-bold tracking-tight hover:opacity-90 transition-opacity"
            >
              <img
                src="/logo.png"
                alt="Odyssey"
                className="w-6 h-6 rounded-lg object-contain border border-primary/20 shadow-sm"
              />
              <span className="font-bold tracking-tight">Odyssey</span>
            </Link>
          </div>

          {/* Gamified HUD Status Chips */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 1. Shield / Level */}
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high border border-outline/10 text-secondary"
              title={`Level ${user?.level ?? 1}`}
            >
              <Shield className="w-3 h-3 text-secondary shrink-0" />
              <span className="text-[11px] font-bold font-mono leading-none">
                Lv. {user?.level ?? 1}
              </span>
            </div>

            {/* 2. Fire / Streak */}
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high border border-outline/10 text-amber-400"
              title={`Streak: ${user?.streak ?? 0} days`}
            >
              <Flame className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[11px] font-bold font-mono leading-none">
                {user?.streak ?? 0}d
              </span>
            </div>

            {/* 4. Profile Avatar Button -> Opens Profile Settings Sheet */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-7 h-7 rounded-full p-0.5 bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm"
              title="Profile & Settings"
              aria-label="Profile and Settings"
            >
              <img
                src="/logo.png"
                alt="Avatar"
                className="w-full h-full object-cover rounded-full bg-surface-container-lowest"
              />
            </button>
          </div>
        </div>
      </header>

      {/* Profile Settings Sheet */}
      <ProfileSettingsSheet
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
