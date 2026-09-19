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

            val cardPad = width * 0.052f
            val cardW = width - cardPad * 2f

            // 3. TOP SAFE ZONE (Top ~34% left 100% clean OLED dark for phone's clock & notifications)
            val topSafeZone = height * 0.34f

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

            // 4. HEADER ANCHOR CARD (Positioned right below clock safe zone)
            val headerY = topSafeZone + height * 0.010f
            val headerH = height * 0.056f
            val cardPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#B813151D")
                style = Paint.Style.FILL
            }
            val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#1FFFFFFF")
                style = Paint.Style.STROKE
                strokeWidth = 1.5f
            }
            val headerRect = RectF(cardPad, headerY, cardPad + cardW, headerY + headerH)
            canvas.drawRoundRect(headerRect, 18f, 18f, cardPaint)
            canvas.drawRoundRect(headerRect, 18f, 18f, borderPaint)

            val headTitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.024f
                color = Color.parseColor("#94A3B8")
            }
            canvas.drawText("ODYSSEY • CH. 0$chapter", cardPad + 22f, headerY + headerH * 0.38f, headTitlePaint)

            // Day Badge Pill
            val dayBadgeText = "DAY $activeDay OF 365"
            val dayBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.020f
                color = Color.parseColor("#34D399")
            }
            val dayBadgeW = dayBadgePaint.measureText(dayBadgeText) + 16f
            val dayBadgeX = cardPad + 22f + headTitlePaint.measureText("ODYSSEY • CH. 0$chapter") + 14f
            val dayBadgeRect = RectF(dayBadgeX, headerY + headerH * 0.16f, dayBadgeX + dayBadgeW, headerY + headerH * 0.44f)
            val dayBadgeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#2610B981") }
            val dayBadgeBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#5510B981")
                style = Paint.Style.STROKE
                strokeWidth = 1f
            }
            canvas.drawRoundRect(dayBadgeRect, 10f, 10f, dayBadgeBg)
            canvas.drawRoundRect(dayBadgeRect, 10f, 10f, dayBadgeBorder)
            canvas.drawText(dayBadgeText, dayBadgeX + 8f, headerY + headerH * 0.36f, dayBadgePaint)

            val rankPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                textSize = width * 0.032f
                color = Color.WHITE
            }
            canvas.drawText("$rankBadge $rankName", cardPad + 22f, headerY + headerH * 0.74f, rankPaint)

            val subRankPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.DEFAULT
                textSize = width * 0.022f
                color = Color.parseColor("#94A3B8")
            }
            canvas.drawText("Level ${String.format("%02d", userLevel)} Cadence", cardPad + 22f + rankPaint.measureText("$rankBadge $rankName ") + 8f, headerY + headerH * 0.74f, subRankPaint)

            // Minimal Streak Count (Replaces the circular progress gauge on the right)
            val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.RIGHT
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.034f
                color = Color.parseColor(if (blinkPhase) "#FBBF24" else "#F59E0B")
            }
            canvas.drawText("$userStreak 🔥", cardPad + cardW - 22f, headerY + headerH * 0.46f, streakPaint)

            val streakLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.RIGHT
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.019f
                color = Color.parseColor("#94A3B8")
            }
            canvas.drawText("DAYS STREAK", cardPad + cardW - 22f, headerY + headerH * 0.74f, streakLabelPaint)

            // 5. TIMELINE HEADER & 24-HOUR CADENCE SPECTRUM BAR
            val specHeaderY = headerY + headerH + height * 0.012f
            val headerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.024f
                color = Color.parseColor("#94A3B8")
            }
            canvas.drawText("SCHEDULE • ACTIVE HOUR CENTERED", cardPad + 10f, specHeaderY, headerPaint)

            // Blinking beacon on the timeline header
            val beaconPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.RIGHT
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.024f
                color = Color.parseColor(if (blinkPhase) "#F59E0B" else "#FBBF24")
            }
            canvas.drawText("● $timeStr ACTIVE", cardPad + cardW - 10f, specHeaderY, beaconPaint)

            val specY = specHeaderY + height * 0.008f
            val specH = height * 0.032f
            val specRect = RectF(cardPad, specY, cardPad + cardW, specY + specH)
            canvas.drawRoundRect(specRect, 14f, 14f, cardPaint)
            canvas.drawRoundRect(specRect, 14f, 14f, borderPaint)

            val stripX = cardPad + 18f
            val stripY = specY + specH * 0.22f
            val stripW = cardW - 36f
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
                    color = Color.parseColor("#4DF59E0B")
                }
                canvas.drawCircle(needleX, stripY + stripH / 2f, 12f, pulseGlowPaint)
            }
            val needlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#F59E0B")
            }
            canvas.drawCircle(needleX, stripY + stripH / 2f, 7.5f, needlePaint)

            // Spectrum labels
            val specLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.MONOSPACE
                textSize = width * 0.020f
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

            // 6. 5-CARD HOURLY SCHEDULE WINDOW (Centered on currentHour)
            val blockCount = 5
            val timelineStartY = specY + specH + height * 0.010f
            val cardHeight = height * 0.038f
            val cardGap = height * 0.005f

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
                    targetHour >= 23 || targetHour < 6 -> if (targetHour == 23) "Wind Down & Sleep" else "Obsidian Rest & Sleep"
                    targetHour in 6..7 -> "Morning Vitality & Priming"
                    targetHour in 12..13 -> "Mindful Recovery & Lunch"
                    targetHour in 17..18 -> "Active Sync & Movement"
                    else -> "Deep Focus Block"
                }

                val cat = matching?.category ?: ""
                val (catLabel, catColor) = getCategoryTheme(cat, targetHour)

                if (isActive) {
                    val activeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.parseColor("#161924")
                    }
                    val activeBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.parseColor(if (blinkPhase) "#FFF59E0B" else "#CCF59E0B")
                        style = Paint.Style.STROKE
                        strokeWidth = if (blinkPhase) 2.8f else 2.2f
                    }
                    canvas.drawRoundRect(cRect, 16f, 16f, activeBg)
                    canvas.drawRoundRect(cRect, 16f, 16f, activeBorder)

                    // Left amber accent bar
                    val accentPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.parseColor("#F59E0B")
                    }
                    canvas.drawRoundRect(RectF(cardPad, cY, cardPad + 6.5f, cY + cardHeight), 16f, 16f, accentPaint)
                } else {
                    val normalBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.parseColor(if (isPast) "#8013151D" else "#B813151D")
                    }
                    canvas.drawRoundRect(cRect, 16f, 16f, normalBg)
                    canvas.drawRoundRect(cRect, 16f, 16f, borderPaint)
                }

                // Left Dot (Blinking for active task)
                val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG)
                if (isActive) {
                    dotPaint.color = Color.parseColor(if (blinkPhase) "#F59E0B" else "#FBBF24")
                    if (blinkPhase) {
                        val dotGlow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                            color = Color.parseColor("#66F59E0B")
                        }
                        canvas.drawCircle(cardPad + 26f, cY + cardHeight / 2f, 9f, dotGlow)
                    }
                    canvas.drawCircle(cardPad + 26f, cY + cardHeight / 2f, 5.5f, dotPaint)
                } else {
                    dotPaint.color = Color.parseColor(if (isPast) "#10B981" else "#475569")
                    canvas.drawCircle(cardPad + 26f, cY + cardHeight / 2f, 4f, dotPaint)
                }

                // Time String
                val timePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    typeface = Typeface.create(Typeface.MONOSPACE, if (isActive) Typeface.BOLD else Typeface.NORMAL)
                    textSize = width * 0.026f
                    color = Color.parseColor(if (isActive) "#FEF08A" else if (isPast) "#94A3B8" else "#E2E8F0")
                }
                val startTime = String.format("%02d:00", targetHour)
                val endTime = String.format("%02d:00", (targetHour + 1) % 24)
                val timeText = "$startTime → $endTime"
                canvas.drawText(timeText, cardPad + 42f, cY + cardHeight * 0.62f, timePaint)

                // Category Pill Badge
                val pillX = cardPad + 42f + timePaint.measureText(timeText) + 16f
                val pillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor(catColor)
                    textSize = width * 0.020f
                    typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                }
                val pillTextW = pillPaint.measureText(catLabel)
                val pillRect = RectF(pillX, cY + cardHeight * 0.32f, pillX + pillTextW + 18f, cY + cardHeight * 0.72f)
                val pillBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor("#26" + catColor.removePrefix("#"))
                }
                val pillBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor("#55" + catColor.removePrefix("#"))
                    style = Paint.Style.STROKE
                    strokeWidth = 1.2f
                }
                canvas.drawRoundRect(pillRect, 8f, 8f, pillBg)
                canvas.drawRoundRect(pillRect, 8f, 8f, pillBorder)
                canvas.drawText(catLabel, pillX + 9f, cY + cardHeight * 0.60f, pillPaint)

                // Right-aligned Title & Status
                val rightTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    textAlign = Paint.Align.RIGHT
                    typeface = Typeface.create(Typeface.SANS_SERIF, if (isActive) Typeface.BOLD else Typeface.NORMAL)
                    textSize = width * 0.027f
                    color = Color.parseColor(if (isActive) "#FFFFFF" else if (isPast) "#94A3B8" else "#CBD5E1")
                }

                // Truncate title if needed
                var displayTitle = title
                val maxTitleW = cardW - (pillX + pillTextW + 30f)
                while (displayTitle.length > 3 && rightTextPaint.measureText("$displayTitle  ✓") > maxTitleW) {
                    displayTitle = displayTitle.dropLast(1)
                }
                if (displayTitle.length < title.length) displayTitle += "…"

                if (isActive) {
                    canvas.drawText("● $displayTitle (NOW)", cardPad + cardW - 20f, cY + cardHeight * 0.62f, rightTextPaint)
                } else if (isPast) {
                    canvas.drawText("$displayTitle  ✓", cardPad + cardW - 20f, cY + cardHeight * 0.62f, rightTextPaint)
                } else {
                    canvas.drawText(displayTitle, cardPad + cardW - 20f, cY + cardHeight * 0.62f, rightTextPaint)
                }
            }

            val timelineEndY = timelineStartY + blockCount * (cardHeight + cardGap)

            // 7. CADENCE HOBBIES & PASSIONS (Full Width if single, 2x2 Grid if multiple)
            var currentY = timelineEndY + height * 0.010f
            if (userHabits.isNotEmpty()) {
                val hobbiesCount = Math.min(4, userHabits.size)
                val hobHeaderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                    textSize = width * 0.022f
                    color = Color.parseColor("#94A3B8")
                }
                val trackWord = if (hobbiesCount == 1) "TRACK" else "TRACKS"
                canvas.drawText("✦ CADENCE • HOBBIES & PASSIONS", cardPad + 10f, currentY + height * 0.012f, hobHeaderPaint)

                val countBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    textAlign = Paint.Align.RIGHT
                    typeface = Typeface.MONOSPACE
                    textSize = width * 0.020f
                    color = Color.parseColor("#64748B")
                }
                canvas.drawText("$hobbiesCount ACTIVE $trackWord", cardPad + cardW - 10f, currentY + height * 0.012f, countBadgePaint)

                val hobStartY = currentY + height * 0.018f
                val hobCardH = height * 0.040f
                val hobGap = 10f

                if (hobbiesCount == 1) {
                    // Single hobby takes full width!
                    val habit = userHabits[0]
                    val hRect = RectF(cardPad, hobStartY, cardPad + cardW, hobStartY + hobCardH)
                    canvas.drawRoundRect(hRect, 16f, 16f, cardPaint)
                    canvas.drawRoundRect(hRect, 16f, 16f, borderPaint)

                    val emoji = resolveEmoji(habit.icon, habit.name)
                    val emojiPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = width * 0.038f }
                    canvas.drawText(emoji, cardPad + 18f, hobStartY + hobCardH * 0.64f, emojiPaint)

                    val hobNamePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                        textSize = width * 0.028f
                        color = Color.WHITE
                    }
                    canvas.drawText(habit.name, cardPad + 66f, hobStartY + hobCardH * 0.44f, hobNamePaint)

                    val hobCatPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        typeface = Typeface.DEFAULT
                        textSize = width * 0.021f
                        color = Color.parseColor("#94A3B8")
                    }
                    canvas.drawText(habit.category.ifEmpty { "Cadence Track" }, cardPad + 66f, hobStartY + hobCardH * 0.78f, hobCatPaint)

                    val streakText = "${habit.streak}d 🔥"
                    val singleStreakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        textAlign = Paint.Align.RIGHT
                        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        textSize = width * 0.025f
                        color = Color.parseColor(if (blinkPhase) "#FBBF24" else "#F59E0B")
                    }
                    canvas.drawText(streakText, cardPad + cardW - 20f, hobStartY + hobCardH * 0.60f, singleStreakPaint)
                } else {
                    val hobCardW = (cardW - hobGap) / 2f
                    for (idx in 0 until hobbiesCount) {
                        val habit = userHabits[idx]
                        val row = idx / 2
                        val col = idx % 2
                        val hX = cardPad + col * (hobCardW + hobGap)
                        val hY = hobStartY + row * (hobCardH + hobGap)

                        val hRect = RectF(hX, hY, hX + hobCardW, hY + hobCardH)
                        canvas.drawRoundRect(hRect, 14f, 14f, cardPaint)
                        canvas.drawRoundRect(hRect, 14f, 14f, borderPaint)

                        // Emoji
                        val emoji = resolveEmoji(habit.icon, habit.name)
                        val emojiPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                            textSize = width * 0.034f
                        }
                        canvas.drawText(emoji, hX + 12f, hY + hobCardH * 0.52f, emojiPaint)

                        // Streak Flame Pill
                        val streakText = "${habit.streak}d 🔥"
                        val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                            textAlign = Paint.Align.RIGHT
                            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                            textSize = width * 0.019f
                            color = Color.parseColor(if (blinkPhase) "#FBBF24" else "#F59E0B")
                        }
                        canvas.drawText(streakText, hX + hobCardW - 10f, hY + hobCardH * 0.40f, streakPaint)

                        // Name
                        val hobNamePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                            textSize = width * 0.024f
                            color = Color.WHITE
                        }
                        var hDisplayName = habit.name
                        while (hDisplayName.length > 3 && hobNamePaint.measureText(hDisplayName) > hobCardW - 40f) {
                            hDisplayName = hDisplayName.dropLast(1)
                        }
                        if (hDisplayName.length < habit.name.length) hDisplayName += "…"
                        canvas.drawText(hDisplayName, hX + 12f, hY + hobCardH * 0.82f, hobNamePaint)
                    }
                }
            }

            // 8. BOTTOM SAFE FOOTNOTE (Clean space for in-display fingerprint sensor & camera/flashlight)
            val footPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.CENTER
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
                textSize = width * 0.022f
                color = Color.parseColor("#33FFFFFF")
            }
            canvas.drawText("ODYSSEY LIVE CADENCE • REAL-TIME", width / 2f, height * 0.955f, footPaint)
        }
    }
}
