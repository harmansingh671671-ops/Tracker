"use client";

import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { RewardCelebrationModal } from "@/components/shop/reward-celebration-modal";
import {
  Shield,
  Zap,
  Sparkles,
  Award,
  Gem,
  Gift,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

interface ShopItem {
  id: string;
  name: string;
  category: "protection" | "boost" | "custom";
  price: number;
  icon: string;
  desc: string;
  badge?: string;
}

export default function ShopPage() {
  const { user, fetchUser, buyItem, addDiamonds, addXp } = useUserStore();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [chestClaimed, setChestClaimed] = useState(false);

  useEffect(() => {
    fetchUser();
    const savedChest = localStorage.getItem(`odyssey_chest_${new Date().toISOString().split("T")[0]}`);
    if (savedChest) setChestClaimed(true);
  }, [fetchUser]);

  const showToast = (text: string, isError = false) => {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const shopItems: ShopItem[] = useMemo(
    () => [
      {
        id: "streak-freeze",
        name: "Streak Freeze Shield",
        category: "protection",
        price: 15,
        icon: "🛡️",
        desc: "Protects your active streak for 24 hours if a daily habit or review is missed.",
        badge: (user?.streakFreezeCount ?? 0) > 0 ? `${user?.streakFreezeCount} Active` : undefined,
      },
      {
        id: "xp-boost",
        name: "2x XP Chrono Boost (24h)",
        category: "boost",
        price: 25,
        icon: "⚡",
        desc: "Doubles all XP earned from schedule blocks and habit check-ins for 24 hours.",
      },
      {
        id: "instant-xp",
        name: "100 Instant Mastery XP",
        category: "boost",
        price: 20,
        icon: "✨",
        desc: "Instantly claim 100 XP towards advancing to the next Division.",
      },
      {
        id: "titan-crest",
        name: "Titan Mindset Golden Crest",
        category: "custom",
        price: 50,
        icon: "👑",
        desc: "Golden profile crest displayed across your journey and rank cards.",
      },
    ],
    [user?.streakFreezeCount]
  );

  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return shopItems;
    return shopItems.filter((item) => item.category === activeCategory);
  }, [shopItems, activeCategory]);

  const handlePurchase = async (item: ShopItem) => {
    if (!user) return;
    if ((user.diamonds ?? 0) < item.price) {
      showToast(`Need ${item.price - (user.diamonds ?? 0)} more diamonds. Complete habits!`, true);
      return;
    }
    const res = await buyItem(item.id, item.price);
    if (res.success) {
      showToast(`Equipped ${item.name}! -${item.price} 💎`);
      await fetchUser();
    } else {
      showToast(res.message || "Purchase failed. Try again.", true);
    }
  };

  const handleOpenChest = async () => {
    if (chestClaimed) {
      showToast("Daily chest already claimed. Returns tomorrow!", true);
      return;
    }
    await addDiamonds(25);
    await addXp(50);
    await fetchUser();
    setChestClaimed(true);
    localStorage.setItem(`odyssey_chest_${new Date().toISOString().split("T")[0]}`, "true");
    setIsCelebrationOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-16 pt-2 space-y-5">
      {/* Micro Weekly Progress & Rewards Tracker Bar */}
      <div className="w-full bg-surface-container-low rounded-2xl p-3 border border-outline/10 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
            <span className="text-secondary text-sm">⭐</span>
          </div>
          <span className="text-xs font-mono font-medium text-on-surface truncate">
            Bonus Tier Active • Week 2 Streak
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-mono font-bold text-primary">+35 💎</span>
        </div>
      </div>

      {/* Diamond Vault Balance Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-container p-5 border border-outline/10 shadow-xl space-y-4">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-secondary/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant font-semibold">
                Vault Reserves
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-bold font-mono text-on-surface">
                  {user?.diamonds ?? 0}
                </span>
                <span className="text-base font-bold text-secondary">Diamonds 💎</span>
              </div>
            </div>

            {/* Active Protections */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high border border-outline/10 text-xs font-mono">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary font-bold">
                {user?.streakFreezeCount ?? 0} Freeze Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
            <TrendingUp className="w-3.5 h-3.5 text-tertiary" />
            <span>Earn <strong className="text-primary font-bold">+15 💎 / day</strong> by completing daily habits</span>
          </div>
        </div>
      </div>

      {/* Daily Free Mystery Chest */}
      <div
        onClick={handleOpenChest}
        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-sm active:scale-[0.99] ${
          chestClaimed
            ? "bg-surface-container-low border-outline/10 opacity-70"
            : "bg-gradient-to-r from-secondary-container/40 via-surface-container to-primary/10 border-primary/40 hover:border-primary"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary-container text-secondary flex items-center justify-center text-2xl shadow-inner">
            🎁
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-on-surface">Daily Mystery Chest</h4>
              {!chestClaimed && (
                <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-mono font-bold animate-pulse">
                  READY
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {chestClaimed ? "Claimed today • Resets tomorrow" : "Tap to open and collect loot!"}
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-primary">
          {chestClaimed ? "Claimed ✓" : "Open ⚡"}
        </span>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {[
          { id: "all", label: "All Items" },
          { id: "protection", label: "Protection" },
          { id: "boost", label: "XP Boosts" },
          { id: "custom", label: "Crests" },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline/10"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Armory Catalog Items */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container border border-outline/10 hover:border-outline/25 transition-all shadow-sm"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-2xl shrink-0">
                <span>{item.icon}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-on-surface truncate">{item.name}</h3>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-mono font-bold">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1 leading-snug">{item.desc}</p>
              </div>
            </div>

            <div className="flex items-center justify-end shrink-0 pt-1 sm:pt-0">
              <button
                onClick={() => handlePurchase(item)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-surface-container-highest hover:bg-primary hover:text-on-primary text-secondary text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 border border-outline/10"
              >
                <span>💎 {item.price}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-lg animate-in fade-in duration-200 ${
            toastMsg.isError
              ? "bg-error-container text-on-error-container"
              : "bg-primary-container text-on-primary-container"
          }`}
        >
          {toastMsg.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Mystery Chest Reward Celebration Modal */}
      <RewardCelebrationModal
        isOpen={isCelebrationOpen}
        onClose={() => setIsCelebrationOpen(false)}
        diamondsWon={25}
        xpWon={50}
        itemWon="Streak Freeze Shield"
      />
    </div>
  );
}
