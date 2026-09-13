'use client';

import React, { useEffect, useState } from 'react';
import { useUserStore } from '@/lib/stores/user-store';
import { useScheduleStore } from '@/lib/stores/schedule-store';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, Plus, Sparkles, Lock, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import type { ScheduleBlock } from '@/lib/db';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Work: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
  Study: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  Health: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
  Sleep: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  Leisure: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/30' },
  Admin: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
};

const MISS_REASONS = [
  "🔋 Low Energy / Fatigue",
  "📱 Distracted (Social / Games)",
  "⏳ Task took longer than planned",
  "💼 Interruption / Emergency",
  "💤 Overslept / Late start"
];

export default function HomePage() {
  const { user, addXp, addDiamonds, updateUser } = useUserStore();
  const { blocks, fetchBlocksForDate, updateBlock } = useScheduleStore();
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const displayDate = format(new Date(), 'EEEE, MMMM d');

  const [selectedBlockForMiss, setSelectedBlockForMiss] = useState<ScheduleBlock | null>(null);
  const [selectedMissReason, setSelectedMissReason] = useState<string>(MISS_REASONS[0]);
  const [isDayLocked, setIsDayLocked] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBlocksForDate(user.id, todayStr);
    }
  }, [user, todayStr, fetchBlocksForDate]);

  if (!user) return null;

  const totalBlocks = blocks.length;
  const completedBlocks = blocks.filter(b => b.status === 'completed').length;
  const missedBlocks = blocks.filter(b => b.status === 'missed').length;
  const reviewedBlocks = completedBlocks + missedBlocks;
  const progressPercent = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;
  const isAllReviewed = totalBlocks > 0 && reviewedBlocks === totalBlocks;

  const handleStatusChange = async (block: ScheduleBlock, status: 'completed' | 'missed' | 'pivoted') => {
    if (status === 'missed') {
      setSelectedBlockForMiss(block);
      return;
    }

    if (status === 'completed' && block.status !== 'completed') {
      await addXp(15);
      await addDiamonds(1);
    }

    await updateBlock(block.id, {
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : undefined
    });
  };

  const confirmMissReason = async () => {
    if (!selectedBlockForMiss) return;
    await updateBlock(selectedBlockForMiss.id, {
      status: 'missed',
      missReason: selectedMissReason
    });
    setSelectedBlockForMiss(null);
  };

  const lockDayReview = async () => {
    if (!user) return;
    const newStreak = user.streak + 1;
    const highestStreak = Math.max(user.highestStreak, newStreak);
    
    await updateUser({
      streak: newStreak,
      highestStreak,
      lastReviewDate: todayStr
    });

    await addDiamonds(completedBlocks);
    setIsDayLocked(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Today's Agenda</h1>
          <p className="text-xs text-muted-foreground">{displayDate}</p>
        </div>
        <Link href="/planner">
          <Button size="sm" className="gap-1 rounded-full font-semibold bg-gradient-to-r from-blue-600 to-indigo-600">
            <Plus className="w-4 h-4" /> Plan Tomorrow
          </Button>
        </Link>
      </div>

      <Card className="border-border/60 bg-gradient-to-br from-card to-card/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Day Progress
            </span>
            <span>{progressPercent}% ({completedBlocks}/{totalBlocks})</span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
        </CardContent>
      </Card>

      {blocks.length === 0 ? (
        <Card className="border-dashed p-8 text-center space-y-3">
          <Clock className="w-8 h-8 text-primary mx-auto" />
          <h3 className="font-bold text-sm">No Schedule Planned</h3>
          <p className="text-xs text-muted-foreground">Plan your day in advance each evening.</p>
          <Link href="/planner">
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Create Schedule</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {blocks.map((block) => {
            const catStyle = CATEGORY_COLORS[block.category] || CATEGORY_COLORS.Work;
            const isCompleted = block.status === 'completed';
            const isMissed = block.status === 'missed';

            return (
              <Card key={block.id} className={`border ${isCompleted ? 'border-emerald-500/40 bg-emerald-500/5' : isMissed ? 'border-rose-500/40 bg-rose-500/5' : ''}`}>
                <CardContent className="p-3.5 flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{block.startTime} - {block.endTime}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>{block.category}</Badge>
                    </div>
                    <p className={`font-medium text-sm truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{block.title}</p>
                    {block.missReason && <p className="text-[11px] text-rose-400 italic">Reason: {block.missReason}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant={isCompleted ? 'default' : 'ghost'} className={`h-8 w-8 rounded-full ${isCompleted ? 'bg-emerald-600 text-white' : ''}`} onClick={() => handleStatusChange(block, 'completed')}>
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant={isMissed ? 'destructive' : 'ghost'} className={`h-8 w-8 rounded-full ${isMissed ? 'bg-rose-600 text-white' : ''}`} onClick={() => handleStatusChange(block, 'missed')}>
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {isAllReviewed && !isDayLocked && (
        <Card className="border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 to-teal-950/40 text-center p-4 space-y-3">
          <Trophy className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="font-bold text-sm text-emerald-300">All Tasks Reviewed!</h3>
          <Button onClick={lockDayReview} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 w-full">
            <Lock className="w-4 h-4" /> Sign & Lock Day Review
          </Button>
        </Card>
      )}

      <Dialog open={!!selectedBlockForMiss} onOpenChange={() => setSelectedBlockForMiss(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reason for Missing</DialogTitle>
            <DialogDescription>Logging honest reasons builds self-awareness.</DialogDescription>
          </DialogHeader>
          <Select value={selectedMissReason} onValueChange={(val) => val && setSelectedMissReason(val)}>
            <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
            <SelectContent>
              {MISS_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button onClick={confirmMissReason} variant="destructive">Log as Missed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
