'use client';

import React, { useState, useEffect } from 'react';
import { useUserStore } from '@/lib/stores/user-store';
import { useScheduleStore } from '@/lib/stores/schedule-store';
import { format, addDays } from 'date-fns';
import { Plus, Trash2, CalendarCheck, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { ScheduleBlock } from '@/lib/db';

type ScheduleCategory = ScheduleBlock['category'];

const CATEGORIES: ScheduleCategory[] = ['Work', 'Study', 'Health', 'Sleep', 'Leisure', 'Admin'];

export default function PlannerPage() {
  const { user } = useUserStore();
  const { blocks, fetchBlocksForDate, addBlock, deleteBlock, commitSchedule } = useScheduleStore();

  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const displayDate = format(addDays(new Date(), 1), 'EEEE, MMMM d');

  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState<ScheduleCategory>('Work');

  useEffect(() => {
    if (user) {
      fetchBlocksForDate(user.id, tomorrowStr);
    }
  }, [user, tomorrowStr, fetchBlocksForDate]);

  if (!user) return null;

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await addBlock({
      userId: user.id,
      date: tomorrowStr,
      startTime,
      endTime,
      title: title.trim(),
      category,
      energyLevel: 'medium',
      status: 'pending',
      isCommitted: false,
    });

    setTitle('');
  };

  const handleCommit = async () => {
    await commitSchedule(user.id, tomorrowStr);
  };

  const isCommitted = blocks.length > 0 && blocks.every(b => b.isCommitted);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Schedule Planner</h1>
        <p className="text-xs text-muted-foreground">Planning for {displayDate}</p>
      </div>

      <Card className="border-border/60 p-4">
        <form onSubmit={handleAddBlock} className="space-y-3">
          <Input
            placeholder="What will you work on?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-sm"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold">Start Time</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold">End Time</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="text-xs" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-semibold">Category</label>
            <Select value={category} onValueChange={(val) => val && setCategory(val as ScheduleCategory)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full text-xs font-bold gap-1">
            <Plus className="w-4 h-4" /> Add Block
          </Button>
        </form>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-bold flex items-center justify-between">
          <span>Tomorrow's Timeline</span>
          <span className="text-xs text-muted-foreground font-normal">{blocks.length} blocks</span>
        </h2>

        {blocks.length === 0 ? (
          <Card className="p-6 text-center border-dashed text-muted-foreground text-xs">
            No time blocks added yet for tomorrow.
          </Card>
        ) : (
          <div className="space-y-2">
            {blocks.map((block) => (
              <Card key={block.id} className="p-3 border flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{block.startTime} - {block.endTime}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{block.category}</Badge>
                  </div>
                  <p className="font-semibold text-sm">{block.title}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500" onClick={() => deleteBlock(block.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Card>
            ))}

            <Button
              onClick={handleCommit}
              disabled={isCommitted}
              className={`w-full font-bold gap-2 ${isCommitted ? 'bg-emerald-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}
            >
              {isCommitted ? <><CheckCircle2 className="w-4 h-4" /> Schedule Locked</> : <><CalendarCheck className="w-4 h-4" /> Lock & Commit Schedule</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
