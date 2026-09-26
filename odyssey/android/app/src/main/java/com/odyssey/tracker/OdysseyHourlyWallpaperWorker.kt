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
import androidx.core.graphics.toColorInt
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * OdysseyHourlyWallpaperWorker
 * 
 * Android background receiver that triggers at the start of every hour (:00:00).
 * It calculates the active hour, parses the real user tasks and habits from latest_schedule_json,
 * renders the rich dynamic adaptive lockscreen canvas (matching the web Wallpaper preview 1:1),
 * and applies the wallpaper directly via WallpaperManager.FLAG_LOCK.
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

    private fun resolveEmoji(icon: String, name: String): String {
        val trimmed = icon.trim()
        if (trimmed.length in 1..4 && !trimmed.all { it.isLetterOrDigit() || it == '_' || it == '-' }) {
            return trimmed
        }
        val combined = "$trimmed $name".lowercase()
        return when {
            combined.contains("breath") || combined.contains("meditat") || combined.contains("zen") || combined.contains("yoga") || combined.contains("mind") -> "🧘"
            combined.contains("water") || combined.contains("hydrat") || combined.contains("drink") || combined.contains("hydro") -> "💧"
            combined.contains("guitar") || combined.contains("music") || combined.contains("song") || combined.contains("audio") -> "🎸"
            combined.contains("write") || combined.contains("writing") || combined.contains("journal") || combined.contains("note") -> "✍️"
            combined.contains("photo") || combined.contains("camera") || combined.contains("film") || combined.contains("35mm") -> "📷"
            combined.contains("climb") || combined.contains("boulder") || combined.contains("mountain") || combined.contains("landscape") -> "🧗"
            combined.contains("gym") || combined.contains("fitness") || combined.contains("workout") || combined.contains("lift") -> "🏋️"
            combined.contains("run") || combined.contains("walk") || combined.contains("jog") || combined.contains("cardio") -> "🏃"
            combined.contains("read") || combined.contains("book") || combined.contains("wing") || combined.contains("fire") -> "📖"
            combined.contains("code") || combined.contains("terminal") || combined.contains("dev") || combined.contains("program") -> "💻"
            combined.contains("sparkle") || combined.contains("star") || combined.contains("magic") -> "✨"
            combined.contains("sun") || combined.contains("morning") || combined.contains("dawn") -> "☀️"
            combined.contains("sleep") || combined.contains("bed") || combined.contains("rest") || combined.contains("night") || combined.contains("moon") -> "🌙"
            combined.contains("bolt") || combined.contains("energy") || combined.contains("vitality") -> "⚡"
            combined.contains("art") || combined.contains("paint") || combined.contains("draw") -> "🎨"
            combined.contains("chess") || combined.contains("game") -> "♟️"
            combined.contains("cook") || combined.contains("food") || combined.contains("chef") -> "🍳"
            else -> "🎯"
        }
    }

    private fun getCategoryBadge(cat: String, h: Int): WallpaperCategoryBadge {
        val c = cat.lowercase()
        return when {
            c.contains("sleep") || c.contains("rest") || (c.isEmpty() && (h < 6 || h >= 23)) ->
                WallpaperCategoryBadge("Rest", "#A5B4FC".toColorInt(), "#331E1B4B".toColorInt(), "#66818CF8".toColorInt())
            c.contains("habit") || c.contains("vitality") || c.contains("gym") || (c.isEmpty() && h in 6..7) ->
                WallpaperCategoryBadge("Vitality", "#34D399".toColorInt(), "#2610B981".toColorInt(), "#6610B981".toColorInt())
            c.contains("sync") || c.contains("meeting") || (c.isEmpty() && h in 17..18) ->
                WallpaperCategoryBadge("Sync", "#38BDF8".toColorInt(), "#260284C7".toColorInt(), "#660284C7".toColorInt())
            c.contains("buffer") || c.contains("break") || c.contains("renewal") || (c.isEmpty() && h in 12..13) ->
                WallpaperCategoryBadge("Renewal", "#FCD34D".toColorInt(), "#26F59E0B".toColorInt(), "#66F59E0B".toColorInt())
            else ->
                WallpaperCategoryBadge("Deep Focus", "#818CF8".toColorInt(), "#266366F1".toColorInt(), "#666366F1".toColorInt())
        }
    }

    private fun renderAdaptiveCanvas(canvas: Canvas, width: Int, height: Int, rawJson: String) {
        val json = try { JSONObject(rawJson) } catch (e: Exception) { JSONObject() }
        val chapter = json.optInt("chapter", 1)
        val activeDay = json.optInt("activeDay", 1)
        val rankBadge = json.optString("rankBadge", "🌱")
        val rankName = json.optString("rankName", "Beginner")
        val userLevel = json.optInt("userLevel", 1)
        val userStreak = json.optInt("userStreak", activeDay)

        // Parse user blocks
        val userBlocks = mutableListOf<ScheduleBlockItem>()
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

                userBlocks.add(ScheduleBlockItem(sH, eH, sTime, eTime, title, category))
            }
        }

        // Parse user habits/hobbies
        val userHabits = mutableListOf<HobbyItem>()
        val habitsArr = json.optJSONArray("habits")
        if (habitsArr != null) {
            for (i in 0 until habitsArr.length()) {
                val h = habitsArr.optJSONObject(i) ?: continue
                val hName = h.optString("name", "Focus")
                val hIcon = h.optString("icon", "🎯")
                val hStreak = h.optInt("currentStreak", 1)
                val hCategory = h.optString("category", "Habit Track")
                userHabits.add(HobbyItem(hName, hIcon, hStreak, hCategory))
            }
        }

        val cal = Calendar.getInstance()
        val currentHour = cal.get(Calendar.HOUR_OF_DAY)
        val currentMinute = cal.get(Calendar.MINUTE)
        val currentHourFloat = currentHour + currentMinute / 60f

        // 1. OLED Pure Dark Background
        canvas.drawColor("#090A0F".toColorInt())

        // 2. Ambient Gradient Glows (Matches Odyssey Design System)
        val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        val topGrad = RadialGradient(
            width * 0.15f, height * 0.10f, width * 0.55f,
            "#381E1B4B".toColorInt(), Color.TRANSPARENT,
            Shader.TileMode.CLAMP
        )
        glowPaint.shader = topGrad
        canvas.drawRect(0f, 0f, width.toFloat(), height * 0.35f, glowPaint)

        val midGrad = RadialGradient(
            width * 0.85f, height * 0.50f, width * 0.50f,
            "#28064E3B".toColorInt(), Color.TRANSPARENT,
            Shader.TileMode.CLAMP
        )
        glowPaint.shader = midGrad
        canvas.drawRect(width * 0.30f, height * 0.30f, width.toFloat(), height * 0.70f, glowPaint)

        val botGrad = RadialGradient(
            width * 0.20f, height * 0.85f, width * 0.50f,
            "#300F172A".toColorInt(), Color.TRANSPARENT,
            Shader.TileMode.CLAMP
        )
        glowPaint.shader = botGrad
        canvas.drawRect(0f, height * 0.65f, width.toFloat(), height.toFloat(), glowPaint)

        val cardPad = width * 0.040f
        val cardW = width - cardPad * 2f

        val topMargin = height * 0.042f
        val bottomMargin = height * 0.030f
        val usableH = height - topMargin - bottomMargin

        fun getCategoryTheme(cat: String, h: Int): Pair<String, String> {
            val c = cat.lowercase()
            return when {
                c.contains("sleep") || c.contains("rest") || (c.isEmpty() && (h < 6 || h >= 23)) -> Pair("Rest", "#1E1B4B")
                c.contains("habit") || c.contains("vitality") || c.contains("gym") || (c.isEmpty() && h in 6..7) -> Pair("Vitality", "#10B981")
                c.contains("sync") || c.contains("meeting") || (c.isEmpty() && h in 17..18) -> Pair("Sync", "#0284C7")
                c.contains("buffer") || c.contains("break") || c.contains("renewal") || (c.isEmpty() && h in 12..13) -> Pair("Renewal", "#F59E0B")
                else -> Pair("Deep Focus", "#6366F1")
            }
        }

        val cardBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#D913151D".toColorInt()
            style = Paint.Style.FILL
        }
        val cardBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#26FFFFFF".toColorInt()
            style = Paint.Style.STROKE
            strokeWidth = 1.8f
        }

        // =========================================================================
        // 1. HEADER ANCHOR CARD (Expansive, perfectly positioned near top)
        // =========================================================================
        val headerY = topMargin
        val headerH = usableH * 0.108f
        val headerRect = RectF(cardPad, headerY, cardPad + cardW, headerY + headerH)
        canvas.drawRoundRect(headerRect, 54f, 54f, cardBgPaint)
        canvas.drawRoundRect(headerRect, 54f, 54f, cardBorderPaint)

        val headTitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.028f
            color = "#94A3B8".toColorInt()
        }
        val chapterStr = "ODYSSEY • CH. 0$chapter"
        val chapterY = headerY + headerH * 0.32f
        canvas.drawText(chapterStr, cardPad + 28f, chapterY, headTitlePaint)

        // Day Badge Pill
        val dayBadgeText = "DAY $activeDay OF 365"
        val dayBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.023f
            color = "#34D399".toColorInt()
        }
        val dayBadgeW = dayBadgePaint.measureText(dayBadgeText) + 24f
        val dayBadgeX = cardPad + 28f + headTitlePaint.measureText(chapterStr) + 16f
        val dayBadgeH = headerH * 0.24f
        val dayBadgeY = headerY + headerH * 0.14f
        val dayBadgeRect = RectF(dayBadgeX, dayBadgeY, dayBadgeX + dayBadgeW, dayBadgeY + dayBadgeH)
        val dayBadgeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = "#3310B981".toColorInt() }
        val dayBadgeBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#6610B981".toColorInt()
            style = Paint.Style.STROKE
            strokeWidth = 1.2f
        }
        canvas.drawRoundRect(dayBadgeRect, 16f, 16f, dayBadgeBg)
        canvas.drawRoundRect(dayBadgeRect, 16f, 16f, dayBadgeBorder)
        canvas.drawText(dayBadgeText, dayBadgeX + 12f, dayBadgeY + dayBadgeH * 0.72f, dayBadgePaint)

        val rankPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            textSize = width * 0.042f
            color = Color.WHITE
        }
        val rankStr = "$rankBadge $rankName"
        val rankY = headerY + headerH * 0.64f
        canvas.drawText(rankStr, cardPad + 28f, rankY, rankPaint)

        val subRankPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            textSize = width * 0.026f
            color = "#94A3B8".toColorInt()
        }
        val levelStr = "Level ${String.format(Locale.getDefault(), "%02d", userLevel)} Explorer"
        val levelY = headerY + headerH * 0.88f
        canvas.drawText(levelStr, cardPad + 28f, levelY, subRankPaint)

        // Minimal Streak Count on Right
        val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.RIGHT
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.052f
            color = "#FBBF24".toColorInt()
        }
        canvas.drawText("$userStreak 🔥", cardPad + cardW - 28f, headerY + headerH * 0.48f, streakPaint)

        val streakLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.RIGHT
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.022f
            color = "#94A3B8".toColorInt()
        }
        canvas.drawText("DAYS STREAK", cardPad + cardW - 28f, headerY + headerH * 0.80f, streakLabelPaint)

        // =========================================================================
        // 2. 24-HOUR SPECTRUM BAR
        // =========================================================================
        val specGap = usableH * 0.014f
        val specY = headerY + headerH + specGap
        val specH = usableH * 0.072f
        val specRect = RectF(cardPad, specY, cardPad + cardW, specY + specH)
        val specBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#BF13151D".toColorInt()
            style = Paint.Style.FILL
        }
        canvas.drawRoundRect(specRect, 36f, 36f, specBgPaint)
        canvas.drawRoundRect(specRect, 36f, 36f, cardBorderPaint)

        val stripX = cardPad + 24f
        val stripY = specY + specH * 0.22f
        val stripW = cardW - 48f
        val stripH = specH * 0.28f
        val slotW = stripW / 24f

        val segPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        for (h in 0 until 24) {
            val matching = userBlocks.find { b -> h >= b.startHour && h < b.endHour }
            val cat = matching?.category ?: ""
            val (_, colorHex) = getCategoryTheme(cat, h)
            segPaint.color = colorHex.toColorInt()
            if (h == currentHour) segPaint.color = "#F59E0B".toColorInt()
            canvas.drawRect(stripX + h * slotW, stripY, stripX + (h + 1) * slotW, stripY + stripH, segPaint)
        }

        // =========================================================================
        // RADIANT GLOWING TIMELINE BEACON
        // =========================================================================
        val pinX = stripX + (currentHourFloat / 24f) * stripW
        val pinCenterY = stripY + stripH / 2f

        val auraPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = "#45F59E0B".toColorInt() }
        canvas.drawCircle(pinX, pinCenterY, 46f, auraPaint)

        val pinGlowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = "#75F59E0B".toColorInt() }
        canvas.drawCircle(pinX, pinCenterY, 28f, pinGlowPaint)

        val pinPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = "#F59E0B".toColorInt() }
        canvas.drawCircle(pinX, pinCenterY, 19f, pinPaint)

        val pinStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#FEF08A".toColorInt()
            style = Paint.Style.STROKE
            strokeWidth = 2.4f
        }
        canvas.drawCircle(pinX, pinCenterY, 19f, pinStrokePaint)

        val pinWhiteCore = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
        canvas.drawCircle(pinX, pinCenterY, 7f, pinWhiteCore)

        val dotTimeStr = String.format(Locale.US, "%02d:00", currentHour)
        val dotLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.024f
            color = "#FCD34D".toColorInt()
        }
        val textBounds = Rect()
        dotLabelPaint.getTextBounds(dotTimeStr, 0, dotTimeStr.length, textBounds)
        val pillW = textBounds.width() + 28f
        val pillH = textBounds.height() + 14f
        val pillX = (pinX - pillW / 2f).coerceIn(cardPad + 10f, cardPad + cardW - pillW - 10f)
        val pillY = pinCenterY + 24f
        val pillRect = RectF(pillX, pillY, pillX + pillW, pillY + pillH)

        val pillBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#E6090A0F".toColorInt()
            style = Paint.Style.FILL
        }
        val pillBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#55F59E0B".toColorInt()
            style = Paint.Style.STROKE
            strokeWidth = 1.8f
        }
        canvas.drawRoundRect(pillRect, pillH / 2f, pillH / 2f, pillBgPaint)
        canvas.drawRoundRect(pillRect, pillH / 2f, pillH / 2f, pillBorderPaint)
        canvas.drawText(dotTimeStr, pillRect.centerX(), pillY + pillH * 0.72f, dotLabelPaint)

        // =========================================================================
        // 3. 2-TASK DISPLAY (CURRENT NOW & UPCOMING NEXT ONLY)
        // =========================================================================
        val taskGap = usableH * 0.016f
        val timelineStartY = specY + specH + taskGap
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
        val curBadge = getCategoryBadge(curCat, currentHour)

        // Outer Emerald Glow
        val curGlowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#405AF0B3".toColorInt()
            style = Paint.Style.STROKE
            strokeWidth = 6f
        }
        val curOuterRect = RectF(cardPad - 2f, curY - 2f, cardPad + cardW + 2f, curY + cardH1 + 2f)
        canvas.drawRoundRect(curOuterRect, 50f, 50f, curGlowPaint)

        // Current Card Body & Crisp Emerald Border
        val curBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#172033".toColorInt()
            style = Paint.Style.FILL
        }
        val curBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#5AF0B3".toColorInt()
            style = Paint.Style.STROKE
            strokeWidth = 3.2f
        }
        canvas.drawRoundRect(curRect, 48f, 48f, curBgPaint)
        canvas.drawRoundRect(curRect, 48f, 48f, curBorderPaint)

        val curRow1Y = curY + cardH1 * 0.36f

        val nowBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.024f
            color = "#003825".toColorInt()
        }
        val nowBadgeText = "NOW"
        val nowBadgeW = nowBadgePaint.measureText(nowBadgeText) + 24f
        val nowBadgeH = cardH1 * 0.28f
        val nowBadgeY = curY + cardH1 * 0.14f
        val nowBadgeRect = RectF(cardPad + 24f, nowBadgeY, cardPad + 24f + nowBadgeW, nowBadgeY + nowBadgeH)
        val nowBadgeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#5AF0B3".toColorInt()
        }
        canvas.drawRoundRect(nowBadgeRect, 14f, 14f, nowBadgeBg)
        canvas.drawText(nowBadgeText, cardPad + 36f, nowBadgeY + nowBadgeH * 0.72f, nowBadgePaint)

        val curTimePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.032f
            color = "#FEF08A".toColorInt()
        }
        val curStart = String.format(Locale.getDefault(), "%02d:00", currentHour)
        val curEnd = String.format(Locale.getDefault(), "%02d:00", (currentHour + 1) % 24)
        canvas.drawText("$curStart → $curEnd", cardPad + 32f + nowBadgeW + 12f, curRow1Y, curTimePaint)

        if (curCat.isNotEmpty()) {
            val curCatPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = curBadge.textColor
                textSize = width * 0.024f
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            }
            val curCatW = curCatPaint.measureText(curBadge.label) + 24f
            val curCatX = cardPad + cardW - curCatW - 24f
            val curCatRect = RectF(curCatX, nowBadgeY, curCatX + curCatW, nowBadgeY + nowBadgeH)
            val curCatBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = curBadge.bgColor }
            val curCatBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = curBadge.borderColor
                style = Paint.Style.STROKE
                strokeWidth = 1.4f
            }
            canvas.drawRoundRect(curCatRect, 14f, 14f, curCatBg)
            canvas.drawRoundRect(curCatRect, 14f, 14f, curCatBorder)
            canvas.drawText(curBadge.label, curCatX + 12f, nowBadgeY + nowBadgeH * 0.72f, curCatPaint)
        }

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
        } else {
            val unscheduledPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.ITALIC)
                textSize = width * 0.034f
                color = "#64748B".toColorInt()
            }
            canvas.drawText("Unscheduled", cardPad + 24f, curY + cardH1 * 0.78f, unscheduledPaint)
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
        val nextBadge = getCategoryBadge(nextCat, nextHour)

        val nextBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#DF131B2E".toColorInt()
            style = Paint.Style.FILL
        }
        val nextBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#24FFFFFF".toColorInt()
            style = Paint.Style.STROKE
            strokeWidth = 1.8f
        }
        canvas.drawRoundRect(nextRect, 44f, 44f, nextBgPaint)
        canvas.drawRoundRect(nextRect, 44f, 44f, nextBorderPaint)

        val nextRow1Y = nextY + cardH2 * 0.36f

        val upBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.022f
            color = "#BDC2FF".toColorInt()
        }
        val upBadgeText = "UPCOMING"
        val upBadgeW = upBadgePaint.measureText(upBadgeText) + 20f
        val upBadgeH = cardH2 * 0.28f
        val upBadgeY = nextY + cardH2 * 0.14f
        val upBadgeRect = RectF(cardPad + 24f, upBadgeY, cardPad + 24f + upBadgeW, upBadgeY + upBadgeH)
        val upBadgeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#283548".toColorInt()
        }
        val upBadgeBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#55BDC2FF".toColorInt()
            style = Paint.Style.STROKE
            strokeWidth = 1.2f
        }
        canvas.drawRoundRect(upBadgeRect, 12f, 12f, upBadgeBg)
        canvas.drawRoundRect(upBadgeRect, 12f, 12f, upBadgeBorder)
        canvas.drawText(upBadgeText, cardPad + 34f, upBadgeY + upBadgeH * 0.72f, upBadgePaint)

        val nextTimePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.028f
            color = "#CBD5E1".toColorInt()
        }
        val nextStart = String.format(Locale.getDefault(), "%02d:00", nextHour)
        val nextEnd = String.format(Locale.getDefault(), "%02d:00", (nextHour + 1) % 24)
        canvas.drawText("$nextStart → $nextEnd", cardPad + 30f + upBadgeW + 12f, nextRow1Y, nextTimePaint)

        if (nextCat.isNotEmpty()) {
            val nextCatPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = nextBadge.textColor
                textSize = width * 0.022f
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            }
            val nextCatW = nextCatPaint.measureText(nextBadge.label) + 22f
            val nextCatX = cardPad + cardW - nextCatW - 24f
            val nextCatRect = RectF(nextCatX, upBadgeY, nextCatX + nextCatW, upBadgeY + upBadgeH)
            val nextCatBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = nextBadge.bgColor }
            val nextCatBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = nextBadge.borderColor
                style = Paint.Style.STROKE
                strokeWidth = 1.2f
            }
            canvas.drawRoundRect(nextCatRect, 12f, 12f, nextCatBg)
            canvas.drawRoundRect(nextCatRect, 12f, 12f, nextCatBorder)
            canvas.drawText(nextBadge.label, nextCatX + 11f, upBadgeY + upBadgeH * 0.72f, nextCatPaint)
        }

        if (nextTitle.isNotEmpty()) {
            val nextTitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                textSize = width * 0.040f
                color = "#E2E8F0".toColorInt()
            }
            var nextDisplayTitle = nextTitle
            val maxNextTitleW = cardW - 48f
            while (nextDisplayTitle.length > 3 && nextTitlePaint.measureText(nextDisplayTitle) > maxNextTitleW) {
                nextDisplayTitle = nextDisplayTitle.dropLast(1)
            }
            if (nextDisplayTitle.length < nextTitle.length) nextDisplayTitle += "…"
            canvas.drawText(nextDisplayTitle, cardPad + 24f, nextY + cardH2 * 0.78f, nextTitlePaint)
        } else {
            val unscheduledPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.ITALIC)
                textSize = width * 0.030f
                color = "#64748B".toColorInt()
            }
            canvas.drawText("Unscheduled", cardPad + 24f, nextY + cardH2 * 0.78f, unscheduledPaint)
        }

        val timelineEndY = nextY + cardH2

        // =========================================================================
        // 4. HOBBIES & PASSIONS (Full-width horizontal rows, zero clipping)
        // =========================================================================
        val hobGap = usableH * 0.018f
        val currentY = timelineEndY + hobGap

        if (userHabits.isEmpty()) {
            userHabits.add(HobbyItem("Mindful Focus", "🧘", userStreak, "Habit Track"))
            userHabits.add(HobbyItem("Daily Hydration", "💧", userStreak, "Vitality Track"))
        }

        val hobbiesCount = minOf(4, userHabits.size)
        val hobHeaderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.027f
            color = "#94A3B8".toColorInt()
        }
        val trackWord = if (hobbiesCount == 1) "TRACK" else "TRACKS"
        canvas.drawText("✦ HOBBIES & PASSIONS", cardPad + 12f, currentY + usableH * 0.010f, hobHeaderPaint)

        val countPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.RIGHT
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
            textSize = width * 0.024f
            color = "#64748B".toColorInt()
        }
        canvas.drawText("$hobbiesCount ACTIVE $trackWord", cardPad + cardW - 12f, currentY + usableH * 0.010f, countPaint)

        val hobStartY = currentY + usableH * 0.018f
        val hobItemGap = 14f
        val hobCardH = if (hobbiesCount <= 2) usableH * 0.068f else usableH * 0.058f

        val hobBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#D9131B2E".toColorInt()
            style = Paint.Style.FILL
        }
        val hobBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = "#24FFFFFF".toColorInt()
            style = Paint.Style.STROKE
            strokeWidth = 1.6f
        }

        for (idx in 0 until hobbiesCount) {
            val habit = userHabits[idx]
            val hY = hobStartY + idx * (hobCardH + hobItemGap)
            val hRect = RectF(cardPad, hY, cardPad + cardW, hY + hobCardH)
            canvas.drawRoundRect(hRect, 36f, 36f, hobBgPaint)
            canvas.drawRoundRect(hRect, 36f, 36f, hobBorderPaint)

            // Frosted Circle Container for Emoji on left
            val iconSize = hobCardH * 0.64f
            val iconX = cardPad + 20f
            val iconY = hY + (hobCardH - iconSize) / 2f
            val iconRect = RectF(iconX, iconY, iconX + iconSize, iconY + iconSize)
            val iconBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = "#14FFFFFF".toColorInt() }
            val iconBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = "#20FFFFFF".toColorInt()
                style = Paint.Style.STROKE
                strokeWidth = 1.2f
            }
            canvas.drawRoundRect(iconRect, iconSize / 2f, iconSize / 2f, iconBg)
            canvas.drawRoundRect(iconRect, iconSize / 2f, iconSize / 2f, iconBorder)

            // Emoji
            val emoji = resolveEmoji(habit.icon, habit.name)
            val emojiPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textSize = iconSize * 0.58f
                textAlign = Paint.Align.CENTER
            }
            canvas.drawText(emoji, iconRect.centerX(), iconRect.centerY() + iconSize * 0.22f, emojiPaint)

            // Right Streak Pill
            val streakText = "${habit.streak}d 🔥"
            val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.RIGHT
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.026f
                color = "#FBBF24".toColorInt()
            }
            val streakW = streakPaint.measureText(streakText) + 24f
            val streakH = hobCardH * 0.40f
            val streakX = cardPad + cardW - streakW - 18f
            val streakY = hY + (hobCardH - streakH) / 2f
            val streakRect = RectF(streakX, streakY, streakX + streakW, streakY + streakH)
            val streakBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = "#33F59E0B".toColorInt() }
            val streakBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = "#66F59E0B".toColorInt()
                style = Paint.Style.STROKE
                strokeWidth = 1.4f
            }
            canvas.drawRoundRect(streakRect, streakH / 2f, streakH / 2f, streakBg)
            canvas.drawRoundRect(streakRect, streakH / 2f, streakH / 2f, streakBorder)
            canvas.drawText(streakText, streakX + streakW - 10f, streakY + streakH * 0.70f, streakPaint)

            // Middle Text: Title + Subtitle (Spacious horizontal space - zero clipping!)
            val textX = iconX + iconSize + 18f
            val maxTextW = streakX - textX - 16f

            // Habit Title
            val hobNamePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                textSize = width * 0.034f
                color = Color.WHITE
            }
            var hDisplayName = habit.name
            while (hDisplayName.length > 3 && hobNamePaint.measureText(hDisplayName) > maxTextW) {
                hDisplayName = hDisplayName.dropLast(1)
            }
            if (hDisplayName.length < habit.name.length) hDisplayName += "…"
            canvas.drawText(hDisplayName, textX, hY + hobCardH * 0.48f, hobNamePaint)

            // Habit Subtitle / Category
            val hobSubPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
                textSize = width * 0.024f
                color = "#94A3B8".toColorInt()
            }
            val categoryLabel = if (habit.category.isNotEmpty()) "${habit.category} • Active Track" else "Active Daily Habit"
            var hDisplaySub = categoryLabel
            while (hDisplaySub.length > 3 && hobSubPaint.measureText(hDisplaySub) > maxTextW) {
                hDisplaySub = hDisplaySub.dropLast(1)
            }
            if (hDisplaySub.length < categoryLabel.length) hDisplaySub += "…"
            canvas.drawText(hDisplaySub, textX, hY + hobCardH * 0.80f, hobSubPaint)
        }

        // =========================================================================
        // 5. BOTTOM SAFE ZONE (Subtle brand tag & clean gesture zone)
        // =========================================================================
        val footPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = width * 0.022f
            color = "#40FFFFFF".toColorInt()
        }
        canvas.drawText("ODYSSEY LIVE SERVICE", width / 2f, height - bottomMargin * 0.40f, footPaint)
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
