'use client';

import React from 'react';
import { useUserStore } from '@/lib/stores/user-store';
import { calculateRank, getRankInfo, RANKS } from '@/lib/utils/gamification';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Gem, Zap, ShieldCheck, Award } from 'lucide-react';

export default function StatsPage() {
  const { user } = useUserStore();

  if (!user) return null;

  const currentRankName = calculateRank(user.streak, 100);
  const currentRank = getRankInfo(currentRankName);
  const currentRankIndex = RANKS.findIndex(r => r.name === currentRank.name);
  const nextRank = RANKS[currentRankIndex + 1] || currentRank;
  
  const streakProgressPercent = Math.min(100, Math.round((user.streak / Math.max(1, nextRank.streak)) * 100));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Analytics & Stats</h1>
        <p className="text-xs text-muted-foreground">Performance and rank metrics</p>
      </div>

      {/* Main Rank Card */}
      <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-card to-purple-950/20">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentRank.badge}</span>
              <div>
                <CardTitle className="text-base font-extrabold">{currentRank.name}</CardTitle>
                <CardDescription className="text-xs">Level {user.level} • {currentRank.division} Division</CardDescription>
              </div>
            </div>
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">{currentRank.name}</Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2 space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Next Rank Streak Requirement</span>
              <span>{user.streak} / {nextRank.streak} days</span>
            </div>
            <Progress value={streakProgressPercent} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold">
            <Flame className="w-4 h-4 fill-amber-500" /> Streak
          </div>
          <p className="text-2xl font-extrabold">{user.streak} days</p>
          <p className="text-[10px] text-muted-foreground">Best: {user.highestStreak} days</p>
        </Card>

        <Card className="p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-cyan-500 font-bold">
            <Gem className="w-4 h-4 fill-cyan-500" /> Diamonds
          </div>
          <p className="text-2xl font-extrabold">{user.diamonds}</p>
          <p className="text-[10px] text-muted-foreground">Earned from reviews</p>
        </Card>

        <Card className="p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-purple-500 font-bold">
            <Zap className="w-4 h-4 text-purple-500" /> Total XP
          </div>
          <p className="text-2xl font-extrabold">{user.xp}</p>
          <p className="text-[10px] text-muted-foreground">All-time lifetime XP</p>
        </Card>

        <Card className="p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Discipline
          </div>
          <p className="text-2xl font-extrabold">{user.level * 10}%</p>
          <p className="text-[10px] text-muted-foreground">Consistency score</p>
        </Card>
      </div>
    </div>
  );
}

