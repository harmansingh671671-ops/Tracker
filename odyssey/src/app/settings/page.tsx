'use client';

import React, { useState } from 'react';
import { useUserStore } from '@/lib/stores/user-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User, Shield, RotateCcw, Save } from 'lucide-react';
import { db } from '@/lib/db';

export default function SettingsPage() {
  const { user, updateUser } = useUserStore();
  const [displayName, setDisplayName] = useState(user?.displayName || 'Commander');
  const [militaryRank, setMilitaryRank] = useState(user?.militaryRank || 'Cadet');
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUser({ displayName: displayName.trim(), militaryRank: militaryRank.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetData = async () => {
    if (confirm('Are you sure you want to reset all user data and schedule history?')) {
      await db.delete();
      await db.open();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Settings & Profile</h1>
        <p className="text-xs text-muted-foreground">Manage your identity and app preferences</p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Commander Profile
          </CardTitle>
          <CardDescription className="text-xs">Update your displayed callsign and rank title.</CardDescription>
        </CardHeader>

        <CardContent className="p-4 pt-2">
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground">Callsign / Name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="text-sm" />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-muted-foreground">Military Rank Title</label>
              <Input value={militaryRank} onChange={(e) => setMilitaryRank(e.target.value)} className="text-sm" />
            </div>

            <Button type="submit" className="w-full font-bold gap-2 text-xs">
              <Save className="w-4 h-4" /> Save Profile Changes
            </Button>
            {saved && <p className="text-xs text-emerald-400 text-center">Changes saved successfully!</p>}
          </form>
        </CardContent>
      </Card>

      <Card className="border-rose-500/30 bg-rose-500/5">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-bold text-rose-400 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Reset Local Database
          </CardTitle>
          <CardDescription className="text-xs">Wipe IndexedDB state and restart fresh.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <Button variant="destructive" size="sm" onClick={handleResetData} className="w-full font-bold">
            Reset Data & Restart
          </Button>
        </CardContent>
      </Card>

      <div className="text-center p-4 text-[11px] text-muted-foreground">
        <p className="font-bold text-foreground">Odyssey Productivity App</p>
        <p>Version 1.0.0 • Local IndexedDB Gamification Engine</p>
      </div>
    </div>
  );
}

