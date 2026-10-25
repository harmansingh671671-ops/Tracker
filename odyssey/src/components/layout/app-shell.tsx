"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { FloatingFeedbackButton } from "@/components/feedback/feedback-modal";
import { usePathname } from "next/navigation";
import { syncCurrentScheduleToNative } from "@/lib/utils/android-bridge";
import { isLowEndDevice } from "@/lib/utils/low-end";

// PERF-5 -- two modals whose job is to appear while the user is already in the
// app: the evening reminder (which waits for the clock to reach 20:00) and the
// app-update notice (which waits for a version check). Both were statically
// imported by the shell, so their code -- and the database and journey helpers
// they pull in -- was part of every screen's first paint in order to render
// nothing. They are loaded after the first paint now: nothing about when they are
// allowed to appear changes, only whether the screen had to wait for them.
const EveningReminderModal = dynamic(
  () => import("@/components/notifications/evening-reminder-modal").then((m) => m.EveningReminderModal),
  { ssr: false }
);
const AppUpdateModal = dynamic(
  () => import("@/components/common/app-update-modal").then((m) => m.AppUpdateModal),
  { ssr: false }
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // "Has the first frame been painted" -- see the import block above. A frame
  // rather than the effect body, because an effect can run before the paint this
  // exists to get out of the way of.
  const [afterPaint, setAfterPaint] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAfterPaint(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // PERF-7e: one flag, once per document. On devices the plan's heuristics
  // call low-end, CSS (see globals.css) swaps every live backdrop-filter pass
  // for the element's flat translucent background. Never loads anything, never
  // runs a timer, and a failure to detect costs only the blur the device
  // already paid.
  useEffect(() => {
    try {
      if (isLowEndDevice(navigator as Navigator & { deviceMemory?: number })) {
        document.documentElement.dataset.lowend = "1";
      }
    } catch {
      // detection must never block paint
    }
  }, []);

  // Keep native Android widgets & notifications always up-to-date with live schedule
  useEffect(() => {
    syncCurrentScheduleToNative();

    const handleFocusSync = () => {
      if (document.visibilityState === "visible") {
        syncCurrentScheduleToNative();
      }
    };

    window.addEventListener("focus", handleFocusSync);
    document.addEventListener("visibilitychange", handleFocusSync);

    return () => {
      window.removeEventListener("focus", handleFocusSync);
      document.removeEventListener("visibilitychange", handleFocusSync);
    };
  }, []);
  
  // Hide shell header/bottom-nav on root page and day-schedule (has its own header + back nav)
  if (pathname === "/" || pathname === "/day-schedule") {
    return (
      <>
        {children}
        {afterPaint && <AppUpdateModal />}
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 pt-14 sm:pt-16 pb-app-content w-full max-w-full touch-pan-y">
        <div key={pathname} className="page-transition min-h-full">
          {children}
        </div>
      </main>
      <FloatingFeedbackButton />
      {afterPaint && (
        <>
          <EveningReminderModal />
          <AppUpdateModal />
        </>
      )}
      <BottomNav />
    </>
  );
}
