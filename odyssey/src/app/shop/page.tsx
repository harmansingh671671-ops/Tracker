'use client';

import React, { useState } from 'react';
import { useUserStore } from '@/lib/stores/user-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gem, ShieldAlert, Zap, Sparkles, Award, Check } from 'lucide-react';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: React.ReactNode;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'streak_freeze',
    name: 'Streak Freeze',
    description: 'Protects your streak for 1 day if you miss your review.',
    price: 15,
    icon: <ShieldAlert className="w-6 h-6 text-amber-400" />
  },
  {
    id: 'xp_boost',
    name: '2x XP Boost (24h)',
    description: 'Doubles all XP earned from task completions for 24 hours.',
    price: 25,
    icon: <Zap className="w-6 h-6 text-purple-400" />
  },
  {
    id: 'xp_pack',
    name: '100 Instant XP',
    description: 'Instantly claim 100 XP towards your next rank.',
    price: 20,
    icon: <Sparkles className="w-6 h-6 text-emerald-400" />
  },
  {
    id: 'titan_badge',
    name: 'Titan Crest',
    description: 'Exclusive golden profile crest badge.',
    price: 50,
    icon: <Award className="w-6 h-6 text-amber-300" />
  }
];

export default function ShopPage() {
  const { user, updateUser, addXp } = useUserStore();
  const [purchasedItems, setPurchasedItems] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  if (!user) return null;

  const handleBuy = async (item: ShopItem) => {
    if (user.diamonds < item.price) {
      setMessage(`Not enough diamonds! Need ${item.price} gems.`);
      return;
    }

    const newDiamonds = user.diamonds - item.price;
    await updateUser({ diamonds: newDiamonds });

    if (item.id === 'xp_pack') {
      await addXp(100);
    }

    setPurchasedItems((prev) => [...prev, item.id]);
    setMessage(`Successfully unlocked ${item.name}!`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Armory & Shop</h1>
          <p className="text-xs text-muted-foreground">Spend your earned diamonds</p>
        </div>
        <div className="flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-full text-xs font-bold">
          <Gem className="w-4 h-4 fill-cyan-400 text-cyan-400" />
          <span>{user.diamonds} Gems</span>
        </div>
      </div>

      {message && (
        <Badge variant="outline" className="w-full justify-center p-2 text-xs bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
          {message}
        </Badge>
      )}

      <div className="space-y-3">
        {SHOP_ITEMS.map((item) => {
          const canAfford = user.diamonds >= item.price;
          const isPurchased = purchasedItems.includes(item.id);

          return (
            <Card key={item.id} className="border-border/60">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-secondary/80 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>

                <Button
                  size="sm"
                  disabled={!canAfford && !isPurchased}
                  onClick={() => handleBuy(item)}
                  className={`font-bold gap-1 min-w-[90px] ${isPurchased ? 'bg-emerald-600 hover:bg-emerald-500' : ''}`}
                >
                  {isPurchased ? (
                    <><Check className="w-4 h-4" /> Unlocked</>
                  ) : (
                    <><Gem className="w-3.5 h-3.5 fill-current" /> {item.price}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
