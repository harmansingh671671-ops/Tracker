"use client";

import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { EveningReminderModal } from "@/components/notifications/evening-reminder-modal";
import { FloatingFeedbackButton } from "@/components/feedback/feedback-modal";
import { AppUpdateModal } from "@/components/common/app-update-modal";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide shell on root page and day-schedule (has its own header + back nav)
  if (pathname === "/" || pathname === "/day-schedule") {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-1 pt-14 sm:pt-16 pb-24 w-full max-w-full touch-pan-y">
        <div key={pathname} className="page-transition min-h-full">
          {children}
        </div>
      </main>
      <FloatingFeedbackButton />
      <EveningReminderModal />
      <AppUpdateModal />
      <BottomNav />
    </>
  );
}
