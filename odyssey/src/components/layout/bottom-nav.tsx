"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Compass, CheckCircle2, Store, BarChart3 } from "lucide-react";

const navItems = [
  { path: "/planner", label: "Today", Icon: Calendar },
  { path: "/journey", label: "Journey", Icon: Compass },
  { path: "/habits", label: "Habits", Icon: CheckCircle2 },
  { path: "/shop", label: "Shop", Icon: Store },
  { path: "/stats", label: "Stats", Icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface-container-lowest/90 backdrop-blur-xl border-t border-outline/10">
      <div className="h-16 px-space-xs flex items-center justify-around max-w-xl sm:max-w-2xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const IconComponent = item.Icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`relative flex flex-col items-center justify-center min-w-[48px] px-2 py-1 gap-1 transition-all duration-200 active:scale-90 ${
                isActive
                  ? "text-primary"
                  : "text-on-surface-variant/70 hover:text-on-surface"
              }`}
            >
              <div className="relative">
                <IconComponent
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? "stroke-[2.5] scale-110" : "stroke-[1.75]"
                  }`}
                />
                {isActive && (
                  <span className="absolute -inset-1 rounded-full bg-primary/20 blur-xs -z-10 animate-in fade-in zoom-in duration-300" />
                )}
              </div>
              <span
                className={`font-label-sm text-[10.5px] transition-all duration-200 ${
                  isActive ? "font-bold text-primary" : "font-medium"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

