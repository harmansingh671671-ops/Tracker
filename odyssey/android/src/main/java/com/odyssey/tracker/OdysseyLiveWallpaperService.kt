package com.odyssey.tracker

import android.content.Context
import android.graphics.*
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
 * - Inspects the current local hour.
 * - Dynamically centers the active hour at the screen center (offset: -2, -1, 0[ACTIVE], +1, +2).
 * - Leaves the top 22% completely clean for the phone's native lockscreen clock.
 * - Zero intrusive permissions: uses standard system BIND_WALLPAPER.
 * - Zero battery drain: sleeps whenever screen is off.
 */
class OdysseyLiveWallpaperService : WallpaperService() {

    override fun onCreateEngine(): Engine {
        return OdysseyWallpaperEngine()
    }

    inner class OdysseyWallpaperEngine : Engine() {
        private var visible = false

        override fun onVisibilityChanged(visible: Boolean) {
            this.visible = visible
            if (visible) {
                drawFrame()
            }
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

        private fun renderWallpaper(canvas: Canvas) {
            val width = canvas.width.toFloat()
            val height = canvas.height.toFloat()

            // 1. OLED Pure Dark Background
            canvas.drawColor(Color.parseColor("#090A0F"))

            // 2. Ambient Gradient Glows
            val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
            val topGrad = RadialGradient(
                width * 0.2f, height * 0.1f, width * 0.45f,
                Color.parseColor("#3B1E1B4B"), Color.TRANSPARENT,
                Shader.TileMode.CLAMP
            )
            glowPaint.shader = topGrad
            canvas.drawRect(0f, 0f, width, height * 0.35f, glowPaint)

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
            var rankName = "Explorer"
            var rankBadge = "🌱"
            var userLevel = 1
            var plannedHours = 18

            if (!rawJson.isNullOrEmpty()) {
                try {
                    val obj = JSONObject(rawJson)
                    chapter = obj.optInt("chapter", 1)
                    activeDay = obj.optInt("activeDay", 1)
                    rankName = obj.optString("rankName", "Explorer")
                    rankBadge = obj.optString("rankBadge", "🌱")
                    userLevel = obj.optInt("userLevel", 1)
                    plannedHours = obj.optInt("plannedHours", 18)
                } catch (e: Exception) {
                    Log.w("OdysseyLiveWallpaper", "JSON parse fallback: ${e.message}")
                }
            }

            val cardPad = width * 0.055f
            val cardW = width - cardPad * 2f

            // 3. TOP SAFE ZONE (Top ~22% is left 100% clean for phone's native clock)
            // Starts drawing around y = height * 0.21
            val headerY = height * 0.21f
            val headerH = height * 0.075f

            // 4. HEADER ANCHOR CARD
            val cardPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#B813151D")
                style = Paint.Style.FILL
            }
            val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#1FFFFFFF")
                style = Paint.Style.STROKE
                strokeWidth = 2f
            }
            val cornerRadius = 24f

            val headerRect = RectF(cardPad, headerY, cardPad + cardW, headerY + headerH)
            canvas.drawRoundRect(headerRect, cornerRadius, cornerRadius, cardPaint)
            canvas.drawRoundRect(headerRect, cornerRadius, cornerRadius, borderPaint)

            // Chapter & Day Info
            val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                textSize = width * 0.028f
                color = Color.parseColor("#94A3B8")
            }
            canvas.drawText("ODYSSEY • CH. 0$chapter   DAY $activeDay OF 365", cardPad + 30f, headerY + headerH * 0.38f, textPaint)

            val rankPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                textSize = width * 0.038f
                color = Color.WHITE
            }
            canvas.drawText("$rankBadge $rankName • Level $userLevel Cadence", cardPad + 30f, headerY + headerH * 0.78f, rankPaint)

            // Radial Planned Ring
            val ringRadius = headerH * 0.32f
            val ringCenterX = cardPad + cardW - ringRadius - 25f
            val ringCenterY = headerY + headerH / 2f

            val ringBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = 7f
                color = Color.parseColor("#1E293B")
            }
            canvas.drawCircle(ringCenterX, ringCenterY, ringRadius, ringBgPaint)

            val ringProgressPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = 7f
                strokeCap = Paint.Cap.ROUND
                color = Color.parseColor("#10B981")
            }
            val sweepAngle = (plannedHours / 24f) * 360f
            canvas.drawArc(
                RectF(ringCenterX - ringRadius, ringCenterY - ringRadius, ringCenterX + ringRadius, ringCenterY + ringRadius),
                -90f, sweepAngle, false, ringProgressPaint
            )

            // 5. 24-HOUR CADENCE SPECTRUM BAR
            val specY = headerY + headerH + height * 0.012f
            val specH = height * 0.045f
            val specRect = RectF(cardPad, specY, cardPad + cardW, specY + specH)
            canvas.drawRoundRect(specRect, 18f, 18f, cardPaint)
            canvas.drawRoundRect(specRect, 18f, 18f, borderPaint)

            val stripX = cardPad + 20f
            val stripY = specY + specH * 0.22f
            val stripW = cardW - 40f
            val stripH = specH * 0.24f

            val stripSlotW = stripW / 24f
            val slotPaint = Paint(Paint.ANTI_ALIAS_FLAG)
            for (h in 0 until 24) {
                val blockX = stripX + h * stripSlotW
                val col = when {
                    h >= 23 || h < 6 -> "#1E1B4B" // Rest
                    h in 6..7 -> "#10B981" // Vitality
                    h in 12..13 -> "#F59E0B" // Renewal
                    h in 17..18 -> "#0284C7" // Sync
                    else -> "#6366F1" // Deep focus
                }
                slotPaint.color = Color.parseColor(col)
                canvas.drawRect(blockX, stripY, blockX + stripSlotW, stripY + stripH, slotPaint)
            }

            // Needle pin
            val needleX = stripX + (currentHourFloat / 24f) * stripW
            val needlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#F59E0B")
            }
            canvas.drawCircle(needleX, stripY + stripH / 2f, 8f, needlePaint)

            // Spectrum labels
            val specLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = Typeface.MONOSPACE
                textSize = width * 0.022f
                color = Color.parseColor("#94A3B8")
            }
            canvas.drawText("00:00", stripX, specY + specH * 0.82f, specLabelPaint)
            val centerLabelPaint = Paint(specLabelPaint).apply {
                textAlign = Paint.Align.CENTER
                color = Color.parseColor("#F59E0B")
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            }
            canvas.drawText("● $timeStr ACTIVE", stripX + stripW / 2f, specY + specH * 0.82f, centerLabelPaint)
            val endLabelPaint = Paint(specLabelPaint).apply { textAlign = Paint.Align.RIGHT }
            canvas.drawText("24:00", stripX + stripW, specY + specH * 0.82f, endLabelPaint)

            // 6. ADAPTIVE SCHEDULE TIMELINE (6 to 7 Cards centered on currentHour)
            val blockCount = 6
            val timelineStartY = specY + specH + height * 0.012f
            val cardHeight = height * 0.044f
            val cardGap = height * 0.006f

            val half = blockCount / 2
            for (i in 0 until blockCount) {
                val offset = i - half
                val targetHour = (currentHour + offset + 24) % 24
                val cY = timelineStartY + i * (cardHeight + cardGap)
                val isActive = offset == 0
                val isPast = offset < 0

                val cRect = RectF(cardPad, cY, cardPad + cardW, cY + cardHeight)

                if (isActive) {
                    val activeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.parseColor("#161924")
                    }
                    val activeBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.parseColor("#E6F59E0B")
                        style = Paint.Style.STROKE
                        strokeWidth = 2.5f
                    }
                    canvas.drawRoundRect(cRect, 18f, 18f, activeBg)
                    canvas.drawRoundRect(cRect, 18f, 18f, activeBorder)

                    // Left amber accent bar
                    val accentPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.parseColor("#F59E0B")
                    }
                    canvas.drawRoundRect(RectF(cardPad, cY, cardPad + 7f, cY + cardHeight), 18f, 18f, accentPaint)
                } else {
                    val normalBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.parseColor(if (isPast) "#8013151D" else "#B813151D")
                    }
                    canvas.drawRoundRect(cRect, 18f, 18f, normalBg)
                    canvas.drawRoundRect(cRect, 18f, 18f, borderPaint)
                }

                // Left Dot
                val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor(if (isActive) "#F59E0B" else if (isPast) "#10B981" else "#64748B")
                }
                canvas.drawCircle(cardPad + 28f, cY + cardHeight / 2f, if (isActive) 6f else 4f, dotPaint)

                // Time String
                val timePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    typeface = Typeface.create(Typeface.MONOSPACE, if (isActive) Typeface.BOLD else Typeface.NORMAL)
                    textSize = width * 0.029f
                    color = Color.parseColor(if (isActive) "#FEF08A" else if (isPast) "#94A3B8" else "#CBD5E1")
                }
                val startTime = String.format("%02d:00", targetHour)
                val endTime = String.format("%02d:00", (targetHour + 1) % 24)
                canvas.drawText("$startTime → $endTime", cardPad + 48f, cY + cardHeight * 0.62f, timePaint)

                // Right-aligned Title & Status
                val rightTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    textAlign = Paint.Align.RIGHT
                    typeface = Typeface.create(Typeface.SANS_SERIF, if (isActive) Typeface.BOLD else Typeface.NORMAL)
                    textSize = width * 0.030f
                    color = Color.parseColor(if (isActive) "#FFFFFF" else if (isPast) "#94A3B8" else "#CBD5E1")
                }

                val title = when {
                    targetHour >= 23 || targetHour < 6 -> "Obsidian Rest"
                    targetHour in 6..7 -> "Morning Vitality"
                    targetHour in 12..13 -> "Mindful Recovery"
                    targetHour in 17..18 -> "Active Sync"
                    else -> "Focus Cadence"
                }

                if (isActive) {
                    canvas.drawText("● $title (NOW)", cardPad + cardW - 25f, cY + cardHeight * 0.62f, rightTextPaint)
                } else if (isPast) {
                    canvas.drawText("$title  ✓", cardPad + cardW - 25f, cY + cardHeight * 0.62f, rightTextPaint)
                } else {
                    canvas.drawText(title, cardPad + cardW - 25f, cY + cardHeight * 0.62f, rightTextPaint)
                }
            }

            val timelineEndY = timelineStartY + blockCount * (cardHeight + cardGap)

            // 7. DAILY CADENCE DIRECTIVE & INTEGRITY CARD (Fills down to bottom safe zone!)
            val dirY = timelineEndY + height * 0.012f
            val dirH = height * 0.155f
            val dirRect = RectF(cardPad, dirY, cardPad + cardW, dirY + dirH)
            canvas.drawRoundRect(dirRect, 22f, 22f, cardPaint)
            canvas.drawRoundRect(dirRect, 22f, 22f, borderPaint)

            val dirHeaderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#F59E0B")
                textSize = width * 0.026f
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            }
            canvas.drawText("✦ DAILY CADENCE DIRECTIVE", cardPad + 25f, dirY + dirH * 0.24f, dirHeaderPaint)

            val mantraPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#E2E8F0")
                textSize = width * 0.028f
                typeface = Typeface.DEFAULT
            }
            val mantra = if (currentHour >= 21 || currentHour < 6)
                "Honor your circadian recovery. Deep rest fuels tomorrow's uninterrupted focus."
            else if (currentHour in 12..13)
                "Step back for mindful recovery. Mental clarity is renewed in deliberate pauses."
            else
                "Protect your active focus blocks with absolute integrity. Momentum is built hour by hour."
            canvas.drawText(mantra, cardPad + 25f, dirY + dirH * 0.50f, mantraPaint)

            // Metric boxes
            val boxY = dirY + dirH * 0.62f
            val boxH = dirH * 0.30f
            val boxGap = 14f
            val boxW = (cardW - 40f - boxGap * 2f) / 3f
            for (p in 0..2) {
                val bX = cardPad + 20f + p * (boxW + boxGap)
                val bRect = RectF(bX, boxY, bX + boxW, boxY + boxH)
                canvas.drawRoundRect(bRect, 14f, 14f, cardPaint)
                canvas.drawRoundRect(bRect, 14f, 14f, borderPaint)

                val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor("#94A3B8")
                    textSize = width * 0.020f
                    typeface = Typeface.MONOSPACE
                }
                val topText = if (p == 0) "INTEGRITY" else if (p == 1) "STREAK" else "CHAPTER GOAL"
                val valText = if (p == 0) "100% 🛡️" else if (p == 1) "$activeDay Days 🔥" else "Sprint 1 ⚔️"
                canvas.drawText(topText, bX + 14f, boxY + boxH * 0.40f, labelPaint)

                val valPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = if (p == 0) Color.parseColor("#34D399") else if (p == 1) Color.parseColor("#FBBF24") else Color.parseColor("#A5B4FC")
                    textSize = width * 0.028f
                    typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                }
                canvas.drawText(valText, bX + 14f, boxY + boxH * 0.82f, valPaint)
            }

            // 8. BOTTOM SAFE FOOTNOTE (Leaves clearance for flashlight & camera)
            val footPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.CENTER
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
                textSize = width * 0.024f
                color = Color.parseColor("#4DFFFFFF")
            }
            canvas.drawText("ODYSSEY LIVE CADENCE • REAL-TIME", width / 2f, height * 0.945f, footPaint)
        }
    }
}
