"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Shield, Flame, Gem, User } from "lucide-react";
import { useUserStore } from "@/lib/stores/user-store";

export function Header() {
  const { user, fetchUser } = useUserStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl border-b border-outline/10">
      <div className="h-12 sm:h-14 px-2.5 sm:px-4 max-w-xl sm:max-w-2xl mx-auto flex items-center justify-between gap-1.5">
        {/* Logo Title */}
        <div className="flex items-center">
          <Link href="/planner" className="text-base sm:text-lg text-on-surface font-bold tracking-tight hover:opacity-90 transition-opacity">
            Odyssey
          </Link>
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

          {/* 4. Profile Avatar Button -> Navigates to full Profile Page */}
          <Link
            href="/profile"
            className="w-6 h-6 rounded-full bg-surface-container-high hover:bg-surface-bright flex items-center justify-center shrink-0 transition-all border border-outline/20 text-primary active:scale-90"
            title="Profile & Settings"
          >
            <User className="w-3.5 h-3.5 text-primary shrink-0" />
          </Link>
        </div>
      </div>
    </header>
  );
}

