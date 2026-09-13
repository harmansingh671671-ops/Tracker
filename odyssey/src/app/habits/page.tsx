'use client';

import React, { useState, useEffect } from 'react';
import { useUserStore } from '@/lib/stores/user-store';
import { useHabitStore } from '@/lib/stores/habit-store';
import { format } from 'date-fns';
import { Plus, Check, Flame, Trash2, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Habit } from '@/lib/db';

type HabitCategory = Habit['category'];
const HABIT_CATEGORIES: HabitCategory[] = ['Health', 'Mindfulness', 'Learning', 'Productivity', 'Social'];

export default function HabitsPage() {
  const { user, addXp, addDiamonds } = useUserStore();
  const { habits, todayLogs, fetchHabits, addHabit, toggleHabitLog, deleteHabit } = useHabitStore();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HabitCategory>('Health');

  useEffect(() => {
    if (user) {
      fetchHabits(user.id, todayStr);
    }
  }, [user, todayStr, fetchHabits]);

  if (!user) return null;

  const handleToggle = async (habitId: string) => {
    if (!user) return;
    const isNowCompleted = await toggleHabitLog(user.id, habitId, todayStr);
    if (isNowCompleted) {
      await addXp(10);
      await addDiamonds(1);
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await addHabit({
      userId: user.id,
      name: name.trim(),
      icon: '🎯',
      category,
      frequency: 'daily',
      targetDaysPerWeek: 7
    });

    setName('');
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Daily Habits</h1>
          <p className="text-xs text-muted-foreground">Build consistency day by day</p>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1 rounded-full font-semibold">
          <Plus className="w-4 h-4" /> New Habit
        </Button>
      </div>

      {habits.length === 0 ? (
        <Card className="p-8 text-center border-dashed space-y-3">
          <Target className="w-8 h-8 text-primary mx-auto" />
          <h3 className="font-bold text-sm">No Habits Tracked Yet</h3>
          <p className="text-xs text-muted-foreground">Start small to build atomic long-term habits.</p>
          <Button size="sm" onClick={() => setIsAddOpen(true)}>Create Habit</Button>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {habits.map((habit) => {
            const isCompleted = !!todayLogs[habit.id]?.completed;

            return (
              <Card key={habit.id} className={`border transition-all ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-card'}`}>
                <CardContent className="p-3.5 flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{habit.category}</Badge>
                      <span className="text-xs text-amber-500 font-bold flex items-center gap-0.5">
                        <Flame className="w-3.5 h-3.5 fill-amber-500" /> {habit.currentStreak} d
                      </span>
                    </div>
                    <p className={`font-semibold text-sm truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{habit.icon} {habit.name}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant={isCompleted ? 'default' : 'outline'}
                      className={`h-9 w-9 rounded-xl ${isCompleted ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : ''}`}
                      onClick={() => handleToggle(habit.id)}
                    >
                      <Check className="w-5 h-5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400 opacity-60 hover:opacity-100" onClick={() => deleteHabit(habit.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Habit</DialogTitle>
            <DialogDescription>Define a clear daily action.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateHabit} className="space-y-3">
            <Input placeholder="e.g. Read 10 pages or 20 pushups" value={name} onChange={(e) => setName(e.target.value)} />
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold">Category</label>
              <Select value={category} onValueChange={(val) => val && setCategory(val as HabitCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HABIT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full font-bold">Save Habit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
