'use client';

import React, { useState } from 'react';
import { useUserStore } from '@/lib/stores/user-store';
import { calculateRank, getRankInfo } from '@/lib/utils/gamification';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Trophy, Star, Lock, CheckCircle2, Flame, Gem, Crown, Gift, Sparkles, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';

interface PathNode {
  day: number;
  type: 'standard' | 'chest' | 'boss' | 'checkpoint';
  title: string;
  xpReward: number;
  diamondReward: number;
  offset: number;
}

export default function JourneyPage() {
  const { user } = useUserStore();
  const [selectedNode, setSelectedNode] = useState<PathNode | null>(null);

  if (!user) return null;

  const currentStreak = user.streak || 1;
  const rankName = calculateRank(currentStreak, 100);
  const rankInfo = getRankInfo(rankName);

  const nodes: PathNode[] = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    let type: PathNode['type'] = 'standard';
    if (day % 7 === 0) type = 'checkpoint';
    else if (day % 5 === 0) type = 'chest';
    else if (day % 3 === 0) type = 'boss';

    const angle = (i / 4) * Math.PI;
    const offset = Math.round(Math.sin(angle) * 32);

    return {
      day,
      type,
      title: day % 7 === 0 ? `Week ${day / 7} Rank Trial` : day % 5 === 0 ? 'Treasure Chest' : day % 3 === 0 ? 'Challenge Node' : `Day ${day} Mission`,
      xpReward: day * 20,
      diamondReward: type === 'chest' ? 10 : type === 'checkpoint' ? 25 : 5,
      offset
    };
  });

  return (
    <div className="space-y-6 pb-8">
      <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-background to-purple-950/40 overflow-hidden relative">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none p-4">
          <Crown className="w-36 h-36 text-indigo-400" />
        </div>
        <CardContent className="p-5 space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{rankInfo.badge}</span>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-white">{rankInfo.name}</h1>
                <p className="text-xs text-muted-foreground">Level {user.level} • {user.xp} XP</p>
              </div>
            </div>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs px-2.5 py-1 font-bold gap-1">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {currentStreak} Day Streak
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
              <span>Path Progression</span>
              <span>Day {currentStreak} of 30</span>
            </div>
            <div className="h-2.5 w-full bg-secondary/80 rounded-full overflow-hidden p-0.5 border border-border/50">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min((currentStreak / 30) * 100, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2.5D Duolingo Path Map */}
      <div className="relative py-4 flex flex-col items-center">
        <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-indigo-500/30" style={{ strokeWidth: 4, strokeDasharray: '8 6' }}>
          {nodes.map((node, i) => {
            if (i === nodes.length - 1) return null;
            const nextNode = nodes[i + 1];
            const y1 = i * 85 + 40;
            const y2 = (i + 1) * 85 + 40;
            const x1 = 50 + (node.offset * 0.45);
            const x2 = 50 + (nextNode.offset * 0.45);
            return (
              <line
                key={i}
                x1={`${x1}%`}
                y1={y1}
                x2={`${x2}%`}
                y2={y2}
              />
            );
          })}
        </svg>

        <div className="space-y-6 w-full relative z-10">
          {nodes.map((node) => {
            const isCompleted = node.day < currentStreak;
            const isCurrent = node.day === currentStreak;
            const isLocked = node.day > currentStreak;

            return (
              <div
                key={node.day}
                className="flex flex-col items-center justify-center transition-all duration-300"
                style={{ transform: `translateX(${node.offset}px)` }}
              >
                {node.type === 'checkpoint' && (
                  <div className="mb-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] uppercase px-3 py-0.5 rounded-full shadow-lg border border-amber-300 flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Week {node.day / 7} Checkpoint
                  </div>
                )}

                <button
                  onClick={() => setSelectedNode(node)}
                  className={`
                    relative group flex items-center justify-center rounded-2xl transition-all duration-150 active:translate-y-1 active:shadow-none
                    ${node.type === 'checkpoint' ? 'w-16 h-16' : node.type === 'chest' ? 'w-14 h-14' : 'w-12 h-12'}
                    ${
                      isCompleted
                        ? 'bg-emerald-500 hover:bg-emerald-400 border-b-[5px] border-emerald-700 text-slate-950 shadow-emerald-950/40 shadow-lg'
                        : isCurrent
                        ? 'bg-gradient-to-b from-indigo-500 to-blue-600 border-b-[5px] border-indigo-800 text-white shadow-indigo-500/50 shadow-xl ring-4 ring-indigo-400/40 animate-bounce'
                        : 'bg-secondary/80 border-b-[5px] border-border text-muted-foreground shadow-md'
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 font-black stroke-[3]" />
                  ) : isCurrent ? (
                    <div className="flex flex-col items-center">
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <span className="text-[9px] font-black uppercase">Start</span>
                    </div>
                  ) : isLocked ? (
                    node.type === 'chest' ? (
                      <Gift className="w-5 h-5 text-muted-foreground/60" />
                    ) : node.type === 'checkpoint' ? (
                      <Crown className="w-6 h-6 text-muted-foreground/60" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground/60" />
                    )
                  ) : null}

                  <span
                    className={`
                      absolute -bottom-2 text-[9px] font-black px-1.5 py-0.5 rounded-full border shadow-sm
                      ${isCompleted ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500/50' : isCurrent ? 'bg-indigo-900 text-indigo-100 border-indigo-400' : 'bg-background text-muted-foreground border-border'}
                    `}
                  >
                    Day {node.day}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <DialogContent className="sm:max-w-xs text-center space-y-4">
          {selectedNode && (
            <>
              <DialogHeader className="items-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-2">
                  {selectedNode.type === 'checkpoint' ? <Crown className="w-8 h-8 text-amber-400" /> : selectedNode.type === 'chest' ? <Gift className="w-8 h-8 text-cyan-400" /> : <Zap className="w-8 h-8 text-indigo-400" />}
                </div>
                <DialogTitle className="text-lg font-bold">
                  {selectedNode.title}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Day {selectedNode.day} of your Odyssey Transformation
                </DialogDescription>
              </DialogHeader>

              <div className="bg-secondary/40 p-3 rounded-xl flex items-center justify-around text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-purple-400">
                  <Star className="w-4 h-4 fill-purple-400" />
                  <span>+{selectedNode.xpReward} XP</span>
                </div>
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <Gem className="w-4 h-4 fill-cyan-400" />
                  <span>+{selectedNode.diamondReward} Gems</span>
                </div>
              </div>

              <DialogFooter className="sm:justify-center">
                {selectedNode.day <= currentStreak ? (
                  <Link href="/home" className="w-full">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 font-bold gap-2">
                      Enter Day {selectedNode.day} <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button disabled className="w-full font-semibold gap-2">
                    <Lock className="w-4 h-4" /> Locked (Complete Day {currentStreak} first)
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
