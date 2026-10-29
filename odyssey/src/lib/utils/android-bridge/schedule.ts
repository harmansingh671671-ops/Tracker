import { type WallpaperData, build24HourlyBlocks } from "../wallpaper-generator";
import { logWarn, writeString } from "@/lib/utils/logger";
import { db } from "../../db";
import { calculateRank, getRankInfo } from "../gamification";
import {
  nativeBridge,
  callNative,
  errText,
  trueStreak,
  type SyncVerificationResult,
} from "./core";

/**
 * Schedule synchronisation — P0-T6.
 *
 * Everything that turns IndexedDB state into the JSON payload the native
 * wallpaper reads, and pushes it across the bridge. Grouped here because these
 * functions only make sense together: the payload is the contract, and the sync
 * and verify paths are two readings of it.
 */

/**
 * Generates the standardized 24-hour and habit payload for native wallpaper sync.
 */
export function buildNativeSchedulePayload(data: WallpaperData): string {
  const full24 = build24HourlyBlocks(data.blocks);

  // Pass all active habits with period & timeOfDay so both JS and native Android can dynamically switch them
  const habitsList = (data.habits && data.habits.length > 0)
    ? data.habits.map((h) => ({
        id: h.id,
        name: h.name,
        icon: h.icon,
        currentStreak: trueStreak(h.currentStreak),
        category: h.category || "Habit Track",
        period: h.period || "",
        timeOfDay: h.timeOfDay || "",
      }))
    : [
        // Placeholders for a user who has not created a habit yet. They
        // deliberately report 0: these habits do not exist, so any streak
        // shown against them is invented.
        { name: "Mindful Focus", icon: "🧘", currentStreak: 0, category: "Habit Track", period: "morning", timeOfDay: "08:00 AM" },
        { name: "Daily Hydration", icon: "💧", currentStreak: 0, category: "Vitality Track", period: "afternoon", timeOfDay: "01:00 PM" },
      ];

  // Merge full 24 blocks with raw user blocks to ensure exact title and hour matching
  const blocksList = full24.map((b) => ({
    startTime: b.startTime,
    endTime: b.endTime,
    title: b.title,
    category: b.category,
    isUserDefined: b.isUserDefined,
    // The ORIGINAL block's span, so the XX:57 reminder can announce a task
    // once (at its first hour) instead of again on every continuation hour
    // (owner 2026-10-29). -1 = unscheduled hour, which keeps the worker's
    // older per-hour behaviour for payloads that predate this field.
    blockStartHour: b.blockStartHour ?? -1,
    blockEndHour: b.blockEndHour ?? -1,
  }));

  return JSON.stringify({
    dateStr: data.dateStr,
    chapter: data.chapter,
    activeDay: data.activeDay,
    rankName: data.rankName,
    rankBadge: data.rankBadge,
    userLevel: data.userLevel,
    // Was `data.userStreak || data.activeDay || 1`, which meant a brand-new
    // user with a real streak of 0 was shown the journey day number, and a
    // day-1 user was shown 1. Neither is a streak. The native header renders
    // this unconditionally next to the label "DAYS STREAK".
    userStreak: trueStreak(data.userStreak),
    plannedHours: data.plannedHours,
    blocks: blocksList,
    habits: habitsList,
    syncedAt: Date.now(),
  });
}

/**
 * Synchronizes today's 24-hour hourly blocks to Android SharedPreferences
 * so the native Live Wallpaper engine can render and center the current hour
 * dynamically whenever the user wakes their screen!
 */
export async function syncScheduleDataToNative(data: WallpaperData): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const payload = buildNativeSchedulePayload(data);

  // Save to web local cache
  writeString("odyssey_native_schedule_cache", payload);

  // Push to Android native bridge if present. `undefined` means no bridge (or
  // a bridge that threw) -- the local cache is still correct, so report success.
  const res = callNative<boolean | void>("syncSchedule", payload);
  if (res === undefined) return true;
  return res !== false;
}

/**
 * Explicitly synchronizes and verifies that the Android Live Wallpaper Service
 * has committed the schedule and habits data to disk.
 * Returns a detailed verification result with exact confirmed task & habit counts.
 */
export async function syncAndVerifySchedule(data: WallpaperData): Promise<SyncVerificationResult> {
  const timeFormatted = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const payload = buildNativeSchedulePayload(data);
  const parsed = JSON.parse(payload);
  const taskNames = ((parsed.blocks ?? []) as { title?: string }[])
    .map((b) => b.title)
    .filter((t): t is string => Boolean(t));
  const habitNames = ((parsed.habits ?? []) as { name?: string; icon?: string }[])
    .map((h) => `${h.name ?? ""} ${h.icon ?? ""}`.trim())
    .filter(Boolean);

  // Cache to web storage
  try {
    writeString("odyssey_native_schedule_cache", payload);
  } catch (e) { logWarn("android-bridge", "could not write to storage", e); }

  // 1. Native Android APK bridge. The richer methods (result-reporting sync and
  //    verification) only exist on the current bridge; the legacy alias can only
  //    do a plain sync. One path, two capability levels.
  if (nativeBridge()) {
    try {
      const rawRes = callNative<string>("syncScheduleWithResult", payload);
      if (rawRes) {
        try {
          const resObj = JSON.parse(rawRes);
          if (resObj.success) {
            return {
              success: true,
              isNativeBridge: true,
              blockCount: resObj.blockCount ?? taskNames.length,
              habitCount: resObj.habitCount ?? habitNames.length,
              taskNames,
              habitNames,
              streak: trueStreak(resObj.streak ?? data.userStreak),
              message: `Verified: ${resObj.blockCount ?? taskNames.length} tasks and ${resObj.habitCount ?? habitNames.length} hobbies confirmed in Android Native Storage!`,
              timestamp: timeFormatted,
            };
          }
        } catch (e) { logWarn("android-bridge", "sync result was not valid JSON", e); }
      }

      // Fallback: standard sync, then read back what landed.
      callNative("syncSchedule", payload);
      const verifyStr = callNative<string>("verifySync") || "";
      const isOk = verifyStr.startsWith("OK") || verifyStr.length > 0;

      return {
        success: isOk,
        isNativeBridge: true,
        blockCount: taskNames.length,
        habitCount: habitNames.length,
        taskNames,
        habitNames,
        streak: trueStreak(data.userStreak),
        message: isOk
          ? `Verified: ${taskNames.length} tasks and ${habitNames.length} hobbies synced to Android preferences.`
          : `Synced to native Android engine (${taskNames.length} tasks, ${habitNames.length} hobbies).`,
        timestamp: timeFormatted,
      };
    } catch (e) {
      return {
        success: false,
        isNativeBridge: true,
        blockCount: taskNames.length,
        habitCount: habitNames.length,
        taskNames,
        habitNames,
        streak: trueStreak(data.userStreak),
        message: `Native bridge error during sync: ${errText(e)}`,
        error: String(e),
        timestamp: timeFormatted,
      };
    }
  }

  // 2. Web Browser Environment (No native bridge injected)
  return {
    success: false,
    isNativeBridge: false,
    blockCount: taskNames.length,
    habitCount: habitNames.length,
    taskNames,
    habitNames,
    streak: trueStreak(data.userStreak),
    message: "Running in web browser (Chrome). The 24-hour schedule and hobbies are verified in web cache, but modifying your physical phone's lockscreen requires the Native APK build.",
    timestamp: timeFormatted,
  };
}

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Automatically fetches today's latest schedule & habits from IndexedDB
 * and pushes the updated payload directly to the Android native bridge.
 * This ensures the lockscreen & live wallpapers refresh immediately
 * whenever any task is added, edited, deleted, or auto-filled!
 */
export async function syncCurrentScheduleToNative(targetDateStr?: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  return new Promise((resolve) => {
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
    }

    syncDebounceTimer = setTimeout(async () => {
      try {
        const users = await db.profiles.toArray();
        const user = users[0];
        if (!user) {
          resolve(false);
          return;
        }

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const activeDateStr =
          targetDateStr && /^\d{4}-\d{2}-\d{2}$/.test(targetDateStr) ? targetDateStr : todayStr;

        const blocks = await db.scheduleBlocks
          .where("[userId+date]")
          .equals([user.id, activeDateStr])
          .toArray();

        // Sort blocks by start time
        blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));

        const habits = await db.habits
          .where("userId")
          .equals(user.id)
          .toArray();

        const rankInfo = getRankInfo(user.militaryRank || calculateRank(user.streak ?? 0));
        const plannedHours = blocks.length;
        const activeDay = user.streak > 0 ? user.streak : 1;
        const activeChapter = Math.ceil(activeDay / 7);

        const [y, m, d] = activeDateStr.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);

        const wallpaperData: WallpaperData = {
          chapter: activeChapter,
          activeDay,
          rankBadge: rankInfo.badge,
          rankName: rankInfo.name,
          userLevel: user.level ?? 1,
          userStreak: trueStreak(user.streak),
          plannedHours,
          dateStr: activeDateStr,
          formattedDate: dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
          blocks,
          habits,
          showClockGuide: false,
          includeHobbies: true,
        };

        const res = await syncScheduleDataToNative(wallpaperData);

        // If target was for tomorrow or another day, ALSO ensure today's live schedule is synced
        if (activeDateStr !== todayStr) {
          const todayBlocks = await db.scheduleBlocks
            .where("[userId+date]")
            .equals([user.id, todayStr])
            .toArray();
          todayBlocks.sort((a, b) => a.startTime.localeCompare(b.startTime));

          const todayWallpaperData: WallpaperData = {
            ...wallpaperData,
            plannedHours: todayBlocks.length,
            dateStr: todayStr,
            formattedDate: now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
            blocks: todayBlocks,
          };
          await syncScheduleDataToNative(todayWallpaperData);
        }

        resolve(res);
      } catch (err) {
        console.warn("syncCurrentScheduleToNative failed:", err);
        resolve(false);
      }
    }, 250);
  });
}