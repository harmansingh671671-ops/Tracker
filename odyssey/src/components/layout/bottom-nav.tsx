"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Compass, CheckCircle2, Store, BarChart3 } from "lucide-react";

const navItems = [
  { path: "/planner", label: "Today", icon: "calendar_today" },
  { path: "/journey", label: "Journey", icon: "explore" },
  { path: "/habits", label: "Habits", icon: "check_circle" },
  { path: "/shop", label: "Shop", icon: "storefront" },
  { path: "/stats", label: "Stats", icon: "bar_chart" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface-container-lowest/85 backdrop-blur-xl border-t border-outline/10">
      <div className="h-20 px-space-xs flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 py-1 gap-0.5 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-label-sm text-label-sm font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

