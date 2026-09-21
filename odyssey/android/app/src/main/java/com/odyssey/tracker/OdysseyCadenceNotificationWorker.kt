package com.odyssey.tracker

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject
import java.util.Calendar
import java.util.Locale

/**
 * OdysseyCadenceNotificationWorker
 *
 * Runs outside the app at every XX:57 (3 minutes before the next hour starts).
 * - Reads the next hour's task from latest_schedule_json.
 * - If the upcoming hour is Sleep or Rest, silently skips the notification.
 * - Otherwise, dispatches a high-priority heads-up notification with:
 *     1. "Roger that" action button -> Dismisses the notification.
 *     2. "Update Task" action button (and card tap) -> Opens the app directly
 *        to that hour's edit pop-up (identical to the 3-dots modal in planner).
 */
@SuppressLint("NewApi")
class OdysseyCadenceNotificationWorker : BroadcastReceiver() {

    companion object {
        const val TAG = "OdysseyCadenceWorker"
        const val ALARM_ACTION = "com.odyssey.tracker.ACTION_CADENCE_NOTIFICATION"
        const val CHANNEL_ID = "odyssey_cadence_channel"
        const val NOTIFICATION_ID = 5757
        private const val REQUEST_CODE = 5701

        fun ensureNotificationChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Hourly Cadence & Task Reminders",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notifies you at XX:57 about your upcoming hour block"
                    enableLights(true)
                    lightColor = Color.CYAN
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 150, 100, 150)
                }
                val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                manager?.createNotificationChannel(channel)
            }
        }

        fun scheduleNextCadenceNotification(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, OdysseyCadenceNotificationWorker::class.java).apply {
                action = ALARM_ACTION
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val cal = Calendar.getInstance().apply {
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
                if (get(Calendar.MINUTE) >= 57) {
                    add(Calendar.HOUR_OF_DAY, 1)
                }
                set(Calendar.MINUTE, 57)
            }

            // Guard against edge cases where target time might already have elapsed in this minute
            if (cal.timeInMillis <= System.currentTimeMillis() + 2000) {
                cal.add(Calendar.HOUR_OF_DAY, 1)
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
                    .putBoolean("cadence_notifications_enabled", true)
                    .apply()

                Log.d(TAG, "Next cadence notification scheduled for: ${cal.time}")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to schedule cadence notification: ${e.message}", e)
            }
        }

        fun cancelCadenceNotification(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, OdysseyCadenceNotificationWorker::class.java).apply {
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
                .putBoolean("cadence_notifications_enabled", false)
                .apply()

            Log.d(TAG, "Cancelled cadence notification alarm.")
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "XX:57 Cadence notification alarm received! Evaluating upcoming hour...")

        ensureNotificationChannel(context)

        val pendingResult = goAsync()
        Thread {
            try {
                processAndDispatchNotification(context)
            } catch (e: Exception) {
                Log.e(TAG, "Error in cadence notification: ${e.message}", e)
            } finally {
                scheduleNextCadenceNotification(context)
                pendingResult.finish()
            }
        }.start()
    }

    private fun processAndDispatchNotification(context: Context) {
        val now = Calendar.getInstance()
        val nextHour = (now.get(Calendar.HOUR_OF_DAY) + 1) % 24
        val nextHourEnd = (nextHour + 1) % 24

        val prefs = context.getSharedPreferences("odyssey_prefs", Context.MODE_PRIVATE)
        val rawJson = prefs.getString("latest_schedule_json", null)

        var blockTitle = ""
        var blockCategory = ""
        var blockTag = ""
        var hasBlock = false

        if (!rawJson.isNullOrBlank()) {
            try {
                val json = JSONObject(rawJson)
                val blocksArr = json.optJSONArray("blocks")
                if (blocksArr != null) {
                    for (i in 0 until blocksArr.length()) {
                        val b = blocksArr.getJSONObject(i)
                        val startHour = b.optInt("startHour", -1)
                        val endHour = b.optInt("endHour", -1)
                        val sTime = b.optString("startTime", "")

                        val parsedStartH = if (startHour >= 0) startHour else parseHourString(sTime)
                        val parsedEndH = if (endHour >= 0) endHour else (parsedStartH + 1)

                        if (nextHour in parsedStartH until parsedEndH) {
                            blockTitle = b.optString("title", "").trim()
                            blockCategory = b.optString("category", "").trim().lowercase(Locale.ROOT)
                            blockTag = b.optString("tag", "").trim().lowercase(Locale.ROOT)
                            hasBlock = true
                            break
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not parse schedule JSON: ${e.message}")
            }
        }

        // 1. SLEEP & REST EXCLUSION CHECK
        // If the upcoming hour is marked as Sleep or Rest, skip notification completely
        if (isSleepOrRest(blockTitle, blockCategory, blockTag)) {
            Log.d(TAG, "Hour $nextHour is Sleep/Rest ('$blockTitle', cat: '$blockCategory'). Skipping notification.")
            return
        }

        // 2. BUILD NOTIFICATION STRINGS
        val startFormatted = String.format(Locale.getDefault(), "%02d:00", nextHour)
        val endFormatted = String.format(Locale.getDefault(), "%02d:00", nextHourEnd)
        val hourRangeStr = "$startFormatted - $endFormatted"

        val notifTitle = "Next Hour • $hourRangeStr"
        val notifBody = if (hasBlock && blockTitle.isNotBlank()) {
            "Upcoming: $blockTitle"
        } else {
            "Unplanned block — Tap to set your task."
        }

        // 3. PENDING INTENT: "Roger that" (Dismiss)
        val rogerIntent = Intent(context, OdysseyNotificationActionReceiver::class.java).apply {
            action = OdysseyNotificationActionReceiver.ACTION_ROGER_THAT
            putExtra(OdysseyNotificationActionReceiver.EXTRA_NOTIFICATION_ID, NOTIFICATION_ID)
        }
        val rogerPendingIntent = PendingIntent.getBroadcast(
            context,
            NOTIFICATION_ID + 1,
            rogerIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 4. PENDING INTENT: "Update Task" / Tap Card (Opens App & Launches Hour Edit Modal)
        val updateTaskIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(MainActivity.EXTRA_OPEN_HOUR_EDIT, nextHour)
        }
        val updateTaskPendingIntent = PendingIntent.getActivity(
            context,
            NOTIFICATION_ID + 2,
            updateTaskIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 5. DISPATCH NOTIFICATION
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(notifTitle)
            .setContentText(notifBody)
            .setStyle(NotificationCompat.BigTextStyle().bigText(notifBody))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(updateTaskPendingIntent) // Tapping card opens the hour edit modal
            .addAction(0, "Roger that", rogerPendingIntent) // Roger that dismisses
            .addAction(0, "Update Task", updateTaskPendingIntent) // Update Task button opens modal

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
            Log.d(TAG, "Dispatched XX:57 notification for hour $nextHour ('$blockTitle')")
        } catch (e: SecurityException) {
            Log.w(TAG, "POST_NOTIFICATIONS permission not granted: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to post notification: ${e.message}", e)
        }
    }

    private fun isSleepOrRest(title: String, category: String, tag: String): Boolean {
        val t = title.lowercase(Locale.ROOT)
        val c = category.lowercase(Locale.ROOT)
        val tg = tag.lowercase(Locale.ROOT)

        if (c == "sleep" || c == "rest") return true
        if (tg.contains("sleep") || tg.contains("rest")) return true
        if (t == "sleep" || t == "rest" || t.contains("sleep") || t.contains("rest") || t.contains("nap")) return true

        return false
    }

    private fun parseHourString(timeStr: String): Int {
        if (timeStr.isBlank()) return 0
        return try {
            val parts = timeStr.split(":")
            parts[0].trim().toInt()
        } catch (e: Exception) {
            0
        }
    }
}
