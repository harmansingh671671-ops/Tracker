'use client';

import React from 'react';
import { useUserStore } from '@/lib/stores/user-store';
import { Flame, Gem, Shield, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const { user } = useUserStore();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
            Odyssey
          </span>
          <Badge variant="outline" className="text-xs font-semibold gap-1 border-primary/20 bg-primary/5">
            <Shield className="w-3 h-3 text-indigo-500" />
            {user.militaryRank || 'Civilian'}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* Streak */}
          <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-500/20">
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
            <span>{user.streak}</span>
          </div>

          {/* Diamonds */}
          <div className="flex items-center gap-1 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-2.5 py-1 rounded-full text-xs font-bold border border-cyan-500/20">
            <Gem className="w-3.5 h-3.5 fill-cyan-500 text-cyan-500" />
            <span>{user.diamonds}</span>
          </div>

          {/* Level */}
          <div className="flex items-center gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded-full text-xs font-bold border border-purple-500/20">
            <Award className="w-3.5 h-3.5 text-purple-500" />
            <span>Lvl {user.level}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
