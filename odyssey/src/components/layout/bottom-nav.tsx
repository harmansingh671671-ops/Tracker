'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, CalendarPlus, Target, BarChart3, ShoppingBag, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/home', label: 'Today', icon: Home },
    { href: '/journey', label: 'Journey', icon: Map },
    { href: '/planner', label: 'Plan', icon: CalendarPlus },
    { href: '/habits', label: 'Habits', icon: Target },
    { href: '/stats', label: 'Stats', icon: BarChart3 },
    { href: '/shop', label: 'Shop', icon: ShoppingBag },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-2 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === '/home' && pathname === '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 gap-1',
                isActive
                  ? 'text-primary font-bold bg-primary/10 scale-105'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
