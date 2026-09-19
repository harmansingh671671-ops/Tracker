package com.odyssey.tracker

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
import java.util.Calendar
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

/**
 * OdysseyLiveWallpaperService
 * 
 * Android Live Wallpaper Service that automatically displays the user's
 * daily Odyssey schedule on the Lock Screen and Home Screen.
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
                    drawFrame()
                    handler.postDelayed(this, 33) // ~30 FPS silky-smooth organic breathing
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
            } catch (_: Exception) {}
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
                ((icon.length in 1..4) && (!icon.all { (it.isLetterOrDigit() || it == '_' || it == '-') })) -> icon
                else -> "🎯"
            }
        }

        private fun renderWallpaper(canvas: Canvas) {
            val width = canvas.width.toFloat()
            val height = canvas.height.toFloat()

            // 1. OLED Pure Dark Background
            canvas.drawColor("#090A0F".toColorInt())

            // 2. Ambient Gradient Glows (Matches Odyssey Design System)
            val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
            val topGrad = RadialGradient(
                width * 0.2f, height * 0.12f, width * 0.5f,
                "#381E1B4B".toColorInt(), Color.TRANSPARENT,
                Shader.TileMode.CLAMP,
            )
            glowPaint.shader = topGrad
            canvas.drawRect(0f, 0f, width, height * 0.35f, glowPaint)

            val midGrad = RadialGradient(
                width * 0.85f, height * 0.52f, width * 0.45f,
                "#28064E3B".toColorInt(), Color.TRANSPARENT,
                Shader.TileMode.CLAMP,
            )
            glowPaint.shader = midGrad
            canvas.drawRect(width * 0.35f, height * 0.35f, width, height * 0.70f, glowPaint)

            // Current Time Calculations
            val cal = Calendar.getInstance()
            val currentHour = cal[Calendar.HOUR_OF_DAY]
            val currentMinute = cal[Calendar.MINUTE]
            val currentHourFloat = currentHour + currentMinute / 60f
            val timeStr = String.format(Locale.getDefault(), "%02d:%02d", currentHour, currentMinute)

            // Smooth breathing phase (0.0 to 1.0 over 2.4-second cycle) for organic fading and defading
            val elapsed = SystemClock.elapsedRealtime()
            val breathPhase = ((sin(elapsed / 1200.0 * Math.PI) + 1.0) / 2.0).toFloat()

            // Load Synced Schedule Data from SharedPreferences
            val prefs = getSharedPreferences("odyssey_prefs", MODE_PRIVATE)
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

            val cardPad = width * 0.036f
            val cardW = width - cardPad * 2f

            // FULL WALLPAPER SPACE ENGINE:
            // Proportional layout utilizing 100% of the screen height without empty voids or squeezing!
            val topMargin = height * 0.038f
            val bottomMargin = height * 0.028f
            val usableH = height - topMargin - bottomMargin

            // Helper to get category details
            fun getCategoryTheme(cat: String, h: Int): Pair<String, String> {
                val c = cat.lowercase()
                return when {
                    c.contains("sleep") || c.contains("rest") || (c.isEmpty() && h !in 6..22) -> Pair("Rest", "#818CF8")
                    c.contains("habit") || c.contains("vitality") || c.contains("gym") || (c.isEmpty() && h in 6..7) -> Pair("Vitality", "#34D399")
                    c.contains("sync") || c.contains("meeting") || (c.isEmpty() && h in 17..18) -> Pair("Sync", "#38BDF8")
                    c.contains("buffer") || c.contains("break") || c.contains("renewal") || (c.isEmpty() && h in 12..13) -> Pair("Renewal", "#FBBF24")
                    else -> Pair("Deep Focus", "#818CF8")
                }
            }

            // 1. HEADER ANCHOR CARD (Expansive, perfectly positioned near top)
            val headerY = topMargin
            val headerH = usableH * 0.102f
            val cardPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = "#C413151D".toColorInt()
                style = Paint.Style.FILL
            }
            val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = "#28FFFFFF".toColorInt()
                style = Paint.Style.STROKE
                strokeWidth = 1.8f
            }
            val headerRect = RectF(cardPad, headerY, cardPad + cardW, headerY + headerH)
            canvas.drawRoundRect(headerRect, 54f, 54f, cardPaint)
            canvas.drawRoundRect(headerRect, 54f, 54f, borderPaint)

            // Header Top Row: Odyssey Chapter & Day Badge
            val headTitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.030f
                color = "#94A3B8".toColorInt()
            }
            val chapterStr = "ODYSSEY • CH. 0$chapter"
            canvas.drawText(chapterStr, cardPad + 28f, headerY + headerH * 0.38f, headTitlePaint)

            // Day Badge Pill (Smooth rounded 20f pill)
            val dayBadgeText = "DAY $activeDay OF 365"
            val dayBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.024f
                color = "#34D399".toColorInt()
            }
            val dayBadgeW = dayBadgePaint.measureText(dayBadgeText) + 24f
            val dayBadgeX = cardPad + 28f + headTitlePaint.measureText(chapterStr) + 16f
            val dayBadgeH = headerH * 0.28f
            val dayBadgeY = headerY + headerH * 0.16f
            val dayBadgeRect = RectF(dayBadgeX, dayBadgeY, dayBadgeX + dayBadgeW, dayBadgeY + dayBadgeH)
            val dayBadgeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = "#2E10B981".toColorInt() }
            val dayBadgeBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = "#6610B981".toColorInt()
                style = Paint.Style.STROKE
                strokeWidth = 1.2f
            }
            canvas.drawRoundRect(dayBadgeRect, 20f, 20f, dayBadgeBg)
            canvas.drawRoundRect(dayBadgeRect, 20f, 20f, dayBadgeBorder)
            canvas.drawText(dayBadgeText, dayBadgeX + 12f, dayBadgeY + dayBadgeH * 0.72f, dayBadgePaint)

            // Header Bottom Row: Rank & Level
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
                color = "#94A3B8".toColorInt()
            }
            canvas.drawText("Level ${String.format(Locale.getDefault(), "%02d", userLevel)} Cadence", cardPad + 28f + rankPaint.measureText("$rankStr ") + 8f, headerY + headerH * 0.80f, subRankPaint)

            // Minimal Streak Count on Right (Solid, steady color)
            val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.RIGHT
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.048f
                color = "#F59E0B".toColorInt()
            }
            canvas.drawText("$userStreak 🔥", cardPad + cardW - 28f, headerY + headerH * 0.48f, streakPaint)

            val streakLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.RIGHT
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.022f
                color = "#94A3B8".toColorInt()
            }
            canvas.drawText("DAYS STREAK", cardPad + cardW - 28f, headerY + headerH * 0.80f, streakLabelPaint)

            // 2. TIMELINE HEADER & 24-HOUR CADENCE SPECTRUM BAR
            val gap1 = usableH * 0.014f
            val specHeaderY = headerY + headerH + gap1
            val headerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.028f
                color = "#94A3B8".toColorInt()
            }
            canvas.drawText("SCHEDULE • ACTIVE HOUR CENTERED", cardPad + 12f, specHeaderY, headerPaint)

            // Active timeline label (Clean steady color, no jumpy blinking)
            val beaconLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.RIGHT
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.028f
                color = "#F59E0B".toColorInt()
            }
            canvas.drawText("● $timeStr ACTIVE", cardPad + cardW - 12f, specHeaderY, beaconLabelPaint)

            val specY = specHeaderY + usableH * 0.008f
            val specH = usableH * 0.058f
            val specRect = RectF(cardPad, specY, cardPad + cardW, specY + specH)
            canvas.drawRoundRect(specRect, 34f, 34f, cardPaint)
            canvas.drawRoundRect(specRect, 34f, 34f, borderPaint)

            val stripX = cardPad + 22f
            val stripY = specY + specH * 0.22f
            val stripW = cardW - 44f
            val stripH = specH * 0.28f
            val stripSlotW = stripW / 24f

            // Multi-segment 24-hour spectrum with real categories
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
            // RADIANT BREATHING GLOWING TIMELINE BEACON (Smooth fading & defading, NO blinking!)
            // =========================================================================
            val needleX = stripX + (currentHourFloat / 24f) * stripW
            val needleCenterY = stripY + stripH / 2f

            // Tier 1: Soft Ambient Radiant Glow Aura (Smooth breathing: radius 38f..56f, alpha 35..90)
            val auraRadius = 38f + 18f * breathPhase
            val auraAlpha = (35 + (55 * breathPhase)).toInt().coerceIn(0, 255)
            val auraPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.argb(auraAlpha, 245, 158, 11)
            }
            canvas.drawCircle(needleX, needleCenterY, auraRadius, auraPaint)

            // Tier 2: Bright Radiant Halo Ring (Smooth breathing: radius 24f..30f, alpha 65..135)
            val haloRadius = 24f + 6f * breathPhase
            val haloAlpha = (65 + (70 * breathPhase)).toInt().coerceIn(0, 255)
            val haloPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.argb(haloAlpha, 245, 158, 11)
            }
            canvas.drawCircle(needleX, needleCenterY, haloRadius, haloPaint)

            // Tier 3: Main Amber Glowing Marker Body (Solid 19f radius / 38px diameter > 26px bar!)
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

            // Spectrum labels
            val specLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.MONOSPACE
                textSize = width * 0.023f
                color = "#64748B".toColorInt()
            }
            canvas.drawText("00:00", stripX, specY + specH * 0.84f, specLabelPaint)
            canvas.drawText("06:00", stripX + stripW * 0.23f, specY + specH * 0.84f, specLabelPaint)
            val centerLabelPaint = Paint(specLabelPaint).apply {
                textAlign = Paint.Align.CENTER
                color = "#F59E0B".toColorInt()
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            }
            canvas.drawText("● 12:00", stripX + stripW / 2f, specY + specH * 0.84f, centerLabelPaint)
            canvas.drawText("18:00", stripX + stripW * 0.77f, specY + specH * 0.84f, specLabelPaint)
            val endLabelPaint = Paint(specLabelPaint).apply { textAlign = Paint.Align.RIGHT }
            canvas.drawText("24:00", stripX + stripW, specY + specH * 0.84f, endLabelPaint)

            // =========================================================================
            // 3. 5-CARD HOURLY SCHEDULE WINDOW (High-Curvature 54f, Expansive, NO Left Bar!)
            // =========================================================================
            val blockCount = 5
            val gap2 = usableH * 0.014f
            val timelineStartY = specY + specH + gap2
            val scheduleTotalH = usableH * 0.530f
            val cardGap = usableH * 0.011f
            val cardHeight = (scheduleTotalH - 4f * cardGap) / 5f

            val half = blockCount / 2
            for (i in 0 until blockCount) {
                val offset = i - half
                val targetHour = (currentHour + offset + 24) % 24
                val cY = timelineStartY + i * (cardHeight + cardGap)
                val isActive = offset == 0
                val isPast = offset < 0

                val cRect = RectF(cardPad, cY, cardPad + cardW, cY + cardHeight)

                // Match user task from synced database
                val matching = userBlocks.find { b -> 
                    (targetHour >= b.startHour && targetHour < b.endHour) ||
                    b.startTime.startsWith(String.format(Locale.getDefault(), "%02d", targetHour))
                }
                val title = matching?.title ?: when (targetHour) {
                    !in 6..22 -> if (targetHour == 23) "Wind Down & Rest" else "Obsidian Rest & Sleep"
                    in 6..7 -> "Morning Vitality & Priming"
                    in 12..13 -> "Mindful Recovery & Lunch"
                    in 17..18 -> "Active Sync & Movement"
                    else -> "Deep Focus Block"
                }

                val cat = matching?.category ?: ""
                val (catLabel, catColor) = getCategoryTheme(cat, targetHour)

                if (isActive) {
                    val activeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = "#181B26".toColorInt()
                    }
                    val activeBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = "#F59E0B".toColorInt()
                        style = Paint.Style.STROKE
                        strokeWidth = 2.8f
                    }
                    // Clean, symmetrical 54f rounded card (left accent bar REMOVED!)
                    canvas.drawRoundRect(cRect, 54f, 54f, activeBg)
                    canvas.drawRoundRect(cRect, 54f, 54f, activeBorder)
                } else {
                    val normalBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = (if (isPast) "#8013151D" else "#BF13151D").toColorInt()
                    }
                    canvas.drawRoundRect(cRect, 54f, 54f, normalBg)
                    canvas.drawRoundRect(cRect, 54f, 54f, borderPaint)
                }

                // ROW 1 OF CARD: Time Range + Category Pill
                val row1Y = cY + cardHeight * 0.36f

                // Left Dot Indicator (Smooth breathing glow on active dot, NO blinking!)
                val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG)
                val dotX = cardPad + 30f
                val dotY = row1Y - 6f
                if (isActive) {
                    // Outer aura gently expands 11f..15f and fades 40..90
                    val dotGlowAlpha = (40 + (50 * breathPhase)).toInt().coerceIn(0, 255)
                    val dotGlow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.argb(dotGlowAlpha, 245, 158, 11)
                    }
                    canvas.drawCircle(dotX, dotY, 11f + 4f * breathPhase, dotGlow)
                    
                    // Core dot: solid amber with gentle smooth alpha breathing 200..255 (never disappears)
                    val dotAlpha = (200 + (55 * breathPhase)).toInt().coerceIn(0, 255)
                    dotPaint.color = Color.argb(dotAlpha, 245, 158, 11)
                    canvas.drawCircle(dotX, dotY, 7f, dotPaint)
                } else {
                    dotPaint.color = (if (isPast) "#10B981" else "#475569").toColorInt()
                    canvas.drawCircle(dotX, dotY, 5.5f, dotPaint)
                }

                // Time String (Large & Bold)
                val timePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                    textSize = width * 0.034f
                    color = (if (isActive) "#FEF08A" else if (isPast) "#94A3B8" else "#E2E8F0").toColorInt()
                }
                val startTime = String.format(Locale.getDefault(), "%02d:00", targetHour)
                val endTime = String.format(Locale.getDefault(), "%02d:00", (targetHour + 1) % 24)
                val timeText = "$startTime → $endTime"
                canvas.drawText(timeText, cardPad + 50f, row1Y, timePaint)

                // Category Pill Badge (Smooth 18f rounded pill)
                val pillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = catColor.toColorInt()
                    textSize = width * 0.025f
                    typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                }
                val pillTextW = pillPaint.measureText(catLabel)
                val pillH = cardHeight * 0.30f
                val pillW = pillTextW + 24f
                val pillX = cardPad + cardW - pillW - 20f
                val pillY = cY + cardHeight * 0.12f
                val pillRect = RectF(pillX, pillY, pillX + pillW, pillY + pillH)
                val pillBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = ("#2E" + catColor.removePrefix("#")).toColorInt()
                }
                val pillBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = ("#66" + catColor.removePrefix("#")).toColorInt()
                    style = Paint.Style.STROKE
                    strokeWidth = 1.4f
                }
                canvas.drawRoundRect(pillRect, 18f, 18f, pillBg)
                canvas.drawRoundRect(pillRect, 18f, 18f, pillBorder)
                canvas.drawText(catLabel, pillX + 12f, pillY + pillH * 0.72f, pillPaint)

                // ROW 2 OF CARD: Full-Width Task Title + Status
                val row2Y = cY + cardHeight * 0.78f

                var statusW = 0f
                if (isActive) {
                    val nowText = "● NOW"
                    val nowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        textAlign = Paint.Align.RIGHT
                        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        textSize = width * 0.028f
                        color = "#F59E0B".toColorInt()
                    }
                    statusW = nowPaint.measureText(nowText) + 14f
                    canvas.drawText(nowText, cardPad + cardW - 22f, row2Y, nowPaint)
                } else if (isPast) {
                    val doneText = "✓ DONE"
                    val donePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        textAlign = Paint.Align.RIGHT
                        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        textSize = width * 0.026f
                        color = "#10B981".toColorInt()
                    }
                    statusW = donePaint.measureText(doneText) + 14f
                    canvas.drawText(doneText, cardPad + cardW - 22f, row2Y, donePaint)
                }

                // Task Title (Large, Bold, across the full card width)
                val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                    textSize = width * 0.040f
                    color = (if (isActive) "#FFFFFF" else if (isPast) "#94A3B8" else "#F1F5F9").toColorInt()
                }

                val maxTitleW = cardW - 70f - statusW
                var displayTitle = title
                while (displayTitle.length > 3 && titlePaint.measureText(displayTitle) > maxTitleW) {
                    displayTitle = displayTitle.dropLast(1)
                }
                if (displayTitle.length < title.length) displayTitle += "…"

                canvas.drawText(displayTitle, cardPad + 30f, row2Y, titlePaint)
            }

            val timelineEndY = timelineStartY + scheduleTotalH

            // =========================================================================
            // 4. CADENCE HOBBIES & PASSIONS (Guaranteed display, fills space to bottom!)
            // =========================================================================
            val gap3 = usableH * 0.015f
            val currentY = timelineEndY + gap3

            if (userHabits.isEmpty()) {
                userHabits.add(HobbyItem("Mindful Focus", "🧘", userStreak, "Cadence Track"))
                userHabits.add(HobbyItem("Daily Hydration", "💧", userStreak, "Vitality Track"))
            }

            val hobbiesCount = minOf(4, userHabits.size)
            val hobHeaderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.027f
                color = "#94A3B8".toColorInt()
            }
            val trackWord = if (hobbiesCount == 1) "TRACK" else "TRACKS"
            canvas.drawText("✦ CADENCE • HOBBIES & PASSIONS", cardPad + 12f, currentY + usableH * 0.010f, hobHeaderPaint)

            val countBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.RIGHT
                typeface = Typeface.MONOSPACE
                textSize = width * 0.024f
                color = "#64748B".toColorInt()
            }
            canvas.drawText("$hobbiesCount ACTIVE $trackWord", cardPad + cardW - 12f, currentY + usableH * 0.010f, countBadgePaint)

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
                    canvas.drawRoundRect(hRect, 44f, 44f, cardPaint)
                    canvas.drawRoundRect(hRect, 44f, 44f, borderPaint)

                    // Emoji
                    val emoji = resolveEmoji(habit.icon, habit.name)
                    val emojiPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = width * 0.052f }
                    canvas.drawText(emoji, hX + 22f, hY + hobCardH * 0.52f, emojiPaint)

                    // Streak badge
                    val streakText = "${habit.streak}d 🔥"
                    val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        textAlign = Paint.Align.RIGHT
                        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        textSize = width * 0.028f
                        color = "#F59E0B".toColorInt()
                    }
                    canvas.drawText(streakText, hX + hobCardW - 18f, hY + hobCardH * 0.44f, streakPaint)

                    // Name
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
                    canvas.drawRoundRect(hRect, 38f, 38f, cardPaint)
                    canvas.drawRoundRect(hRect, 38f, 38f, borderPaint)

                    // Emoji
                    val emoji = resolveEmoji(habit.icon, habit.name)
                    val emojiPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = width * 0.046f }
                    canvas.drawText(emoji, hX + 18f, hY + hobCardH * 0.50f, emojiPaint)

                    // Streak badge
                    val streakText = "${habit.streak}d 🔥"
                    val streakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        textAlign = Paint.Align.RIGHT
                        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        textSize = width * 0.026f
                        color = "#F59E0B".toColorInt()
                    }
                    canvas.drawText(streakText, hX + hobCardW - 16f, hY + hobCardH * 0.42f, streakPaint)

                    // Name
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

            // 5. BOTTOM SUBTLE FOOTNOTE
            val footPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.CENTER
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
                textSize = width * 0.022f
                color = "#44FFFFFF".toColorInt()
            }
            canvas.drawText("ODYSSEY LIVE CADENCE • REAL-TIME", width / 2f, height - bottomMargin * 0.40f, footPaint)
        }
    }
}
