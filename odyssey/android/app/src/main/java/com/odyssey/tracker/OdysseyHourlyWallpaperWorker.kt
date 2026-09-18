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
 * It calculates the active hour, renders the dynamic adaptive lockscreen canvas,
 * and sets the lockscreen wallpaper automatically via WallpaperManager.FLAG_LOCK.
 * 
 * Safe permissions used:
 * - android.permission.SET_WALLPAPER
 * - android.permission.SCHEDULE_EXACT_ALARM
 * - android.permission.WAKE_LOCK
 * Zero access to camera, microphone, contacts, location, or private storage.
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
            wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
        } else {
            wallpaperManager.setBitmap(bitmap)
        }

        prefs.edit().putLong("last_auto_update_time", System.currentTimeMillis()).apply()
        Log.d(TAG, "Successfully refreshed lockscreen wallpaper for current hour!")
    }

    private fun renderAdaptiveCanvas(canvas: Canvas, width: Int, height: Int, rawJson: String) {
        val json = try { JSONObject(rawJson) } catch (e: Exception) { JSONObject() }
        val chapter = json.optInt("chapter", 1)
        val activeDay = json.optInt("activeDay", 1)
        val rankBadge = json.optString("rankBadge", "🌱")
        val rankName = json.optString("rankName", "Explorer")
        val userLevel = json.optInt("userLevel", 1)
        val habitsArr = json.optJSONArray("habits")
        val hobbyCount = habitsArr?.length() ?: 0

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
            width * 0.2f, height * 0.1f, width * 0.45f,
            Color.parseColor("#3B1E1B4B"), Color.TRANSPARENT,
            Shader.TileMode.CLAMP
        )
        glowPaint.shader = topGrad
        canvas.drawRect(0f, 0f, width.toFloat(), height * 0.35f, glowPaint)

        val cardPad = 60f
        val cardW = width - cardPad * 2f        // 3. TOP SAFE ZONE (Top 840px is 100% clean OLED pure dark for phone's clock & notifications)
        val topSafeZone = 840f

        val cardBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#B813151D")
            style = Paint.Style.FILL
        }
        val cardBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#1FFFFFFF")
            style = Paint.Style.STROKE
            strokeWidth = 2f
        }

        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG)

        // 4. Spectrum Bar (Starts right below phone clock & notifications)
        val specY = topSafeZone + 25f
        val specH = 50f
        val specRect = RectF(cardPad, specY, cardPad + cardW, specY + specH)
        canvas.drawRoundRect(specRect, 16f, 16f, cardBgPaint)
        canvas.drawRoundRect(specRect, 16f, 16f, cardBorderPaint)

        val stripX = cardPad + 18f
        val stripY = specY + 12f
        val stripW = cardW - 36f
        val stripH = 14f
        val slotW = stripW / 24f

        val segPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        for (h in 0 until 24) {
            segPaint.color = if (h < 6 || h >= 23) Color.parseColor("#1E1B4B")
            else if (h in 6..7) Color.parseColor("#10B981")
            else if (h in 12..13) Color.parseColor("#F59E0B")
            else if (h in 17..18) Color.parseColor("#0284C7")
            else Color.parseColor("#6366F1")
            canvas.drawRect(stripX + h * slotW, stripY, stripX + (h + 1) * slotW, stripY + stripH, segPaint)
        }

        // Needle Pin
        val pinX = stripX + (currentHourFloat / 24f) * stripW
        val pinPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#F59E0B") }
        canvas.drawCircle(pinX, stripY + stripH / 2f, 8f, pinPaint)

        textPaint.color = Color.parseColor("#94A3B8")
        textPaint.textSize = 15f
        textPaint.typeface = Typeface.MONOSPACE
        canvas.drawText("00:00", stripX, specY + 42f, textPaint)
        canvas.drawText("06:00", stripX + stripW * 0.23f, specY + 42f, textPaint)
        textPaint.color = Color.parseColor("#F59E0B")
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("● $timeStr ACTIVE", stripX + stripW / 2f, specY + 42f, textPaint)
        textPaint.color = Color.parseColor("#94A3B8")
        textPaint.textAlign = Paint.Align.RIGHT
        canvas.drawText("24:00", stripX + stripW, specY + 42f, textPaint)
        textPaint.textAlign = Paint.Align.LEFT

        // 5. Adaptive Schedule Timeline (5 blocks centered on active hour)
        val blockCount = 5
        val timelineStartY = specY + specH + 18f
        val cardHeight = 92f
        val cardGap = 12f

        val half = blockCount / 2
        for (i in 0 until blockCount) {
            val offset = i - half
            val targetHour = (currentHour + offset + 24) % 24
            val cardY = timelineStartY + i * (cardHeight + cardGap)
            val isActive = offset == 0
            val isPast = offset < 0

            val cardRect = RectF(cardPad, cardY, cardPad + cardW, cardY + cardHeight)

            if (isActive) {
                val activeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#161924") }
                val activeBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor("#E6F59E0B")
                    style = Paint.Style.STROKE
                    strokeWidth = 2.5f
                }
                canvas.drawRoundRect(cardRect, 18f, 18f, activeBg)
                canvas.drawRoundRect(cardRect, 18f, 18f, activeBorder)
            } else {
                val normalBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor(if (isPast) "#8013151D" else "#B813151D")
                }
                canvas.drawRoundRect(cardRect, 18f, 18f, normalBg)
                canvas.drawRoundRect(cardRect, 18f, 18f, cardBorderPaint)
            }

            // Left Dot
            val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor(if (isActive) "#F59E0B" else if (isPast) "#10B981" else "#64748B")
            }
            canvas.drawCircle(cardPad + 28f, cardY + cardHeight / 2f, if (isActive) 5f else 4f, dotPaint)

            // Time Range
            textPaint.color = if (isActive) Color.parseColor("#FBBF24") else if (isPast) Color.parseColor("#94A3B8") else Color.parseColor("#CBD5E1")
            textPaint.textSize = 20f
            textPaint.typeface = Typeface.MONOSPACE
            val sTime = String.format("%02d:00", targetHour)
            val eTime = String.format("%02d:00", (targetHour + 1) % 24)
            canvas.drawText("$sTime → $eTime", cardPad + 45f, cardY + 54f, textPaint)

            // Right-aligned Activity Title
            textPaint.textAlign = Paint.Align.RIGHT
            textPaint.typeface = Typeface.DEFAULT_BOLD
            textPaint.textSize = 21f
            textPaint.color = if (isActive) Color.WHITE else if (isPast) Color.parseColor("#94A3B8") else Color.parseColor("#CBD5E1")

            val title = when {
                targetHour >= 23 || targetHour < 6 -> "Obsidian Rest"
                targetHour in 6..7 -> "Morning Vitality"
                targetHour in 12..13 -> "Mindful Recovery"
                targetHour in 17..18 -> "Active Sync"
                else -> "Focus Cadence"
            }
            canvas.drawText(if (isActive) "● $title (NOW)" else title, cardPad + cardW - 25f, cardY + 54f, textPaint)
            textPaint.textAlign = Paint.Align.LEFT
        }

        val timelineEndY = timelineStartY + blockCount * (cardHeight + cardGap)

        // 6. Header Card (Positioned in comfortable mid-lower screen, below schedule)
        val headerY = timelineEndY + 20f
        val headerH = 150f
        val headerRect = RectF(cardPad, headerY, cardPad + cardW, headerY + headerH)
        canvas.drawRoundRect(headerRect, 24f, 24f, cardBgPaint)
        canvas.drawRoundRect(headerRect, 24f, 24f, cardBorderPaint)

        textPaint.color = Color.parseColor("#94A3B8")
        textPaint.textSize = 20f
        textPaint.typeface = Typeface.MONOSPACE
        canvas.drawText("ODYSSEY • CH. 0$chapter", cardPad + 30f, headerY + 44f, textPaint)

        textPaint.color = Color.WHITE
        textPaint.textSize = 28f
        textPaint.typeface = Typeface.DEFAULT_BOLD
        canvas.drawText("$rankBadge $rankName", cardPad + 30f, headerY + 96f, textPaint)

        textPaint.color = Color.parseColor("#94A3B8")
        textPaint.textSize = 20f
        textPaint.typeface = Typeface.DEFAULT
        canvas.drawText("Level ${String.format("%02d", userLevel)} Cadence • Day $activeDay of 365", cardPad + 30f, headerY + 128f, textPaint)

        // 7. Daily Cadence Directive & Stats Card
        val directiveStartY = headerY + headerH + 18f
        val directiveH = 185f
        val dirRect = RectF(cardPad, directiveStartY, cardPad + cardW, directiveStartY + directiveH)
        canvas.drawRoundRect(dirRect, 22f, 22f, cardBgPaint)
        canvas.drawRoundRect(dirRect, 22f, 22f, cardBorderPaint)

        textPaint.color = Color.parseColor("#F59E0B")
        textPaint.textSize = 17f
        textPaint.typeface = Typeface.MONOSPACE
        canvas.drawText("✦ DAILY CADENCE DIRECTIVE", cardPad + 25f, directiveStartY + 38f, textPaint)

        textPaint.color = Color.parseColor("#E2E8F0")
        textPaint.textSize = 19f
        textPaint.typeface = Typeface.DEFAULT
        val mantra = if (currentHour >= 21 || currentHour < 6)
            "Honor your circadian recovery. Deep rest fuels tomorrow's uninterrupted focus."
        else if (currentHour in 12..13)
            "Step back for mindful recovery. Mental clarity is renewed in deliberate pauses."
        else
            "Protect your active focus blocks with absolute integrity. Momentum is built hour by hour."
        canvas.drawText(mantra, cardPad + 25f, directiveStartY + 76f, textPaint)

        // Metric Boxes
        val pillY = directiveStartY + 104f
        val pillH = 62f
        val pillGap = 16f
        val pillW = (cardW - 50f - pillGap * 2f) / 3f
        for (p in 0..2) {
            val pX = cardPad + 25f + p * (pillW + pillGap)
            val pRect = RectF(pX, pillY, pX + pillW, pillY + pillH)
            canvas.drawRoundRect(pRect, 14f, 14f, cardBgPaint)
            canvas.drawRoundRect(pRect, 14f, 14f, cardBorderPaint)

            textPaint.color = Color.parseColor("#94A3B8")
            textPaint.textSize = 13f
            textPaint.typeface = Typeface.MONOSPACE
            val topText = if (p == 0) "INTEGRITY" else if (p == 1) "STREAK" else "CHAPTER GOAL"
            val valText = if (p == 0) "100% 🛡️" else if (p == 1) "$activeDay Days 🔥" else "Sprint 1 ⚔️"
            canvas.drawText(topText, pX + 16f, pillY + 24f, textPaint)
            textPaint.color = if (p == 0) Color.parseColor("#34D399") else if (p == 1) Color.parseColor("#FBBF24") else Color.parseColor("#A5B4FC")
            textPaint.textSize = 20f
            textPaint.typeface = Typeface.DEFAULT_BOLD
            canvas.drawText(valText, pX + 16f, pillY + 50f, textPaint)
        }

        // 8. Bottom Safe Zone (Leaves fingerprint scanner & shortcuts clean)
        textPaint.color = Color.parseColor("#2EFFFFFF")
        textPaint.textSize = 16f
        textPaint.typeface = Typeface.MONOSPACE
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("ODYSSEY CADENCE", width / 2f, 2300f, textPaint)
        textPaint.textAlign = Paint.Align.LEFT
    }

    companion object {
        private const val TAG = "OdysseyHourlyWorker"
        private const val ALARM_ACTION = "com.odyssey.tracker.ACTION_HOURLY_WALLPAPER_UPDATE"
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
