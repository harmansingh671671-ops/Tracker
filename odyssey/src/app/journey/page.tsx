"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { db } from "@/lib/db";
import {
  Check,
  Zap,
  Clock,
  Play,
  CheckCircle2,
  Trophy,
  Gift,
  Award,
  Crown,
  Sparkles,
  Compass,
  Calendar,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { JourneyDaySchedule } from "@/components/journey/journey-day-schedule";
import { getJourneyDayNumber, getDateForJourneyDay } from "@/lib/utils/journey";
import { getRankInfo, calculateRank } from "@/lib/utils/gamification";

interface MilestoneInfo {
  title: string;
  badge: string;
  reward: string;
  Icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

function getMilestoneForDay(day: number): MilestoneInfo | null {
  if (day % 7 !== 0) return null;
  const weekNum = day / 7;
  if (weekNum === 1) {
    return {
      title: "Week 1 Foundations",
      badge: "Chapter I Milestone",
      reward: "+25 Gems • Streak Freeze",
      Icon: Gift,
      accentColor: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    };
  }
  if (weekNum === 2) {
    return {
      title: "Fortnight Momentum",
      badge: "Chapter II Milestone",
      reward: "+50 Gems • Scholar Division",
      Icon: Award,
      accentColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    };
  }
  if (weekNum === 3) {
    return {
      title: "Master of Consistency",
      badge: "Chapter III Checkpoint",
      reward: "+50 Gems • Aura Frame",
      Icon: Trophy,
      accentColor: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
    };
  }
  return {
    title: `Week ${weekNum} Ascension`,
    badge: `Milestone Week ${weekNum}`,
    reward: `+${Math.min(100, 25 * weekNum)} Gems • Celestial Crown`,
    Icon: Crown,
    accentColor: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  };
}

// Duolingo winding serpentine horizontal offsets (in pixels)
const DUO_OFFSETS = [0, -55, -75, -40, 0, 40, 75, 55];

function getNodeOffset(index: number): number {
  return DUO_OFFSETS[index % DUO_OFFSETS.length];
}

interface ChallengeRecord {
  started: boolean;
  startedAt?: string;
  claimed?: boolean;
  claimedAt?: string;
}

function getChallengeRecord(userId?: string, dateStr?: string): ChallengeRecord {
  if (typeof window === "undefined" || !dateStr) {
    return { started: false, claimed: false };
  }
  try {
    if (userId) {
      const rawUser = localStorage.getItem(`odyssey_challenge_${userId}_${dateStr}`);
      if (rawUser) return JSON.parse(rawUser);
    }
    const rawGeneric = localStorage.getItem(`odyssey_challenge_${dateStr}`);
    if (rawGeneric) return JSON.parse(rawGeneric);
  } catch {}
  return { started: false, claimed: false };
}

function setChallengeRecord(userId: string | undefined, dateStr: string, record: ChallengeRecord) {
  if (typeof window === "undefined" || !dateStr) return;
  try {
    const json = JSON.stringify(record);
    localStorage.setItem(`odyssey_challenge_${dateStr}`, json);
    if (userId) {
      localStorage.setItem(`odyssey_challenge_${userId}_${dateStr}`, json);
    }
  } catch {}
}

interface UnclaimedReward {
  dayNum: number;
  dateStr: string;
}

function findUnclaimedPastChallenges(userId?: string, activeDay: number = 1, createdAt?: string): UnclaimedReward[] {
  if (typeof window === "undefined") return [];
  const results: UnclaimedReward[] = [];
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  try {
    // 1. Check past days in current journey window (day 1 to activeDay - 1)
    for (let d = 1; d < activeDay; d++) {
      const dStr = getDateForJourneyDay(d, createdAt);
      const rec = getChallengeRecord(userId, dStr);
      if (rec.started && !rec.claimed) {
        results.push({ dayNum: d, dateStr: dStr });
      }
    }

    // 2. Check yesterday's calendar date
    const yObj = new Date();
    yObj.setDate(yObj.getDate() - 1);
    const yStr = `${yObj.getFullYear()}-${String(yObj.getMonth() + 1).padStart(2, "0")}-${String(yObj.getDate()).padStart(2, "0")}`;
    if (!results.some((r) => r.dateStr === yStr)) {
      const yRec = getChallengeRecord(userId, yStr);
      if (yRec.started && !yRec.claimed) {
        results.push({ dayNum: Math.max(1, activeDay - 1), dateStr: yStr });
      }
    }

    // 3. Scan all localStorage keys for past dates
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("odyssey_challenge_")) {
        const parts = key.split("_");
        const datePart = parts[parts.length - 1];
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart) && datePart < todayStr) {
          if (!results.some((r) => r.dateStr === datePart)) {
            try {
              const rec = JSON.parse(localStorage.getItem(key) || "{}");
              if (rec.started && !rec.claimed) {
                results.push({ dayNum: Math.max(1, activeDay - 1), dateStr: datePart });
              }
            } catch {}
          }
        }
      }
    }
  } catch {}

  return results;
}

export default function JourneyPage() {
  const { user, fetchUser, addXp, addDiamonds } = useUserStore();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Trigger to re-read localStorage challenge records
  const [challengeSyncCount, setChallengeSyncCount] = useState(0);

  // Endless chain window: loads initial 7 days (Today + next 7 days = 8 days total)
  const [windowDaysCount, setWindowDaysCount] = useState<number>(8);

  // Map of scheduled hours for each date string
  const [scheduledHoursMap, setScheduledHoursMap] = useState<Record<string, number>>({});

  // In-journey day schedule editor state (keeps Today page and Journey day planning completely separate)
  const [selectedDayMeta, setSelectedDayMeta] = useState<{
    dayNum: number;
    dateStr: string;
    isToday: boolean;
  } | null>(null);

  // Live midnight ticker so activeDay immediately advances when a new day officially begins
  const [currentDateStr, setCurrentDateStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (s !== currentDateStr) {
        setCurrentDateStr(s);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [currentDateStr]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const activeDay = useMemo(() => {
    return getJourneyDayNumber(user?.createdAt);
  }, [user?.createdAt, currentDateStr]);

  const rankInfo = useMemo(
    () => getRankInfo(user?.militaryRank || calculateRank(user?.streak ?? 0)),
    [user?.militaryRank, user?.streak]
  );

  const activeChapter = Math.ceil(activeDay / 7);
  const chapterTitle =
    activeChapter === 1
      ? "Initiating Foundations"
      : activeChapter === 2
      ? "Grounded Momentum"
      : activeChapter === 3
      ? "Deep Mastery"
      : "Transcendence";

  const xpCurrent = user ? user.xp % 500 : 0;
  const xpPercent = Math.min(100, Math.round((xpCurrent / 500) * 100));

  // Generate date information for any dayNum in the journey
  const getDayMeta = useCallback(
    (dayNum: number) => {
      const dateStr = getDateForJourneyDay(dayNum, user?.createdAt);
      const [y, m, d] = dateStr.split("-").map(Number);
      const targetDate = new Date(y, m - 1, d);
      const dayLabel = targetDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return {
        dateStr,
        dayLabel,
        isPast: dayNum < activeDay,
        isToday: dayNum === activeDay,
        isTomorrow: dayNum === activeDay + 1,
      };
    },
    [activeDay, user?.createdAt]
  );

  // Upper curve collapsible past days (only Yesterday shown by default, earlier days can be expanded/collapsed)
  const [showEarlierDays, setShowEarlierDays] = useState<boolean>(false);

  const earlierPastDays = useMemo(() => {
    if (activeDay <= 2) return [];
    return Array.from({ length: activeDay - 2 }, (_, i) => i + 1);
  }, [activeDay]);

  const hasEarlierDays = earlierPastDays.length > 0;

  // Array of days currently rendered in the window
  const visibleDays = useMemo(() => {
    const days: number[] = [];

    // Prepend earlier past days only if user has opened minimization to upward side
    if (hasEarlierDays && showEarlierDays) {
      days.push(...earlierPastDays);
    }

    // Always keep Yesterday directly above Today if activeDay > 1
    if (activeDay > 1) {
      days.push(activeDay - 1);
    }

    // Today
    days.push(activeDay);

    // Future rolling chain
    for (let i = 1; i < windowDaysCount; i++) {
      days.push(activeDay + i);
    }

    return days;
  }, [activeDay, windowDaysCount, hasEarlierDays, showEarlierDays, earlierPastDays]);

  // Query planned hours for all visible days from Dexie DB
  const loadScheduledHours = useCallback(async () => {
    if (!user) return;
    const hoursRecord: Record<string, number> = {};

    for (const d of visibleDays) {
      const { dateStr } = getDayMeta(d);
      const blocks = await db.scheduleBlocks
        .where("[userId+date]")
        .equals([user.id, dateStr])
        .toArray();

      const occupied = new Set<number>();
      for (const b of blocks) {
        const sH = parseInt(b.startTime.split(":")[0], 10);
        let eH = parseInt(b.endTime.split(":")[0], 10);
        if (b.endTime === "24:00" || (eH === 0 && sH > 0)) eH = 24;
        for (let h = sH; h < eH; h++) {
          occupied.add(h);
        }
      }
      hoursRecord[dateStr] = occupied.size;
    }
    setScheduledHoursMap(hoursRecord);
  }, [user, visibleDays, getDayMeta]);

  useEffect(() => {
    loadScheduledHours();
  }, [loadScheduledHours]);

  // Ref to Today's node container for auto-scroll and intersection detection
  const todayRef = useRef<HTMLDivElement>(null);
  const [isTodayInView, setIsTodayInView] = useState<boolean>(true);

  // Smoothly center Today in viewport
  const scrollToToday = useCallback((smooth: boolean = true) => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "center",
      });
    }
  }, []);

  // Today always appears in front of the user when landing on Journey or returning from schedule
  useEffect(() => {
    if (!selectedDayMeta) {
      const timer = setTimeout(() => {
        scrollToToday(true);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [selectedDayMeta, scrollToToday]);

  // Detect when Today is off-screen to display floating quick-return button
  useEffect(() => {
    if (selectedDayMeta) return;
    const target = todayRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsTodayInView(entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.15,
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [selectedDayMeta, visibleDays, showEarlierDays]);

  // Direct URL support (?day=X)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const dayParam = params.get("day");
    if (dayParam) {
      const dNum = parseInt(dayParam, 10);
      if (!isNaN(dNum) && dNum >= 1) {
        const meta = getDayMeta(dNum);
        setSelectedDayMeta({
          dayNum: dNum,
          dateStr: meta.dateStr,
          isToday: meta.isToday,
        });
      }
    }
  }, [getDayMeta]);

  // Track latest selectedDayMeta in ref to prevent stale closures in popstate listener
  const selectedDayMetaRef = useRef(selectedDayMeta);
  selectedDayMetaRef.current = selectedDayMeta;

  // Native mobile swipe-back & browser back button handler:
  // When swiping back inside a day's schedule, it closes the scheduler and stays on /journey
  useEffect(() => {
    const onPopState = () => {
      if (selectedDayMetaRef.current) {
        setSelectedDayMeta(null);
        loadScheduledHours();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [loadScheduledHours]);

  // Today's challenge record
  const todayMeta = useMemo(() => getDayMeta(activeDay), [getDayMeta, activeDay]);
  const todayChallenge = useMemo(() => {
    return getChallengeRecord(user?.id, todayMeta.dateStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, todayMeta.dateStr, challengeSyncCount]);

  // Unclaimed past challenge rewards (shows whenever a completed day has reward pending!)
  const unclaimedRewards = useMemo(() => {
    return findUnclaimedPastChallenges(user?.id, activeDay, user?.createdAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeDay, challengeSyncCount, user?.createdAt]);

  // Begin Today's challenge (Persisted, zero instant reward, prevents endless farming!)
  const handleBeginTodayChallenge = () => {
    if (!user) return;
    if (todayChallenge.started) return;

    setChallengeRecord(user.id, todayMeta.dateStr, {
      started: true,
      startedAt: new Date().toISOString(),
      claimed: false,
    });
    setChallengeSyncCount((c) => c + 1);

    setToastMsg(
      `Day ${activeDay} Challenge Active! Maintain focus today; your +50 XP & +5 Gems reward will be available to claim tomorrow.`
    );
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Claim reward for a completed day (awards XP & Gems once only!)
  const handleClaimReward = async (dayNum: number, dateStr?: string) => {
    if (!user) return;
    const targetDateStr = dateStr || getDayMeta(dayNum).dateStr;
    const rec = getChallengeRecord(user.id, targetDateStr);
    if (rec.claimed) return;

    setChallengeRecord(user.id, targetDateStr, {
      ...rec,
      started: true,
      claimed: true,
      claimedAt: new Date().toISOString(),
    });

    await addXp(50);
    await addDiamonds(5);
    setChallengeSyncCount((c) => c + 1);

    setToastMsg(`Day ${dayNum} Reward Claimed! +50 XP & +5 Gems awarded.`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Open full day schedule editor directly inside Journey (pushes state so mobile swipe-back stays on /journey)
  const handleOpenScheduler = (dayNum: number) => {
    const meta = getDayMeta(dayNum);
    setSelectedDayMeta({
      dayNum,
      dateStr: meta.dateStr,
      isToday: meta.isToday,
    });
    if (typeof window !== "undefined") {
      window.history.pushState(
        { journeyDaySchedule: true, dayNum },
        "",
        `${window.location.pathname}?day=${dayNum}`
      );
    }
  };

  // Close schedule editor safely syncing browser history
  const handleCloseScheduler = useCallback(() => {
    if (typeof window !== "undefined" && window.history.state?.journeyDaySchedule) {
      window.history.back();
    } else {
      setSelectedDayMeta(null);
      loadScheduledHours();
      if (typeof window !== "undefined" && window.location.search.includes("day=")) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [loadScheduledHours]);

  const handleLoadMoreDays = () => {
    setWindowDaysCount((prev) => prev + 7);
  };

  // Render full day schedule directly inside Journey view
  if (selectedDayMeta) {
    return (
      <JourneyDaySchedule
        dateStr={selectedDayMeta.dateStr}
        dayNum={selectedDayMeta.dayNum}
        isToday={selectedDayMeta.isToday}
        onBack={handleCloseScheduler}
        onScheduleUpdated={loadScheduledHours}
      />
    );
  }

  return (
    <div className="view-transition min-h-screen bg-surface">
      <div className="w-full max-w-md sm:max-w-lg mx-auto px-3 sm:px-4 pb-28 pt-2 space-y-3">
        {/* Top Header Progress Card — Formatted with full width, zero unnatural text wrapping */}
        <section className="rounded-2xl bg-surface-container-high/90 border border-outline/15 p-3.5 sm:p-4 shadow-sm space-y-2.5">
          {/* Row 1: Tag & Today Badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-primary">
              <Compass className="w-4 h-4 shrink-0" />
              <span className="text-[11px] uppercase tracking-wider font-bold">
                Endless Odyssey Trail
              </span>
            </div>

            <div className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-primary font-mono text-xs font-bold shrink-0">
              Day {activeDay} Today
            </div>
          </div>

          {/* Row 2: Chapter Title & Subtitle — Spans 100% full card width */}
          <div className="space-y-0.5">
            <h1 className="text-base sm:text-lg text-on-surface font-bold tracking-tight leading-snug">
              Chapter {activeChapter}: {chapterTitle}
            </h1>
            <p className="text-xs text-on-surface-variant font-medium">
              Day {activeDay} Active • 7-Day Rolling Path
            </p>
          </div>

          {/* Row 3: Division Rank & XP Progress Bar */}
          <div className="space-y-1.5 pt-2 border-t border-outline/10">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-on-surface-variant font-medium truncate">
                Rank: <span className="text-on-surface font-bold">{rankInfo.badge} {rankInfo.name} • {rankInfo.division}</span>
              </span>
              <span className="text-secondary font-bold shrink-0 ml-2">
                {xpCurrent} / 500 XP
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </section>

        {/* Unclaimed Past Day Reward Banner (Shows when yesterday or any past day has ended and reward is waiting!) */}
        {unclaimedRewards.length > 0 && (
          <div className="w-full p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-surface-container border border-amber-400/35 shadow-lg flex items-center justify-between gap-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-amber-400">
                  Day {unclaimedRewards[0].dayNum} Cadence Completed!
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-on-surface truncate">
                  Claim Day {unclaimedRewards[0].dayNum} Reward
                </h4>
                <span className="text-[10.5px] font-mono text-on-surface-variant">
                  +50 XP • +5 Gems
                </span>
              </div>
            </div>

            <button
              onClick={() => handleClaimReward(unclaimedRewards[0].dayNum, unclaimedRewards[0].dateStr)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-xs font-mono shadow-md hover:brightness-110 active:scale-95 transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Claim</span>
            </button>
          </div>
        )}

        {/* Duolingo Winding Curved Trail */}
        <div className="relative flex flex-col items-center py-4 select-none">
          {/* Upper Side of Curve: Minimization & Expansion for Earlier Past Days */}
          {hasEarlierDays && (
            <div className="relative z-10 pb-4 pt-1 flex flex-col items-center">
              {!showEarlierDays ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowEarlierDays(true)}
                    className="px-4 py-2 rounded-full bg-surface-container-high border border-outline/25 hover:border-primary/50 text-xs font-mono font-semibold text-on-surface hover:text-primary shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer group"
                    title="View earlier past days"
                  >
                    <ChevronUp className="w-4 h-4 text-primary group-hover:-translate-y-0.5 transition-transform" />
                    <span>View Earlier Past Days (1 – {activeDay - 2})</span>
                    <Sparkles className="w-3.5 h-3.5 text-primary/70" />
                  </button>
                  <span className="text-[10px] font-mono text-on-surface-variant/60 mt-1">
                    {earlierPastDays.length} past {earlierPastDays.length === 1 ? "day" : "days"} minimized • Yesterday is shown below
                  </span>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowEarlierDays(false)}
                    className="px-4 py-2 rounded-full bg-surface-container-high border border-outline/25 hover:border-amber-400/50 text-xs font-mono font-semibold text-on-surface hover:text-amber-400 shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer group"
                    title="Collapse earlier past days"
                  >
                    <ChevronDown className="w-4 h-4 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
                    <span>Collapse Earlier Days</span>
                  </button>
                  <span className="text-[10px] font-mono text-on-surface-variant/60 mt-1">
                    Showing all {earlierPastDays.length} earlier days
                  </span>
                </>
              )}
            </div>
          )}

          {visibleDays.map((day, idx) => {
            const meta = getDayMeta(day);
            const isCompleted = day < activeDay;
            const isCurrent = day === activeDay;
            const milestone = getMilestoneForDay(day);
            const plannedHours = scheduledHoursMap[meta.dateStr] || 0;

            const dayRecord = getChallengeRecord(user?.id, meta.dateStr);

            const offsetX = getNodeOffset(day - 1);
            const nextDay = idx < visibleDays.length - 1 ? visibleDays[idx + 1] : null;
            const nextOffsetX = nextDay !== null ? getNodeOffset(nextDay - 1) : 0;
            const isNextCompleted = nextDay !== null && nextDay < activeDay;
            const isNextCurrent = nextDay !== null && nextDay === activeDay;

            return (
              <div key={day} className="flex flex-col items-center w-full">
                {/* Milestone Banner if applicable */}
                {milestone && (
                  <div className="w-full max-w-xs my-2 p-2.5 rounded-2xl bg-surface-container border border-outline/20 shadow-sm flex items-center justify-between gap-2.5 z-20">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${milestone.accentColor}`}
                      >
                        <milestone.Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9.5px] font-bold font-mono uppercase tracking-wider text-amber-400 truncate">
                          {milestone.badge}
                        </span>
                        <h4 className="text-xs font-bold text-on-surface truncate">
                          {milestone.title}
                        </h4>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-[10px] font-mono font-semibold text-on-surface-variant shrink-0">
                      {milestone.reward}
                    </span>
                  </div>
                )}

                {/* Node Container with Duolingo Winding Horizontal Offset */}
                <div
                  ref={isCurrent ? todayRef : undefined}
                  id={isCurrent ? "journey-today-node" : undefined}
                  style={{ transform: `translateX(${offsetX}px)` }}
                  className="relative z-10 flex flex-col items-center transition-transform duration-300 my-1 scroll-mt-32"
                >
                  {/* Completed Step */}
                  {isCompleted && (
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenScheduler(day)}
                        className="w-14 h-14 rounded-full bg-emerald-500 border-b-4 border-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:translate-y-1 active:border-b-0 cursor-pointer"
                        title={`View Day ${day} schedule`}
                      >
                        <Check className="w-6 h-6 stroke-[3]" />
                      </button>

                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-surface-container border border-emerald-500/30 text-[10px] font-mono font-semibold text-emerald-400">
                          Day {day}
                        </span>
                        {plannedHours > 0 && (
                          <span className="text-[9.5px] font-mono text-on-surface-variant">
                            {plannedHours}h
                          </span>
                        )}
                      </div>

                      {/* Claim reward button on completed node if unclaimed */}
                      {dayRecord.started && !dayRecord.claimed && (
                        <button
                          type="button"
                          onClick={() => handleClaimReward(day, meta.dateStr)}
                          className="px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-mono font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Gift className="w-2.5 h-2.5" />
                          <span>Claim Reward</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Active Today Step (Hero Node with Pulse) */}
                  {isCurrent && (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="relative flex items-center justify-center">
                        <div className="absolute -inset-3 rounded-full bg-primary/25 blur-md animate-pulse pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => handleOpenScheduler(day)}
                          className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-primary-container border-b-4 border-primary-fixed-dim p-0.5 shadow-xl shadow-primary/30 transition-all hover:scale-105 active:translate-y-1 active:border-b-0 flex items-center justify-center cursor-pointer"
                          title="Open Today's schedule"
                        >
                          <div className="w-full h-full rounded-full bg-surface-container-lowest flex flex-col items-center justify-center text-primary">
                            <Zap className="w-6 h-6 fill-primary" />
                            <span className="text-[8.5px] font-bold font-mono tracking-wider -mt-0.5">
                              TODAY
                            </span>
                          </div>
                        </button>
                      </div>

                      {/* Status badge pill */}
                      <button
                        type="button"
                        onClick={() => handleOpenScheduler(day)}
                        className={`px-3 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1 shadow-xs transition-all cursor-pointer ${
                          plannedHours === 24
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                            : plannedHours > 0
                            ? "bg-amber-400/15 border-amber-400/40 text-amber-400"
                            : "bg-primary text-on-primary border-primary hover:bg-primary-fixed"
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>
                          {plannedHours === 24
                            ? "24h Locked"
                            : plannedHours > 0
                            ? `${plannedHours}h Planned`
                            : "Plan Today"}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Upcoming Future Step */}
                  {!isCompleted && !isCurrent && (
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenScheduler(day)}
                        className={`w-13 h-13 rounded-full border-b-4 flex flex-col items-center justify-center font-mono font-bold transition-all hover:scale-105 active:translate-y-1 active:border-b-0 cursor-pointer shadow-md ${
                          plannedHours === 24
                            ? "bg-surface-container-high border-emerald-500/50 text-emerald-400 hover:border-emerald-500"
                            : plannedHours > 0
                            ? "bg-surface-container-high border-amber-400/50 text-amber-400 hover:border-amber-400"
                            : "bg-surface-container border-outline/35 text-on-surface hover:border-primary/50"
                        }`}
                        title={`Write schedule for Day ${day}`}
                      >
                        <span className="text-sm">{day}</span>
                        {meta.isTomorrow && (
                          <span className="text-[8px] uppercase tracking-tighter text-amber-400 -mt-0.5">
                            TMRW
                          </span>
                        )}
                      </button>

                      {/* Quick status pill under the node */}
                      <button
                        type="button"
                        onClick={() => handleOpenScheduler(day)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                          plannedHours === 24
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : plannedHours > 0
                            ? "bg-amber-400/10 border-amber-400/30 text-amber-400"
                            : "bg-surface-container-high border-outline/20 text-on-surface-variant hover:text-primary hover:border-primary/40"
                        }`}
                      >
                        {plannedHours === 24 ? (
                          <>
                            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                            <span>24h</span>
                          </>
                        ) : plannedHours > 0 ? (
                          <>
                            <Clock className="w-2.5 h-2.5" />
                            <span>{plannedHours}h</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-2.5 h-2.5" />
                            <span>Plan</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Today's Focus Card */}
                {isCurrent && (
                  <div className="w-full max-w-sm my-3 p-3.5 sm:p-4 rounded-2xl bg-surface-container-high/95 border border-primary/35 shadow-xl space-y-2.5 text-left z-20">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] uppercase font-bold tracking-wider text-primary font-mono flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                        Today's Focus Anchor
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-bright text-tertiary text-[11px] font-mono font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        45m
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-on-surface">
                        {day === 1
                          ? "Mindful Intention & Hydration Anchor"
                          : `Day ${day} Deep Cadence & Focus Anchor`}
                      </h3>
                      <p suppressHydrationWarning className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                        {todayChallenge.started
                          ? "Challenge initiated. Complete your daily cadence; your +50 XP & +5 Gems reward will be available to claim tomorrow."
                          : day === 1
                          ? "Initiate your mindful journey with an intentional deep focus block and hydration check."
                          : "Complete your core deep work block without distractions and maintain steady daily rhythm."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-outline/10 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-mono font-bold">
                          +50 XP
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-mono font-semibold">
                          +5 Gems
                        </span>
                      </div>

                      {/* Begin challenge button with persistence & no infinite exploitation */}
                      {todayChallenge.started ? (
                        <div suppressHydrationWarning className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Active Today</span>
                        </div>
                      ) : (
                        <button
                          suppressHydrationWarning
                          onClick={handleBeginTodayChallenge}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md bg-primary text-on-primary hover:bg-primary-fixed shadow-primary/20 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Begin Challenge</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Duolingo S-Curved Connector Ribbon to Next Node */}
                {nextDay !== null && (
                  <div className="w-full flex items-center justify-center my-1 pointer-events-none">
                    <svg
                      className="w-64 h-14 overflow-visible"
                      viewBox="0 0 256 56"
                      fill="none"
                    >
                      <defs>
                        <linearGradient
                          id={`duo-curve-${idx}`}
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            stopColor={isCompleted ? "#10b981" : isCurrent ? "#6366f1" : "#475569"}
                            stopOpacity={isCompleted ? "0.9" : "0.7"}
                          />
                          <stop
                            offset="100%"
                            stopColor={
                              isNextCompleted
                                ? "#10b981"
                                : isNextCurrent
                                ? "#6366f1"
                                : "#475569"
                            }
                            stopOpacity={isNextCompleted ? "0.9" : "0.6"}
                          />
                        </linearGradient>
                      </defs>

                      {/* Outer Track 3D Bevel/Shadow */}
                      <path
                        d={`M ${128 + offsetX} 0 C ${128 + offsetX} 28, ${128 + nextOffsetX} 28, ${128 + nextOffsetX} 56`}
                        stroke="rgba(15, 23, 42, 0.85)"
                        strokeWidth="13"
                        strokeLinecap="round"
                      />

                      {/* Main Continuous Curved Trail Ribbon */}
                      <path
                        d={`M ${128 + offsetX} 0 C ${128 + offsetX} 28, ${128 + nextOffsetX} 28, ${128 + nextOffsetX} 56`}
                        stroke={`url(#duo-curve-${idx})`}
                        strokeWidth="7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}

          {/* Endless Expansion Button at Bottom */}
          <div className="relative z-10 pt-6 flex flex-col items-center">
            <button
              type="button"
              onClick={handleLoadMoreDays}
              className="px-5 py-2.5 rounded-full bg-surface-container-high border border-outline/25 hover:border-primary/50 text-xs sm:text-sm font-mono font-semibold text-on-surface hover:text-primary shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Extend Journey (+7 Days)</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-on-surface-variant/60 mt-1.5">
              Chain extends endlessly • Plan as many days ahead as you want
            </span>
          </div>
        </div>

        {/* Floating Quick Return to Today Button (Visible when scrolled away from Today) */}
        {!isTodayInView && !selectedDayMeta && (
          <button
            type="button"
            onClick={() => scrollToToday(true)}
            className="fixed bottom-22 sm:bottom-24 right-4 sm:right-6 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-surface-container-highest/95 border border-primary/40 shadow-2xl text-primary font-mono text-xs font-bold backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 group cursor-pointer"
            title="Scroll back to Today"
          >
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-primary/40 animate-ping absolute" />
              <Zap className="w-4 h-4 fill-primary shrink-0" />
            </div>
            <span className="tracking-wide">Today</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
              D{activeDay}
            </span>
          </button>
        )}

        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-primary text-on-primary shadow-2xl flex items-center gap-2 text-xs font-bold">
            <Sparkles className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
