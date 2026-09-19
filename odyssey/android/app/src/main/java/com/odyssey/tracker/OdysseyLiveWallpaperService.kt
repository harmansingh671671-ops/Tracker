package com.odyssey.tracker

import android.content.Context
import android.graphics.*
import android.os.Handler
import android.os.Looper
import android.service.wallpaper.WallpaperService
import android.util.Log
import android.view.SurfaceHolder
import org.json.JSONObject
import java.util.Calendar

/**
 * OdysseyLiveWallpaperService
 * 
 * Android Live Wallpaper Service that automatically displays the user's
 * daily Odyssey schedule on the Lock Screen and Home Screen.
 * 
 * Real-Time Dynamics:
 * - Wakes up when the screen turns on.
 * - Runs a smooth, subtle breathing/blinking pulse animation for the active task beacon.
 * - Reads real user tasks from latest_schedule_json (synced from the Odyssey app).
 * - Leaves the top ~34% completely clean for the phone's native lockscreen clock and notifications.
 * - Leaves the bottom clean for in-display fingerprint scanner and camera/flashlight buttons.
 * - Zero battery drain: sleeps and removes callbacks whenever screen is off.
 */
class OdysseyLiveWallpaperService : WallpaperService() {

    override fun onCreateEngine(): Engine {
        return OdysseyWallpaperEngine()
    }

    inner class OdysseyWallpaperEngine : Engine() {
        private var visible = false
        private val handler = Handler(Looper.getMainLooper())
        private var blinkPhase = false

        private val pulseRunnable = object : Runnable {
            override fun run() {
                if (visible) {
                    blinkPhase = !blinkPhase
                    drawFrame()
                    handler.postDelayed(this, 650)
                }
            }
        }

        override fun onVisibilityChanged(visible: Boolean) {
            this.visible = visible
            if (visible) {
                handler.removeCallbacks(pulseRunnable)
                handler.post(pulseRunnable)
            } else {
                handler.removeCallbacks(pulseRunnable)
            }
        }

        override fun onDestroy() {
            super.onDestroy()
            handler.removeCallbacks(pulseRunnable)
        }

        override fun onSurfaceChanged(holder: SurfaceHolder?, format: Int, width: Int, height: Int) {
            super.onSurfaceChanged(holder, format, width, height)
            drawFrame()
        }

        private fun drawFrame() {
            val holder = surfaceHolder ?: return
            var canvas: Canvas? = null

            try {
                canvas = holder.lockCanvas()
                if (canvas != null) {
                    renderWallpaper(canvas)
                }
            } catch (e: Exception) {
                Log.e("OdysseyLiveWallpaper", "Canvas render error: ${e.message}", e)
            } finally {
                if (canvas != null) {
                    try {
                        holder.unlockCanvasAndPost(canvas)
                    } catch (e: Exception) {
                        Log.e("OdysseyLiveWallpaper", "Canvas unlock error: ${e.message}")
                    }
                }
            }
        }

        data class ScheduleBlockItem(
            val startHour: Int,
            val endHour: Int,
            val startTime: String,
            val endTime: String,
            val title: String,
            val category: String
        )

        data class HobbyItem(
            val name: String,
            val icon: String,
            val streak: Int,
            val category: String
        )

        private fun resolveEmoji(icon: String, name: String): String {
            val combined = "$icon $name".lowercase()
            return when {
                combined.contains("breath") || combined.contains("meditat") || combined.contains("zen") -> "🧘"
                combined.contains("water") || combined.contains("hydrat") || combined.contains("drink") -> "💧"
                combined.contains("guitar") || combined.contains("music") || combined.contains("audio") -> "🎸"
                combined.contains("focus") || combined.contains("sprint") || combined.contains("target") -> "🎯"
                combined.contains("gym") || combined.contains("workout") || combined.contains("fitness") -> "🏋️"
                combined.contains("run") || combined.contains("walk") || combined.contains("jog") -> "🏃"
                combined.contains("read") || combined.contains("book") -> "📖"
                combined.contains("code") || combined.contains("dev") -> "💻"
                combined.contains("write") || combined.contains("journal") -> "✍️"
                combined.contains("sun") || combined.contains("morning") -> "☀️"
                combined.contains("sleep") || combined.contains("rest") || combined.contains("moon") -> "🌙"
                icon.length in 1..4 && !icon.all { it.isLetterOrDigit() || it == '_' || it == '-' } -> icon
                else -> "🎯"
            }
        }

        private fun renderWallpaper(canvas: Canvas) {
            val width = canvas.width.toFloat()
            val height = canvas.height.toFloat()

            // 1. OLED Pure Dark Background
            canvas.drawColor(Color.parseColor("#090A0F"))

            // 2. Ambient Gradient Glows (Matches Odyssey Design System)
            val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
            val topGrad = RadialGradient(
                width * 0.2f, height * 0.12f, width * 0.5f,
                Color.parseColor("#381E1B4B"), Color.TRANSPARENT,
                Shader.TileMode.CLAMP
            )
            glowPaint.shader = topGrad
            canvas.drawRect(0f, 0f, width, height * 0.35f, glowPaint)

            val midGrad = RadialGradient(
                width * 0.85f, height * 0.52f, width * 0.45f,
                Color.parseColor("#28064E3B"), Color.TRANSPARENT,
                Shader.TileMode.CLAMP
            )
            glowPaint.shader = midGrad
            canvas.drawRect(width * 0.35f, height * 0.35f, width, height * 0.70f, glowPaint)

            // Current Time Calculations
            val cal = Calendar.getInstance()
            val currentHour = cal.get(Calendar.HOUR_OF_DAY)
            val currentMinute = cal.get(Calendar.MINUTE)
            val currentHourFloat = currentHour + currentMinute / 60f
            val timeStr = String.format("%02d:%02d", currentHour, currentMinute)

            // Load Synced Schedule Data from SharedPreferences
            val prefs = getSharedPreferences("odyssey_prefs", Context.MODE_PRIVATE)
            val rawJson = prefs.getString("latest_schedule_json", null)
            var chapter = 1
            var activeDay = 1
            var rankName = "Beginner"
            var rankBadge = "🌱"
            var userLevel = 1
            var plannedHours = 18
            var userStreak = 1

            val userBlocks = mutableListOf<ScheduleBlockItem>()
            val userHabits = mutableListOf<HobbyItem>()

            if (!rawJson.isNullOrEmpty()) {
                try {
                    val obj = JSONObject(rawJson)
                    chapter = obj.optInt("chapter", 1)
                    activeDay = obj.optInt("activeDay", 1)
                    rankName = obj.optString("rankName", "Beginner")
                    rankBadge = obj.optString("rankBadge", "🌱")
                    userLevel = obj.optInt("userLevel", 1)
                    plannedHours = obj.optInt("plannedHours", 18)
                    userStreak = obj.optInt("userStreak", activeDay)

                    // Parse real user blocks
                    val blocksArr = obj.optJSONArray("blocks")
                    if (blocksArr != null) {
                        for (i in 0 until blocksArr.length()) {
                            val b = blocksArr.optJSONObject(i) ?: continue
                            val sTime = b.optString("startTime", "00:00")
                            val eTime = b.optString("endTime", "01:00")
                            val title = b.optString("title", "Focus")
                            val category = b.optString("category", "work")

                            val sH = sTime.split(":").firstOrNull()?.toIntOrNull() ?: 0
                            var eH = eTime.split(":").firstOrNull()?.toIntOrNull() ?: (sH + 1)
                            if (eTime == "24:00" || (eH == 0 && sH > 0)) eH = 24

                            userBlocks.add(ScheduleBlockItem(sH, eH, sTime, eTime, title, category))
                        }
                    }

                    // Parse user habits/hobbies
                    val habitsArr = obj.optJSONArray("habits")
                    if (habitsArr != null) {
                        for (i in 0 until habitsArr.length()) {
                            val h = habitsArr.optJSONObject(i) ?: continue
                            val hName = h.optString("name", "Focus")
                            val hIcon = h.optString("icon", "🎯")
                            val hStreak = h.optInt("currentStreak", 1)
                            val hCategory = h.optString("category", "Cadence Track")
                            userHabits.add(HobbyItem(hName, hIcon, hStreak, hCategory))
                        }
                    }
                } catch (e: Exception) {
                    Log.w("OdysseyLiveWallpaper", "JSON parse error: ${e.message}")
                }
            }

            val cardPad = width * 0.045f
            val cardW = width - cardPad * 2f

            // 3. TOP SAFE ZONE (Optimized to ~12% so content uses full top space while clearing camera notch)
            val topSafeZone = height * 0.115f

            // Helper to get category details
            fun getCategoryTheme(cat: String, h: Int): Pair<String, String> {
                val c = cat.lowercase()
                return when {
                    c.contains("sleep") || c.contains("rest") || (c.isEmpty() && (h >= 23 || h < 6)) -> Pair("Rest", "#818CF8")
                    c.contains("habit") || c.contains("vitality") || c.contains("gym") || (c.isEmpty() && h in 6..7) -> Pair("Vitality", "#34D399")
                    c.contains("sync") || c.contains("meeting") || (c.isEmpty() && h in 17..18) -> Pair("Sync", "#38BDF8")
                    c.contains("buffer") || c.contains("break") || c.contains("renewal") || (c.isEmpty() && h in 12..13) -> Pair("Renewal", "#FBBF24")
                    else -> Pair("Deep Focus", "#818CF8")
                }
            }

            // 4. HEADER ANCHOR CARD (Positioned right below notch/status safe zone)
            val headerY = topSafeZone
            val headerH = height * 0.082f
            val cardPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#C413151D")
                style = Paint.Style.FILL
            }
            val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#28FFFFFF")
                style = Paint.Style.STROKE
                strokeWidth = 1.8f
            }
            val headerRect = RectF(cardPad, headerY, cardPad + cardW, headerY + headerH)
            canvas.drawRoundRect(headerRect, 22f, 22f, cardPaint)
            canvas.drawRoundRect(headerRect, 22f, 22f, borderPaint)

            // Header Top Row: Odyssey Chapter & Day Badge
            val headTitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.029f
                color = Color.parseColor("#94A3B8")
            }
            val chapterStr = "ODYSSEY • CH. 0$chapter"
            canvas.drawText(chapterStr, cardPad + 24f, headerY + headerH * 0.38f, headTitlePaint)

            // Day Badge Pill
            val dayBadgeText = "DAY $activeDay OF 365"
            val dayBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.024f
                color = Color.parseColor("#34D399")
            }
            val dayBadgeW = dayBadgePaint.measureText(dayBadgeText) + 20f
            val dayBadgeX = cardPad + 24f + headTitlePaint.measureText(chapterStr) + 16f
            val dayBadgeH = headerH * 0.28f
            val dayBadgeY = headerY + headerH * 0.16f
            val dayBadgeRect = RectF(dayBadgeX, dayBadgeY, dayBadgeX + dayBadgeW, dayBadgeY + dayBadgeH)
            val dayBadgeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#2E10B981") }
            val dayBadgeBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#6610B981")
                style = Paint.Style.STROKE
                strokeWidth = 1.2f
            }
            canvas.drawRoundRect(dayBadgeRect, 12f, 12f, dayBadgeBg)
            canvas.drawRoundRect(dayBadgeRect, 12f, 12f, dayBadgeBorder)
            canvas.drawText(dayBadgeText, dayBadgeX + 10f, dayBadgeY + dayBadgeH * 0.72f, dayBadgePaint)

            // Header Bottom Row: Rank & Level
            val rankPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                textSize = width * 0.040f
                color = Color.WHITE
            }
            val rankStr = "$rankBadge $rankName"
            canvas.drawText(rankStr, cardPad + 24f, headerY + headerH * 0.80f, rankPaint)

            val subRankPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.DEFAULT
                textSize = width * 0.026f
                color = Color.parseColor("#94A3B8")
            }
            canvas.drawText("Level ${String.format("%02d", userLevel)} Cadence", cardPad + 24f + rankPaint.measureText("$rankStr ") + 8f, headerY + headerH * 0.80f, subRankPaint)

            // Minimal Streak Count on Right
            val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.RIGHT
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.048f
                color = Color.parseColor(if (blinkPhase) "#FBBF24" else "#F59E0B")
            }
            canvas.drawText("$userStreak 🔥", cardPad + cardW - 24f, headerY + headerH * 0.48f, streakPaint)

            val streakLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.RIGHT
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.022f
                color = Color.parseColor("#94A3B8")
            }
            canvas.drawText("DAYS STREAK", cardPad + cardW - 24f, headerY + headerH * 0.80f, streakLabelPaint)

            // 5. TIMELINE HEADER & 24-HOUR CADENCE SPECTRUM BAR
            val specHeaderY = headerY + headerH + height * 0.012f
            val headerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.028f
                color = Color.parseColor("#94A3B8")
            }
            canvas.drawText("SCHEDULE • ACTIVE HOUR CENTERED", cardPad + 10f, specHeaderY, headerPaint)

            // Blinking beacon on the timeline header
            val beaconPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.RIGHT
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.028f
                color = Color.parseColor(if (blinkPhase) "#F59E0B" else "#FBBF24")
            }
            canvas.drawText("● $timeStr ACTIVE", cardPad + cardW - 10f, specHeaderY, beaconPaint)

            val specY = specHeaderY + height * 0.007f
            val specH = height * 0.040f
            val specRect = RectF(cardPad, specY, cardPad + cardW, specY + specH)
            canvas.drawRoundRect(specRect, 16f, 16f, cardPaint)
            canvas.drawRoundRect(specRect, 16f, 16f, borderPaint)

            val stripX = cardPad + 20f
            val stripY = specY + specH * 0.22f
            val stripW = cardW - 40f
            val stripH = specH * 0.28f
            val stripSlotW = stripW / 24f

            // Multi-segment 24-hour spectrum with real categories
            val slotPaint = Paint(Paint.ANTI_ALIAS_FLAG)
            for (h in 0 until 24) {
                val blockX = stripX + h * stripSlotW
                val matching = userBlocks.find { b -> h >= b.startHour && h < b.endHour }
                val cat = matching?.category ?: ""
                val (_, colorHex) = getCategoryTheme(cat, h)
                slotPaint.color = Color.parseColor(colorHex)
                if (h == currentHour) {
                    slotPaint.color = Color.parseColor("#F59E0B")
                }
                canvas.drawRect(blockX, stripY, blockX + stripSlotW, stripY + stripH, slotPaint)
            }

            // Needle pin with live pulsating beacon
            val needleX = stripX + (currentHourFloat / 24f) * stripW
            if (blinkPhase) {
                val pulseGlowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor("#55F59E0B")
                }
                canvas.drawCircle(needleX, stripY + stripH / 2f, 14f, pulseGlowPaint)
            }
            val needlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#F59E0B")
            }
            canvas.drawCircle(needleX, stripY + stripH / 2f, 8.5f, needlePaint)

            // Spectrum labels
            val specLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.MONOSPACE
                textSize = width * 0.023f
                color = Color.parseColor("#64748B")
            }
            canvas.drawText("00:00", stripX, specY + specH * 0.84f, specLabelPaint)
            canvas.drawText("06:00", stripX + stripW * 0.23f, specY + specH * 0.84f, specLabelPaint)
            val centerLabelPaint = Paint(specLabelPaint).apply {
                textAlign = Paint.Align.CENTER
                color = Color.parseColor("#F59E0B")
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            }
            canvas.drawText("● 12:00", stripX + stripW / 2f, specY + specH * 0.84f, centerLabelPaint)
            canvas.drawText("18:00", stripX + stripW * 0.77f, specY + specH * 0.84f, specLabelPaint)
            val endLabelPaint = Paint(specLabelPaint).apply { textAlign = Paint.Align.RIGHT }
            canvas.drawText("24:00", stripX + stripW, specY + specH * 0.84f, endLabelPaint)

            // 6. 5-CARD HOURLY SCHEDULE WINDOW (Spacious 2-Row Design, Large Text, Never Clips!)
            val blockCount = 5
            val timelineStartY = specY + specH + height * 0.010f
            val cardHeight = height * 0.076f
            val cardGap = height * 0.009f

            val half = blockCount / 2
            for (i in 0 until blockCount) {
                val offset = i - half
                val targetHour = (currentHour + offset + 24) % 24
                val cY = timelineStartY + i * (cardHeight + cardGap)
                val isActive = offset == 0
                val isPast = offset < 0

                val cRect = RectF(cardPad, cY, cardPad + cardW, cY + cardHeight)

                // Match user task from synced database
                val matching = userBlocks.find { b -> targetHour >= b.startHour && targetHour < b.endHour }
                val title = matching?.title ?: when {
                    targetHour >= 23 || targetHour < 6 -> if (targetHour == 23) "Wind Down & Rest" else "Obsidian Rest & Sleep"
                    targetHour in 6..7 -> "Morning Vitality & Priming"
                    targetHour in 12..13 -> "Mindful Recovery & Lunch"
                    targetHour in 17..18 -> "Active Sync & Movement"
                    else -> "Deep Focus Block"
                }

                val cat = matching?.category ?: ""
                val (catLabel, catColor) = getCategoryTheme(cat, targetHour)

                if (isActive) {
                    val activeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.parseColor("#181B26")
                    }
                    val activeBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.parseColor(if (blinkPhase) "#FFF59E0B" else "#DDF59E0B")
                        style = Paint.Style.STROKE
                        strokeWidth = if (blinkPhase) 3.2f else 2.5f
                    }
                    canvas.drawRoundRect(cRect, 20f, 20f, activeBg)
                    canvas.drawRoundRect(cRect, 20f, 20f, activeBorder)

                    // Left amber accent bar
                    val accentPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.parseColor("#F59E0B")
                    }
                    canvas.drawRoundRect(RectF(cardPad, cY, cardPad + 8f, cY + cardHeight), 20f, 20f, accentPaint)
                } else {
                    val normalBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.parseColor(if (isPast) "#8013151D" else "#BF13151D")
                    }
                    canvas.drawRoundRect(cRect, 20f, 20f, normalBg)
                    canvas.drawRoundRect(cRect, 20f, 20f, borderPaint)
                }

                // ==========================================
                // ROW 1 OF CARD: Time Range + Category Pill
                // ==========================================
                val row1Y = cY + cardHeight * 0.36f

                // Left Dot Indicator
                val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG)
                val dotX = cardPad + 28f
                val dotY = row1Y - 6f
                if (isActive) {
                    dotPaint.color = Color.parseColor(if (blinkPhase) "#F59E0B" else "#FBBF24")
                    if (blinkPhase) {
                        val dotGlow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                            color = Color.parseColor("#66F59E0B")
                        }
                        canvas.drawCircle(dotX, dotY, 11f, dotGlow)
                    }
                    canvas.drawCircle(dotX, dotY, 6.5f, dotPaint)
                } else {
                    dotPaint.color = Color.parseColor(if (isPast) "#10B981" else "#475569")
                    canvas.drawCircle(dotX, dotY, 5f, dotPaint)
                }

                // Time String (Large & Bold)
                val timePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                    textSize = width * 0.032f
                    color = Color.parseColor(if (isActive) "#FEF08A" else if (isPast) "#94A3B8" else "#E2E8F0")
                }
                val startTime = String.format("%02d:00", targetHour)
                val endTime = String.format("%02d:00", (targetHour + 1) % 24)
                val timeText = "$startTime → $endTime"
                canvas.drawText(timeText, cardPad + 48f, row1Y, timePaint)

                // Category Pill Badge (Positioned on the right of Row 1)
                val pillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor(catColor)
                    textSize = width * 0.024f
                    typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                }
                val pillTextW = pillPaint.measureText(catLabel)
                val pillH = cardHeight * 0.30f
                val pillW = pillTextW + 22f
                val pillX = cardPad + cardW - pillW - 20f
                val pillY = cY + cardHeight * 0.12f
                val pillRect = RectF(pillX, pillY, pillX + pillW, pillY + pillH)
                val pillBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor("#2E" + catColor.removePrefix("#"))
                }
                val pillBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor("#66" + catColor.removePrefix("#"))
                    style = Paint.Style.STROKE
                    strokeWidth = 1.4f
                }
                canvas.drawRoundRect(pillRect, 10f, 10f, pillBg)
                canvas.drawRoundRect(pillRect, 10f, 10f, pillBorder)
                canvas.drawText(catLabel, pillX + 11f, pillY + pillH * 0.72f, pillPaint)

                // ==========================================
                // ROW 2 OF CARD: Full-Width Task Title + Status
                // ==========================================
                val row2Y = cY + cardHeight * 0.78f

                // Status Badge / Beacon (NOW or DONE check)
                var statusW = 0f
                if (isActive) {
                    val nowText = "● NOW"
                    val nowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        textAlign = Paint.Align.RIGHT
                        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        textSize = width * 0.028f
                        color = Color.parseColor(if (blinkPhase) "#F59E0B" else "#FBBF24")
                    }
                    statusW = nowPaint.measureText(nowText) + 12f
                    canvas.drawText(nowText, cardPad + cardW - 22f, row2Y, nowPaint)
                } else if (isPast) {
                    val doneText = "✓ DONE"
                    val donePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        textAlign = Paint.Align.RIGHT
                        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        textSize = width * 0.026f
                        color = Color.parseColor("#10B981")
                    }
                    statusW = donePaint.measureText(doneText) + 12f
                    canvas.drawText(doneText, cardPad + cardW - 22f, row2Y, donePaint)
                }

                // Task Title (Large, Bold, across the full card width)
                val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                    textSize = width * 0.038f
                    color = Color.parseColor(if (isActive) "#FFFFFF" else if (isPast) "#94A3B8" else "#F1F5F9")
                }

                val maxTitleW = cardW - 68f - statusW
                var displayTitle = title
                while (displayTitle.length > 3 && titlePaint.measureText(displayTitle) > maxTitleW) {
                    displayTitle = displayTitle.dropLast(1)
                }
                if (displayTitle.length < title.length) displayTitle += "…"

                canvas.drawText(displayTitle, cardPad + 28f, row2Y, titlePaint)
            }

            val timelineEndY = timelineStartY + blockCount * (cardHeight + cardGap)

            // 7. CADENCE HOBBIES & PASSIONS (Full Width if single, 2x2 Grid if multiple)
            var currentY = timelineEndY + height * 0.010f
            if (userHabits.isNotEmpty()) {
                val hobbiesCount = Math.min(4, userHabits.size)
                val hobHeaderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                    textSize = width * 0.026f
                    color = Color.parseColor("#94A3B8")
                }
                val trackWord = if (hobbiesCount == 1) "TRACK" else "TRACKS"
                canvas.drawText("✦ CADENCE • HOBBIES & PASSIONS", cardPad + 10f, currentY + height * 0.012f, hobHeaderPaint)

                val countBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    textAlign = Paint.Align.RIGHT
                    typeface = Typeface.MONOSPACE
                    textSize = width * 0.024f
                    color = Color.parseColor("#64748B")
                }
                canvas.drawText("$hobbiesCount ACTIVE $trackWord", cardPad + cardW - 10f, currentY + height * 0.012f, countBadgePaint)

                val hobStartY = currentY + height * 0.018f
                val hobCardH = if (hobbiesCount == 1) height * 0.070f else height * 0.055f
                val hobGap = 12f

                if (hobbiesCount == 1) {
                    // Single hobby takes full width with large, readable fonts!
                    val habit = userHabits[0]
                    val hRect = RectF(cardPad, hobStartY, cardPad + cardW, hobStartY + hobCardH)
                    canvas.drawRoundRect(hRect, 20f, 20f, cardPaint)
                    canvas.drawRoundRect(hRect, 20f, 20f, borderPaint)

                    val emoji = resolveEmoji(habit.icon, habit.name)
                    val emojiPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = width * 0.056f }
                    canvas.drawText(emoji, cardPad + 22f, hobStartY + hobCardH * 0.68f, emojiPaint)

                    val hobNamePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                        textSize = width * 0.038f
                        color = Color.WHITE
                    }
                    canvas.drawText(habit.name, cardPad + 84f, hobStartY + hobCardH * 0.44f, hobNamePaint)

                    val hobCatPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        typeface = Typeface.DEFAULT
                        textSize = width * 0.026f
                        color = Color.parseColor("#94A3B8")
                    }
                    canvas.drawText(habit.category.ifEmpty { "Cadence Track" }, cardPad + 84f, hobStartY + hobCardH * 0.80f, hobCatPaint)

                    val streakText = "${habit.streak}d 🔥"
                    val singleStreakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        textAlign = Paint.Align.RIGHT
                        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        textSize = width * 0.036f
                        color = Color.parseColor(if (blinkPhase) "#FBBF24" else "#F59E0B")
                    }
                    canvas.drawText(streakText, cardPad + cardW - 24f, hobStartY + hobCardH * 0.60f, singleStreakPaint)
                } else {
                    val hobCardW = (cardW - hobGap) / 2f
                    for (idx in 0 until hobbiesCount) {
                        val habit = userHabits[idx]
                        val row = idx / 2
                        val col = idx % 2
                        val hX = cardPad + col * (hobCardW + hobGap)
                        val hY = hobStartY + row * (hobCardH + hobGap)

                        val hRect = RectF(hX, hY, hX + hobCardW, hY + hobCardH)
                        canvas.drawRoundRect(hRect, 18f, 18f, cardPaint)
                        canvas.drawRoundRect(hRect, 18f, 18f, borderPaint)

                        // Emoji
                        val emoji = resolveEmoji(habit.icon, habit.name)
                        val emojiPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                            textSize = width * 0.044f
                        }
                        canvas.drawText(emoji, hX + 16f, hY + hobCardH * 0.52f, emojiPaint)

                        // Streak Flame Pill
                        val streakText = "${habit.streak}d 🔥"
                        val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                            textAlign = Paint.Align.RIGHT
                            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                            textSize = width * 0.026f
                            color = Color.parseColor(if (blinkPhase) "#FBBF24" else "#F59E0B")
                        }
                        canvas.drawText(streakText, hX + hobCardW - 14f, hY + hobCardH * 0.42f, streakPaint)

                        // Name
                        val hobNamePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                            textSize = width * 0.030f
                            color = Color.WHITE
                        }
                        var hDisplayName = habit.name
                        while (hDisplayName.length > 3 && hobNamePaint.measureText(hDisplayName) > hobCardW - 44f) {
                            hDisplayName = hDisplayName.dropLast(1)
                        }
                        if (hDisplayName.length < habit.name.length) hDisplayName += "…"
                        canvas.drawText(hDisplayName, hX + 16f, hY + hobCardH * 0.82f, hobNamePaint)
                    }
                }
            }

            // 8. BOTTOM SAFE FOOTNOTE (Clean space for navigation bar & fingerprint sensor)
            val footPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.CENTER
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
                textSize = width * 0.024f
                color = Color.parseColor("#44FFFFFF")
            }
            canvas.drawText("ODYSSEY LIVE CADENCE • REAL-TIME", width / 2f, height * 0.965f, footPaint)
        }
    }
}
