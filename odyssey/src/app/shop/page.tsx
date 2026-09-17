"use client";

import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import {
  Store,
  Sparkles,
  Shield,
  Zap,
  Award,
  Palette,
  Headphones,
  Gift,
  Check,
} from "lucide-react";

interface ShopItem {
  id: string;
  name: string;
  category: "streak" | "xp" | "audio-theme" | "crests";
  price: number;
  Icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  desc: string;
  badge?: string;
}

export default function ShopPage() {
  const { user, fetchUser, buyItem, addDiamonds } = useUserStore();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [chestClaimed, setChestClaimed] = useState<boolean>(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const shopItems: ShopItem[] = useMemo(
    () => [
      {
        id: "streak-freeze",
        name: "Streak Freeze",
        category: "streak",
        price: 15,
        Icon: Shield,
        iconColor: "text-amber-400 bg-amber-400/10 border-amber-400/25",
        desc: "Protects your active streak for 24 hours if a daily review is missed.",
        badge:
          (user?.streakFreezeCount ?? 0) > 0
            ? `${user?.streakFreezeCount} Equipped`
            : undefined,
      },
      {
        id: "xp-boost",
        name: "2x XP Odyssey Boost (24h)",
        category: "xp",
        price: 25,
        Icon: Zap,
        iconColor: "text-secondary bg-secondary/10 border-secondary/25",
        desc: "Doubles all XP earned from schedule blocks and habit check-ins for 24 hours.",
      },
      {
        id: "instant-xp",
        name: "100 Instant XP",
        category: "xp",
        price: 20,
        Icon: Sparkles,
        iconColor: "text-primary bg-primary/10 border-primary/25",
        desc: "Instantly claim 100 XP towards advancing to Scholar Division II.",
      },
      {
        id: "titan-crest",
        name: "Titan Mindset Golden Crest",
        category: "crests",
        price: 50,
        Icon: Award,
        iconColor: "text-amber-300 bg-amber-300/10 border-amber-300/25",
        desc: "Exclusive golden profile crest displayed across your journey and rank cards.",
      },
      {
        id: "emerald-theme",
        name: "Midnight Emerald Theme",
        category: "audio-theme",
        price: 75,
        Icon: Palette,
        iconColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
        desc: "Unlocks the celestial dark emerald atmosphere for your planner and trail.",
      },
      {
        id: "binaural-audio",
        name: "Binaural Deep Work Audio Pack",
        category: "audio-theme",
        price: 40,
        Icon: Headphones,
        iconColor: "text-cyan-400 bg-cyan-400/10 border-cyan-400/25",
        desc: "Unlocks 4 spatial soundscapes designed for high-clarity flow state work.",
      },
    ],
    [user]
  );

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

  return (
    <div className="view-transition min-h-screen bg-surface">
      <div className="flex flex-col w-full max-w-xl sm:max-w-2xl mx-auto px-3 sm:px-4 pb-28 pt-2 space-y-3 touch-pan-y">
        {/* Header Bar: Matching Today and Journey */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-primary">
              <Store className="w-4 h-4 shrink-0" />
              <span className="text-[11px] uppercase tracking-wider font-semibold font-mono">
                Rewards & Vault
              </span>
            </div>
            <h1 className="text-lg sm:text-xl text-on-surface font-bold tracking-tight mt-0.5">
              Odyssey Shop
            </h1>
          </div>

          <button
            type="button"
            onClick={handleClaimChest}
            disabled={chestClaimed}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all shadow-sm cursor-pointer shrink-0 ${
              chestClaimed
                ? "bg-surface-container text-on-surface-variant/60 border border-outline/10 cursor-default"
                : "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-amber-500/20 active:scale-95 hover:brightness-110"
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>{chestClaimed ? "Chest Claimed" : "Daily Chest (+10)"}</span>
          </button>
        </div>

        {/* Vault Balance Card */}
        <section className="rounded-2xl bg-surface-container-low border border-outline/10 p-3.5 sm:p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface-variant">
              Diamond Vault Balance
            </span>
            <span className="text-[11px] font-mono text-primary font-semibold">
              {(user?.streakFreezeCount ?? 0) > 0
                ? `${user?.streakFreezeCount} Freezes Active`
                : "0 Freezes Active"}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-primary tracking-tight">
                {user?.diamonds ?? 0}
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono text-on-surface-variant">
                Gems Available
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono text-secondary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Earn +5/day</span>
            </div>
          </div>
        </section>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          {[
            { id: "all", label: "All Items" },
            { id: "streak", label: "Streak Protections" },
            { id: "xp", label: "XP Multipliers" },
            { id: "audio-theme", label: "Themes & Audio" },
            { id: "crests", label: "Crests" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-full font-mono text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-primary text-on-primary shadow-xs font-bold"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline/10"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Shop Items List */}
        <div className="space-y-2 pt-0.5">
          {filteredItems.map((item) => {
            const canAfford = (user?.diamonds ?? 0) >= item.price;
            const ItemIcon = item.Icon;

            return (
              <div
                key={item.id}
                className="p-3 sm:p-3.5 rounded-2xl bg-surface-container-low border border-outline/15 hover:border-primary/30 transition-all duration-200 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${item.iconColor}`}
                  >
                    <ItemIcon className="w-5 h-5" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-xs sm:text-sm text-on-surface leading-snug">
                        {item.name}
                      </h3>
                      {item.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-primary text-[10px] font-mono font-bold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    canAfford
                      ? "bg-primary text-on-primary hover:bg-primary-fixed active:scale-95"
                      : "bg-surface-container text-on-surface-variant/40 border border-outline/10 cursor-not-allowed"
                  }`}
                  title={canAfford ? `Buy for ${item.price} Gems` : "Insufficient Gems"}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{item.price}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div
            className={`fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in ${
              toastMsg.isError
                ? "bg-rose-500 text-white"
                : "bg-primary text-on-primary"
            }`}
          >
            {toastMsg.isError ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <Check className="w-4 h-4 stroke-[3]" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
