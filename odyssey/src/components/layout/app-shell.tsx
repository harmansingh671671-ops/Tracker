"use client";

import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide shell on root page
  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-1 pt-16 pb-24 overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
