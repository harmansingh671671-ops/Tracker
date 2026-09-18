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

  // 3. TOP SAFE ZONE (y: 0 to topSafeZone)
  // Clean OLED dark space so the phone's native lock, date, big clock (e.g. 00:48) and notifications NEVER collide with text!
  const topSafeZone = data.topClockOffset ?? 840;

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
    ctx.fillText(data.formattedDate.toUpperCase(), width / 2, 330);

    ctx.font = "300 160px 'Plus Jakarta Sans', -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillText(timeStr, width / 2, 530);

    // Simulated lockscreen notification card hint
    const notifW = width - 180;
    const notifH = 82;
    const notifY = 660;
    ctx.fillStyle = "rgba(30, 41, 59, 0.40)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect((width - notifW) / 2, notifY, notifW, notifH, 20);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.font = "600 20px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillText("Android System • 1 notification", (width - notifW) / 2 + 25, notifY + 48);
  }

  const cardPad = 60;
  const cardW = width - cardPad * 2; // 960px

  // 4. TIMELINE HEADER & SPECTRUM (Starts right below phone clock & notification safe zone)
  const scheduleHeaderY = topSafeZone + 25;
  ctx.font = "700 19px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
  ctx.fillText("SCHEDULE • ACTIVE HOUR CENTERED", cardPad + 10, scheduleHeaderY);

  ctx.textAlign = "right";
  ctx.font = "700 17px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#f59e0b";
  ctx.fillText(`● ${timeStr} ACTIVE`, cardPad + cardW - 10, scheduleHeaderY);
  ctx.textAlign = "left";

  // 24-Hour Cadence Spectrum Bar
  const specY = scheduleHeaderY + 22;
  const specH = 50;
  ctx.fillStyle = "rgba(19, 21, 29, 0.65)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cardPad, specY, cardW, specH, 16);
  ctx.fill();
  ctx.stroke();

  // Multi-segment 24h timeline strip
  const stripX = cardPad + 18;
  const stripY = specY + 12;
  const stripW = cardW - 36;
  const stripH = 14;

  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.beginPath();
  ctx.roundRect(stripX, stripY, stripW, stripH, 7);
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

  const needleX = stripX + (currentHourFloat / 24) * stripW;
  ctx.fillStyle = "#f59e0b";
  ctx.strokeStyle = "#090a0f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(needleX, stripY + stripH / 2, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Legend timestamps
  ctx.font = "600 15px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
  ctx.fillText("00:00", stripX, specY + 42);
  ctx.fillText("06:00", stripX + stripW * 0.23, specY + 42);
  ctx.textAlign = "center";
  ctx.fillText("12:00", stripX + stripW * 0.5, specY + 42);
  ctx.fillText("18:00", stripX + stripW * 0.77, specY + 42);
  ctx.textAlign = "right";
  ctx.fillText("24:00", stripX + stripW, specY + 42);
  ctx.textAlign = "left";

  // 5. 5-CARD HOURLY SCHEDULE WINDOW (Dead-Center on Screen)
  const blockCount = 5;
  const displayBlocks = getCenteredHourlyWindow(allHourlyBlocks, currentHour, blockCount);

  const timelineStartY = specY + specH + 18;
  const cardHeight = 92;
  const cardGap = 12;

  displayBlocks.forEach((block, idx) => {
    const cardY = timelineStartY + idx * (cardHeight + cardGap);
    const isActive = block.hour === currentHour;
    const isPast =
      (block.hour < currentHour && currentHour - block.hour < 12) ||
      (block.hour > currentHour && block.hour - currentHour > 12);

    if (isActive) {
      // Golden beacon glowing box around the active hour
      const activeGlow = ctx.createRadialGradient(
        cardPad + cardW / 2, cardY + cardHeight / 2, 50,
        cardPad + cardW / 2, cardY + cardHeight / 2, cardW / 2
      );
      activeGlow.addColorStop(0, "rgba(245, 158, 11, 0.14)");
      activeGlow.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = activeGlow;
      ctx.fillRect(cardPad - 15, cardY - 10, cardW + 30, cardHeight + 20);

      ctx.fillStyle = "#161924";
      ctx.strokeStyle = "rgba(245, 158, 11, 0.95)";
      ctx.lineWidth = 2.5;
    } else {
      ctx.fillStyle = isPast ? "rgba(19, 21, 29, 0.45)" : "rgba(19, 21, 29, 0.72)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1.5;
    }

    ctx.beginPath();
    ctx.roundRect(cardPad, cardY, cardW, cardHeight, 18);
    ctx.fill();
    ctx.stroke();

    // Left category color pill indicator
    const cat = (block.category || "").toLowerCase();
    let col = "#6366f1";
    if (cat.includes("sleep") || cat.includes("rest")) col = "#818cf8";
    else if (cat.includes("habit") || cat.includes("vitality") || cat.includes("gym")) col = "#10b981";
    else if (cat.includes("sync") || cat.includes("meeting")) col = "#0284c7";
    else if (cat.includes("buffer") || cat.includes("break") || cat.includes("renewal")) col = "#f59e0b";

    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cardPad + 28, cardY + cardHeight / 2, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Time Slot
    ctx.font = isActive ? "700 21px 'JetBrains Mono', monospace" : "600 20px 'JetBrains Mono', monospace";
    ctx.fillStyle = isActive ? "#fbbf24" : isPast ? "rgba(148, 163, 184, 0.55)" : "#e2e8f0";
    ctx.fillText(`${block.startTime} → ${block.endTime}`, cardPad + 45, cardY + 54);

    // Category Tag Pill
    const tagText = block.tag || (cat.includes("sleep") ? "Rest" : "Focus");
    ctx.font = "600 14px 'JetBrains Mono', monospace";
    const tagW = ctx.measureText(tagText).width + 20;
    const tagX = cardPad + 245;

    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tagX, cardY + 31, tagW, 28, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(203, 213, 225, 0.85)";
    ctx.fillText(tagText, tagX + 10, cardY + 51);

    // Title / Activity Name
    ctx.textAlign = "right";
    if (isActive) {
      ctx.font = "700 13px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#f59e0b";
      ctx.fillText("● ACTIVE NOW", cardPad + cardW - 25, cardY + 36);

      ctx.font = "700 21px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(truncateText(ctx, block.title || "Focus", 360), cardPad + cardW - 25, cardY + 65);
    } else {
      ctx.font = "600 19px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = isPast ? "#94a3b8" : "#cbd5e1";
      ctx.fillText(truncateText(ctx, block.title || "Scheduled", 400), cardPad + cardW - 25, cardY + 54);
    }
    ctx.textAlign = "left";
  });

  const timelineEndHeight = timelineStartY + blockCount * (cardHeight + cardGap);

  // 6. HEADER ANCHOR CARD (Positioned in comfortable mid-lower screen, below schedule)
  const headerY = timelineEndHeight + 20;
  const headerH = 150;

  ctx.fillStyle = "rgba(19, 21, 29, 0.72)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardPad, headerY, cardW, headerH, 24);
  ctx.fill();
  ctx.stroke();

  // Left Title: ODYSSEY • CH. 0X
  ctx.font = "700 20px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
  const chapterText = `ODYSSEY • CH. 0${data.chapter}`;
  ctx.fillText(chapterText, cardPad + 30, headerY + 44);

  // Day Badge Pill
  const chapterTextW = ctx.measureText(chapterText).width;
  const dayBadgeText = `DAY ${data.activeDay} OF 365`;
  ctx.font = "700 18px 'JetBrains Mono', monospace";
  const badgeW = ctx.measureText(dayBadgeText).width + 22;
  const badgeX = cardPad + 30 + chapterTextW + 18;

  ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
  ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, headerY + 25, badgeW, 26, 13);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#34d399";
  ctx.fillText(dayBadgeText, badgeX + 11, headerY + 44);

  // User Rank & Level
  ctx.font = "700 28px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(`${data.rankBadge} ${data.rankName}`, cardPad + 30, headerY + 96);

  ctx.font = "500 20px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
  ctx.fillText(`Level ${String(data.userLevel).padStart(2, "0")} Cadence`, cardPad + 30, headerY + 128);

  // Radial Coverage Gauge
  const userPlannedCount = allHourlyBlocks.filter((b) => b.isUserDefined).length;
  const effectivePlannedHours = userPlannedCount > 0 ? userPlannedCount : data.plannedHours || 18;
  const plannedPercent = Math.min(100, Math.round((effectivePlannedHours / 24) * 100));

  const gaugeCenterX = cardPad + cardW - 75;
  const gaugeCenterY = headerY + 75;
  const gaugeRadius = 40;

  ctx.strokeStyle = "rgba(30, 41, 59, 0.8)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (Math.PI * 2 * (plannedPercent / 100));
  ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, startAngle, endAngle);
  ctx.stroke();

  ctx.font = "700 21px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.fillText(`${plannedPercent}%`, gaugeCenterX, gaugeCenterY + 8);

  ctx.textAlign = "right";
  ctx.font = "600 17px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
  ctx.fillText("PLANNED", gaugeCenterX - 58, gaugeCenterY - 4);
  ctx.font = "700 21px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#34d399";
  ctx.fillText(`${effectivePlannedHours}/24h`, gaugeCenterX - 58, gaugeCenterY + 22);
  ctx.textAlign = "left";

  // 7. DAILY CADENCE DIRECTIVE & STATS CARD
  const directiveStartY = headerY + headerH + 18;
  const directiveHeight = 185;

  ctx.fillStyle = "rgba(19, 21, 29, 0.75)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cardPad, directiveStartY, cardW, directiveHeight, 22);
  ctx.fill();
  ctx.stroke();

  // Top subtle gradient highlight in directive card
  const cardGrad = ctx.createLinearGradient(cardPad, directiveStartY, cardPad + cardW, directiveStartY);
  cardGrad.addColorStop(0, "rgba(99, 102, 241, 0.12)");
  cardGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.08)");
  cardGrad.addColorStop(1, "rgba(16, 185, 129, 0.08)");
  ctx.fillStyle = cardGrad;
  ctx.beginPath();
  ctx.roundRect(cardPad, directiveStartY, cardW, 36, [22, 22, 0, 0]);
  ctx.fill();

  // Card Header
  ctx.font = "700 17px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(245, 158, 11, 0.9)";
  ctx.fillText("✦ DAILY CADENCE DIRECTIVE", cardPad + 25, directiveStartY + 38);

  ctx.textAlign = "right";
  ctx.font = "600 15px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#34d399";
  ctx.fillText(`DAY ${String(data.activeDay).padStart(2, "0")} / ACTIVE CADENCE`, cardPad + cardW - 25, directiveStartY + 38);
  ctx.textAlign = "left";

  // Inspiring Cadence Mantra
  const mantra = currentHour >= 21 || currentHour < 6
    ? "Honor your circadian recovery. Deep rest fuels tomorrow's uninterrupted focus."
    : currentHour >= 12 && currentHour < 14
    ? "Step back for mindful recovery. Mental clarity is renewed in deliberate pauses."
    : "Protect your active focus blocks with absolute integrity. Momentum is built hour by hour.";

  ctx.font = "500 19px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(truncateText(ctx, mantra, cardW - 50), cardPad + 25, directiveStartY + 76);

  // 3 Metric Pills across the lower section of the card
  const pillY = directiveStartY + 104;
  const pillH = 62;
  const pillGap = 16;
  const pillW = (cardW - 50 - pillGap * 2) / 3;

  // Metric 1: Integrity
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cardPad + 25, pillY, pillW, pillH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.font = "600 13px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
  ctx.fillText("INTEGRITY", cardPad + 38, pillY + 24);
  ctx.font = "700 20px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#34d399";
  ctx.fillText("100% 🛡️", cardPad + 38, pillY + 50);

  // Metric 2: Cadence Streak
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
  ctx.beginPath();
  ctx.roundRect(cardPad + 25 + pillW + pillGap, pillY, pillW, pillH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.font = "600 13px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
  ctx.fillText("STREAK", cardPad + 38 + pillW + pillGap, pillY + 24);
  ctx.font = "700 20px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText("6 Days 🔥", cardPad + 38 + pillW + pillGap, pillY + 50);

  // Metric 3: Cadence Sprint Target
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  ctx.strokeStyle = "rgba(99, 102, 241, 0.25)";
  ctx.beginPath();
  ctx.roundRect(cardPad + 25 + (pillW + pillGap) * 2, pillY, pillW, pillH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.font = "600 13px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
  ctx.fillText("CHAPTER GOAL", cardPad + 38 + (pillW + pillGap) * 2, pillY + 24);
  ctx.font = "700 20px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#a5b4fc";
  ctx.fillText("Sprint 1 ⚔️", cardPad + 38 + (pillW + pillGap) * 2, pillY + 50);

  // 8. BOTTOM SAFE ZONE (y: 1880 to 2340)
  // 100% clean OLED pure dark for in-display fingerprint scanner, flashlight, and camera buttons.
  // Subtle brand mark only at the very bottom edge:
  ctx.textAlign = "center";
  ctx.font = "600 16px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fillText("ODYSSEY CADENCE", width / 2, 2300);

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.beginPath();
  ctx.roundRect((width - 340) / 2, 2295, 340, 8, 4);
  ctx.fill();

  return canvas;
}
