"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Shield,
  Flame,
  Gem,
  Award,
  Check,
  Save,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  Heart,
  Target,
} from "lucide-react";
import { useUserStore } from "@/lib/stores/user-store";
import { getRankInfo, calculateRank, RANKS } from "@/lib/utils/gamification";

export default function ProfilePage() {
  const router = useRouter();
  const { user, fetchUser, updateUser, resetToZero } = useUserStore();

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState<string>("");
  const [motto, setMotto] = useState("");
  const [bio, setBio] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setUsername(user.username || "");
      setAge(user.age !== undefined && user.age !== null ? String(user.age) : "");
      setMotto(user.motto || "");
      setBio(user.bio || "");
    }
  }, [user]);

  const rankInfo = useMemo(() => {
    return getRankInfo(user?.militaryRank || calculateRank(user?.streak ?? 0));
  }, [user?.militaryRank, user?.streak]);

  const xpCurrent = (user?.xp ?? 0) % 500;
  const xpPercent = Math.min(100, Math.round((xpCurrent / 500) * 100));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const parsedAge = age.trim() !== "" ? parseInt(age.trim(), 10) : undefined;

    await updateUser({
      displayName: displayName.trim() || "Traveler",
      username: username.trim() || "explorer",
      age: !isNaN(parsedAge as number) ? parsedAge : undefined,
      motto: motto.trim() || undefined,
      bio: bio.trim() || undefined,
    });

    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 2500);
  };

  const handleResetProgress = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset all progress to zero? (Level 1, 0 XP, 0 Diamonds, 0 Streak)"
      )
    ) {
      await resetToZero();
      window.location.reload();
    }
  };

  return (
    <div className="view-transition min-h-screen bg-surface">
      <div className="flex flex-col w-full max-w-xl sm:max-w-2xl mx-auto px-3.5 sm:px-4 pb-28 pt-2 space-y-4">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-outline/10 pb-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-fixed active:scale-95 transition-all cursor-pointer p-1 -ml-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <h1 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
            Profile &amp; Identity
          </h1>

          <div className="w-12" />
        </div>

        {/* 1. Identity Hero Banner */}
        <section className="rounded-3xl bg-surface-container border border-outline/15 p-4 sm:p-5 shadow-lg relative overflow-hidden space-y-4">
          {/* Subtle ambient glow behind avatar */}
          <div className="absolute -top-12 -left-12 w-44 h-44 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3.5 sm:gap-4 relative z-10">
            {/* Rank Badge Avatar */}
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-primary/20 via-surface-container-high to-surface-container border-2 border-primary/30 shadow-md flex items-center justify-center text-3xl sm:text-4xl shrink-0">
              <span>{rankInfo.badge}</span>
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-on-surface truncate">
                  {user?.displayName || "Traveler"}
                </h2>
                <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/25 font-bold">
                  {rankInfo.division} Tier
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono mt-0.5">
                <span>@{user?.username || "explorer"}</span>
                {user?.age ? (
                  <>
                    <span>•</span>
                    <span>{user.age} yrs</span>
                  </>
                ) : null}
              </div>

              <span className="text-xs font-semibold text-primary mt-1">
                {rankInfo.name} • Level {user?.level ?? 1}
              </span>
            </div>
          </div>

          {/* Level Progress */}
          <div className="space-y-1.5 pt-1 border-t border-outline/10 relative z-10">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-on-surface-variant">Level {user?.level ?? 1} Progress</span>
              <span className="text-secondary font-bold">{xpCurrent} / 500 XP</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 shadow-sm shadow-primary/30"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </section>

        {/* 2. Personal Details (Editable) */}
        <section className="rounded-3xl bg-surface-container-low border border-outline/15 p-4 sm:p-5 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <User className="w-4 h-4" />
            <span>Personal Information</span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Display Name */}
              <div>
                <label className="text-[11px] font-mono text-on-surface-variant block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name or Call-sign"
                  className="w-full bg-surface-container-high border border-outline/25 rounded-xl px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-all font-body-md"
                />
              </div>

              {/* Age */}
              <div>
                <label className="text-[11px] font-mono text-on-surface-variant block mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 24"
                  min={1}
                  max={120}
                  className="w-full bg-surface-container-high border border-outline/25 rounded-xl px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-all font-mono"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="text-[11px] font-mono text-on-surface-variant block mb-1">
                Username / Handle
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-mono text-on-surface-variant/60">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  placeholder="username"
                  className="w-full bg-surface-container-high border border-outline/25 rounded-xl pl-7 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-all font-mono"
                />
              </div>
            </div>

            {/* Personal Focus / Motto */}
            <div>
              <label className="text-[11px] font-mono text-on-surface-variant block mb-1">
                Journey Motto &amp; Primary Focus
              </label>
              <textarea
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                placeholder="What drives your daily journey? (e.g. Relentless execution, calm mind)"
                rows={2}
                className="w-full bg-surface-container-high border border-outline/25 rounded-xl px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-all resize-none font-body-md"
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md ${
                  isSaved
                    ? "bg-emerald-500 text-black shadow-emerald-500/25"
                    : "bg-primary hover:bg-primary-fixed text-on-primary shadow-primary/20"
                }`}
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Profile Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? "Saving..." : "Save Profile"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* 3. Concrete Milestones & Stats */}
        <section className="rounded-3xl bg-surface-container-low border border-outline/15 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Target className="w-4 h-4" />
            <span>Journey Performance</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Streak */}
            <div className="p-3 rounded-2xl bg-surface-container-high/70 border border-outline/10 text-center space-y-0.5">
              <span className="text-[10.5px] font-mono text-on-surface-variant block">Current Streak</span>
              <div className="flex items-center justify-center gap-1 text-amber-400 font-mono font-bold text-lg">
                <Flame className="w-4 h-4" />
                <span>{user?.streak ?? 0}d</span>
              </div>
            </div>

            {/* Highest Streak */}
            <div className="p-3 rounded-2xl bg-surface-container-high/70 border border-outline/10 text-center space-y-0.5">
              <span className="text-[10.5px] font-mono text-on-surface-variant block">Best Streak</span>
              <div className="flex items-center justify-center gap-1 text-secondary font-mono font-bold text-lg">
                <Award className="w-4 h-4" />
                <span>{user?.highestStreak ?? user?.streak ?? 0}d</span>
              </div>
            </div>

            {/* Diamonds */}
            <div className="p-3 rounded-2xl bg-surface-container-high/70 border border-outline/10 text-center space-y-0.5">
              <span className="text-[10.5px] font-mono text-on-surface-variant block">Vault Gems</span>
              <div className="flex items-center justify-center gap-1 text-primary font-mono font-bold text-lg">
                <Gem className="w-4 h-4" />
                <span>{user?.diamonds ?? 0}</span>
              </div>
            </div>

            {/* Streak Freezes */}
            <div className="p-3 rounded-2xl bg-surface-container-high/70 border border-outline/10 text-center space-y-0.5">
              <span className="text-[10.5px] font-mono text-on-surface-variant block">Streak Freezes</span>
              <div className="flex items-center justify-center gap-1 text-cyan-400 font-mono font-bold text-lg">
                <Shield className="w-4 h-4" />
                <span>{user?.streakFreezeCount ?? 0}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Unlocked Badges */}
        <section className="rounded-3xl bg-surface-container-low border border-outline/15 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Award className="w-4 h-4" />
              <span>Unlocked Badges</span>
            </div>
            <span className="text-[11px] font-mono text-on-surface-variant">
              {(user?.unlockedBadges || ["Newbie Scribe"]).length} Achieved
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {(user?.unlockedBadges || ["Newbie Scribe"]).map((badge) => (
              <div
                key={badge}
                className="px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface text-xs font-semibold border border-outline/20 flex items-center gap-1.5 shadow-xs"
              >
                <span>🎖️</span>
                <span>{badge}</span>
              </div>
            ))}
          </div>

          {/* Rank Progression Overview */}
          <div className="pt-2 border-t border-outline/10 space-y-2">
            <span className="text-[11px] font-mono font-semibold text-on-surface-variant block uppercase tracking-wider">
              Cadence Progression Tiers
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-center">
              {RANKS.slice(0, 5).map((r) => {
                const isReached = (user?.streak ?? 0) >= r.streak;
                return (
                  <div
                    key={r.name}
                    className={`p-2 rounded-xl border text-[10.5px] font-mono transition-all ${
                      isReached
                        ? "bg-primary/10 border-primary/40 text-primary font-bold shadow-xs"
                        : "bg-surface-container border-outline/10 text-on-surface-variant/50 opacity-60"
                    }`}
                  >
                    <div className="text-base mb-0.5">{r.badge}</div>
                    <span className="block truncate">{r.name}</span>
                    <span className="text-[9.5px] opacity-75">{r.streak}d</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. Account & Data Actions */}
        <section className="rounded-3xl bg-surface-container-low border border-outline/15 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-on-surface">Data &amp; Progress Reset</span>
              <span className="text-[11px] text-on-surface-variant">
                Clear streaks and gamification back to Level 1
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetProgress}
              className="px-3 py-1.5 rounded-xl bg-error/15 hover:bg-error/25 text-error text-xs font-mono font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-error/25"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
