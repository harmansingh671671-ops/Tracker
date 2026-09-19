package com.odyssey.tracker

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.WallpaperManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.os.Build
import android.util.Log
import org.json.JSONObject
import java.util.Calendar

/**
 * OdysseyHourlyWallpaperWorker
 * 
 * Android background receiver that triggers at the start of every hour (:00:00).
 * It calculates the active hour, parses the real user tasks and habits from latest_schedule_json,
 * renders the rich dynamic adaptive lockscreen canvas, and applies the wallpaper directly
 * via WallpaperManager.FLAG_LOCK.
 */
class OdysseyHourlyWallpaperWorker : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Hourly wallpaper alarm triggered! Refreshing lockscreen...")

        val pendingResult = goAsync()
        Thread {
            try {
                updateLockscreenWallpaper(context)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to update hourly wallpaper: ${e.message}", e)
            } finally {
                scheduleNextHourlyUpdate(context)
                pendingResult.finish()
            }
        }.start()
    }

    private fun updateLockscreenWallpaper(context: Context) {
        val wallpaperManager = WallpaperManager.getInstance(context)
        val prefs = context.getSharedPreferences("odyssey_prefs", Context.MODE_PRIVATE)
        val rawJson = prefs.getString("latest_schedule_json", null) ?: return

        val width = 1080
        val height = 2340
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        renderAdaptiveCanvas(canvas, width, height, rawJson)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK or WallpaperManager.FLAG_SYSTEM)
        } else {
            wallpaperManager.setBitmap(bitmap)
        }

        prefs.edit().putLong("last_auto_update_time", System.currentTimeMillis()).apply()
        Log.d(TAG, "Successfully refreshed lockscreen wallpaper for current hour!")
    }

    data class BlockItem(
        val startHour: Int,
        val endHour: Int,
        val startTime: String,
        val endTime: String,
        val title: String,
        val category: String
    )

    data class HabitItem(
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

    private fun renderAdaptiveCanvas(canvas: Canvas, width: Int, height: Int, rawJson: String) {
        val json = try { JSONObject(rawJson) } catch (e: Exception) { JSONObject() }
        val chapter = json.optInt("chapter", 1)
        val activeDay = json.optInt("activeDay", 1)
        val rankBadge = json.optString("rankBadge", "🌱")
        val rankName = json.optString("rankName", "Beginner")
        val userLevel = json.optInt("userLevel", 1)
        val plannedHours = json.optInt("plannedHours", 18)

        // Parse user blocks
        val userBlocks = mutableListOf<BlockItem>()
        val blocksArr = json.optJSONArray("blocks")
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

                userBlocks.add(BlockItem(sH, eH, sTime, eTime, title, category))
            }
        }

        // Parse user habits/hobbies
        val userHabits = mutableListOf<HabitItem>()
        val habitsArr = json.optJSONArray("habits")
        if (habitsArr != null) {
            for (i in 0 until habitsArr.length()) {
                val h = habitsArr.optJSONObject(i) ?: continue
                val hName = h.optString("name", "Focus")
                val hIcon = h.optString("icon", "🎯")
                val hStreak = h.optInt("currentStreak", 1)
                val hCategory = h.optString("category", "Cadence Track")
                userHabits.add(HabitItem(hName, hIcon, hStreak, hCategory))
            }
        }

        val cal = Calendar.getInstance()
        val currentHour = cal.get(Calendar.HOUR_OF_DAY)
        val currentMinute = cal.get(Calendar.MINUTE)
        val currentHourFloat = currentHour + currentMinute / 60f
        val timeStr = String.format("%02d:%02d", currentHour, currentMinute)

        // 1. OLED Pure Dark Background
        canvas.drawColor(Color.parseColor("#090A0F"))

        // 2. Ambient Gradient Glows
        val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        val topGrad = RadialGradient(
            width * 0.2f, height * 0.12f, width * 0.5f,
            Color.parseColor("#381E1B4B"), Color.TRANSPARENT,
            Shader.TileMode.CLAMP
        )
        glowPaint.shader = topGrad
        canvas.drawRect(0f, 0f, width.toFloat(), height * 0.35f, glowPaint)

        val midGrad = RadialGradient(
            width * 0.85f, height * 0.52f, width * 0.45f,
            Color.parseColor("#28064E3B"), Color.TRANSPARENT,
            Shader.TileMode.CLAMP
        )
        glowPaint.shader = midGrad
        canvas.drawRect(width * 0.35f, height * 0.35f, width.toFloat(), height * 0.70f, glowPaint)

        val cardPad = width * 0.045f
        val cardW = width - cardPad * 2f

        // 3. TOP SAFE ZONE (Optimized to ~11.5% so content uses full top space while clearing camera notch)
        val topSafeZone = height * 0.115f

        val cardBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#C413151D")
            style = Paint.Style.FILL
        }
        val cardBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#28FFFFFF")
            style = Paint.Style.STROKE
            strokeWidth = 1.8f
        }

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

        val streak = json.optInt("userStreak", json.optInt("activeDay", 1))

        // 4. Header Card (Positioned right below top clock/notch safe zone)
        val headerY = topSafeZone
        val headerH = height * 0.082f
        val headerRect = RectF(cardPad, headerY, cardPad + cardW, headerY + headerH)
        canvas.drawRoundRect(headerRect, 22f, 22f, cardBgPaint)
        canvas.drawRoundRect(headerRect, 22f, 22f, cardBorderPaint)

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

        // Minimal Streak Count (Replaces the circular progress gauge on the right)
        val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.RIGHT
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.048f
            color = Color.parseColor("#FBBF24")
        }
        canvas.drawText("$streak 🔥", cardPad + cardW - 24f, headerY + headerH * 0.48f, streakPaint)

        val streakLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.RIGHT
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.022f
            color = Color.parseColor("#94A3B8")
        }
        canvas.drawText("DAYS STREAK", cardPad + cardW - 24f, headerY + headerH * 0.80f, streakLabelPaint)

        // 5. Spectrum Bar & Header
        val specHeaderY = headerY + headerH + height * 0.012f
        val headPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.028f
            color = Color.parseColor("#94A3B8")
        }
        canvas.drawText("SCHEDULE • ACTIVE HOUR CENTERED", cardPad + 10f, specHeaderY, headPaint)

        val activeTimePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.RIGHT
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.028f
            color = Color.parseColor("#F59E0B")
        }
        canvas.drawText("● $timeStr ACTIVE", cardPad + cardW - 10f, specHeaderY, activeTimePaint)

        val specY = specHeaderY + height * 0.007f
        val specH = height * 0.040f
        val specRect = RectF(cardPad, specY, cardPad + cardW, specY + specH)
        canvas.drawRoundRect(specRect, 16f, 16f, cardBgPaint)
        canvas.drawRoundRect(specRect, 16f, 16f, cardBorderPaint)

        val stripX = cardPad + 20f
        val stripY = specY + specH * 0.22f
        val stripW = cardW - 40f
        val stripH = specH * 0.28f
        val slotW = stripW / 24f

        val segPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        for (h in 0 until 24) {
            val matching = userBlocks.find { b -> h >= b.startHour && h < b.endHour }
            val cat = matching?.category ?: ""
            val (_, colorHex) = getCategoryTheme(cat, h)
            segPaint.color = Color.parseColor(colorHex)
            if (h == currentHour) segPaint.color = Color.parseColor("#F59E0B")
            canvas.drawRect(stripX + h * slotW, stripY, stripX + (h + 1) * slotW, stripY + stripH, segPaint)
        }

        // Needle Pin
        val pinX = stripX + (currentHourFloat / 24f) * stripW
        val pinGlowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#55F59E0B") }
        canvas.drawCircle(pinX, stripY + stripH / 2f, 14f, pinGlowPaint)
        val pinPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#F59E0B") }
        canvas.drawCircle(pinX, stripY + stripH / 2f, 8.5f, pinPaint)

        val specLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.MONOSPACE
            textSize = width * 0.023f
            color = Color.parseColor("#64748B")
        }
        canvas.drawText("00:00", stripX, specY + specH * 0.84f, specLabelPaint)
        canvas.drawText("06:00", stripX + stripW * 0.23f, specY + specH * 0.84f, specLabelPaint)
        val centerSpecPaint = Paint(specLabelPaint).apply {
            textAlign = Paint.Align.CENTER
            color = Color.parseColor("#F59E0B")
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
        }
        canvas.drawText("● 12:00", stripX + stripW / 2f, specY + specH * 0.84f, centerSpecPaint)
        canvas.drawText("18:00", stripX + stripW * 0.77f, specY + specH * 0.84f, specLabelPaint)
        val endSpecPaint = Paint(specLabelPaint).apply { textAlign = Paint.Align.RIGHT }
        canvas.drawText("24:00", stripX + stripW, specY + specH * 0.84f, endSpecPaint)

        // 6. Adaptive Schedule Timeline (Spacious 2-Row Design, Large Text, Never Clips!)
        val blockCount = 5
        val timelineStartY = specY + specH + height * 0.010f
        val cardHeight = height * 0.076f
        val cardGap = height * 0.009f

        val half = blockCount / 2
        for (i in 0 until blockCount) {
            val offset = i - half
            val targetHour = (currentHour + offset + 24) % 24
            val cardY = timelineStartY + i * (cardHeight + cardGap)
            val isActive = offset == 0
            val isPast = offset < 0

            val cardRect = RectF(cardPad, cardY, cardPad + cardW, cardY + cardHeight)

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
                val activeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#181B26") }
                val activeBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor("#FFF59E0B")
                    style = Paint.Style.STROKE
                    strokeWidth = 3.0f
                }
                canvas.drawRoundRect(cardRect, 20f, 20f, activeBg)
                canvas.drawRoundRect(cardRect, 20f, 20f, activeBorder)

                // Left amber accent bar
                val accentPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#F59E0B") }
                canvas.drawRoundRect(RectF(cardPad, cardY, cardPad + 8f, cardY + cardHeight), 20f, 20f, accentPaint)
            } else {
                val normalBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor(if (isPast) "#8013151D" else "#BF13151D")
                }
                canvas.drawRoundRect(cardRect, 20f, 20f, normalBg)
                canvas.drawRoundRect(cardRect, 20f, 20f, cardBorderPaint)
            }

            // ==========================================
            // ROW 1 OF CARD: Time Range + Category Pill
            // ==========================================
            val row1Y = cardY + cardHeight * 0.36f

            // Left Dot
            val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor(if (isActive) "#F59E0B" else if (isPast) "#10B981" else "#475569")
            }
            val dotX = cardPad + 28f
            val dotY = row1Y - 6f
            if (isActive) {
                val dotGlow = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#66F59E0B") }
                canvas.drawCircle(dotX, dotY, 11f, dotGlow)
            }
            canvas.drawCircle(dotX, dotY, if (isActive) 6.5f else 5f, dotPaint)

            // Time Range (Large & Bold)
            val timeRangePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.032f
                color = Color.parseColor(if (isActive) "#FEF08A" else if (isPast) "#94A3B8" else "#E2E8F0")
            }
            val sTime = String.format("%02d:00", targetHour)
            val eTime = String.format("%02d:00", (targetHour + 1) % 24)
            val timeText = "$sTime → $eTime"
            canvas.drawText(timeText, cardPad + 48f, row1Y, timeRangePaint)

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
            val pillY = cardY + cardHeight * 0.12f
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
            val row2Y = cardY + cardHeight * 0.78f

            // Status Badge / Beacon (NOW or DONE check)
            var statusW = 0f
            if (isActive) {
                val nowText = "● NOW"
                val nowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    textAlign = Paint.Align.RIGHT
                    typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                    textSize = width * 0.028f
                    color = Color.parseColor("#F59E0B")
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

        // 7. Cadence Hobbies (Full Width if single, 2x2 Grid if multiple)
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

            val countPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.RIGHT
                typeface = Typeface.MONOSPACE
                textSize = width * 0.024f
                color = Color.parseColor("#64748B")
            }
            canvas.drawText("$hobbiesCount ACTIVE $trackWord", cardPad + cardW - 10f, currentY + height * 0.012f, countPaint)

            val hobStartY = currentY + height * 0.018f
            val hobCardH = if (hobbiesCount == 1) height * 0.070f else height * 0.055f
            val hobGap = 12f

            if (hobbiesCount == 1) {
                // Single hobby takes full width with large, readable fonts!
                val habit = userHabits[0]
                val hRect = RectF(cardPad, hobStartY, cardPad + cardW, hobStartY + hobCardH)
                canvas.drawRoundRect(hRect, 20f, 20f, cardBgPaint)
                canvas.drawRoundRect(hRect, 20f, 20f, cardBorderPaint)

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
                    color = Color.parseColor("#FBBF24")
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
                    canvas.drawRoundRect(hRect, 18f, 18f, cardBgPaint)
                    canvas.drawRoundRect(hRect, 18f, 18f, cardBorderPaint)

                    val emoji = resolveEmoji(habit.icon, habit.name)
                    val emojiPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = width * 0.044f }
                    canvas.drawText(emoji, hX + 16f, hY + hobCardH * 0.52f, emojiPaint)

                    val streakText = "${habit.streak}d 🔥"
                    val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        textAlign = Paint.Align.RIGHT
                        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        textSize = width * 0.026f
                        color = Color.parseColor("#FBBF24")
                    }
                    canvas.drawText(streakText, hX + hobCardW - 14f, hY + hobCardH * 0.42f, streakPaint)

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

        // 9. Bottom subtle brand
        val footPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
            textSize = width * 0.024f
            color = Color.parseColor("#44FFFFFF")
        }
        canvas.drawText("ODYSSEY CADENCE LOCKSCREEN", width / 2f, height * 0.965f, footPaint)
    }

    companion object {
        private const val TAG = "OdysseyHourlyWorker"
        private const val ALARM_ACTION = "com.odyssey.tracker.REFRESH_HOURLY_WALLPAPER"
        private const val REQUEST_CODE = 4041

        fun scheduleNextHourlyUpdate(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, OdysseyHourlyWallpaperWorker::class.java).apply {
                action = ALARM_ACTION
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val cal = Calendar.getInstance().apply {
                add(Calendar.HOUR_OF_DAY, 1)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        cal.timeInMillis,
                        pendingIntent
                    )
                } else {
                    alarmManager.setExact(
                        AlarmManager.RTC_WAKEUP,
                        cal.timeInMillis,
                        pendingIntent
                    )
                }

                context.getSharedPreferences("odyssey_prefs", Context.MODE_PRIVATE)
                    .edit()
                    .putBoolean("hourly_auto_update_enabled", true)
                    .apply()

                Log.d(TAG, "Scheduled next hourly wallpaper update for: ${cal.time}")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to schedule exact alarm: ${e.message}")
            }
        }

        fun cancelHourlyUpdate(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, OdysseyHourlyWallpaperWorker::class.java).apply {
                action = ALARM_ACTION
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.cancel(pendingIntent)

            context.getSharedPreferences("odyssey_prefs", Context.MODE_PRIVATE)
                .edit()
                .putBoolean("hourly_auto_update_enabled", false)
                .apply()

            Log.d(TAG, "Cancelled hourly wallpaper auto-update alarm.")
        }

        fun isScheduled(context: Context): Boolean {
            val prefs = context.getSharedPreferences("odyssey_prefs", Context.MODE_PRIVATE)
            return prefs.getBoolean("hourly_auto_update_enabled", false)
        }
    }
}
