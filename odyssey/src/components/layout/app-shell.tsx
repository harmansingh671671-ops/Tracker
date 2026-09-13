'use client';

import React, { useEffect } from 'react';
import { useUserStore } from '@/lib/stores/user-store';
import { Header } from './header';
import { BottomNav } from './bottom-nav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { fetchUser, loading } = useUserStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-muted-foreground animate-pulse">Initializing Odyssey...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto border-x border-border shadow-xl relative pb-20">
      <Header />
      <main className="flex-1 p-4 overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
