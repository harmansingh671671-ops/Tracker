package com.odyssey.tracker

import android.annotation.SuppressLint
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
@SuppressLint("NewApi")
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

        // CRITICAL: If Odyssey Live Wallpaper is active, do NOT overwrite with static bitmap!
        // Calling setBitmap kills the live wallpaper engine and causes it to freeze.
        if (wallpaperManager.wallpaperInfo?.packageName == context.packageName) {
            Log.d(TAG, "Odyssey Live Wallpaper is currently active. Skipping static setBitmap to preserve smooth live animation.")
            return
        }

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
        // Parse real user blocks (Ensure we do NOT loop previous day's schedule)
        val savedDateStr = json.optString("dateStr", "")
        val todayDateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        val isDateCurrent = savedDateStr.isEmpty() || savedDateStr == todayDateStr

        val blocksArr = json.optJSONArray("blocks")
        if (isDateCurrent && blocksArr != null) {
            for (i in 0 until blocksArr.length()) {
                val b = blocksArr.optJSONObject(i) ?: continue
                val sTime = b.optString("startTime", "00:00")
                val eTime = b.optString("endTime", "01:00")
                val title = b.optString("title", "")
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

        val cardPad = width * 0.036f
        val cardW = width - cardPad * 2f

        // FULL WALLPAPER SPACE ENGINE:
        // Proportional layout utilizing 100% of the screen height without empty voids or squeezing!
        val topMargin = height * 0.038f
        val bottomMargin = height * 0.028f
        val usableH = height - topMargin - bottomMargin

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

        // 4. Header Card (Positioned near top with generous height)
        val headerY = topMargin
        val headerH = usableH * 0.102f
        val headerRect = RectF(cardPad, headerY, cardPad + cardW, headerY + headerH)
        canvas.drawRoundRect(headerRect, 54f, 54f, cardBgPaint)
        canvas.drawRoundRect(headerRect, 54f, 54f, cardBorderPaint)

        val headTitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.030f
            color = Color.parseColor("#94A3B8")
        }
        val chapterStr = "ODYSSEY • CH. 0$chapter"
        canvas.drawText(chapterStr, cardPad + 28f, headerY + headerH * 0.38f, headTitlePaint)

        // Day Badge Pill (Smooth 20f rounded)
        val dayBadgeText = "DAY $activeDay OF 365"
        val dayBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.024f
            color = Color.parseColor("#34D399")
        }
        val dayBadgeW = dayBadgePaint.measureText(dayBadgeText) + 24f
        val dayBadgeX = cardPad + 28f + headTitlePaint.measureText(chapterStr) + 16f
        val dayBadgeH = headerH * 0.28f
        val dayBadgeY = headerY + headerH * 0.16f
        val dayBadgeRect = RectF(dayBadgeX, dayBadgeY, dayBadgeX + dayBadgeW, dayBadgeY + dayBadgeH)
        val dayBadgeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#2E10B981") }
        val dayBadgeBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#6610B981")
            style = Paint.Style.STROKE
            strokeWidth = 1.2f
        }
        canvas.drawRoundRect(dayBadgeRect, 20f, 20f, dayBadgeBg)
        canvas.drawRoundRect(dayBadgeRect, 20f, 20f, dayBadgeBorder)
        canvas.drawText(dayBadgeText, dayBadgeX + 12f, dayBadgeY + dayBadgeH * 0.72f, dayBadgePaint)

        val rankPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            textSize = width * 0.042f
            color = Color.WHITE
        }
        val rankStr = "$rankBadge $rankName"
        canvas.drawText(rankStr, cardPad + 28f, headerY + headerH * 0.80f, rankPaint)

        val subRankPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.DEFAULT
            textSize = width * 0.026f
            color = Color.parseColor("#94A3B8")
        }
        canvas.drawText("Level ${String.format("%02d", userLevel)} Cadence", cardPad + 28f + rankPaint.measureText("$rankStr ") + 8f, headerY + headerH * 0.80f, subRankPaint)

        // Minimal Streak Count (Replaces the circular progress gauge on the right)
        val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.RIGHT
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.048f
            color = Color.parseColor("#F59E0B")
        }
        canvas.drawText("$streak 🔥", cardPad + cardW - 28f, headerY + headerH * 0.48f, streakPaint)

        val streakLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.RIGHT
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.022f
            color = Color.parseColor("#94A3B8")
        }
        canvas.drawText("DAYS STREAK", cardPad + cardW - 28f, headerY + headerH * 0.80f, streakLabelPaint)

        // 5. 24-Hour Cadence Spectrum Bar (Expanded, clean, no squeezed text)
        val gap1 = usableH * 0.014f
        val specY = headerY + headerH + gap1
        val specH = usableH * 0.068f
        val specRect = RectF(cardPad, specY, cardPad + cardW, specY + specH)
        canvas.drawRoundRect(specRect, 34f, 34f, cardBgPaint)
        canvas.drawRoundRect(specRect, 34f, 34f, cardBorderPaint)

        val stripX = cardPad + 22f
        val stripY = specY + specH * 0.22f
        val stripW = cardW - 44f
        val stripH = specH * 0.26f // ~26px height
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

        // =========================================================================
        // RADIANT GLOWING TIMELINE NEEDLE (Noticeably larger than the bar!)
        // =========================================================================
        val pinX = stripX + (currentHourFloat / 24f) * stripW
        val pinCenterY = stripY + stripH / 2f

        // Soft ambient aura
        val auraPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#45F59E0B") }
        canvas.drawCircle(pinX, pinCenterY, 46f, auraPaint)

        // Bright halo ring
        val pinGlowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#75F59E0B") }
        canvas.drawCircle(pinX, pinCenterY, 28f, pinGlowPaint)

        // Solid amber body (diameter 38px > 26px bar!)
        val pinPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#F59E0B") }
        canvas.drawCircle(pinX, pinCenterY, 19f, pinPaint)

        // Specular stroke & white core
        val pinStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#FEF08A")
            style = Paint.Style.STROKE
            strokeWidth = 2.4f
        }
        canvas.drawCircle(pinX, pinCenterY, 19f, pinStrokePaint)

        val pinWhiteCore = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
        canvas.drawCircle(pinX, pinCenterY, 7f, pinWhiteCore)

        // Active hour time badge directly below moving beacon needle
        val dotTimeStr = String.format(java.util.Locale.US, "%02d:00", currentHour)
        val dotLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.024f
            color = Color.parseColor("#FCD34D")
        }
        val textBounds = Rect()
        dotLabelPaint.getTextBounds(dotTimeStr, 0, dotTimeStr.length, textBounds)
        val pillW = textBounds.width() + 28f
        val pillH = textBounds.height() + 14f
        val pillX = (pinX - pillW / 2f).coerceIn(cardPad + 10f, cardPad + cardW - pillW - 10f)
        val pillY = pinCenterY + 24f
        val pillRect = RectF(pillX, pillY, pillX + pillW, pillY + pillH)

        val pillBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#E0090A0F")
            style = Paint.Style.FILL
        }
        val pillBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#55F59E0B")
            style = Paint.Style.STROKE
            strokeWidth = 1.8f
        }
        canvas.drawRoundRect(pillRect, pillH / 2f, pillH / 2f, pillBgPaint)
        canvas.drawRoundRect(pillRect, pillH / 2f, pillH / 2f, pillBorderPaint)
        canvas.drawText(dotTimeStr, pillRect.centerX(), pillY + pillH * 0.72f, dotLabelPaint)

        // 6. 2-TASK CADENCE WINDOW (Strictly 2 Tasks: Current NOW & Upcoming NEXT)
        val gap2 = usableH * 0.016f
        val timelineStartY = specY + specH + gap2
        val cardGap = usableH * 0.012f
        val cardH1 = usableH * 0.138f
        val cardH2 = usableH * 0.122f

        // --- 1. CURRENT TASK (NOW) ---
        val curY = timelineStartY
        val curRect = RectF(cardPad, curY, cardPad + cardW, curY + cardH1)

        val curMatching = userBlocks.find { b ->
            (currentHour >= b.startHour && currentHour < b.endHour) ||
            b.startTime.startsWith(String.format(Locale.getDefault(), "%02d", currentHour))
        }
        val curTitle = curMatching?.title ?: ""
        val curCat = curMatching?.category ?: ""
        val (curCatLabel, curCatColor) = getCategoryTheme(curCat, currentHour)

        // Outer Emerald Glow
        val curGlowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#405AF0B3")
            style = Paint.Style.STROKE
            strokeWidth = 6f
        }
        val curOuterRect = RectF(cardPad - 2f, curY - 2f, cardPad + cardW + 2f, curY + cardH1 + 2f)
        canvas.drawRoundRect(curOuterRect, 50f, 50f, curGlowPaint)

        // Current Card Body & Crisp Emerald Border
        val curBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#172033")
            style = Paint.Style.FILL
        }
        val curBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#5AF0B3")
            style = Paint.Style.STROKE
            strokeWidth = 3.2f
        }
        canvas.drawRoundRect(curRect, 48f, 48f, curBgPaint)
        canvas.drawRoundRect(curRect, 48f, 48f, curBorderPaint)

        // Current Row 1: "NOW" Pill Badge + Time Range + Category Pill
        val curRow1Y = curY + cardH1 * 0.36f

        // Emerald "NOW" Badge Pill
        val nowBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.024f
            color = Color.parseColor("#003825")
        }
        val nowBadgeText = "NOW"
        val nowBadgeW = nowBadgePaint.measureText(nowBadgeText) + 24f
        val nowBadgeH = cardH1 * 0.28f
        val nowBadgeY = curY + cardH1 * 0.14f
        val nowBadgeRect = RectF(cardPad + 24f, nowBadgeY, cardPad + 24f + nowBadgeW, nowBadgeY + nowBadgeH)
        val nowBadgeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#5AF0B3")
        }
        canvas.drawRoundRect(nowBadgeRect, 14f, 14f, nowBadgeBg)
        canvas.drawText(nowBadgeText, cardPad + 36f, nowBadgeY + nowBadgeH * 0.72f, nowBadgePaint)

        // Current Time Range
        val curTimePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.032f
            color = Color.parseColor("#FEF08A")
        }
        val curStart = String.format(Locale.getDefault(), "%02d:00", currentHour)
        val curEnd = String.format(Locale.getDefault(), "%02d:00", (currentHour + 1) % 24)
        canvas.drawText("$curStart → $curEnd", cardPad + 32f + nowBadgeW + 12f, curRow1Y, curTimePaint)

        // Current Category Pill Badge (only if user defined)
        if (curCat.isNotEmpty()) {
            val curCatPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor(curCatColor)
                textSize = width * 0.024f
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            }
            val curCatW = curCatPaint.measureText(curCatLabel) + 24f
            val curCatX = cardPad + cardW - curCatW - 24f
            val curCatRect = RectF(curCatX, nowBadgeY, curCatX + curCatW, nowBadgeY + nowBadgeH)
            val curCatBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#2E" + curCatColor.removePrefix("#"))
            }
            val curCatBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#80" + curCatColor.removePrefix("#"))
                style = Paint.Style.STROKE
                strokeWidth = 1.4f
            }
            canvas.drawRoundRect(curCatRect, 14f, 14f, curCatBg)
            canvas.drawRoundRect(curCatRect, 14f, 14f, curCatBorder)
            canvas.drawText(curCatLabel, curCatX + 12f, nowBadgeY + nowBadgeH * 0.72f, curCatPaint)
        }

        // Current Row 2: Full Large Task Title (Keep strictly empty if user hasn't scheduled)
        if (curTitle.isNotEmpty()) {
            val curTitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                textSize = width * 0.046f
                color = Color.WHITE
            }
            val maxCurTitleW = cardW - 48f
            var curDisplayTitle = curTitle
            while (curDisplayTitle.length > 3 && curTitlePaint.measureText(curDisplayTitle) > maxCurTitleW) {
                curDisplayTitle = curDisplayTitle.dropLast(1)
            }
            if (curDisplayTitle.length < curTitle.length) curDisplayTitle += "…"
            canvas.drawText(curDisplayTitle, cardPad + 24f, curY + cardH1 * 0.78f, curTitlePaint)
        }

        // --- 2. UPCOMING TASK (NEXT) ---
        val nextHour = (currentHour + 1) % 24
        val nextY = curY + cardH1 + cardGap
        val nextRect = RectF(cardPad, nextY, cardPad + cardW, nextY + cardH2)

        val nextMatching = userBlocks.find { b ->
            (nextHour >= b.startHour && nextHour < b.endHour) ||
            b.startTime.startsWith(String.format(Locale.getDefault(), "%02d", nextHour))
        }
        val nextTitle = nextMatching?.title ?: ""
        val nextCat = nextMatching?.category ?: ""
        val (nextCatLabel, nextCatColor) = getCategoryTheme(nextCat, nextHour)

        val nextBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#DF131B2E")
            style = Paint.Style.FILL
        }
        val nextBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#24FFFFFF")
            style = Paint.Style.STROKE
            strokeWidth = 1.8f
        }
        canvas.drawRoundRect(nextRect, 44f, 44f, nextBgPaint)
        canvas.drawRoundRect(nextRect, 44f, 44f, nextBorderPaint)

        // Upcoming Row 1: "UPCOMING" Pill + Time Range + Category Pill
        val nextRow1Y = nextY + cardH2 * 0.36f

        val upBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.022f
            color = Color.parseColor("#BDC2FF")
        }
        val upBadgeText = "UPCOMING"
        val upBadgeW = upBadgePaint.measureText(upBadgeText) + 20f
        val upBadgeH = cardH2 * 0.28f
        val upBadgeY = nextY + cardH2 * 0.14f
        val upBadgeRect = RectF(cardPad + 24f, upBadgeY, cardPad + 24f + upBadgeW, upBadgeY + upBadgeH)
        val upBadgeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#283548")
        }
        val upBadgeBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#55BDC2FF")
            style = Paint.Style.STROKE
            strokeWidth = 1.2f
        }
        canvas.drawRoundRect(upBadgeRect, 12f, 12f, upBadgeBg)
        canvas.drawRoundRect(upBadgeRect, 12f, 12f, upBadgeBorder)
        canvas.drawText(upBadgeText, cardPad + 34f, upBadgeY + upBadgeH * 0.72f, upBadgePaint)

        val nextTimePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.028f
            color = Color.parseColor("#CBD5E1")
        }
        val nextStart = String.format(Locale.getDefault(), "%02d:00", nextHour)
        val nextEnd = String.format(Locale.getDefault(), "%02d:00", (nextHour + 1) % 24)
        canvas.drawText("$nextStart → $nextEnd", cardPad + 30f + upBadgeW + 12f, nextRow1Y, nextTimePaint)

        // Upcoming Category badge (only if user defined)
        if (nextCat.isNotEmpty()) {
            val nextCatPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor(nextCatColor)
                textSize = width * 0.022f
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            }
            val nextCatW = nextCatPaint.measureText(nextCatLabel) + 22f
            val nextCatX = cardPad + cardW - nextCatW - 24f
            val nextCatRect = RectF(nextCatX, upBadgeY, nextCatX + nextCatW, upBadgeY + upBadgeH)
            val nextCatBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#22" + nextCatColor.removePrefix("#"))
            }
            val nextCatBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#66" + nextCatColor.removePrefix("#"))
                style = Paint.Style.STROKE
                strokeWidth = 1.2f
            }
            canvas.drawRoundRect(nextCatRect, 12f, 12f, nextCatBg)
            canvas.drawRoundRect(nextCatRect, 12f, 12f, nextCatBorder)
            canvas.drawText(nextCatLabel, nextCatX + 11f, upBadgeY + upBadgeH * 0.72f, nextCatPaint)
        }

        // Upcoming Row 2: Upcoming Task Title (Keep strictly empty if user hasn't scheduled)
        if (nextTitle.isNotEmpty()) {
            val nextTitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                textSize = width * 0.040f
                color = Color.parseColor("#E2E8F0")
            }
            var nextDisplayTitle = nextTitle
            val maxNextTitleW = cardW - 48f
            while (nextDisplayTitle.length > 3 && nextTitlePaint.measureText(nextDisplayTitle) > maxNextTitleW) {
                nextDisplayTitle = nextDisplayTitle.dropLast(1)
            }
            if (nextDisplayTitle.length < nextTitle.length) nextDisplayTitle += "…"
            canvas.drawText(nextDisplayTitle, cardPad + 24f, nextY + cardH2 * 0.78f, nextTitlePaint)
        }

        val timelineEndY = nextY + cardH2

        // =========================================================================
        // 7. Cadence Hobbies (Guaranteed display, fills space to bottom!)
        // =========================================================================
        val gap3 = usableH * 0.015f
        val currentY = timelineEndY + gap3

        // Fallback so hobbies are never missing
        if (userHabits.isEmpty()) {
            userHabits.add(HabitItem("Mindful Focus", "🧘", streak, "Cadence Track"))
            userHabits.add(HabitItem("Daily Hydration", "💧", streak, "Vitality Track"))
        }

        val hobbiesCount = Math.min(4, userHabits.size)
        val hobHeaderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.027f
            color = Color.parseColor("#94A3B8")
        }
        val trackWord = if (hobbiesCount == 1) "TRACK" else "TRACKS"
        canvas.drawText("✦ CADENCE • HOBBIES & PASSIONS", cardPad + 12f, currentY + usableH * 0.010f, hobHeaderPaint)

        val countPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.RIGHT
            typeface = Typeface.MONOSPACE
            textSize = width * 0.024f
            color = Color.parseColor("#64748B")
        }
        canvas.drawText("$hobbiesCount ACTIVE $trackWord", cardPad + cardW - 12f, currentY + usableH * 0.010f, countPaint)

        val hobStartY = currentY + usableH * 0.014f
        val hobFootnoteH = usableH * 0.025f
        val hobAvailableH = (topMargin + usableH) - hobStartY - hobFootnoteH
        val hobGap = 14f

        val rows = (hobbiesCount + 1) / 2
        if (rows == 1) {
            // 1 row: 1 full-width card or 2 side-by-side cards with expansive height
            val isSingle = hobbiesCount == 1
            val hobCardW = if (isSingle) cardW else (cardW - hobGap) / 2f
            val hobCardH = minOf(usableH * 0.130f, hobAvailableH)

            for (idx in 0 until hobbiesCount) {
                val habit = userHabits[idx]
                val hX = if (isSingle) cardPad else cardPad + idx * (hobCardW + hobGap)
                val hY = hobStartY
                val hRect = RectF(hX, hY, hX + hobCardW, hY + hobCardH)
                canvas.drawRoundRect(hRect, 44f, 44f, cardBgPaint)
                canvas.drawRoundRect(hRect, 44f, 44f, cardBorderPaint)

                val emoji = resolveEmoji(habit.icon, habit.name)
                val emojiPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = width * 0.052f }
                canvas.drawText(emoji, hX + 22f, hY + hobCardH * 0.52f, emojiPaint)

                val streakText = "${habit.streak}d 🔥"
                val singleStreakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    textAlign = Paint.Align.RIGHT
                    typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                    textSize = width * 0.028f
                    color = Color.parseColor("#F59E0B")
                }
                canvas.drawText(streakText, hX + hobCardW - 18f, hY + hobCardH * 0.44f, singleStreakPaint)

                val hobNamePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                    textSize = width * 0.034f
                    color = Color.WHITE
                }
                var hDisplayName = habit.name
                while (hDisplayName.length > 3 && hobNamePaint.measureText(hDisplayName) > hobCardW - 44f) {
                    hDisplayName = hDisplayName.dropLast(1)
                }
                if (hDisplayName.length < habit.name.length) hDisplayName += "…"
                canvas.drawText(hDisplayName, hX + 22f, hY + hobCardH * 0.82f, hobNamePaint)
            }
        } else {
            // 2 rows of 2 columns, filling available height evenly
            val hobCardW = (cardW - hobGap) / 2f
            val hobCardH = (hobAvailableH - hobGap) / 2f

            for (idx in 0 until hobbiesCount) {
                val habit = userHabits[idx]
                val r = idx / 2
                val c = idx % 2
                val hX = cardPad + c * (hobCardW + hobGap)
                val hY = hobStartY + r * (hobCardH + hobGap)

                val hRect = RectF(hX, hY, hX + hobCardW, hY + hobCardH)
                canvas.drawRoundRect(hRect, 38f, 38f, cardBgPaint)
                canvas.drawRoundRect(hRect, 38f, 38f, cardBorderPaint)

                val emoji = resolveEmoji(habit.icon, habit.name)
                val emojiPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = width * 0.046f }
                canvas.drawText(emoji, hX + 18f, hY + hobCardH * 0.50f, emojiPaint)

                val streakText = "${habit.streak}d 🔥"
                val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    textAlign = Paint.Align.RIGHT
                    typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                    textSize = width * 0.026f
                    color = Color.parseColor("#F59E0B")
                }
                canvas.drawText(streakText, hX + hobCardW - 16f, hY + hobCardH * 0.42f, streakPaint)

                val hobNamePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                    textSize = width * 0.032f
                    color = Color.WHITE
                }
                var hDisplayName = habit.name
                while (hDisplayName.length > 3 && hobNamePaint.measureText(hDisplayName) > hobCardW - 44f) {
                    hDisplayName = hDisplayName.dropLast(1)
                }
                if (hDisplayName.length < habit.name.length) hDisplayName += "…"
                canvas.drawText(hDisplayName, hX + 18f, hY + hobCardH * 0.82f, hobNamePaint)
            }
        }

        // 9. Bottom subtle brand mark
        val footPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
            textSize = width * 0.022f
            color = Color.parseColor("#44FFFFFF")
        }
        canvas.drawText("ODYSSEY CADENCE LOCKSCREEN", width / 2f, height - bottomMargin * 0.40f, footPaint)
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
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        cal.timeInMillis,
                        pendingIntent
                    )
                } else {
                    alarmManager.set(
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

        fun updateLockscreenNow(context: Context) {
            val wallpaperManager = WallpaperManager.getInstance(context)
            if (wallpaperManager.wallpaperInfo?.packageName == context.packageName) {
                Log.d(TAG, "Odyssey Live Wallpaper is currently active. Skipping updateLockscreenNow to avoid freezing live service.")
                return
            }
            Thread {
                try {
                    val worker = OdysseyHourlyWallpaperWorker()
                    worker.updateLockscreenWallpaper(context)
                    Log.d(TAG, "updateLockscreenNow completed successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "updateLockscreenNow failed: ${e.message}", e)
                }
            }.start()
        }
    }
}
