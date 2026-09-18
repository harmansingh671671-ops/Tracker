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

  // 2. Ambient Subtle Radial Gradients
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
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentHourFloat = currentHour + currentMinute / 60;
  const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;

  // 3. TOP SAFE ZONE (y: 0 to 450)
  if (data.showClockGuide) {
    // OS Status bar hints
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

    // Center Native Lockscreen Clock Hint
    ctx.textAlign = "center";
    ctx.font = "600 28px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillText(data.formattedDate.toUpperCase(), width / 2, 230);

    ctx.font = "300 145px 'Plus Jakarta Sans', -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillText(timeStr, width / 2, 380);

    ctx.font = "600 24px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(16, 185, 129, 0.5)";
    ctx.fillText("● FOCUS SESSION ACTIVE", width / 2, 430);
    ctx.textAlign = "left";
  }

  // 4. HEADER ANCHOR CARD (y: 470 to 620)
  const headerY = 470;
  const cardPad = 60;
  const cardW = width - cardPad * 2;

  // Background Glass Card
  ctx.fillStyle = "rgba(19, 21, 29, 0.72)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardPad, headerY, cardW, 160, 32);
  ctx.fill();
  ctx.stroke();

  // Left Title
  ctx.font = "700 22px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
  ctx.fillText(`ODYSSEY • CH. 0${data.chapter}`, cardPad + 35, headerY + 48);

  // Day Badge Pill
  const dayBadgeText = `DAY ${data.activeDay} OF 365`;
  ctx.font = "700 20px 'JetBrains Mono', monospace";
  const badgeW = ctx.measureText(dayBadgeText).width + 24;
  ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
  ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
  ctx.beginPath();
  ctx.roundRect(cardPad + 280, headerY + 28, badgeW, 30, 15);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#34d399";
  ctx.fillText(dayBadgeText, cardPad + 292, headerY + 50);

  // User Rank & Level
  ctx.font = "700 32px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(`${data.rankBadge} ${data.rankName}`, cardPad + 35, headerY + 105);

  ctx.font = "500 24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
  ctx.fillText(`Level ${String(data.userLevel).padStart(2, "0")} Cadence`, cardPad + 35, headerY + 138);

  // Effective hours and blocks (fallback to representative cadence if user hasn't planned today yet)
  const effectiveBlocks = data.blocks && data.blocks.length > 0 ? data.blocks : getRepresentativeBlocks([], currentHourFloat);
  const effectivePlannedHours = data.blocks && data.blocks.length > 0 ? data.plannedHours : 20;
  const plannedPercent = Math.min(100, Math.round((effectivePlannedHours / 24) * 100));

  const gaugeCenterX = cardPad + cardW - 75;
  const gaugeCenterY = headerY + 80;
  const gaugeRadius = 45;

  // Background Ring
  ctx.strokeStyle = "rgba(30, 41, 59, 0.8)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Emerald Progress Arc
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (Math.PI * 2 * (plannedPercent / 100));
  ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, startAngle, endAngle);
  ctx.stroke();

  ctx.font = "700 24px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.fillText(`${plannedPercent}%`, gaugeCenterX, gaugeCenterY + 8);

  ctx.textAlign = "right";
  ctx.font = "600 20px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
  ctx.fillText("PLANNED", gaugeCenterX - 65, gaugeCenterY - 4);
  ctx.font = "700 24px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#34d399";
  ctx.fillText(`${effectivePlannedHours}/24h`, gaugeCenterX - 65, gaugeCenterY + 24);
  ctx.textAlign = "left";

  // 5. 24-HOUR CADENCE SPECTRUM BAR (y: 655 to 765)
  const specY = 655;
  const specH = 100;
  ctx.fillStyle = "rgba(19, 21, 29, 0.65)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardPad, specY, cardW, specH, 24);
  ctx.fill();
  ctx.stroke();

  // Multi-segment 24h timeline strip
  const stripX = cardPad + 25;
  const stripY = specY + 22;
  const stripW = cardW - 50;
  const stripH = 18;

  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.beginPath();
  ctx.roundRect(stripX, stripY, stripW, stripH, 9);
  ctx.fill();

  // Draw scheduled segments across 24h
  for (const block of effectiveBlocks) {
    const sH = parseInt(block.startTime.split(":")[0], 10) + parseInt(block.startTime.split(":")[1] || "0", 10) / 60;
    let eH = parseInt(block.endTime.split(":")[0], 10) + parseInt(block.endTime.split(":")[1] || "0", 10) / 60;
    if (block.endTime === "24:00" || (eH === 0 && sH > 0)) eH = 24;

    const blockX = stripX + (sH / 24) * stripW;
    const blockW = Math.max(2, ((eH - sH) / 24) * stripW);

    const cat = (block.category || "").toLowerCase();
    let col = "#6366f1"; // deep work default
    if (cat.includes("sleep") || cat.includes("rest")) col = "#1e1b4b";
    else if (cat.includes("habit") || cat.includes("vitality") || cat.includes("gym")) col = "#10b981";
    else if (cat.includes("sync") || cat.includes("meeting")) col = "#0284c7";
    else if (cat.includes("buffer") || cat.includes("break")) col = "#f59e0b";

    ctx.fillStyle = col;
    ctx.fillRect(blockX, stripY, blockW, stripH);
  }

  // Active time needle pin
  const needleX = stripX + (currentHourFloat / 24) * stripW;
  ctx.fillStyle = "#f59e0b";
  ctx.strokeStyle = "#090a0f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(needleX, stripY + stripH / 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Spectrum legend & timestamps
  ctx.font = "600 18px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
  ctx.fillText("00:00", stripX, specY + 76);
  ctx.fillText("06:00", stripX + stripW * 0.25, specY + 76);

  ctx.fillStyle = "#f59e0b";
  ctx.fillText(`● ${timeStr} ACTIVE`, needleX - 45, specY + 76);

  ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
  ctx.fillText("18:00", stripX + stripW * 0.75, specY + 76);
  ctx.fillText("24:00", stripX + stripW - 45, specY + 76);

  // 6. CORE SCHEDULE TIMELINE CARDS (y: 775 to 1480)
  const timelineStartY = 775;
  const cardHeight = 72;
  const cardGap = 12;

  // Select up to 7 representative blocks around current hour
  const displayBlocks = getRepresentativeBlocks(data.blocks, currentHourFloat);

  displayBlocks.forEach((block, idx) => {
    const cardY = timelineStartY + idx * (cardHeight + cardGap);
    const sH = parseInt(block.startTime.split(":")[0], 10) + parseInt(block.startTime.split(":")[1] || "0", 10) / 60;
    let eH = parseInt(block.endTime.split(":")[0], 10) + parseInt(block.endTime.split(":")[1] || "0", 10) / 60;
    if (block.endTime === "24:00" || (eH === 0 && sH > 0)) eH = 24;

    const isActive = currentHourFloat >= sH && currentHourFloat < eH;
    const isPast = currentHourFloat >= eH;

    // Card background
    if (isActive) {
      ctx.fillStyle = "#161924";
      ctx.strokeStyle = "rgba(245, 158, 11, 0.65)";
      ctx.lineWidth = 3;
    } else {
      ctx.fillStyle = isPast ? "rgba(19, 21, 29, 0.5)" : "rgba(19, 21, 29, 0.7)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx.lineWidth = 1.5;
    }

    ctx.beginPath();
    ctx.roundRect(cardPad, cardY, cardW, cardHeight, 18);
    ctx.fill();
    ctx.stroke();

    // Active accent left bar
    if (isActive) {
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.roundRect(cardPad, cardY, 6, cardHeight, [18, 0, 0, 18]);
      ctx.fill();
    }

    // Time range text
    const cleanTime = `${block.startTime} → ${block.endTime}`;
    ctx.font = isActive ? "700 21px 'JetBrains Mono', monospace" : "600 20px 'JetBrains Mono', monospace";
    ctx.fillStyle = isActive ? "#fef08a" : isPast ? "rgba(203, 213, 225, 0.85)" : "#94a3b8";
    ctx.fillText(cleanTime, cardPad + 30, cardY + 44);

    // Category Chip
    const cat = (block.category || "work").toLowerCase();
    const catLabel = cat.includes("sleep") ? "Rest" : cat.includes("habit") ? "Vitality" : cat.includes("sync") ? "Sync" : "Deep Focus";
    const chipX = cardPad + 225;
    ctx.font = "600 18px 'Plus Jakarta Sans', sans-serif";
    const chipW = ctx.measureText(catLabel).width + 24;

    ctx.fillStyle = isActive ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.08)";
    ctx.strokeStyle = isActive ? "rgba(245, 158, 11, 0.4)" : "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(chipX, cardY + 20, chipW, 32, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isActive ? "#fde047" : "#e2e8f0";
    ctx.fillText(catLabel, chipX + 12, cardY + 43);

    // Block Title
    ctx.font = isActive ? "700 24px 'Plus Jakarta Sans', sans-serif" : "600 22px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = isActive ? "#ffffff" : isPast ? "#cbd5e1" : "#e2e8f0";
    ctx.fillText(truncateText(ctx, block.title || "Scheduled Focus", cardW - chipX - chipW - 60), chipX + chipW + 25, cardY + 44);

    // Status Icon
    if (block.status === "completed" || isPast) {
      ctx.fillStyle = "#10b981";
      ctx.font = "700 20px sans-serif";
      ctx.fillText("✓", cardPad + cardW - 40, cardY + 44);
    }
  });

  // 7. CADENCE HOBBIES (Adjust dynamically for 1, 2, 3, or 4 user hobbies; omit completely if 0)
  const userHobbies = getDisplayHobbies(data.habits);
  if (data.includeHobbies !== false && userHobbies.length > 0) {
    const hobbiesY = 1470;
    const count = userHobbies.length;

    ctx.font = "700 20px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
    ctx.fillText("CADENCE • HOBBIES & PASSIONS", cardPad + 10, hobbiesY);

    ctx.textAlign = "right";
    ctx.font = "600 18px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(100, 116, 139, 0.8)";
    ctx.fillText(`${count} ACTIVE ${count === 1 ? "TRACK" : "TRACKS"}`, cardPad + cardW - 10, hobbiesY);
    ctx.textAlign = "left";

    const gridY = hobbiesY + 20;
    const gridGap = 16;
    const halfColW = (cardW - gridGap) / 2;
    const cellH = 125;

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

      // Card Box
      ctx.fillStyle = "rgba(19, 21, 29, 0.65)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(hX, hY, cellW, cellH, 20);
      ctx.fill();
      ctx.stroke();

      // Icon & Streak
      ctx.font = "24px sans-serif";
      ctx.fillText(hob.icon, hX + 20, hY + 42);

      // Streak Pill
      ctx.textAlign = "right";
      ctx.font = "700 18px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(`${hob.streak}d 🔥`, hX + cellW - 20, hY + 40);
      ctx.textAlign = "left";

      // Title & Subtitle
      ctx.font = "700 22px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(truncateText(ctx, hob.title, cellW - 40), hX + 20, hY + 76);

      ctx.font = "500 17px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "rgba(148, 163, 184, 0.75)";
      ctx.fillText(hob.sub, hX + 20, hY + 104);
    });
  }

  // 8. BOTTOM SAFE ZONE (y: 1980 to 2340)
  ctx.textAlign = "center";
  ctx.font = "600 20px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.fillText("ODYSSEY CADENCE LOCKSCREEN", width / 2, 2180);

  ctx.font = "400 18px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillText("Swipe up to unlock", width / 2, 2215);

  // iOS Home Bar clearance silhouette
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.beginPath();
  ctx.roundRect((width - 340) / 2, 2280, 340, 8, 4);
  ctx.fill();

  return canvas;
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let str = text;
  while (str.length > 3 && ctx.measureText(str + "…").width > maxW) {
    str = str.slice(0, -1);
  }
  return str + "…";
}

function getRepresentativeBlocks(blocks: ScheduleBlock[], currentHour: number): ScheduleBlock[] {
  if (blocks && blocks.length >= 4) {
    return blocks.slice(0, 7);
  }

  // Fallback realistic daily cadence if user schedule has sparse blocks
  const fallbackCreatedAt = new Date().toISOString();
  return [
    {
      id: "b1",
      userId: "u",
      date: "today",
      startTime: "06:30",
      endTime: "07:45",
      title: "Morning Vitality & Run",
      category: "habits",
      status: currentHour > 7.75 ? "completed" : "pending",
      tag: "Vitality",
      isCommitted: true,
      createdAt: fallbackCreatedAt,
    },
    {
      id: "b2",
      userId: "u",
      date: "today",
      startTime: "08:00",
      endTime: "09:30",
      title: "Deep Focus 1 • Core Build",
      category: "work",
      status: currentHour > 9.5 ? "completed" : "pending",
      tag: "Deep Focus",
      isCommitted: true,
      createdAt: fallbackCreatedAt,
    },
    {
      id: "b3",
      userId: "u",
      date: "today",
      startTime: "09:30",
      endTime: "11:30",
      title: "System Architecture & Specs",
      category: "work",
      status: "pending",
      tag: "Deep Focus",
      isCommitted: true,
      createdAt: fallbackCreatedAt,
    },
    {
      id: "b4",
      userId: "u",
      date: "today",
      startTime: "11:45",
      endTime: "12:45",
      title: "Team Cadence & Review",
      category: "work",
      status: "pending",
      tag: "Sync",
      isCommitted: true,
      createdAt: fallbackCreatedAt,
    },
    {
      id: "b5",
      userId: "u",
      date: "today",
      startTime: "13:00",
      endTime: "14:00",
      title: "Mindful Lunch & Recovery",
      category: "habits",
      status: "pending",
      tag: "Renewal",
      isCommitted: true,
      createdAt: fallbackCreatedAt,
    },
    {
      id: "b6",
      userId: "u",
      date: "today",
      startTime: "14:30",
      endTime: "17:30",
      title: "Feature Implementation & QA",
      category: "work",
      status: "pending",
      tag: "Deep Focus",
      isCommitted: true,
      createdAt: fallbackCreatedAt,
    },
    {
      id: "b7",
      userId: "u",
      date: "today",
      startTime: "22:30",
      endTime: "06:30",
      title: "Obsidian Deep Sleep",
      category: "sleep",
      status: "pending",
      tag: "Rest",
      isCommitted: true,
      createdAt: fallbackCreatedAt,
    },
  ];
}

interface DisplayHobby {
  icon: string;
  title: string;
  streak: number;
  sub: string;
}

function getDisplayHobbies(habits: Habit[]): DisplayHobby[] {
  const iconMap: Record<string, string> = {
    writing: "✍️",
    guitar: "🎸",
    music: "🎵",
    photo: "📷",
    bouldering: "🧗",
    climb: "🧗",
    read: "📖",
    fitness: "🏋️",
    meditation: "🧘",
    code: "💻",
  };

  const results: DisplayHobby[] = [];

  if (habits && habits.length > 0) {
    for (const h of habits.slice(0, 4)) {
      const lower = (h.name || "").toLowerCase();
      let icon = h.icon || "🎯";
      for (const [k, v] of Object.entries(iconMap)) {
        if (lower.includes(k)) {
          icon = v;
          break;
        }
      }
      results.push({
        icon,
        title: h.name,
        streak: h.currentStreak || 1,
        sub: h.category ? `${h.category} • Target active` : "Cadence track",
      });
    }
  }

  return results;
}

export async function downloadWallpaper(data: WallpaperData, filename: string = "odyssey-lockscreen.png"): Promise<void> {
  const canvas = await generateWallpaperCanvas(data);
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function shareWallpaper(data: WallpaperData): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) {
    await downloadWallpaper(data);
    return false;
  }

  try {
    const canvas = await generateWallpaperCanvas(data);
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
            // If share was cancelled or aborted, resolve cleanly
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
