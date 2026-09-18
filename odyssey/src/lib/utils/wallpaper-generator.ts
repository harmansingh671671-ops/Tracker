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

      if (h >= 23 || h < 6) {
        defaultTitle = h === 23 ? "Wind Down & Sleep" : "Obsidian Rest & Sleep";
        defaultCategory = "sleep";
        defaultTag = "Rest";
      } else if (h >= 6 && h < 8) {
        defaultTitle = "Morning Vitality & Priming";
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
        defaultCategory = "reflection";
        defaultTag = "Study";
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

  // 3. TOP SAFE ZONE (y: 0 to 460)
  // ONLY render simulated OS clock if explicitly requested for UI preview guide.
  // When downloaded/shared for actual phone lockscreen, this area remains completely clean OLED dark!
  if (data.showClockGuide) {
    // OS Status bar hints (subtle preview guide)
    ctx.font = "500 24px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillText(timeStr, 80, 75);

    // Dynamic Island simulation
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect((width - 240) / 2, 45, 240, 55, 28);
    ctx.fill();
    ctx.stroke();

    // Center Native Lockscreen Clock Hint (Translucent guide)
    ctx.textAlign = "center";
    ctx.font = "600 28px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillText(data.formattedDate.toUpperCase(), width / 2, 230);

    ctx.font = "300 145px 'Plus Jakarta Sans', -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillText(timeStr, width / 2, 380);

    ctx.font = "600 24px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(16, 185, 129, 0.45)";
    ctx.fillText("● FOCUS SESSION ACTIVE", width / 2, 430);
    ctx.textAlign = "left";
  }

  const cardPad = 60;
  const cardW = width - cardPad * 2; // 960px

  // 4. HEADER ANCHOR CARD (y: 470 to 625)
  const headerY = 470;
  const headerH = 155;

  ctx.fillStyle = "rgba(19, 21, 29, 0.72)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardPad, headerY, cardW, headerH, 28);
  ctx.fill();
  ctx.stroke();

  // Left Title: ODYSSEY • CH. 0X
  ctx.font = "700 21px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
  const chapterText = `ODYSSEY • CH. 0${data.chapter}`;
  ctx.fillText(chapterText, cardPad + 35, headerY + 46);

  // Day Badge Pill (computed offset so it NEVER collides with chapter text)
  const chapterTextW = ctx.measureText(chapterText).width;
  const dayBadgeText = `DAY ${data.activeDay} OF 365`;
  ctx.font = "700 19px 'JetBrains Mono', monospace";
  const badgeW = ctx.measureText(dayBadgeText).width + 24;
  const badgeX = cardPad + 35 + chapterTextW + 20;

  ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
  ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, headerY + 26, badgeW, 28, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#34d399";
  ctx.fillText(dayBadgeText, badgeX + 12, headerY + 47);

  // User Rank & Level
  ctx.font = "700 30px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(`${data.rankBadge} ${data.rankName}`, cardPad + 35, headerY + 102);

  ctx.font = "500 22px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
  ctx.fillText(`Level ${String(data.userLevel).padStart(2, "0")} Cadence`, cardPad + 35, headerY + 134);

  // 24 strictly hourly cadence blocks
  const allHourlyBlocks = build24HourlyBlocks(data.blocks);
  const userPlannedCount = allHourlyBlocks.filter((b) => b.isUserDefined).length;
  const effectivePlannedHours = userPlannedCount > 0 ? userPlannedCount : data.plannedHours || 18;
  const plannedPercent = Math.min(100, Math.round((effectivePlannedHours / 24) * 100));

  // Radial Coverage Gauge
  const gaugeCenterX = cardPad + cardW - 75;
  const gaugeCenterY = headerY + 77;
  const gaugeRadius = 42;

  // Background Ring
  ctx.strokeStyle = "rgba(30, 41, 59, 0.8)";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Emerald Progress Arc
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (Math.PI * 2 * (plannedPercent / 100));
  ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, startAngle, endAngle);
  ctx.stroke();

  ctx.font = "700 22px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.fillText(`${plannedPercent}%`, gaugeCenterX, gaugeCenterY + 8);

  ctx.textAlign = "right";
  ctx.font = "600 18px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
  ctx.fillText("PLANNED", gaugeCenterX - 60, gaugeCenterY - 4);
  ctx.font = "700 22px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#34d399";
  ctx.fillText(`${effectivePlannedHours}/24h`, gaugeCenterX - 60, gaugeCenterY + 22);
  ctx.textAlign = "left";

  // 5. 24-HOUR CADENCE SPECTRUM BAR (y: 645 to 745)
  const specY = 645;
  const specH = 95;
  ctx.fillStyle = "rgba(19, 21, 29, 0.65)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardPad, specY, cardW, specH, 20);
  ctx.fill();
  ctx.stroke();

  // Multi-segment 24h timeline strip (24 individual 1-hour slots)
  const stripX = cardPad + 25;
  const stripY = specY + 20;
  const stripW = cardW - 50;
  const stripH = 16;

  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.beginPath();
  ctx.roundRect(stripX, stripY, stripW, stripH, 8);
  ctx.fill();

  // Draw 24 hourly segments across the day
  const hourlySlotW = stripW / 24;
  for (const b of allHourlyBlocks) {
    const blockX = stripX + b.hour * hourlySlotW;
    const cat = (b.category || "").toLowerCase();
    let col = "#6366f1"; // deep work default
    if (cat.includes("sleep") || cat.includes("rest")) col = "#1e1b4b";
    else if (cat.includes("habit") || cat.includes("vitality") || cat.includes("gym")) col = "#10b981";
    else if (cat.includes("sync") || cat.includes("meeting")) col = "#0284c7";
    else if (cat.includes("buffer") || cat.includes("break") || cat.includes("renewal")) col = "#f59e0b";

    ctx.fillStyle = col;
    ctx.fillRect(blockX, stripY, hourlySlotW, stripH);
  }

  // Active time needle pin
  const needleX = stripX + (currentHourFloat / 24) * stripW;
  ctx.fillStyle = "#f59e0b";
  ctx.strokeStyle = "#090a0f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(needleX, stripY + stripH / 2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Spectrum legend & timestamps below strip (Fixed layout: NEVER overlaps!)
  ctx.font = "600 17px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
  ctx.fillText("00:00", stripX, specY + 64);
  ctx.fillText("06:00", stripX + stripW * 0.22, specY + 64);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f59e0b";
  ctx.fillText(`● ${timeStr} ACTIVE`, stripX + stripW * 0.5, specY + 64);

  ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
  ctx.fillText("18:00", stripX + stripW * 0.78, specY + 64);

  ctx.textAlign = "right";
  ctx.fillText("24:00", stripX + stripW, specY + 64);
  ctx.textAlign = "left";

  // Category Color Dots Legend (Matches screen.png)
  ctx.font = "500 14px 'JetBrains Mono', monospace";
  const legendY = specY + 84;
  const legendItems = [
    { label: "Vitality", color: "#10b981" },
    { label: "Deep Focus", color: "#6366f1" },
    { label: "Active", color: "#f59e0b" },
    { label: "Sync", color: "#0284c7" },
    { label: "Rest", color: "#818cf8" },
  ];
  let curLegX = stripX;
  const legSpacing = stripW / legendItems.length;
  for (const leg of legendItems) {
    ctx.fillStyle = leg.color;
    ctx.beginPath();
    ctx.arc(curLegX + 5, legendY - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
    ctx.fillText(leg.label, curLegX + 16, legendY);
    curLegX += legSpacing;
  }

  // 6. CORE SCHEDULE TIMELINE CARDS (Centered on Active Hour)
  const timelineHeaderY = 765;
  ctx.font = "700 19px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
  ctx.fillText("SCHEDULE • ACTIVE HOUR CENTERED", cardPad + 10, timelineHeaderY);

  ctx.textAlign = "right";
  ctx.font = "700 17px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#f59e0b";
  ctx.fillText(`● ${String(currentHour).padStart(2, "0")}:00 ACTIVE`, cardPad + cardW - 10, timelineHeaderY);
  ctx.textAlign = "left";

  const timelineStartY = 790;
  const cardHeight = 86;
  const cardGap = 14;

  // 5 hourly blocks centered on currentHour (offset: -2, -1, 0[ACTIVE], +1, +2)
  const displayBlocks = getCenteredHourlyWindow(allHourlyBlocks, currentHour, 5);

  displayBlocks.forEach((block, idx) => {
    const cardY = timelineStartY + idx * (cardHeight + cardGap);
    const isActive = block.hour === currentHour;
    const isPast =
      (block.hour < currentHour && currentHour - block.hour < 12) ||
      (block.hour > currentHour && block.hour - currentHour > 12);

    // Card background
    if (isActive) {
      ctx.fillStyle = "#161924";
      ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
      ctx.lineWidth = 3;
    } else {
      ctx.fillStyle = isPast ? "rgba(19, 21, 29, 0.45)" : "rgba(19, 21, 29, 0.72)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1.5;
    }

    ctx.beginPath();
    ctx.roundRect(cardPad, cardY, cardW, cardHeight, 20);
    ctx.fill();
    ctx.stroke();

    // Active accent left bar
    if (isActive) {
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.roundRect(cardPad, cardY, 7, cardHeight, [20, 0, 0, 20]);
      ctx.fill();
    }

    // Left Status Dot / Beacon
    const dotX = cardPad + 32;
    const dotY = cardY + cardHeight / 2;
    if (isActive) {
      // Pulsing outer beacon
      ctx.fillStyle = "rgba(245, 158, 11, 0.3)";
      ctx.beginPath();
      ctx.arc(dotX, dotY, 7, 0, Math.PI * 2);
      ctx.fill();
      // Solid inner core
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = isPast ? "rgba(16, 185, 129, 0.75)" : "rgba(100, 116, 139, 0.6)";
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Time range text
    const cleanTime = `${block.startTime} → ${block.endTime}`;
    ctx.font = isActive ? "700 21px 'JetBrains Mono', monospace" : "600 19px 'JetBrains Mono', monospace";
    ctx.fillStyle = isActive ? "#fef08a" : isPast ? "rgba(203, 213, 225, 0.7)" : "#94a3b8";
    ctx.fillText(cleanTime, cardPad + 56, cardY + 52);

    // Category Chip (Pill at cardPad + 265)
    const cat = (block.category || "work").toLowerCase();
    const catLabel = cat.includes("sleep") ? "Rest" : cat.includes("habit") || cat.includes("vitality") ? "Vitality" : cat.includes("sync") ? "Sync" : "Deep Focus";
    const chipX = cardPad + 265;
    ctx.font = "600 16px 'Plus Jakarta Sans', sans-serif";
    const chipW = ctx.measureText(catLabel).width + 24;

    ctx.fillStyle = isActive ? "rgba(245, 158, 11, 0.22)" : "rgba(255, 255, 255, 0.06)";
    ctx.strokeStyle = isActive ? "rgba(245, 158, 11, 0.45)" : "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(chipX, cardY + 27, chipW, 32, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isActive ? "#fde047" : "#e2e8f0";
    ctx.fillText(catLabel, chipX + 12, cardY + 49);

    // RIGHT SIDE: Block Title & Status Indicators (Right-aligned to PREVENT ANY OVERLAP)
    ctx.textAlign = "right";

    if (isActive) {
      // Golden 'NOW' badge on top right
      ctx.font = "700 15px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#f59e0b";
      ctx.fillText("● ACTIVE NOW", cardPad + cardW - 30, cardY + 38);

      // Title below
      ctx.font = "700 22px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(truncateText(ctx, block.title || "Scheduled Focus", 360), cardPad + cardW - 30, cardY + 66);
    } else if (isPast) {
      // Green checkmark
      ctx.fillStyle = "#10b981";
      ctx.font = "700 20px sans-serif";
      ctx.fillText("✓", cardPad + cardW - 30, cardY + 52);

      // Title right-aligned ending before checkmark
      ctx.font = "600 20px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "rgba(203, 213, 225, 0.85)";
      ctx.fillText(truncateText(ctx, block.title || "Focus", 380), cardPad + cardW - 65, cardY + 52);
    } else {
      // Upcoming title right-aligned
      ctx.font = "600 20px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(truncateText(ctx, block.title || "Scheduled", 420), cardPad + cardW - 30, cardY + 52);
    }

    ctx.textAlign = "left";
  });

  // 7. CADENCE HOBBIES (Adjust dynamically for 1, 2, 3, or 4 user hobbies; omit completely if 0)
  const userHobbies = getDisplayHobbies(data.habits);
  if (data.includeHobbies !== false && userHobbies.length > 0) {
    const hobbiesY = 1350;
    const count = userHobbies.length;

    ctx.font = "700 19px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
    ctx.fillText("CADENCE • HOBBIES & PASSIONS", cardPad + 10, hobbiesY);

    ctx.textAlign = "right";
    ctx.font = "600 17px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(100, 116, 139, 0.8)";
    ctx.fillText(`${count} ACTIVE ${count === 1 ? "TRACK" : "TRACKS"}`, cardPad + cardW - 10, hobbiesY);
    ctx.textAlign = "left";

    const gridY = hobbiesY + 20;
    const gridGap = 16;
    const halfColW = (cardW - gridGap) / 2;
    const cellH = 130;

    userHobbies.forEach((hob, hIdx) => {
      let hX = cardPad;
      let hY = gridY;
      let cellW = cardW;

      if (count === 1) {
        cellW = cardW;
        hX = cardPad;
        hY = gridY;
      } else if (count === 2) {
        cellW = halfColW;
        hX = cardPad + hIdx * (halfColW + gridGap);
        hY = gridY;
      } else if (count === 3) {
        if (hIdx < 2) {
          cellW = halfColW;
          hX = cardPad + hIdx * (halfColW + gridGap);
          hY = gridY;
        } else {
          cellW = cardW;
          hX = cardPad;
          hY = gridY + cellH + gridGap;
        }
      } else {
        const col = hIdx % 2;
        const row = Math.floor(hIdx / 2);
        cellW = halfColW;
        hX = cardPad + col * (halfColW + gridGap);
        hY = gridY + row * (cellH + gridGap);
      }

      // Card Box (Matches screen.png)
      ctx.fillStyle = "rgba(19, 21, 29, 0.65)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(hX, hY, cellW, cellH, 20);
      ctx.fill();
      ctx.stroke();

      // Top Icon Box (38x38 rounded container)
      const iconBoxSize = 38;
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(hX + 18, hY + 16, iconBoxSize, iconBoxSize, 10);
      ctx.fill();
      ctx.stroke();

      // Emoji drawn centered inside icon box
      ctx.font = "20px 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(hob.icon, hX + 18 + iconBoxSize / 2, hY + 16 + 27);
      ctx.textAlign = "left";

      // Streak Pill on top-right
      ctx.textAlign = "right";
      ctx.font = "700 17px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(`${hob.streak}d 🔥`, hX + cellW - 20, hY + 38);
      ctx.textAlign = "left";

      // Title & Subtitle
      ctx.font = "700 21px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(truncateText(ctx, hob.title, cellW - 40), hX + 20, hY + 84);

      ctx.font = "500 16px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "rgba(148, 163, 184, 0.75)";
      ctx.fillText(truncateText(ctx, hob.sub, cellW - 40), hX + 20, hY + 112);
    });
  }

  // 8. BOTTOM SAFE ZONE (y: 2050 to 2340)
  // Clean area for OS flashlight & camera lockscreen buttons
  ctx.textAlign = "center";
  ctx.font = "600 18px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.fillText("ODYSSEY CADENCE LOCKSCREEN", width / 2, 2200);

  ctx.font = "400 17px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillText("Swipe up to unlock", width / 2, 2235);

  // iOS Home Bar clearance silhouette
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.beginPath();
  ctx.roundRect((width - 340) / 2, 2280, 340, 8, 4);
  ctx.fill();

  return canvas;
}

export async function downloadWallpaper(data: WallpaperData, filename: string = "odyssey-lockscreen.png"): Promise<void> {
  // CRITICAL: When downloading the wallpaper image to set on the device, showClockGuide MUST be false!
  // The phone's OS already renders its own clock and status bar on the lockscreen!
  const canvas = await generateWallpaperCanvas({ ...data, showClockGuide: false });
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function shareWallpaper(data: WallpaperData): Promise<boolean> {
  // CRITICAL: showClockGuide MUST be false for the actual wallpaper file
  if (typeof navigator === "undefined" || !navigator.share) {
    await downloadWallpaper(data);
    return false;
  }

  try {
    const canvas = await generateWallpaperCanvas({ ...data, showClockGuide: false });
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          await downloadWallpaper(data);
          resolve(false);
          return;
        }
        const file = new File([blob], "odyssey-lockscreen.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: "Odyssey Lockscreen Wallpaper",
              text: "My daily Odyssey cadence lockscreen wallpaper",
              files: [file],
            });
            resolve(true);
          } catch (e) {
            resolve(false);
          }
        } else {
          await downloadWallpaper(data);
          resolve(false);
        }
      }, "image/png");
    });
  } catch (e) {
    await downloadWallpaper(data);
    return false;
  }
}
