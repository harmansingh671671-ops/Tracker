package com.odyssey.tracker

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.*
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.service.wallpaper.WallpaperService
import android.util.Log
import android.view.SurfaceHolder
import androidx.core.content.ContextCompat
import androidx.core.graphics.toColorInt
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlin.math.sin

data class ScheduleBlockItem(
    val startHour: Int,
    val endHour: Int,
    val startTime: String,
    val endTime: String,
    val title: String,
    val category: String,
)

data class HobbyItem(
    val name: String,
    val icon: String,
    val streak: Int,
    val category: String,
)

data class WallpaperCategoryBadge(
    val label: String,
    val textColor: Int,
    val bgColor: Int,
    val borderColor: Int,
)

/**
 * OdysseyLiveWallpaperService
 * 
 * Android Live Wallpaper Service that automatically displays the user's
 * daily Odyssey schedule on the Lock Screen and Home Screen with 1:1 visual parity
 * to the web app's Wallpaper page simulator.
 * 
 * Real-Time Dynamics:
 * - Wakes up when the screen turns on.
 * - Runs a smooth, organic breathing/fading glow animation for the active task beacon.
 * - Reads real user tasks from latest_schedule_json (synced from the Odyssey app).
 * - Reacts instantly to ACTION_WALLPAPER_DATA_UPDATED broadcasts from the web app.
 * - Features high-curvature rounded cards (54f) and a radiant, enlarged glowing timeline beacon.
 * - Fully utilizes screen height from top to bottom (no wasted space, no squeezed content).
 * - Zero battery drain: sleeps and removes callbacks whenever screen is off.
 */
@SuppressLint("NewApi")
class OdysseyLiveWallpaperService : WallpaperService() {

    override fun onCreateEngine(): Engine {
        return OdysseyWallpaperEngine()
    }

    inner class OdysseyWallpaperEngine : Engine() {
        private var visible = false
        private val handler = Handler(Looper.getMainLooper())

        private val updateReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                Log.d("OdysseyLiveWallpaper", "ACTION_WALLPAPER_DATA_UPDATED received! Refreshing canvas immediately...")
                drawFrame()
            }
        }

        private val pulseRunnable = object : Runnable {
            override fun run() {
                if (visible) {
                    val prefs = getSharedPreferences("odyssey_prefs", MODE_PRIVATE)
                    val isEnabled = prefs.getBoolean("wallpaper_enabled", true)
                    drawFrame()
                    if (isEnabled) {
                        handler.postDelayed(this, 33) // ~30 FPS silky-smooth organic breathing
                    }
                }
            }
        }

        override fun onCreate(surfaceHolder: SurfaceHolder?) {
            super.onCreate(surfaceHolder)
            try {
                val filter = IntentFilter("com.odyssey.tracker.ACTION_WALLPAPER_DATA_UPDATED")
                ContextCompat.registerReceiver(
                    this@OdysseyLiveWallpaperService,
                    updateReceiver,
                    filter,
                    ContextCompat.RECEIVER_NOT_EXPORTED,
                )
                Log.d("OdysseyLiveWallpaper", "Registered broadcast receiver for dynamic schedule updates")
            } catch (e: Exception) {
                Log.w("OdysseyLiveWallpaper", "Could not register updateReceiver: ${e.message}")
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
            try {
                unregisterReceiver(updateReceiver)
            } catch (e: Exception) {}
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
                canvas?.let {
                    renderWallpaper(it)
                }
            } catch (e: Exception) {
                Log.e("OdysseyLiveWallpaper", "Canvas render error: ${e.message}", e)
            } finally {
                canvas?.let {
                    try {
                        holder.unlockCanvasAndPost(it)
                    } catch (e: Exception) {
                        Log.e("OdysseyLiveWallpaper", "Canvas unlock error: ${e.message}")
                    }
                }
            }
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

        private fun renderWallpaper(canvas: Canvas) {
            val width = canvas.width.toFloat()
            val height = canvas.height.toFloat()

            val prefs = getSharedPreferences("odyssey_prefs", MODE_PRIVATE)
            val isEnabled = prefs.getBoolean("wallpaper_enabled", true)

            // When user turned off Odyssey wallpaper, restore custom photo or render sleek clean canvas
            if (!isEnabled) {
                val customFile = java.io.File(filesDir, "custom_restoration_wallpaper.png")
                val customBitmap = if (customFile.exists()) {
                    BitmapFactory.decodeFile(customFile.absolutePath)
                } else null

                if (customBitmap != null) {
                    val canvasRatio = width / height
                    val bitmapRatio = customBitmap.width.toFloat() / customBitmap.height.toFloat()
                    val cropSrc = if (bitmapRatio > canvasRatio) {
                        val newSrcW = (customBitmap.height * canvasRatio).toInt()
                        val srcX = (customBitmap.width - newSrcW) / 2
                        Rect(srcX, 0, srcX + newSrcW, customBitmap.height)
                    } else {
                        val newSrcH = (customBitmap.width / canvasRatio).toInt()
                        val srcY = (customBitmap.height - newSrcH) / 2
                        Rect(0, srcY, customBitmap.width, srcY + newSrcH)
                    }
                    val dstRect = RectF(0f, 0f, width, height)
                    val p = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
                    canvas.drawBitmap(customBitmap, cropSrc, dstRect, p)
                    return
                }

                // If no custom photo is stored, render clean dark OLED canvas
                canvas.drawColor("#090A0F".toColorInt())
                return
            }

            // 1. OLED Pure Dark Background
            canvas.drawColor("#090A0F".toColorInt())

            // 2. Ambient Gradient Glows (Matches Odyssey Design System)
            val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
            val topGrad = RadialGradient(
                width * 0.15f, height * 0.10f, width * 0.55f,
                "#381E1B4B".toColorInt(), Color.TRANSPARENT,
                Shader.TileMode.CLAMP,
            )
            glowPaint.shader = topGrad
            canvas.drawRect(0f, 0f, width, height * 0.35f, glowPaint)

            val midGrad = RadialGradient(
                width * 0.85f, height * 0.50f, width * 0.50f,
                "#28064E3B".toColorInt(), Color.TRANSPARENT,
                Shader.TileMode.CLAMP,
            )
            glowPaint.shader = midGrad
            canvas.drawRect(width * 0.30f, height * 0.30f, width, height * 0.70f, glowPaint)

            val botGrad = RadialGradient(
                width * 0.20f, height * 0.85f, width * 0.50f,
                "#300F172A".toColorInt(), Color.TRANSPARENT,
                Shader.TileMode.CLAMP,
            )
            glowPaint.shader = botGrad
            canvas.drawRect(0f, height * 0.65f, width, height, glowPaint)

            // Current Time Calculations
            val cal = Calendar.getInstance()
            val currentHour = cal[Calendar.HOUR_OF_DAY]
            val currentMinute = cal[Calendar.MINUTE]
            val currentHourFloat = currentHour + currentMinute / 60f

            // Smooth breathing phase (0.0 to 1.0 over 2.4-second cycle) for organic fading and defading
            val elapsed = SystemClock.elapsedRealtime()
            val breathPhase = ((sin(elapsed / 1200.0 * Math.PI) + 1.0) / 2.0).toFloat()

            // Load Synced Schedule Data from SharedPreferences
            val rawJson = prefs.getString("latest_schedule_json", null)
            var chapter = 1
            var activeDay = 1
            var rankName = "Beginner"
            var rankBadge = "🌱"
            var userLevel = 1
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
                    userStreak = obj.optInt("userStreak", activeDay)

                    // Ensure we do NOT loop previous day's schedule into today
                    val savedDateStr = obj.optString("dateStr", "")
                    val todayDateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                    val isDateCurrent = savedDateStr.isEmpty() || savedDateStr == todayDateStr

                    // Parse real user blocks only if for today
                    val blocksArr = obj.optJSONArray("blocks")
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
                    val habitsArr = obj.optJSONArray("habits")
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
                } catch (e: Exception) {
                    Log.w("OdysseyLiveWallpaper", "JSON parse error: ${e.message}")
                }
            }

            val cardPad = width * 0.040f
            val cardW = width - cardPad * 2f

            // FULL WALLPAPER SPACE ENGINE:
            // Proportional layout utilizing 100% of screen height without empty voids or squeezing!
            val topMargin = height * 0.042f
            val bottomMargin = height * 0.030f
            val usableH = height - topMargin - bottomMargin

            // Helper to get category colors for the spectrum timeline
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
            // 1. HEADER ANCHOR CARD (Utilizes upper area, matching web wallpaper preview)
            // =========================================================================
            val headerY = topMargin
            val headerH = usableH * 0.108f
            val headerRect = RectF(cardPad, headerY, cardPad + cardW, headerY + headerH)
            canvas.drawRoundRect(headerRect, 54f, 54f, cardBgPaint)
            canvas.drawRoundRect(headerRect, 54f, 54f, cardBorderPaint)

            // Header Top Row: Odyssey Chapter & Day Badge
            val headTitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.028f
                color = "#94A3B8".toColorInt()
            }
            val chapterStr = "ODYSSEY • CH. 0$chapter"
            val chapterY = headerY + headerH * 0.32f
            canvas.drawText(chapterStr, cardPad + 28f, chapterY, headTitlePaint)

            // Day Badge Pill (Smooth rounded 18f pill)
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

            // Header Middle Row: Rank Badge + Rank Name
            val rankPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                textSize = width * 0.042f
                color = Color.WHITE
            }
            val rankStr = "$rankBadge $rankName"
            val rankY = headerY + headerH * 0.64f
            canvas.drawText(rankStr, cardPad + 28f, rankY, rankPaint)

            // Header Bottom Row: Level Subtitle (Dedicated 3rd line)
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
            // 2. 24-HOUR SPECTRUM BAR (Expanded, clean, with glowing needle beacon)
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
            val stripSlotW = stripW / 24f

            // Multi-segment 24-hour spectrum with category colors
            val slotPaint = Paint(Paint.ANTI_ALIAS_FLAG)
            for (h in 0 until 24) {
                val blockX = stripX + h * stripSlotW
                val matching = userBlocks.find { b -> h >= b.startHour && h < b.endHour }
                val cat = matching?.category ?: ""
                val (_, colorHex) = getCategoryTheme(cat, h)
                slotPaint.color = colorHex.toColorInt()
                if (h == currentHour) {
                    slotPaint.color = "#F59E0B".toColorInt()
                }
                canvas.drawRect(blockX, stripY, blockX + stripSlotW, stripY + stripH, slotPaint)
            }

            // =========================================================================
            // RADIANT BREATHING GLOWING TIMELINE BEACON (Smooth breathing aura)
            // =========================================================================
            val needleX = stripX + (currentHourFloat / 24f) * stripW
            val needleCenterY = stripY + stripH / 2f

            // Tier 1: Soft Ambient Radiant Glow Aura (Smooth breathing: radius 38f..54f, alpha 35..85)
            val auraRadius = 38f + 16f * breathPhase
            val auraAlpha = (35 + (50 * breathPhase)).toInt().coerceIn(0, 255)
            val auraPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.argb(auraAlpha, 245, 158, 11)
            }
            canvas.drawCircle(needleX, needleCenterY, auraRadius, auraPaint)

            // Tier 2: Bright Radiant Halo Ring (Smooth breathing: radius 24f..30f, alpha 65..125)
            val haloRadius = 24f + 6f * breathPhase
            val haloAlpha = (65 + (60 * breathPhase)).toInt().coerceIn(0, 255)
            val haloPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.argb(haloAlpha, 245, 158, 11)
            }
            canvas.drawCircle(needleX, needleCenterY, haloRadius, haloPaint)

            // Tier 3: Main Amber Glowing Marker Body (Solid 19f radius / 38px diameter > 24px bar!)
            val needlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = "#F59E0B".toColorInt()
            }
            canvas.drawCircle(needleX, needleCenterY, 19f, needlePaint)

            // Tier 4: Neon Outer Stroke (Crisp steady rim)
            val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = "#FEF08A".toColorInt()
                style = Paint.Style.STROKE
                strokeWidth = 2.4f
            }
            canvas.drawCircle(needleX, needleCenterY, 19f, strokePaint)

            // Tier 5: Specular White Center Pinpoint (Pure white intense core)
            val whiteCorePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.WHITE
            }
            canvas.drawCircle(needleX, needleCenterY, 7f, whiteCorePaint)

            // Active hour time badge directly below moving beacon dot
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
            val pillX = (needleX - pillW / 2f).coerceIn(cardPad + 10f, cardPad + cardW - pillW - 10f)
            val pillY = needleCenterY + 24f
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

            // Dynamic Live Breathing Aura around NOW Card
            val curGlowAlpha = (40 + (50 * breathPhase)).toInt().coerceIn(0, 255)
            val curGlowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.argb(curGlowAlpha, 90, 240, 179)
                style = Paint.Style.STROKE
                strokeWidth = 5f + (3f * breathPhase)
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

            // Current Row 1: "NOW" Pill Badge + Time Range + Category Pill
            val curRow1Y = curY + cardH1 * 0.36f

            // Emerald "NOW" Badge Pill
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

            // Current Time Range
            val curTimePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.032f
                color = "#FEF08A".toColorInt()
            }
            val curStart = String.format(Locale.getDefault(), "%02d:00", currentHour)
            val curEnd = String.format(Locale.getDefault(), "%02d:00", (currentHour + 1) % 24)
            canvas.drawText("$curStart → $curEnd", cardPad + 32f + nowBadgeW + 12f, curRow1Y, curTimePaint)

            // Current Category Pill Badge (Right side)
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

            // Current Row 2: Large Bold Task Title (Or "Unscheduled" in italic)
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

            // Upcoming Row 1: "UPCOMING" Pill + Time Range + Category Pill
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

            // Upcoming Category badge (Right side)
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

            // Upcoming Row 2: Upcoming Task Title (Or "Unscheduled" in italic)
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
            // 4. HOBBIES & PASSIONS (Guaranteed display, fills remaining screen down to bottom)
            // =========================================================================
            val hobGap = usableH * 0.015f
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

            val countBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.RIGHT
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
                textSize = width * 0.024f
                color = "#64748B".toColorInt()
            }
            canvas.drawText("$hobbiesCount ACTIVE $trackWord", cardPad + cardW - 12f, currentY + usableH * 0.010f, countBadgePaint)

            val hobStartY = currentY + usableH * 0.014f
            val hobFootnoteH = usableH * 0.025f
            val hobAvailableH = (topMargin + usableH) - hobStartY - hobFootnoteH
            val cardItemGap = 14f

            val rows = (hobbiesCount + 1) / 2
            if (rows == 1) {
                // 1 row: 1 full-width card or 2 side-by-side cards with expansive height
                val isSingle = hobbiesCount == 1
                val hobCardW = if (isSingle) cardW else (cardW - cardItemGap) / 2f
                val hobCardH = minOf(usableH * 0.130f, hobAvailableH)

                for (idx in 0 until hobbiesCount) {
                    val habit = userHabits[idx]
                    val hX = if (isSingle) cardPad else cardPad + idx * (hobCardW + cardItemGap)
                    val hY = hobStartY
                    val hRect = RectF(hX, hY, hX + hobCardW, hY + hobCardH)
                    canvas.drawRoundRect(hRect, 44f, 44f, cardBgPaint)
                    canvas.drawRoundRect(hRect, 44f, 44f, cardBorderPaint)

                    // Emoji on left
                    val emoji = resolveEmoji(habit.icon, habit.name)
                    val emojiPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = width * 0.052f }
                    canvas.drawText(emoji, hX + 22f, hY + hobCardH * 0.52f, emojiPaint)

                    // Streak badge on right
                    val streakText = "${habit.streak}d 🔥"
                    val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        textAlign = Paint.Align.RIGHT
                        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        textSize = width * 0.026f
                        color = "#FBBF24".toColorInt()
                    }
                    val streakW = streakPaint.measureText(streakText) + 20f
                    val streakH = hobCardH * 0.32f
                    val streakX = hX + hobCardW - streakW - 18f
                    val streakY = hY + hobCardH * 0.16f
                    val streakRect = RectF(streakX, streakY, streakX + streakW, streakY + streakH)
                    val streakBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = "#33F59E0B".toColorInt() }
                    val streakBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = "#66F59E0B".toColorInt()
                        style = Paint.Style.STROKE
                        strokeWidth = 1.2f
                    }
                    canvas.drawRoundRect(streakRect, 14f, 14f, streakBg)
                    canvas.drawRoundRect(streakRect, 14f, 14f, streakBorder)
                    canvas.drawText(streakText, streakX + streakW - 10f, streakY + streakH * 0.72f, streakPaint)

                    // Title & Category in middle
                    val hobNamePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                        textSize = width * 0.034f
                        color = Color.WHITE
                    }
                    var hDisplayName = habit.name
                    val maxNameW = hobCardW - streakW - 64f
                    while (hDisplayName.length > 3 && hobNamePaint.measureText(hDisplayName) > maxNameW) {
                        hDisplayName = hDisplayName.dropLast(1)
                    }
                    if (hDisplayName.length < habit.name.length) hDisplayName += "…"
                    canvas.drawText(hDisplayName, hX + 22f, hY + hobCardH * 0.82f, hobNamePaint)
                }
            } else {
                // 2 rows of 2 columns, filling available height evenly
                val hobCardW = (cardW - cardItemGap) / 2f
                val hobCardH = (hobAvailableH - cardItemGap) / 2f

                for (idx in 0 until hobbiesCount) {
                    val habit = userHabits[idx]
                    val r = idx / 2
                    val c = idx % 2
                    val hX = cardPad + c * (hobCardW + cardItemGap)
                    val hY = hobStartY + r * (hobCardH + cardItemGap)

                    val hRect = RectF(hX, hY, hX + hobCardW, hY + hobCardH)
                    canvas.drawRoundRect(hRect, 38f, 38f, cardBgPaint)
                    canvas.drawRoundRect(hRect, 38f, 38f, cardBorderPaint)

                    // Emoji on left
                    val emoji = resolveEmoji(habit.icon, habit.name)
                    val emojiPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = width * 0.046f }
                    canvas.drawText(emoji, hX + 18f, hY + hobCardH * 0.48f, emojiPaint)

                    // Streak badge on right
                    val streakText = "${habit.streak}d 🔥"
                    val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        textAlign = Paint.Align.RIGHT
                        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        textSize = width * 0.024f
                        color = "#FBBF24".toColorInt()
                    }
                    val streakW = streakPaint.measureText(streakText) + 18f
                    val streakH = hobCardH * 0.32f
                    val streakX = hX + hobCardW - streakW - 14f
                    val streakY = hY + hobCardH * 0.14f
                    val streakRect = RectF(streakX, streakY, streakX + streakW, streakY + streakH)
                    val streakBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = "#33F59E0B".toColorInt() }
                    val streakBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = "#66F59E0B".toColorInt()
                        style = Paint.Style.STROKE
                        strokeWidth = 1.2f
                    }
                    canvas.drawRoundRect(streakRect, 12f, 12f, streakBg)
                    canvas.drawRoundRect(streakRect, 12f, 12f, streakBorder)
                    canvas.drawText(streakText, streakX + streakW - 8f, streakY + streakH * 0.72f, streakPaint)

                    // Title
                    val hobNamePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                        textSize = width * 0.030f
                        color = Color.WHITE
                    }
                    var hDisplayName = habit.name
                    val maxNameW = hobCardW - 36f
                    while (hDisplayName.length > 3 && hobNamePaint.measureText(hDisplayName) > maxNameW) {
                        hDisplayName = hDisplayName.dropLast(1)
                    }
                    if (hDisplayName.length < habit.name.length) hDisplayName += "…"
                    canvas.drawText(hDisplayName, hX + 18f, hY + hobCardH * 0.82f, hobNamePaint)
                }
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
    }
}
