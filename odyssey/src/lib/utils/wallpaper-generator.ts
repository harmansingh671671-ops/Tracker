import { type ScheduleBlock } from "@/lib/db";
import { type Habit } from "@/lib/db";

export interface WallpaperData {
  chapter: number;
  activeDay: number;
  rankBadge: string;
  rankName: string;
  userLevel: number;
  plannedHours: number;
  dateStr: string;
  formattedDate: string;
  blocks: ScheduleBlock[];
  habits: Habit[];
  showClockGuide?: boolean;
  includeHobbies?: boolean;
  activeHour?: number;
  topClockOffset?: number;
  userStreak?: number;
}

export interface HourlyBlock {
  hour: number; // 0 to 23
  startTime: string; // "00:00", "01:00", etc.
  endTime: string; // "01:00", "02:00", ..., "24:00"
  title: string;
  category: string;
  tag: string;
  isUserDefined: boolean;
}

export function build24HourlyBlocks(userBlocks: ScheduleBlock[] = []): HourlyBlock[] {
  const result: HourlyBlock[] = [];

  for (let h = 0; h < 24; h++) {
    const sTime = `${String(h).padStart(2, "0")}:00`;
    const eTime = `${String((h + 1) % 24 === 0 ? 24 : (h + 1) % 24).padStart(2, "0")}:00`;

    // Check if user has an assigned block covering this hour
    const matching = userBlocks.find((b) => {
      const sH = parseInt(b.startTime.split(":")[0], 10);
      let eH = parseInt(b.endTime.split(":")[0], 10);
      if (b.endTime === "24:00" || (eH === 0 && sH > 0)) eH = 24;
      return h >= sH && h < eH;
    });

    if (matching) {
      result.push({
        hour: h,
        startTime: sTime,
        endTime: eTime,
        title: matching.title,
        category: matching.category || "work",
        tag: matching.category || "Focus",
        isUserDefined: true,
      });
    } else {
      // Natural circadian cadence fallback
      let defaultTitle = "Deep Focus";
      let defaultCategory = "work";
      let defaultTag = "Focus";

      if (h === 23) {
        defaultTitle = "Circadian Slumber Inception";
        defaultCategory = "sleep";
        defaultTag = "Rest";
      } else if (h === 0) {
        defaultTitle = "Deep Circadian Slumber (H1)";
        defaultCategory = "sleep";
        defaultTag = "Rest";
      } else if (h === 1) {
        defaultTitle = "REM Cycle Phase I";
        defaultCategory = "sleep";
        defaultTag = "Rest";
      } else if (h === 2) {
        defaultTitle = "Deep Delta Sleep Wave";
        defaultCategory = "sleep";
        defaultTag = "Rest";
      } else if (h < 6) {
        defaultTitle = "Obsidian Rest & Recovery";
        defaultCategory = "sleep";
        defaultTag = "Rest";
      } else if (h >= 6 && h < 8) {
        defaultTitle = "Morning Priming & Vitality";
        defaultCategory = "vitality";
        defaultTag = "Vitality";
      } else if (h === 12 || h === 13) {
        defaultTitle = "Mindful Recovery & Lunch";
        defaultCategory = "renewal";
        defaultTag = "Renewal";
      } else if (h >= 17 && h < 19) {
        defaultTitle = "Active Sync & Movement";
        defaultCategory = "sync";
        defaultTag = "Sync";
      } else if (h >= 19 && h < 21) {
        defaultTitle = "Evening Reflection & Study";
        defaultCategory = "work";
        defaultTag = "Focus";
      } else if (h === 21) {
        defaultTitle = "Digital Sunset & Fiction Reading";
        defaultCategory = "renewal";
        defaultTag = "Renewal";
      } else if (h === 22) {
        defaultTitle = "Melatonin Prep & Ambient Rest";
        defaultCategory = "sleep";
        defaultTag = "Rest";
      }

      result.push({
        hour: h,
        startTime: sTime,
        endTime: eTime,
        title: defaultTitle,
        category: defaultCategory,
        tag: defaultTag,
        isUserDefined: false,
      });
    }
  }

  return result;
}

export function getCenteredHourlyWindow(
  hourlyBlocks: HourlyBlock[],
  activeHour: number,
  count: number = 5
): HourlyBlock[] {
  const half = Math.floor(count / 2);
  const windowBlocks: HourlyBlock[] = [];

  for (let offset = -half; offset <= half; offset++) {
    const targetHour = (activeHour + offset + 24) % 24;
    const block = hourlyBlocks[targetHour];
    if (block) {
      windowBlocks.push(block);
    }
  }

  return windowBlocks;
}

export function resolveHobbyEmoji(icon?: string, name?: string): string {
  const rawIcon = (icon || "").trim();
  const rawName = (name || "").toLowerCase();

  // If already a single emoji (1-4 chars and not standard ASCII text)
  if (rawIcon && rawIcon.length <= 4 && !/^[a-zA-Z0-9_\-]+$/.test(rawIcon)) {
    return rawIcon;
  }

  const combined = `${rawIcon} ${rawName}`.toLowerCase();
  if (combined.includes("guitar") || combined.includes("music") || combined.includes("song") || combined.includes("audio")) return "🎸";
  if (combined.includes("write") || combined.includes("writing") || combined.includes("journal") || combined.includes("note")) return "✍️";
  if (combined.includes("photo") || combined.includes("camera") || combined.includes("film") || combined.includes("35mm")) return "📷";
  if (combined.includes("climb") || combined.includes("boulder") || combined.includes("mountain") || combined.includes("landscape")) return "🧗";
  if (combined.includes("gym") || combined.includes("fitness") || combined.includes("workout") || combined.includes("lift")) return "🏋️";
  if (combined.includes("run") || combined.includes("jog") || combined.includes("walk") || combined.includes("cardio")) return "🏃";
  if (combined.includes("read") || combined.includes("book") || combined.includes("wing") || combined.includes("fire")) return "📖";
  if (combined.includes("water") || combined.includes("hydro") || combined.includes("hydrate")) return "💧";
  if (combined.includes("meditat") || combined.includes("mind") || combined.includes("zen") || combined.includes("yoga") || combined.includes("breath")) return "🧘";
  if (combined.includes("code") || combined.includes("terminal") || combined.includes("dev") || combined.includes("program")) return "💻";
  if (combined.includes("sparkle") || combined.includes("star") || combined.includes("magic")) return "✨";
  if (combined.includes("sun") || combined.includes("morning") || combined.includes("dawn")) return "☀️";
  if (combined.includes("sleep") || combined.includes("bed") || combined.includes("rest") || combined.includes("night") || combined.includes("moon")) return "🌙";
  if (combined.includes("bolt") || combined.includes("energy") || combined.includes("vitality")) return "⚡";
  if (combined.includes("art") || combined.includes("paint") || combined.includes("draw")) return "🎨";
  if (combined.includes("chess") || combined.includes("game")) return "♟️";
  if (combined.includes("cook") || combined.includes("food") || combined.includes("chef")) return "🍳";
  return "🎯";
}

interface DisplayHobby {
  icon: string;
  title: string;
  streak: number;
  sub: string;
}

function getDisplayHobbies(habits: Habit[]): DisplayHobby[] {
  const results: DisplayHobby[] = [];
  if (habits && habits.length > 0) {
    for (const h of habits.slice(0, 4)) {
      results.push({
        icon: resolveHobbyEmoji(h.icon, h.name),
        title: h.name,
        streak: h.currentStreak || 1,
        sub: h.category ? `${h.category} • Target active` : "Cadence track",
      });
    }
  }
  return results;
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let str = text;
  while (str.length > 3 && ctx.measureText(str + "…").width > maxW) {
    str = str.slice(0, -1);
  }
  return str + "…";
}

export async function generateWallpaperCanvas(data: WallpaperData): Promise<HTMLCanvasElement> {
  const width = 1080;
  const height = 2340;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas 2d context");

  // 1. OLED Pure Dark Background
  ctx.fillStyle = "#090A0F";
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient Subtle Radial Gradients (Matches screen.png)
  const gradTop = ctx.createRadialGradient(150, 150, 0, 150, 150, 400);
  gradTop.addColorStop(0, "rgba(49, 46, 129, 0.25)");
  gradTop.addColorStop(1, "rgba(9, 10, 15, 0)");
  ctx.fillStyle = gradTop;
  ctx.fillRect(0, 0, width, 600);

  const gradMid = ctx.createRadialGradient(950, 1100, 0, 950, 1100, 450);
  gradMid.addColorStop(0, "rgba(6, 78, 59, 0.18)");
  gradMid.addColorStop(1, "rgba(9, 10, 15, 0)");
  ctx.fillStyle = gradMid;
  ctx.fillRect(500, 700, 580, 800);

  const gradBot = ctx.createRadialGradient(200, 1900, 0, 200, 1900, 450);
  gradBot.addColorStop(0, "rgba(30, 41, 59, 0.35)");
  gradBot.addColorStop(1, "rgba(9, 10, 15, 0)");
  ctx.fillStyle = gradBot;
  ctx.fillRect(0, 1500, width, 840);

  const now = new Date();
  const currentHour = data.activeHour !== undefined ? data.activeHour : now.getHours();
  const currentMinute = data.activeHour !== undefined ? 0 : now.getMinutes();
  const currentHourFloat = currentHour + currentMinute / 60;
  const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;

  // 3. TOP SAFE ZONE (y: 0 to topSafeZone)
  // Minimal top safe margin (3.8%) to clear camera notch/status bar without wasting screen space!
  const topSafeZone = data.topClockOffset ?? (data.showClockGuide ? 620 : Math.round(height * 0.038));
  const bottomMargin = Math.round(height * 0.028);
  const usableH = height - topSafeZone - bottomMargin;

  if (data.showClockGuide) {
    // OS Status bar hints (only visible in app preview simulation guide)
    ctx.font = "500 24px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillText(timeStr, 80, 75);

    ctx.textAlign = "right";
    ctx.fillText("5G  92%", width - 80, 75);
    ctx.textAlign = "left";

    // Center Native Lockscreen Clock Simulation (Matches real Android lockscreen)
    ctx.textAlign = "center";
    ctx.font = "600 28px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillText(data.formattedDate.toUpperCase(), width / 2, 280);

    ctx.font = "300 130px 'Plus Jakarta Sans', -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillText(timeStr, width / 2, 440);

    // Simulated lockscreen notification card hint
    const notifW = width - 240;
    const notifH = 70;
    const notifY = 510;
    ctx.fillStyle = "rgba(30, 41, 59, 0.40)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect((width - notifW) / 2, notifY, notifW, notifH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.font = "600 20px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillText("Android System • 1 notification", (width - notifW) / 2 + 25, notifY + 42);
  }

  const cardPad = 50;
  const cardW = width - cardPad * 2; // 980px

  // 4. HEADER ANCHOR CARD (Positioned right below clock/notch safe zone)
  const headerY = topSafeZone;
  const headerH = 190;

  ctx.fillStyle = "rgba(19, 21, 29, 0.82)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardPad, headerY, cardW, headerH, 54);
  ctx.fill();
  ctx.stroke();

  // Left Title: ODYSSEY • CH. 0X
  ctx.font = "700 26px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
  const chapterText = `ODYSSEY • CH. 0${data.chapter}`;
  ctx.fillText(chapterText, cardPad + 36, headerY + 60);

  // Day Badge Pill
  const chapterTextW = ctx.measureText(chapterText).width;
  const dayBadgeText = `DAY ${data.activeDay} OF 365`;
  ctx.font = "700 22px 'JetBrains Mono', monospace";
  const badgeW = ctx.measureText(dayBadgeText).width + 28;
  const badgeX = cardPad + 36 + chapterTextW + 18;

  ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
  ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, headerY + 32, badgeW, 36, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#34d399";
  ctx.fillText(dayBadgeText, badgeX + 14, headerY + 58);

  // User Rank & Level (Large bold)
  ctx.font = "700 36px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${data.rankBadge} ${data.rankName}`, cardPad + 36, headerY + 125);

  ctx.font = "500 24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
  ctx.fillText(`Level ${String(data.userLevel).padStart(2, "0")} Cadence`, cardPad + 36, headerY + 162);

  // Minimal Streak Count on right
  const streakNum = data.userStreak !== undefined ? data.userStreak : data.activeDay;
  const streakX = cardPad + cardW - 36;
  ctx.textAlign = "right";
  ctx.font = "700 44px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(`${streakNum} 🔥`, streakX, headerY + 95);

  ctx.font = "600 18px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
  ctx.fillText("DAYS STREAK", streakX, headerY + 145);
  ctx.textAlign = "left";

  // 5. 24-HOUR CADENCE SPECTRUM BAR (Expanded, clean, no squeezed text)
  const specY = headerY + headerH + 24;
  const specH = 104;
  ctx.fillStyle = "rgba(19, 21, 29, 0.75)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardPad, specY, cardW, specH, 34);
  ctx.fill();
  ctx.stroke();

  // Multi-segment 24h timeline strip
  const stripX = cardPad + 24;
  const stripY = specY + 22;
  const stripW = cardW - 48;
  const stripH = 22;

  ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
  ctx.beginPath();
  ctx.roundRect(stripX, stripY, stripW, stripH, 10);
  ctx.fill();

  const allHourlyBlocks = build24HourlyBlocks(data.blocks);
  const hourlySlotW = stripW / 24;
  for (const b of allHourlyBlocks) {
    const blockX = stripX + b.hour * hourlySlotW;
    const cat = (b.category || "").toLowerCase();
    let col = "#6366f1";
    if (cat.includes("sleep") || cat.includes("rest")) col = "#1e1b4b";
    else if (cat.includes("habit") || cat.includes("vitality") || cat.includes("gym")) col = "#10b981";
    else if (cat.includes("sync") || cat.includes("meeting")) col = "#0284c7";
    else if (cat.includes("buffer") || cat.includes("break") || cat.includes("renewal")) col = "#f59e0b";

    ctx.fillStyle = col;
    ctx.fillRect(blockX, stripY, hourlySlotW, stripH);
  }

  // =========================================================================
  // LARGE RADIANT GLOWING NEEDLE (Noticeably larger than 22px bar!)
  // =========================================================================
  const needleX = stripX + (currentHourFloat / 24) * stripW;
  const needleY = stripY + stripH / 2;

  // Soft radiant aura
  ctx.fillStyle = "rgba(245, 158, 11, 0.22)";
  ctx.beginPath();
  ctx.arc(needleX, needleY, 44, 0, Math.PI * 2);
  ctx.fill();

  // Glowing halo ring
  ctx.fillStyle = "rgba(245, 158, 11, 0.45)";
  ctx.beginPath();
  ctx.arc(needleX, needleY, 28, 0, Math.PI * 2);
  ctx.fill();

  // Solid amber body (diameter 38px > 22px bar!)
  ctx.fillStyle = "#f59e0b";
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(needleX, needleY, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Specular white center pin
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(needleX, needleY, 7, 0, Math.PI * 2);
  ctx.fill();

  // Active hour time badge directly below moving dot
  const dotTimeText = `${String(currentHour).padStart(2, "0")}:00`;
  ctx.font = "700 20px 'JetBrains Mono', monospace";
  const pillTextW = ctx.measureText(dotTimeText).width;
  const pillW = pillTextW + 24;
  const pillH = 30;
  const pillX = Math.max(cardPad + 10, Math.min(cardPad + cardW - pillW - 10, needleX - pillW / 2));
  const pillY = needleY + 25;

  ctx.fillStyle = "rgba(9, 10, 15, 0.85)";
  ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 15);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#fcd34d";
  ctx.fillText(dotTimeText, pillX + pillW / 2, pillY + 22);
  ctx.textAlign = "left";

  // 6. 5-CARD HOURLY SCHEDULE WINDOW (High-Curvature 54px Rounded Cards, Expansive, NO Left Bar!)
  const blockCount = 5;
  const displayBlocks = getCenteredHourlyWindow(allHourlyBlocks, currentHour, blockCount);

  const timelineStartY = specY + specH + Math.round(usableH * 0.014);
  const scheduleTotalH = Math.round(usableH * 0.530);
  const cardGap = Math.round(usableH * 0.011);
  const cardHeight = Math.round((scheduleTotalH - 4 * cardGap) / 5);

  displayBlocks.forEach((block, idx) => {
    const cardY = timelineStartY + idx * (cardHeight + cardGap);
    const isActive = block.hour === currentHour;
    const isPast =
      (block.hour < currentHour && currentHour - block.hour < 12) ||
      (block.hour > currentHour && block.hour - currentHour > 12);

    if (isActive) {
      ctx.fillStyle = "#181b26";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3.2;
    } else {
      ctx.fillStyle = isPast ? "rgba(19, 21, 29, 0.5)" : "rgba(19, 21, 29, 0.82)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1.6;
    }

    ctx.beginPath();
    ctx.roundRect(cardPad, cardY, cardW, cardHeight, 54);
    ctx.fill();
    ctx.stroke();

    // Category theme
    const cat = (block.category || "").toLowerCase();
    let col = "#6366f1";
    let catLabel = "Deep Focus";
    if (cat.includes("sleep") || cat.includes("rest")) {
      col = "#818cf8";
      catLabel = "Rest";
    } else if (cat.includes("habit") || cat.includes("vitality") || cat.includes("gym")) {
      col = "#10b981";
      catLabel = "Vitality";
    } else if (cat.includes("sync") || cat.includes("meeting")) {
      col = "#38bdf8";
      catLabel = "Sync";
    } else if (cat.includes("buffer") || cat.includes("break") || cat.includes("renewal")) {
      col = "#f59e0b";
      catLabel = "Renewal";
    }

    // ==========================================
    // ROW 1: Time Interval (Left) + Category Badge (Right)
    // ==========================================
    const row1Y = cardY + Math.round(cardHeight * 0.36);

    // Left dot (radiant ambient glow, NO blinking!)
    if (isActive) {
      ctx.fillStyle = "rgba(245, 158, 11, 0.35)";
      ctx.beginPath();
      ctx.arc(cardPad + 36, row1Y - 8, 13, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = isActive ? "#f59e0b" : isPast ? "#10b981" : "#475569";
    ctx.beginPath();
    ctx.arc(cardPad + 36, row1Y - 8, isActive ? 7.5 : 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Time text
    ctx.font = isActive ? "700 30px 'JetBrains Mono', monospace" : "600 28px 'JetBrains Mono', monospace";
    ctx.fillStyle = isActive ? "#fef08a" : isPast ? "#94a3b8" : "#e2e8f0";
    ctx.fillText(`${block.startTime} → ${block.endTime}`, cardPad + 62, row1Y);

    // Category badge pill on right (smooth 18px rounded pill)
    ctx.font = "700 22px 'JetBrains Mono', monospace";
    const tagW = ctx.measureText(catLabel).width + 26;
    const tagX = cardPad + cardW - tagW - 28;

    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(tagX, cardY + 24, tagW, 44, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = col;
    ctx.fillText(catLabel, tagX + 13, cardY + 54);

    // ==========================================
    // ROW 2: Full-Width Task Title + Status (NOW / DONE)
    // ==========================================
    const row2Y = cardY + Math.round(cardHeight * 0.78);

    let statusW = 0;
    if (isActive) {
      ctx.textAlign = "right";
      ctx.font = "700 26px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#f59e0b";
      ctx.fillText("● NOW", cardPad + cardW - 28, row2Y);
      statusW = ctx.measureText("● NOW").width + 30;
      ctx.textAlign = "left";
    } else if (isPast) {
      ctx.textAlign = "right";
      ctx.font = "700 24px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#10b981";
      ctx.fillText("✓ DONE", cardPad + cardW - 28, row2Y);
      statusW = ctx.measureText("✓ DONE").width + 30;
      ctx.textAlign = "left";
    }

    // Task Title (Large & Bold across entire card width)
    ctx.font = "700 36px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = isActive ? "#ffffff" : isPast ? "#94a3b8" : "#f1f5f9";
    const maxTitleW = cardW - 74 - statusW;
    ctx.fillText(truncateText(ctx, block.title || "Scheduled Block", maxTitleW), cardPad + 36, row2Y);
  });

  const timelineEndHeight = timelineStartY + blockCount * (cardHeight + cardGap);

  // 7. CADENCE HOBBIES & PASSIONS (Guaranteed display - fills remaining screen down to bottom)
  let currentCardY = timelineEndHeight + Math.round(usableH * 0.015);
  const userHobbies = (data.includeHobbies !== false && data.habits && data.habits.length > 0)
    ? data.habits.slice(0, 4)
    : [
        { id: "def-1", name: "Mindful Focus", icon: "🧘", currentStreak: data.userStreak || 1, category: "Cadence Track" } as any,
        { id: "def-2", name: "Daily Hydration", icon: "💧", currentStreak: data.userStreak || 1, category: "Vitality Track" } as any,
      ];

  if (userHobbies.length > 0) {
    const hobHeaderY = currentCardY + Math.round(usableH * 0.010);
    ctx.font = "700 24px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
    ctx.fillText("✦ CADENCE • HOBBIES & PASSIONS", cardPad + 14, hobHeaderY);

    ctx.textAlign = "right";
    ctx.font = "600 20px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(100, 116, 139, 0.9)";
    ctx.fillText(`${userHobbies.length} ACTIVE ${userHobbies.length === 1 ? "TRACK" : "TRACKS"}`, cardPad + cardW - 14, hobHeaderY);
    ctx.textAlign = "left";

    const hobStartY = hobHeaderY + Math.round(usableH * 0.014);
    const hobFootnoteH = Math.round(usableH * 0.025);
    const hobAvailableH = (topSafeZone + usableH) - hobStartY - hobFootnoteH;
    const isSingle = userHobbies.length === 1;
    const rows = Math.ceil(userHobbies.length / 2);

    if (rows === 1) {
      // 1 Row: 1 full-width card or 2 side-by-side cards with expansive height
      const hobGap = 16;
      const hobW = isSingle ? cardW : (cardW - hobGap) / 2;
      const hobH = Math.min(Math.round(usableH * 0.130), hobAvailableH);

      userHobbies.forEach((h, idx) => {
        const hX = isSingle ? cardPad : cardPad + idx * (hobW + hobGap);
        const hY = hobStartY;

        ctx.fillStyle = "rgba(19, 21, 29, 0.82)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(hX, hY, hobW, hobH, 44);
        ctx.fill();
        ctx.stroke();

        // Emoji
        const emoji = resolveHobbyEmoji(h.icon, h.name);
        ctx.font = "52px sans-serif";
        ctx.fillText(emoji, hX + 24, hY + Math.round(hobH * 0.54));

        // Streak flame pill on the right (18px rounded)
        const streakText = `${h.currentStreak || 0}d 🔥`;
        ctx.font = "700 26px 'JetBrains Mono', monospace";
        const streakW = ctx.measureText(streakText).width + 24;
        const streakX = hX + hobW - streakW - 20;
        ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
        ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(streakX, hY + 20, streakW, 46, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(streakText, streakX + 12, hY + 52);

        // Title and category
        ctx.font = "700 32px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(truncateText(ctx, h.name, hobW - 40), hX + 24, hY + Math.round(hobH * 0.84));
      });
    } else {
      // 2-Column Grid for multiple hobbies (38px rounded)
      const hobGap = 16;
      const hobW = (cardW - hobGap) / 2;
      const hobH = Math.round((hobAvailableH - hobGap) / 2);

      userHobbies.forEach((h, idx) => {
        const row = Math.floor(idx / 2);
        const col = idx % 2;
        const hX = cardPad + col * (hobW + hobGap);
        const hY = hobStartY + row * (hobH + hobGap);

        ctx.fillStyle = "rgba(19, 21, 29, 0.8)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(hX, hY, hobW, hobH, 38);
        ctx.fill();
        ctx.stroke();

        // Emoji
        const emoji = resolveHobbyEmoji(h.icon, h.name);
        ctx.font = "40px sans-serif";
        ctx.fillText(emoji, hX + 22, hY + 75);

        // Streak flame badge
        const streakText = `${h.currentStreak || 0}d 🔥`;
        ctx.font = "700 20px 'JetBrains Mono', monospace";
        const streakW = ctx.measureText(streakText).width + 20;
        ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
        ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(hX + hobW - streakW - 16, hY + 16, streakW, 36, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(streakText, hX + hobW - streakW - 6, hY + 41);

        // Name
        ctx.font = "700 26px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(truncateText(ctx, h.name, hobW - 40), hX + 22, hY + 112);
      });
    }
  }

  // 8. BOTTOM SAFE ZONE (Clean space for in-display fingerprint scanner & shortcuts)
  // Subtle brand mark only at the very bottom edge:
  ctx.textAlign = "center";
  ctx.font = "600 15px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fillText("ODYSSEY CADENCE LOCKSCREEN", width / 2, 2300);

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.beginPath();
  ctx.roundRect((width - 320) / 2, 2295, 320, 6, 3);
  ctx.fill();

  return canvas;
}
