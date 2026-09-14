"use client";

import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "@/lib/stores/user-store";

interface ShopItem {
  id: string;
  name: string;
  category: 'streak' | 'xp' | 'audio-theme' | 'crests';
  price: number;
  icon: string;
  iconColor: string;
  desc: string;
  badge?: string;
}

export default function ShopPage() {
  const { user, fetchUser, buyItem, addDiamonds } = useUserStore();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [chestClaimed, setChestClaimed] = useState<boolean>(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const shopItems: ShopItem[] = useMemo(() => [
    {
      id: "streak-freeze",
      name: "Streak Freeze",
      category: "streak",
      price: 15,
      icon: "shield",
      iconColor: "text-tertiary-container",
      desc: "Protects your active streak for 24 hours if a daily review is missed.",
      badge: (user?.streakFreezeCount ?? 0) > 0 ? `${user?.streakFreezeCount} Equipped` : undefined,
    },
    {
      id: "xp-boost",
      name: "2x XP Odyssey Boost (24h)",
      category: "xp",
      price: 25,
      icon: "bolt",
      iconColor: "text-secondary",
      desc: "Doubles all XP earned from schedule blocks and habit check-ins for 24 hours.",
    },
    {
      id: "instant-xp",
      name: "100 Instant XP",
      category: "xp",
      price: 20,
      icon: "auto_awesome",
      iconColor: "text-primary",
      desc: "Instantly claim 100 XP towards advancing to Scholar Division II.",
    },
    {
      id: "titan-crest",
      name: "Titan Mindset Golden Crest",
      category: "crests",
      price: 50,
      icon: "military_tech",
      iconColor: "text-tertiary-fixed-dim",
      desc: "Exclusive golden profile crest displayed across your journey and rank cards.",
    },
    {
      id: "emerald-theme",
      name: "Midnight Emerald Atmosphere",
      category: "audio-theme",
      price: 75,
      icon: "palette",
      iconColor: "text-primary",
      desc: "Unlocks the celestial dark emerald theme for your 24h planner and timeline.",
    },
    {
      id: "binaural-audio",
      name: "Binaural Deep Work Audio Pack",
      category: "audio-theme",
      price: 40,
      icon: "headphones",
      iconColor: "text-secondary",
      desc: "Unlocks 4 spatial soundscapes designed for high-clarity flow state work.",
    },
  ], [user]);

  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return shopItems;
    return shopItems.filter((item) => item.category === activeCategory);
  }, [shopItems, activeCategory]);

  const handleBuy = async (item: ShopItem) => {
    const result = await buyItem(item.name, item.price);
    setToastMsg({ text: result.message, isError: !result.success });
    setTimeout(() => setToastMsg(null), 2800);
  };

  const handleClaimChest = () => {
    if (chestClaimed) return;
    setChestClaimed(true);
    addDiamonds(10);
    setToastMsg({ text: "Daily Discipline Chest Claimed! +10 Gems added to Vault." });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const toggleAudio = () => {
    setIsPlayingAudio(!isPlayingAudio);
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex flex-col w-full px-gutter pb-space-xl gap-space-lg">
        {/* Shop Header & Wallet Vault */}
        <section className="relative overflow-hidden rounded-xl bg-surface-container p-space-md shadow-md border border-outline/10">
          <div className="absolute -right-10 -top-10 w-36 h-36 bg-primary-container/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-10 w-36 h-36 bg-secondary-container/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative flex flex-col gap-space-sm z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                </div>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  Diamond Vault
                </span>
              </div>
              <button
                onClick={() => {
                  setToastMsg({ text: "Complete daily rituals in Habits to earn more Gems!" });
                  setTimeout(() => setToastMsg(null), 2500);
                }}
                className="flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-high text-secondary hover:bg-surface-bright active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span className="font-label-sm text-label-sm font-semibold">Earn More</span>
              </button>
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <span
                className="material-symbols-outlined text-primary text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                diamond
              </span>
              <span className="font-display-lg-mobile text-display-lg-mobile font-bold text-on-surface tracking-tight">
                {user?.diamonds ?? 0}
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface-variant font-medium">
                Gems
              </span>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Spend your earned discipline diamonds on streak protections, focus audio, and prestige crests.
            </p>
          </div>
        </section>

        {/* Horizontal Category Chips */}
        <section className="w-full overflow-x-auto no-scrollbar -mx-gutter px-gutter">
          <div className="flex items-center gap-space-xs min-w-max">
            {[
              { id: "all", label: "All Items" },
              { id: "streak", label: "Streak Protections" },
              { id: "xp", label: "XP Multipliers" },
              { id: "audio-theme", label: "Themes & Audio" },
              { id: "crests", label: "Crests" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-space-md py-1.5 rounded-full font-label-md text-label-md font-semibold transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Inventory Items List */}
        <section className="flex flex-col gap-space-sm">
          {filteredItems.map((item) => {
            const canAfford = (user?.diamonds ?? 0) >= item.price;

            return (
              <article
                key={item.id}
                className="shop-card group relative bg-surface-container rounded-xl p-space-md shadow-sm transition-all duration-200 hover:bg-surface-container-high border border-outline/10"
              >
                <div className="flex items-start justify-between gap-space-sm">
                  <div className="flex items-start gap-space-sm min-w-0">
                    <div className={`w-12 h-12 rounded-xl bg-surface-container-highest flex-shrink-0 flex items-center justify-center ${item.iconColor} shadow-inner`}>
                      <span className="material-symbols-outlined text-[26px]">{item.icon}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-space-xs flex-wrap">
                        <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                          {item.name}
                        </h3>
                        {item.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuy(item)}
                    className={`buy-btn flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg font-label-md text-label-md font-semibold active:scale-95 transition-all shadow-sm group/btn ${
                      canAfford
                        ? "bg-surface-bright hover:bg-primary hover:text-on-primary text-on-surface"
                        : "bg-surface-container-high text-on-surface-variant/70 border border-outline/10"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[15px] ${
                        canAfford ? "text-primary group-hover/btn:text-on-primary" : "text-on-surface-variant/70"
                      }`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      diamond
                    </span>
                    <span>{item.price}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {/* Spatial Sanctuary Preview */}
        <section className="relative rounded-xl overflow-hidden bg-surface-container p-space-md flex flex-col gap-space-sm shadow-md border border-outline/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                spatial_audio_off
              </span>
              <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Spatial Sanctuary Preview
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-secondary bg-secondary-container/40 px-2 py-0.5 rounded-full font-medium">
              Included in Audio
            </span>
          </div>

          <div className="relative w-full h-32 rounded-lg overflow-hidden bg-surface-container-lowest flex items-end p-space-md border border-outline/10">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0b1326] via-[#171f33] to-[#2f3aa3] opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center opacity-25 pointer-events-none">
              <div className="flex gap-1 items-end h-16">
                {[40, 70, 90, 60, 80, 100, 50, 75, 60, 85, 45, 95].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full bg-primary ${isPlayingAudio ? 'animate-pulse' : ''}`}
                    style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
            
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-primary font-semibold uppercase tracking-wider">
                  {isPlayingAudio ? "Now Playing" : "Preview"}
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Emerald Flow State 432Hz
                </span>
              </div>
              <button
                onClick={toggleAudio}
                className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isPlayingAudio ? "pause" : "play_arrow"}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Timed Reward Mystery Chest */}
        <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-surface-container via-surface-container-high to-surface-container p-space-md shadow-md border border-outline/10">
          <div className="flex items-center gap-space-md">
            <div className="relative w-14 h-14 rounded-xl bg-tertiary-container/15 flex-shrink-0 flex items-center justify-center text-tertiary-container">
              <span className="material-symbols-outlined text-[32px]">lock_clock</span>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-tertiary-container animate-pulse" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  Daily Discipline Chest
                </h4>
                <span className="font-label-md text-label-md text-tertiary-container font-mono font-semibold">
                  {chestClaimed ? "Claimed!" : "03:42:15"}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {chestClaimed
                  ? "Daily reward collected! Resets tomorrow."
                  : "Tap to claim mystery gems and focus tokens."}
              </p>
            </div>
          </div>
          <div className="w-full bg-surface-container-highest h-1.5 rounded-full mt-space-sm overflow-hidden">
            <div
              className="bg-tertiary-container h-full rounded-full transition-all duration-500"
              style={{ width: chestClaimed ? "100%" : "72%" }}
            />
          </div>
          {!chestClaimed && (
            <button
              onClick={handleClaimChest}
              className="mt-3 w-full py-2 px-3 rounded-lg bg-tertiary-container/20 hover:bg-tertiary-container text-tertiary hover:text-on-tertiary font-label-md font-semibold transition-all text-center"
            >
              Claim Mystery Bonus (+10 Gems)
            </button>
          )}
        </section>

        {/* Purchase Confirmation Toast */}
        {toastMsg && (
          <div
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 ${
              toastMsg.isError
                ? "bg-error-container text-on-error-container"
                : "bg-surface-bright text-on-surface"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                toastMsg.isError ? "text-error" : "text-primary"
              }`}
            >
              {toastMsg.isError ? "error" : "check_circle"}
            </span>
            <span className="font-label-md text-label-md font-medium">
              {toastMsg.text}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
