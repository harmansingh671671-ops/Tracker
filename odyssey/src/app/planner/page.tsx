'use client';

import React, { useState, useEffect } from 'react';
import { useUserStore } from '@/lib/stores/user-store';
import { useScheduleStore } from '@/lib/stores/schedule-store';
import { format, addDays } from 'date-fns';
import { Moon, Sparkles, Lock, CheckCircle2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { ScheduleBlock } from '@/lib/db';

type ScheduleCategory = ScheduleBlock['category'];
const CATEGORIES: ScheduleCategory[] = ['Work', 'Study', 'Health', 'Sleep', 'Leisure', 'Admin'];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const start = i < 10 ? `0${i}:00` : `${i}:00`;
  const next = i + 1;
  const end = next === 24 ? '00:00' : next < 10 ? `0${next}:00` : `${next}:00`;
  return { start, end, label: `${start} - ${end}`, idx: i };
});

export default function PlannerPage() {
  const { user } = useUserStore();
  const { blocks, fetchBlocksForDate, addBlock, updateBlock, deleteBlock, commitSchedule } = useScheduleStore();

  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const displayDate = format(addDays(new Date(), 1), 'EEEE, MMMM d');

  const [hourMap, setHourMap] = useState<Record<number, { title: string; category: ScheduleCategory }>>({});

  useEffect(() => {
    if (user) fetchBlocksForDate(user.id, tomorrow);
  }, [user, tomorrow, fetchBlocksForDate]);

  useEffect(() => {
    const map: Record<number, { title: string; category: ScheduleCategory }> = {};
    blocks.forEach(b => {
      const idx = parseInt(b.startTime.split(':')[0], 10);
      if (!isNaN(idx)) map[idx] = { title: b.title, category: b.category };
    });
    setHourMap(map);
  }, [blocks]);

  if (!user) return null;

  const handleChange = (idx: number, field: 'title' | 'category', value: string) => {
    setHourMap(prev => ({
      ...prev,
      [idx]: {
        title: field === 'title' ? value : (prev[idx]?.title || ''),
        category: field === 'category' ? (value as ScheduleCategory) : (prev[idx]?.category || 'Work')
      }
    }));
  };

  const saveHour = async (idx: number) => {
    const data = hourMap[idx];
    if (!data?.title.trim()) return;
    const hour = HOURS[idx];
    const existing = blocks.find(b => b.startTime === hour.start);
    if (existing) {
      await updateBlock(existing.id, { title: data.title.trim(), category: data.category });
    } else {
      await addBlock({
        userId: user.id,
        date: tomorrow,
        startTime: hour.start,
        endTime: hour.end,
        title: data.title.trim(),
        category: data.category,
        energyLevel: 'medium',
        status: 'pending',
        isCommitted: false
      });
    }
  };

  const clearHour = async (idx: number) => {
    const hour = HOURS[idx];
    const existing = blocks.find(b => b.startTime === hour.start);
    if (existing) await deleteBlock(existing.id);
    setHourMap(prev => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  };

  const autoSleep = async () => {
    const sleep = [23, 0, 1, 2, 3, 4, 5, 6];
    for (const i of sleep) {
      const hour = HOURS[i];
      if (!blocks.find(b => b.startTime === hour.start)) {
        await addBlock({
          userId: user.id,
          date: tomorrow,
          startTime: hour.start,
          endTime: hour.end,
          title: 'Sleep & Rest',
          category: 'Sleep',
          energyLevel: 'low',
          status: 'pending',
          isCommitted: false
        });
      }
    }
  };

  const commit = async () => await commitSchedule(user.id, tomorrow);
  const filled = Object.values(hourMap).filter(v => v.title?.trim()).length;
  const percent = Math.round((filled / 24) * 100);
  const isCommitted = blocks.length > 0 && blocks.every(b => b.isCommitted);

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">24‑Hour Planner</h1>
          <p className="text-xs text-muted-foreground">{displayDate}</p>
        </div>
        <Button size="sm" variant="outline" onClick={autoSleep} className="gap-1.5 text-xs font-semibold">
          <Moon className="w-3.5 h-3.5 text-indigo-400" /> Auto‑fill Sleep
        </Button>
      </div>

      <Card className="border-indigo-500/30 bg-gradient-to-br from-card to-card/50">
        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <Sparkles className="w-4 h-4" /> Planned Hours
            </span>
            <span>{filled}/24 ({percent}%)</span>
          </div>
          <Progress value={percent} className="h-2.5" />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {HOURS.map(h => {
          const info = hourMap[h.idx] || { title: '', category: 'Work' };
          const hasData = !!info.title.trim();
          return (
            <Card
              key={h.idx}
              className={`border transition-all ${hasData ? 'bg-card border-indigo-500/30' : 'bg-card/40 border-dashed border-border/70'}`}
            >
              <CardContent className="p-2.5 flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px] px-2 py-1 min-w-[85px] justify-center bg-secondary/60">
                  {h.label}
                </Badge>
                <Input
                  placeholder="Activity..."
                  value={info.title}
                  onChange={e => handleChange(h.idx, 'title', e.target.value)}
                  onBlur={() => saveHour(h.idx)}
                  className="text-xs h-8 flex-1"
                />
                <Select
                  value={info.category}
                  onValueChange={val => {
                    if (val) {
                      handleChange(h.idx, 'category', val);
                      setTimeout(() => saveHour(h.idx), 50);
                    }
                  }}
                >
                  <SelectTrigger className="w-[85px] h-8 text-[10px] px-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasData && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400 shrink-0" onClick={() => clearHour(h.idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button
        onClick={commit}
        disabled={isCommitted || filled === 0}
        className={`w-full font-bold gap-2 py-6 text-sm ${isCommitted ? 'bg-emerald-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}
      >
        {isCommitted ? (
          <>
            <CheckCircle2 className="w-5 h-5" /> 24‑Hour Schedule Locked
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" /> Lock & Commit
          </>
        )}
      </Button>
    </div>
  );
}

