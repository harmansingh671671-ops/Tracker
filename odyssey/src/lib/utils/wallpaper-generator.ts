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
      // Unscheduled hour: keep strictly empty (no fake prefilled circadian titles)
      result.push({
        hour: h,
        startTime: sTime,
        endTime: eTime,
        title: "",
        category: "",
        tag: "",
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
        sub: h.category ? `${h.category} • Target active` : "Habit track",
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
  ctx.fillText(`Level ${String(data.userLevel).padStart(2, "0")} Explorer`, cardPad + 36, headerY + 162);

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

  // 5. 24-HOUR SPECTRUM BAR (Expanded, clean, no squeezed text)
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

  // 6. 2-TASK DISPLAY (Strictly 2 Tasks: Current NOW & Upcoming NEXT)
  const currentBlock = allHourlyBlocks[currentHour] || {
    hour: currentHour,
    startTime: `${String(currentHour).padStart(2, "0")}:00`,
    endTime: `${String((currentHour + 1) % 24).padStart(2, "0")}:00`,
    title: "",
    category: "",
    tag: "",
    isUserDefined: false,
  };

  const nextHour = (currentHour + 1) % 24;
  const nextBlock = allHourlyBlocks[nextHour] || {
    hour: nextHour,
    startTime: `${String(nextHour).padStart(2, "0")}:00`,
    endTime: `${String((nextHour + 1) % 24).padStart(2, "0")}:00`,
    title: "",
    category: "",
    tag: "",
    isUserDefined: false,
  };

  const timelineStartY = specY + specH + Math.round(usableH * 0.018);
  const cardGap = 20;
  const currentCardH = 175;
  const nextCardH = 155;

  // Helper for category theme
  const getCatDetails = (category: string) => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("sleep") || cat.includes("rest")) return { col: "#818cf8", bg: "rgba(129, 140, 248, 0.15)", label: "Rest" };
    if (cat.includes("habit") || cat.includes("vitality") || cat.includes("gym")) return { col: "#34d399", bg: "rgba(52, 211, 153, 0.15)", label: "Vitality" };
    if (cat.includes("sync") || cat.includes("meeting")) return { col: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)", label: "Sync" };
    if (cat.includes("buffer") || cat.includes("break") || cat.includes("renewal")) return { col: "#fbbf24", bg: "rgba(251, 191, 36, 0.15)", label: "Renewal" };
    return { col: "#5af0b3", bg: "rgba(90, 240, 179, 0.15)", label: "Focus" };
  };

  // --- CARD 1: CURRENT TASK (NOW) ---
  const currentY = timelineStartY;
  const curCat = getCatDetails(currentBlock.category);

  // High-Curvature Card background with glowing emerald border
  ctx.fillStyle = "#172033";
  ctx.strokeStyle = "#5af0b3";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(cardPad, currentY, cardW, currentCardH, 48);
  ctx.fill();
  ctx.stroke();

  // Ambient outer pulse glow around Current card
  ctx.strokeStyle = "rgba(90, 240, 179, 0.22)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(cardPad - 2, currentY - 2, cardW + 4, currentCardH + 4, 50);
  ctx.stroke();

  // Row 1: "NOW" Pill Badge + Time Interval + Category Badge
  const curRow1Y = currentY + 48;

  // Emerald "NOW" Pill Badge
  ctx.font = "800 20px 'JetBrains Mono', monospace";
  const nowText = "NOW";
  const nowBadgeW = ctx.measureText(nowText).width + 24;
  ctx.fillStyle = "#5af0b3";
  ctx.beginPath();
  ctx.roundRect(cardPad + 32, currentY + 24, nowBadgeW, 36, 14);
  ctx.fill();
  ctx.fillStyle = "#003825";
  ctx.fillText(nowText, cardPad + 44, currentY + 49);

  // Time Interval text
  ctx.font = "700 28px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#fef08a";
  ctx.fillText(`${currentBlock.startTime} → ${currentBlock.endTime}`, cardPad + 32 + nowBadgeW + 18, curRow1Y);

  // Category Badge Pill (Right side) - only if user defined
  if (currentBlock.category) {
    ctx.font = "700 22px 'JetBrains Mono', monospace";
    const curTagW = ctx.measureText(curCat.label).width + 26;
    const curTagX = cardPad + cardW - curTagW - 32;
    ctx.fillStyle = curCat.bg;
    ctx.strokeStyle = curCat.col;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(curTagX, currentY + 24, curTagW, 38, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = curCat.col;
    ctx.fillText(curCat.label, curTagX + 13, currentY + 50);
  }

  // Row 2: Full Prominent Task Title (Strictly empty if user has not scheduled anything)
  if (currentBlock.title) {
    ctx.font = "700 40px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#ffffff";
    const maxCurTitleW = cardW - 64;
    ctx.fillText(truncateText(ctx, currentBlock.title, maxCurTitleW), cardPad + 32, currentY + 125);
  }

  // --- CARD 2: UPCOMING TASK (NEXT) ---
  const nextY = currentY + currentCardH + cardGap;
  const nextCat = getCatDetails(nextBlock.category);

  // Clean secondary background
  ctx.fillStyle = "rgba(19, 27, 46, 0.88)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardPad, nextY, cardW, nextCardH, 44);
  ctx.fill();
  ctx.stroke();

  // Row 1: "UPCOMING" Pill + Time Interval + Category Badge
  const nextRow1Y = nextY + 46;

  // Slate/Lavender "UPCOMING" Pill
  ctx.font = "700 18px 'JetBrains Mono', monospace";
  const nextText = "UPCOMING";
  const nextBadgeW = ctx.measureText(nextText).width + 22;
  ctx.fillStyle = "#283548";
  ctx.strokeStyle = "rgba(189, 194, 255, 0.4)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(cardPad + 32, nextY + 22, nextBadgeW, 34, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#bdc2ff";
  ctx.fillText(nextText, cardPad + 43, nextY + 46);

  // Next Time text
  ctx.font = "600 26px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
  ctx.fillText(`${nextBlock.startTime} → ${nextBlock.endTime}`, cardPad + 32 + nextBadgeW + 18, nextRow1Y);

  // Next Category badge - only if user defined
  if (nextBlock.category) {
    ctx.font = "700 20px 'JetBrains Mono', monospace";
    const nextTagW = ctx.measureText(nextCat.label).width + 24;
    const nextTagX = cardPad + cardW - nextTagW - 32;
    ctx.fillStyle = nextCat.bg;
    ctx.strokeStyle = nextCat.col;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(nextTagX, nextY + 22, nextTagW, 34, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = nextCat.col;
    ctx.fillText(nextCat.label, nextTagX + 12, nextY + 46);
  }

  // Row 2: Upcoming Task Title (Strictly empty if user has not scheduled anything)
  if (nextBlock.title) {
    ctx.font = "600 34px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "rgba(241, 245, 249, 0.95)";
    ctx.fillText(truncateText(ctx, nextBlock.title, cardW - 64), cardPad + 32, nextY + 112);
  }

  const timelineEndHeight = nextY + nextCardH;

  // 7. HOBBIES & PASSIONS (Guaranteed display - fills remaining screen down to bottom)
  let currentCardY = timelineEndHeight + Math.round(usableH * 0.015);
  const userHobbies = (data.includeHobbies !== false && data.habits && data.habits.length > 0)
    ? data.habits.slice(0, 4)
    : [
        { id: "def-1", name: "Mindful Focus", icon: "🧘", currentStreak: data.userStreak || 1, category: "Habit Track" } as any,
        { id: "def-2", name: "Daily Hydration", icon: "💧", currentStreak: data.userStreak || 1, category: "Vitality Track" } as any,
      ];

  if (userHobbies.length > 0) {
    const hobHeaderY = currentCardY + Math.round(usableH * 0.010);
    ctx.font = "700 24px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
    ctx.fillText("✦ HOBBIES & PASSIONS", cardPad + 14, hobHeaderY);

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
  ctx.fillText("ODYSSEY LIVE LOCKSCREEN", width / 2, 2300);

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.beginPath();
  ctx.roundRect((width - 320) / 2, 2295, 320, 6, 3);
  ctx.fill();

  return canvas;
}
