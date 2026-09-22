"use client";

import { X, Sparkles, Gem, Shield, Zap, Check } from "lucide-react";

interface RewardCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  diamondsWon?: number;
  xpWon?: number;
  itemWon?: string;
}

export function RewardCelebrationModal({
  isOpen,
  onClose,
  title = "Mystery Chest Unboxed!",
  diamondsWon = 25,
  xpWon = 50,
  itemWon = "Streak Freeze Shield",
}: RewardCelebrationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/85 backdrop-blur-md animate-in fade-in duration-300">
      {/* Radiant Glow Behind Modal */}
      <div className="absolute w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm bg-surface-container rounded-[32px] p-6 text-center border border-primary/40 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Chest Icon Animation */}
        <div className="relative flex items-center justify-center pt-3">
          <div className="absolute w-24 h-24 rounded-full bg-primary/25 animate-ping" />
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-4xl shadow-xl shadow-primary/30">
            🎁
          </div>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
            LEGENDARY DROP
          </span>
          <h3 className="text-xl font-bold tracking-tight text-on-surface mt-1">{title}</h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Rewards deposited directly into your cadence vault
          </p>
        </div>

        {/* Reward Loot Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="p-3 rounded-2xl bg-surface-container-low border border-outline/10 flex flex-col items-center">
            <span className="text-xl mb-1">💎</span>
            <span className="text-base font-bold font-mono text-on-surface">+{diamondsWon}</span>
            <span className="text-[10px] font-mono text-on-surface-variant">Diamonds</span>
          </div>

          <div className="p-3 rounded-2xl bg-surface-container-low border border-outline/10 flex flex-col items-center">
            <span className="text-xl mb-1">⚡</span>
            <span className="text-base font-bold font-mono text-on-surface">+{xpWon}</span>
            <span className="text-[10px] font-mono text-on-surface-variant">Mastery XP</span>
          </div>

          {itemWon && (
            <div className="col-span-2 p-3 rounded-2xl bg-surface-container-low border border-primary/30 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-on-surface">{itemWon}</span>
              <span className="text-[10px] font-mono text-primary font-semibold">Equipped</span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-primary text-on-primary font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>Claim All & Equip</span>
        </button>
      </div>
    </div>
  );
}
