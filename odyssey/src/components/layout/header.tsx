"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Shield, Flame } from "lucide-react";
import { useUserStore } from "@/lib/stores/user-store";

// PERF-5 -- the header is on every screen, so anything it imports statically is
// downloaded and parsed by every screen before it can be used. Two things were,
// and neither is needed to draw the header:
//
//   * the profile sheet, which carries the settings list, the backup/restore
//     flow, the alerts card and the notification permission panel;
//   * the rank-up dialog, which is the app's only user of the UI kit's dialog
//     primitives -- measured, that one dialog put 41.6 KB gzipped of the kit into
//     the shared set that every route paid for, including routes that never open
//     a dialog at all.
//
// Both are loaded on demand now. The rank-up dialog mounts as soon as the profile
// loads (it needs the profile to have anything to compare, and it reads its own
// stored baseline, so mounting late cannot miss a promotion); the sheet mounts
// the first time it is opened and then stays mounted, exactly as it was, so its
// tab state still survives closing and reopening it.
const ProfileSettingsSheet = dynamic(
  () => import("./profile-settings-sheet").then((m) => m.ProfileSettingsSheet),
  { ssr: false }
);
const RankUpDialog = dynamic(
  () => import("@/components/gamification/rank-up-dialog").then((m) => m.RankUpDialog),
  { ssr: false }
);

export function Header() {
  const { user, fetchUser, daysComplied } = useUserStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Set once, never unset: after the first open the sheet stays mounted so its
  // state behaves as it always has. See the import block above.
  const [profileHasOpened, setProfileHasOpened] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <>
      {/* M14 -- mounted here because the header is the one component present on
          every screen, so a promotion earned while completing a habit is shown
          wherever the user happens to be. PERF-5: gated on the profile, because
          with no profile there is nothing to compare and the dialog itself
          returns early until one arrives -- the gate only stops its code being
          part of every screen's first paint. The rank is now earned in days done
          (ADR 0005), not in consecutive days. */}
      {user && <RankUpDialog daysDone={daysComplied} />}
      <header className="fixed top-0 w-full z-40 pt-safe bg-surface/85 backdrop-blur-md border-b border-outline/10">
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

            {/* 2. Fire / Days done */}
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high border border-outline/10 text-amber-400"
              title={`Days done: ${daysComplied}`}
            >
              <Flame className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[11px] font-bold font-mono leading-none">
                {daysComplied}d
              </span>
            </div>

            {/* 4. Profile Avatar Button -> Opens Profile Settings Sheet */}
            <button
              onClick={() => {
                setProfileHasOpened(true);
                setIsProfileOpen(true);
              }}
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

      {/* Profile Settings Sheet -- mounted from the first open onwards (PERF-5). */}
      {profileHasOpened && (
        <ProfileSettingsSheet
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </>
  );
}
