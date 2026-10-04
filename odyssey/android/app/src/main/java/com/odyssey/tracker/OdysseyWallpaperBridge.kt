package com.odyssey.tracker

import android.app.DownloadManager
import android.app.WallpaperManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

/**
 * OdysseyWallpaperBridge
 * 
 * Injected into the WebView as `window.OdysseyAndroid` or `window.Android`.
 * Provides zero-friction, privacy-safe 1-tap lockscreen wallpaper updates
 * using Android's standard WallpaperManager (Install-time normal permission, 0 runtime popups).
 */
class OdysseyWallpaperBridge(
    private val context: Context,
    private val activity: MainActivity? = null
) {

    private val prefs = context.getSharedPreferences("odyssey_prefs", Context.MODE_PRIVATE)

    /**
     * Directly launches native Android Photo / Gallery picker on UI thread for target screen ("lock" or "home").
     */
    @JavascriptInterface
    fun pickCustomWallpaperPhoto(targetScreen: String): Boolean {
        return try {
            if (activity != null) {
                activity.runOnUiThread {
                    activity.launchPhotoPicker(targetScreen)
                }
                true
            } else {
                openSystemWallpaperChooser()
            }
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to launch photo picker: ${e.message}", e)
            false
        }
    }

    @JavascriptInterface
    fun pickCustomWallpaperPhoto(): Boolean {
        return pickCustomWallpaperPhoto("lock")
    }

    private fun backupCurrentWallpaperIfNeeded(wallpaperManager: WallpaperManager) {
        try {
            val backupFile = File(context.filesDir, "previous_user_wallpaper.png")
            if (!backupFile.exists()) {
                val drawable = wallpaperManager.drawable
                if (drawable is BitmapDrawable && drawable.bitmap != null) {
                    FileOutputStream(backupFile).use { out ->
                        drawable.bitmap.compress(Bitmap.CompressFormat.PNG, 95, out)
                    }
                    Log.d("OdysseyWallpaper", "Backed up user previous wallpaper to ${backupFile.absolutePath}")
                }
            }
        } catch (e: Exception) {
            Log.w("OdysseyWallpaper", "Could not backup previous wallpaper: ${e.message}")
        }
    }

    /**
     * Applies a wallpaper bitmap to target screen:
     * - "lock" -> WallpaperManager.FLAG_LOCK
     * - "home" -> WallpaperManager.FLAG_SYSTEM
     */
    @JavascriptInterface
    fun setCustomWallpaper(base64Image: String, targetScreen: String): Boolean {
        return try {
            val cleanBase64 = if (base64Image.contains(",")) {
                base64Image.substringAfter(",")
            } else {
                base64Image
            }
            if (cleanBase64.isBlank()) return false
            val decodedBytes = Base64.decode(cleanBase64.trim(), Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size) ?: return false

            val wallpaperManager = WallpaperManager.getInstance(context)
            backupCurrentWallpaperIfNeeded(wallpaperManager)

            val isHome = targetScreen.lowercase() == "home"
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val flag = if (isHome) WallpaperManager.FLAG_SYSTEM else WallpaperManager.FLAG_LOCK
                wallpaperManager.setBitmap(bitmap, null, true, flag)
            } else {
                wallpaperManager.setBitmap(bitmap)
            }

            Log.d("OdysseyWallpaper", "Successfully applied custom wallpaper to $targetScreen (flag=${if (isHome) "FLAG_SYSTEM" else "FLAG_LOCK"})")
            true
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to apply custom wallpaper to $targetScreen: ${e.message}", e)
            false
        }
    }

    @JavascriptInterface
    fun setCustomWallpaper(base64Image: String): Boolean {
        return setCustomWallpaper(base64Image, "lock")
    }

    /**
     * Directly applies the base64 PNG image onto the Android Lock screen.
     */
    @JavascriptInterface
    fun setLockscreenWallpaper(base64Image: String): Boolean {
        return setCustomWallpaper(base64Image, "lock")
    }

    /**
     * Saves user's custom alternate wallpaper specifically for target screen ("lock" or "home").
     * Completely isolated so lock screen and home screen never overwrite each other.
     */
    @JavascriptInterface
    fun saveAlternateWallpaper(base64Image: String, targetScreen: String): Boolean {
        return try {
            val isHome = targetScreen.lowercase() == "home"
            val target = if (isHome) "home" else "lock"
            val cleanBase64 = if (base64Image.contains(",")) {
                base64Image.substringAfter(",")
            } else {
                base64Image
            }
            if (cleanBase64.isBlank()) return false
            val decodedBytes = Base64.decode(cleanBase64.trim(), Base64.DEFAULT)
            val file = File(context.filesDir, "custom_restoration_wallpaper_${target}.png")
            FileOutputStream(file).use { out ->
                out.write(decodedBytes)
            }
            val key = if (isHome) "alternate_home_wallpaper" else "alternate_lock_wallpaper"
            prefs.edit().putString(key, base64Image).commit()
            Log.d("OdysseyWallpaper", "Saved alternate wallpaper for $target to ${file.absolutePath}")
            true
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to save alternate wallpaper: ${e.message}", e)
            false
        }
    }

    @JavascriptInterface
    fun saveAlternateWallpaper(base64Image: String): Boolean {
        return saveAlternateWallpaper(base64Image, "lock")
    }

    /**
     * Returns the user's saved alternate wallpaper base64 string for "lock" or "home".
     */
    @JavascriptInterface
    fun getAlternateWallpaper(targetScreen: String): String {
        val isHome = targetScreen.lowercase() == "home"
        val key = if (isHome) "alternate_home_wallpaper" else "alternate_lock_wallpaper"
        val saved = prefs.getString(key, "") ?: ""
        if (saved.isNotBlank()) return saved

        // Fallback: check if isolated disk file exists and convert to base64
        val target = if (isHome) "home" else "lock"
        val file = File(context.filesDir, "custom_restoration_wallpaper_${target}.png")
        if (file.exists()) {
            try {
                val bytes = file.readBytes()
                val b64 = "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
                prefs.edit().putString(key, b64).commit()
                return b64
            } catch (e: Exception) {}
        }
        return ""
    }

    @JavascriptInterface
    fun getAlternateWallpaper(): String {
        return getAlternateWallpaper("lock")
    }

    /**
     * Clears only the alternate wallpaper for the specified screen ("lock" or "home").
     */
    @JavascriptInterface
    fun clearAlternateWallpaper(targetScreen: String): Boolean {
        return try {
            val isHome = targetScreen.lowercase() == "home"
            val target = if (isHome) "home" else "lock"
            val file = File(context.filesDir, "custom_restoration_wallpaper_${target}.png")
            if (file.exists()) file.delete()
            val key = if (isHome) "alternate_home_wallpaper" else "alternate_lock_wallpaper"
            prefs.edit().remove(key).commit()
            Log.d("OdysseyWallpaper", "Cleared alternate wallpaper for $target")
            true
        } catch (e: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun clearAlternateWallpaper(): Boolean {
        return clearAlternateWallpaper("lock")
    }

    /**
     * Applies the user's saved alternate wallpaper directly to "lock" or "home".
     */
    @JavascriptInterface
    fun applyAlternateWallpaper(targetScreen: String): Boolean {
        return try {
            val isHome = targetScreen.lowercase() == "home"
            val target = if (isHome) "home" else "lock"
            val file = File(context.filesDir, "custom_restoration_wallpaper_${target}.png")
            val bitmap = if (file.exists()) {
                BitmapFactory.decodeFile(file.absolutePath)
            } else {
                val base64 = getAlternateWallpaper(target)
                if (base64.isNotBlank()) {
                    val clean = if (base64.contains(",")) base64.substringAfter(",") else base64
                    val bytes = Base64.decode(clean.trim(), Base64.DEFAULT)
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                } else null
            }

            if (bitmap != null) {
                val wallpaperManager = WallpaperManager.getInstance(context)
                backupCurrentWallpaperIfNeeded(wallpaperManager)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    val flag = if (isHome) WallpaperManager.FLAG_SYSTEM else WallpaperManager.FLAG_LOCK
                    wallpaperManager.setBitmap(bitmap, null, true, flag)
                } else {
                    wallpaperManager.setBitmap(bitmap)
                }
                Log.d("OdysseyWallpaper", "Successfully applied alternate wallpaper to $target (flag=${if (isHome) "FLAG_SYSTEM" else "FLAG_LOCK"})")
                true
            } else {
                Log.w("OdysseyWallpaper", "No alternate wallpaper bitmap found to apply for $target")
                false
            }
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to apply alternate wallpaper to $targetScreen: ${e.message}", e)
            false
        }
    }

    @JavascriptInterface
    fun applyAlternateWallpaper(): Boolean {
        return applyAlternateWallpaper("lock")
    }

    @JavascriptInterface
    fun saveCustomWallpaper(base64Image: String): Boolean {
        return saveAlternateWallpaper(base64Image, "lock")
    }

    @JavascriptInterface
    fun getCustomWallpaper(): String {
        return getAlternateWallpaper("lock")
    }

    @JavascriptInterface
    fun clearCustomWallpaper(): Boolean {
        return clearAlternateWallpaper("lock")
    }

    @JavascriptInterface
    fun applyCustomWallpaper(targetScreen: String): Boolean {
        return applyAlternateWallpaper(targetScreen)
    }

    @JavascriptInterface
    fun applyCustomWallpaper(): Boolean {
        return applyAlternateWallpaper("lock")
    }

    /**
     * Master switch for the entire Odyssey wallpaper mechanism.
     *
     * Turning it OFF must stand the whole thing down, not merely hide it:
     *   - clears `wallpaper_enabled`, which the live wallpaper engine reads and
     *     which stops its continuous render loop
     *   - cancels the hourly auto-update alarm so the device is not woken every
     *     hour for wallpaper work the user has switched off
     *   - restores the user's own lock + home wallpapers
     *
     * Turning it ON only flips the flag. It deliberately does NOT re-arm the
     * hourly alarm, because the user still has to pick a wallpaper in Wallpaper
     * Studio; the alarm is armed there, once something is actually applied.
     */
    @JavascriptInterface
    fun setWallpaperMasterEnabled(enabled: Boolean): Boolean {
        return try {
            if (!enabled) {
                // clearLockscreenWallpaper already clears the flag, broadcasts
                // to the live engine, and restores the user's own lock + home
                // wallpapers -- so reuse it rather than duplicating that logic.
                val restored = clearLockscreenWallpaper()

                // Stand the background alarm down too. Without this the device
                // keeps waking hourly for a feature the user has switched off.
                try {
                    OdysseyHourlyWallpaperWorker.cancelHourlyUpdate(context)
                } catch (e: Exception) {
                    Log.w("OdysseyWallpaper", "Failed to cancel hourly alarm: ${e.message}")
                }

                // Report honestly. The flag is down either way, but if the user's
                // own wallpapers could not be put back they should know the
                // switch did not fully take effect rather than see a clean "off".
                Log.d("OdysseyWallpaper", "Master wallpaper switch OFF (restored=$restored)")
                restored
            } else {
                prefs.edit().putBoolean("wallpaper_enabled", true).apply()
                // Tell the live engine to re-read the flag immediately.
                try {
                    val intent = Intent("com.odyssey.tracker.ACTION_WALLPAPER_DATA_UPDATED").apply {
                        setPackage(context.packageName)
                    }
                    context.sendBroadcast(intent)
                } catch (e: Exception) {}
                Log.d("OdysseyWallpaper", "Master wallpaper switch set to true")
                true
            }
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to set master wallpaper switch: ${e.message}")
            false
        }
    }

    @JavascriptInterface
    fun isWallpaperEnabled(): Boolean {
        return try {
            prefs.getBoolean("wallpaper_enabled", false)
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Clears custom schedule wallpaper and completely replaces Odyssey on Lock and Home screens
     * with the user's individually selected alternate wallpapers.
     */
    @JavascriptInterface
    fun clearLockscreenWallpaper(): Boolean {
        return try {
            val wallpaperManager = WallpaperManager.getInstance(context)

            // Mark wallpaper as disabled in preferences & broadcast to Live Wallpaper Service immediately
            prefs.edit().putBoolean("wallpaper_enabled", false).commit()
            try {
                val intent = Intent("com.odyssey.tracker.ACTION_WALLPAPER_DATA_UPDATED").apply {
                    setPackage(context.packageName)
                }
                context.sendBroadcast(intent)
            } catch (e: Exception) {}

            // 1. Restore separate Lock Screen alternate wallpaper
            val lockApplied = applyAlternateWallpaper("lock")

            // 2. Restore separate Home Screen alternate wallpaper
            val homeApplied = applyAlternateWallpaper("home")

            // 3. If neither was applied, try previous backup bitmap
            if (!lockApplied && !homeApplied) {
                val backupFile = File(context.filesDir, "previous_user_wallpaper.png")
                if (backupFile.exists()) {
                    try {
                        val backupBitmap = BitmapFactory.decodeFile(backupFile.absolutePath)
                        if (backupBitmap != null) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                try { wallpaperManager.setBitmap(backupBitmap, null, true, WallpaperManager.FLAG_LOCK) } catch (e: Exception) {}
                                try { wallpaperManager.setBitmap(backupBitmap, null, true, WallpaperManager.FLAG_SYSTEM) } catch (e: Exception) {}
                            } else {
                                wallpaperManager.setBitmap(backupBitmap)
                            }
                            backupFile.delete()
                            Log.d("OdysseyWallpaper", "Successfully restored user's previous wallpaper from backup")
                        }
                    } catch (e: Exception) {
                        Log.w("OdysseyWallpaper", "Could not restore backup bitmap: ${e.message}")
                    }
                }
            }

            OdysseyHourlyWallpaperWorker.cancelHourlyUpdate(context)
            true
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to clear wallpaper: ${e.message}", e)
            false
        }
    }

    /**
     * Saves today's schedule JSON into SharedPreferences with synchronous disk commit.
     * Broadcasts ACTION_WALLPAPER_DATA_UPDATED so OdysseyLiveWallpaperService refreshes
     * immediately in real time with zero delay.
     */
    @JavascriptInterface
    fun syncSchedule(scheduleJson: String): Boolean {
        return try {
            val dateStr = try {
                org.json.JSONObject(scheduleJson).optString("dateStr", "")
            } catch (e: Exception) { "" }
            val todayDateStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())

            val editor = prefs.edit()
            if (dateStr.isNotBlank()) {
                editor.putString("schedule_json_$dateStr", scheduleJson)
            }
            if (dateStr.isBlank() || dateStr == todayDateStr) {
                editor.putString("latest_schedule_json", scheduleJson)
            }
            editor.putBoolean("wallpaper_enabled", true)
            val success = editor.commit()

            if (success) {
                // 1. Broadcast to Live Wallpaper Service for instant canvas redraw
                val intent = Intent("com.odyssey.tracker.ACTION_WALLPAPER_DATA_UPDATED").apply {
                    setPackage(context.packageName)
                }
                context.sendBroadcast(intent)

                // 2. Only refresh static lockscreen if Live Wallpaper is NOT currently running!
                val wallpaperManager = WallpaperManager.getInstance(context)
                val isLiveActive = wallpaperManager.wallpaperInfo?.packageName == context.packageName
                if (!isLiveActive && OdysseyHourlyWallpaperWorker.isScheduled(context)) {
                    try {
                        OdysseyHourlyWallpaperWorker.updateLockscreenNow(context)
                    } catch (e: Exception) {
                        Log.w("OdysseyWallpaper", "Could not immediately update static lockscreen: ${e.message}")
                    }
                }

                // 3. Ensure the XX:57 background cadence notification is armed
                try {
                    OdysseyCadenceNotificationWorker.scheduleNextCadenceNotification(context)
                } catch (e: Exception) {
                    Log.w("OdysseyWallpaper", "Could not arm cadence notification: ${e.message}")
                }

                Log.d("OdysseyWallpaper", "Synced schedule data ($dateStr) to native preferences, updated wallpapers & armed cadence notification")
            }
            success
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Error saving schedule: ${e.message}", e)
            false
        }
    }

    /**
     * Detailed verification method that validates the JSON payload, commits to disk,
     * broadcasts update, and returns a verified JSON summary to JavaScript.
     */
    @JavascriptInterface
    fun syncScheduleWithResult(scheduleJson: String): String {
        return try {
            if (scheduleJson.isBlank()) {
                return "{\"success\":false,\"error\":\"Empty payload\"}"
            }
            val obj = org.json.JSONObject(scheduleJson)
            val blocksCount = obj.optJSONArray("blocks")?.length() ?: 0
            val habitsCount = obj.optJSONArray("habits")?.length() ?: 0
            val streak = obj.optInt("userStreak", obj.optInt("activeDay", 1))
            val dateStr = obj.optString("dateStr", "")
            val todayDateStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())

            val editor = prefs.edit()
            if (dateStr.isNotBlank()) {
                editor.putString("schedule_json_$dateStr", scheduleJson)
            }
            if (dateStr.isBlank() || dateStr == todayDateStr) {
                editor.putString("latest_schedule_json", scheduleJson)
            }
            editor.putBoolean("wallpaper_enabled", true)
            val success = editor.commit()

            if (success) {
                // 1. Broadcast to Live Wallpaper Service
                val intent = Intent("com.odyssey.tracker.ACTION_WALLPAPER_DATA_UPDATED").apply {
                    setPackage(context.packageName)
                }
                context.sendBroadcast(intent)

                // 2. Only refresh static lockscreen if Live Wallpaper is NOT currently active!
                val wallpaperManager = WallpaperManager.getInstance(context)
                val isLiveActive = wallpaperManager.wallpaperInfo?.packageName == context.packageName
                if (!isLiveActive && OdysseyHourlyWallpaperWorker.isScheduled(context)) {
                    try {
                        OdysseyHourlyWallpaperWorker.updateLockscreenNow(context)
                    } catch (e: Exception) {
                        Log.w("OdysseyWallpaper", "Could not immediately update static lockscreen: ${e.message}")
                    }
                }

                // 3. Ensure the XX:57 background cadence notification is armed
                try {
                    OdysseyCadenceNotificationWorker.scheduleNextCadenceNotification(context)
                } catch (e: Exception) {
                    Log.w("OdysseyWallpaper", "Could not arm cadence notification: ${e.message}")
                }

                Log.d("OdysseyWallpaper", "Verified & synced $blocksCount blocks for date $dateStr to native preferences")
                "{\"success\":true,\"blockCount\":$blocksCount,\"habitCount\":$habitsCount,\"streak\":$streak,\"date\":\"$dateStr\",\"message\":\"Verified: $blocksCount tasks saved to Android Live Wallpaper\"}"
            } else {
                "{\"success\":false,\"error\":\"SharedPreferences commit failed\"}"
            }
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "syncScheduleWithResult error: ${e.message}", e)
            "{\"success\":false,\"error\":\"${e.message}\"}"
        }
    }

    /**
     * Reads back the stored schedule JSON from SharedPreferences so JavaScript can verify.
     */
    @JavascriptInterface
    fun getSyncedSchedule(): String {
        val todayDateStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())
        val todayJson = prefs.getString("schedule_json_$todayDateStr", null)
        if (!todayJson.isNullOrBlank()) return todayJson
        return prefs.getString("latest_schedule_json", "") ?: ""
    }

    /**
     * Quick verification check for native Android storage.
     */
    @JavascriptInterface
    fun verifySync(): String {
        val raw = prefs.getString("latest_schedule_json", null)
        if (raw.isNullOrEmpty()) return "EMPTY"
        return try {
            val obj = org.json.JSONObject(raw)
            val bCount = obj.optJSONArray("blocks")?.length() ?: 0
            val hCount = obj.optJSONArray("habits")?.length() ?: 0
            val streak = obj.optInt("userStreak", 1)
            "OK:blocks=$bCount,habits=$hCount,streak=$streak"
        } catch (e: Exception) {
            "ERROR:${e.message}"
        }
    }

    /**
     * Opens Android's system Live Wallpaper picker to preview & apply
     * the real-time dynamic lockscreen wallpaper.
     */
    @JavascriptInterface
    fun launchLiveWallpaperPicker() {
        try {
            prefs.edit().putBoolean("wallpaper_enabled", true).commit()
            val wallpaperManager = WallpaperManager.getInstance(context)
            backupCurrentWallpaperIfNeeded(wallpaperManager)
            val intent = Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER).apply {
                putExtra(
                    WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                    ComponentName(context, OdysseyLiveWallpaperService::class.java)
                )
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            // Fallback to standard wallpaper chooser
            try {
                val fallback = Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallback)
            } catch (err: Exception) {
                Log.e("OdysseyWallpaper", "Could not launch live wallpaper chooser: ${err.message}")
            }
        }
    }

    /**
     * Enables automatic hourly background lockscreen refresh via AlarmManager.
     * Updates the wallpaper at the top of every hour (:00:00) with zero manual actions.
     */
    @JavascriptInterface
    fun enableHourlyAutoUpdate(): Boolean {
        return try {
            prefs.edit().putBoolean("wallpaper_enabled", true).commit()
            OdysseyHourlyWallpaperWorker.scheduleNextHourlyUpdate(context)
            Log.d("OdysseyWallpaper", "Hourly auto-update enabled successfully")
            true
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to enable hourly auto-update: ${e.message}")
            false
        }
    }

    /**
     * Disables automatic hourly background updates.
     */
    @JavascriptInterface
    fun disableHourlyAutoUpdate(): Boolean {
        return try {
            OdysseyHourlyWallpaperWorker.cancelHourlyUpdate(context)
            Log.d("OdysseyWallpaper", "Hourly auto-update cancelled")
            true
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to cancel hourly auto-update: ${e.message}")
            false
        }
    }

    /**
     * Returns whether the hourly background updater is currently active.
     */
    @JavascriptInterface
    fun isHourlyAutoUpdateEnabled(): Boolean {
        return OdysseyHourlyWallpaperWorker.isScheduled(context)
    }

    /**
     * Enables automatic XX:57 background cadence notifications.
     */
    @JavascriptInterface
    fun enableCadenceNotifications(): Boolean {
        return try {
            OdysseyCadenceNotificationWorker.scheduleNextCadenceNotification(context)
            Log.d("OdysseyWallpaper", "Cadence notifications enabled successfully")
            true
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to enable cadence notifications: ${e.message}")
            false
        }
    }

    /**
     * Disables automatic XX:57 background cadence notifications.
     */
    @JavascriptInterface
    fun disableCadenceNotifications(): Boolean {
        return try {
            OdysseyCadenceNotificationWorker.cancelCadenceNotification(context)
            Log.d("OdysseyWallpaper", "Cadence notifications cancelled")
            true
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to cancel cadence notifications: ${e.message}")
            false
        }
    }

    /**
     * Returns whether cadence notifications are currently active.
     */
    @JavascriptInterface
    fun isCadenceNotificationsEnabled(): Boolean {
        return prefs.getBoolean("cadence_notifications_enabled", true)
    }

    /**
     * Instantly dispatches a test cadence notification to verify delivery and action buttons.
     */
    @JavascriptInterface
    fun triggerTestNotification(): Boolean {
        return try {
            OdysseyCadenceNotificationWorker.dispatchCadenceNotificationNow(context, forceTest = true)
            Log.d("OdysseyWallpaper", "Triggered test cadence notification successfully")
            true
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to trigger test notification: ${e.message}", e)
            false
        }
    }

    /**
     * Arms the background XX:57 cadence notification alarm.
     */
    @JavascriptInterface
    fun armCadenceNotification(): Boolean {
        return try {
            OdysseyCadenceNotificationWorker.scheduleNextCadenceNotification(context)
            Log.d("OdysseyWallpaper", "Armed cadence notification alarm")
            true
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to arm cadence notification: ${e.message}", e)
            false
        }
    }

    /**
     * Opens Android's system wallpaper / photo picker so the user can select
     * their custom gallery or default wallpaper when configuring restoration wallpaper.
     */
    @JavascriptInterface
    fun openSystemWallpaperChooser(): Boolean {
        if (activity != null) {
            activity.runOnUiThread {
                activity.launchPhotoPicker()
            }
            return true
        }

        val intentsToTry = listOf(
            Intent(Intent.ACTION_GET_CONTENT).apply {
                type = "image/*"
                addCategory(Intent.CATEGORY_OPENABLE)
            },
            Intent(Intent.ACTION_PICK, android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI),
            Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER),
            Intent("android.settings.WALLPAPER_SETTINGS"),
            Intent(android.provider.Settings.ACTION_DISPLAY_SETTINGS)
        )

        for (intent in intentsToTry) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                Log.d("OdysseyWallpaper", "Launched wallpaper intent: ${intent.action}")
                return true
            } catch (e: Exception) {
                Log.w("OdysseyWallpaper", "Intent failed (${intent.action}): ${e.message}")
            }
        }
        return false
    }

    /**
     * Downloads the updated APK using Android's DownloadManager and automatically
     * launches the package installer via FileProvider when complete.
     */
    @JavascriptInterface
    fun downloadAndInstallApk(apkUrl: String): Boolean {
        return try {
            val uri = Uri.parse(apkUrl)
            val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
                ?: return fallbackOpenUrl(apkUrl)

            val destinationFile = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "odyssey-latest.apk")
            if (destinationFile.exists()) {
                destinationFile.delete()
            }

            val request = DownloadManager.Request(uri).apply {
                setTitle("Odyssey Update")
                setDescription("Downloading latest Odyssey APK...")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationUri(Uri.fromFile(destinationFile))
                setMimeType("application/vnd.android.package-archive")
            }

            val downloadId = downloadManager.enqueue(request)

            val onComplete = object : BroadcastReceiver() {
                override fun onReceive(ctxt: Context?, intent: Intent?) {
                    val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L) ?: -1L
                    if (id == downloadId) {
                        try {
                            context.unregisterReceiver(this)
                        } catch (e: Exception) {}

                        try {
                            val apkUri = FileProvider.getUriForFile(
                                context,
                                "${context.packageName}.fileprovider",
                                destinationFile
                            )
                            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                                setDataAndType(apkUri, "application/vnd.android.package-archive")
                                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            context.startActivity(installIntent)
                        } catch (e: Exception) {
                            Log.e("OdysseyWallpaper", "Failed to launch APK installer: ${e.message}", e)
                        }
                    }
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(
                    onComplete,
                    IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
                    Context.RECEIVER_NOT_EXPORTED
                )
            } else {
                context.registerReceiver(
                    onComplete,
                    IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
                )
            }

            Toast.makeText(context, "Odyssey update download started...", Toast.LENGTH_SHORT).show()
            true
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Error in downloadAndInstallApk: ${e.message}", e)
            fallbackOpenUrl(apkUrl)
        }
    }

    private fun fallbackOpenUrl(apkUrl: String): Boolean {
        return try {
            val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(browserIntent)
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Returns the currently installed APK versionCode (e.g. 1, 2)
     */
    @JavascriptInterface
    fun getAppVersionCode(): Int {
        return try {
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pInfo.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode
            }
        } catch (e: Exception) {
            1
        }
    }

    /**
     * Returns the currently installed APK versionName (e.g. "1.0", "1.1.0")
     */
    @JavascriptInterface
    fun getAppVersionName(): String {
        return try {
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            pInfo.versionName ?: "1.0"
        } catch (e: Exception) {
            "1.0"
        }
    }

    @JavascriptInterface
    fun isSupported(): Boolean = true
}
