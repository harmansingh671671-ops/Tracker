package com.odyssey.tracker

import android.app.WallpaperManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import android.net.Uri
import android.os.Build
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import android.widget.Toast
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
     * Directly launches native Android Photo / Gallery picker on UI thread.
     */
    @JavascriptInterface
    fun pickCustomWallpaperPhoto(): Boolean {
        return try {
            if (activity != null) {
                activity.runOnUiThread {
                    activity.launchPhotoPicker()
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
     * - "both" -> WallpaperManager.FLAG_LOCK or WallpaperManager.FLAG_SYSTEM
     */
    @JavascriptInterface
    fun setCustomWallpaper(base64Image: String, targetScreen: String): Boolean {
        return try {
            val cleanBase64 = if (base64Image.contains(",")) {
                base64Image.substringAfter(",")
            } else {
                base64Image
            }
            val decodedBytes = Base64.decode(cleanBase64.trim(), Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)

            val wallpaperManager = WallpaperManager.getInstance(context)
            backupCurrentWallpaperIfNeeded(wallpaperManager)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val flag = when (targetScreen.lowercase()) {
                    "lock" -> WallpaperManager.FLAG_LOCK
                    "home" -> WallpaperManager.FLAG_SYSTEM
                    else -> WallpaperManager.FLAG_LOCK or WallpaperManager.FLAG_SYSTEM
                }
                wallpaperManager.setBitmap(bitmap, null, true, flag)
            } else {
                wallpaperManager.setBitmap(bitmap)
            }

            Log.d("OdysseyWallpaper", "Successfully applied custom wallpaper to $targetScreen via WallpaperManager")
            true
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to apply custom wallpaper to $targetScreen: ${e.message}", e)
            false
        }
    }

    /**
     * Directly applies the base64 PNG image onto the Android Lock and Home screens.
     */
    @JavascriptInterface
    fun setLockscreenWallpaper(base64Image: String): Boolean {
        return setCustomWallpaper(base64Image, "both")
    }

    /**
     * Saves user's custom restoration wallpaper in permanent local file and preferences.
     */
    @JavascriptInterface
    fun saveCustomWallpaper(base64Image: String): Boolean {
        return try {
            val cleanBase64 = if (base64Image.contains(",")) {
                base64Image.substringAfter(",")
            } else {
                base64Image
            }
            val decodedBytes = Base64.decode(cleanBase64.trim(), Base64.DEFAULT)
            val file = File(context.filesDir, "custom_restoration_wallpaper.png")
            FileOutputStream(file).use { out ->
                out.write(decodedBytes)
            }
            prefs.edit()
                .putString("saved_custom_wallpaper", base64Image)
                .putString("alternate_lock_wallpaper", base64Image)
                .putString("alternate_home_wallpaper", base64Image)
                .commit()
            Log.d("OdysseyWallpaper", "Saved custom restoration wallpaper to ${file.absolutePath}")
            true
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to save custom wallpaper: ${e.message}", e)
            false
        }
    }

    /**
     * Returns the user's saved custom wallpaper base64 string.
     */
    @JavascriptInterface
    fun getCustomWallpaper(): String {
        val direct = prefs.getString("saved_custom_wallpaper", "") ?: ""
        if (direct.isNotBlank()) return direct
        val lock = prefs.getString("alternate_lock_wallpaper", "") ?: ""
        if (lock.isNotBlank()) return lock
        return prefs.getString("alternate_home_wallpaper", "") ?: ""
    }

    /**
     * Clears user's custom restoration wallpaper.
     */
    @JavascriptInterface
    fun clearCustomWallpaper(): Boolean {
        return try {
            val file = File(context.filesDir, "custom_restoration_wallpaper.png")
            if (file.exists()) file.delete()
            prefs.edit()
                .remove("saved_custom_wallpaper")
                .remove("alternate_lock_wallpaper")
                .remove("alternate_home_wallpaper")
                .commit()
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Applies the user's saved custom wallpaper directly to "lock", "home", or "both".
     */
    @JavascriptInterface
    fun applyCustomWallpaper(targetScreen: String = "both"): Boolean {
        return try {
            val file = File(context.filesDir, "custom_restoration_wallpaper.png")
            val bitmap = if (file.exists()) {
                BitmapFactory.decodeFile(file.absolutePath)
            } else {
                val base64 = getCustomWallpaper()
                if (base64.isNotBlank()) {
                    val clean = if (base64.contains(",")) base64.substringAfter(",") else base64
                    val bytes = Base64.decode(clean.trim(), Base64.DEFAULT)
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                } else null
            }

            if (bitmap != null) {
                val wallpaperManager = WallpaperManager.getInstance(context)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    val flag = when (targetScreen.lowercase()) {
                        "lock" -> WallpaperManager.FLAG_LOCK
                        "home" -> WallpaperManager.FLAG_SYSTEM
                        else -> WallpaperManager.FLAG_LOCK or WallpaperManager.FLAG_SYSTEM
                    }
                    wallpaperManager.setBitmap(bitmap, null, true, flag)
                    if (targetScreen.lowercase() == "both") {
                        try { wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK) } catch (_: Exception) {}
                        try { wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_SYSTEM) } catch (_: Exception) {}
                    }
                } else {
                    wallpaperManager.setBitmap(bitmap)
                }
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to apply custom wallpaper: ${e.message}", e)
            false
        }
    }

    /**
     * Saves user's custom alternate wallpaper in local preferences (legacy/compat).
     */
    @JavascriptInterface
    fun saveAlternateWallpaper(base64Image: String, targetScreen: String): Boolean {
        saveCustomWallpaper(base64Image)
        return try {
            val key = if (targetScreen.lowercase() == "home") "alternate_home_wallpaper" else "alternate_lock_wallpaper"
            prefs.edit().putString(key, base64Image).commit()
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Returns the user's saved alternate wallpaper base64 string for "lock" or "home".
     */
    @JavascriptInterface
    fun getAlternateWallpaper(targetScreen: String): String {
        return getCustomWallpaper()
    }

    /**
     * Applies the user's saved alternate wallpaper directly to "lock", "home", or "both".
     */
    @JavascriptInterface
    fun applyAlternateWallpaper(targetScreen: String): Boolean {
        return applyCustomWallpaper(targetScreen)
    }

    /**
     * Clears custom schedule wallpaper and completely replaces Odyssey on BOTH Lock and Home screens
     * with the user's saved custom wallpaper (or clean default).
     */
    @JavascriptInterface
    fun clearLockscreenWallpaper(): Boolean {
        return try {
            val wallpaperManager = WallpaperManager.getInstance(context)
            var restored = false

            // Mark wallpaper as disabled in preferences & broadcast to Live Wallpaper Service immediately
            prefs.edit().putBoolean("wallpaper_enabled", false).commit()
            try {
                val intent = Intent("com.odyssey.tracker.ACTION_WALLPAPER_DATA_UPDATED").apply {
                    setPackage(context.packageName)
                }
                context.sendBroadcast(intent)
            } catch (_: Exception) {}

            // 1. Check if user configured a custom restoration wallpaper
            val file = File(context.filesDir, "custom_restoration_wallpaper.png")
            val customBitmap = if (file.exists()) {
                BitmapFactory.decodeFile(file.absolutePath)
            } else {
                val base64 = getCustomWallpaper()
                if (base64.isNotBlank()) {
                    val clean = if (base64.contains(",")) base64.substringAfter(",") else base64
                    val bytes = Base64.decode(clean.trim(), Base64.DEFAULT)
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                } else null
            }

            if (customBitmap != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    try {
                        wallpaperManager.setBitmap(customBitmap, null, true, WallpaperManager.FLAG_LOCK or WallpaperManager.FLAG_SYSTEM)
                    } catch (e: Exception) {
                        Log.w("OdysseyWallpaper", "Dual setBitmap failed: ${e.message}")
                    }
                    try {
                        wallpaperManager.setBitmap(customBitmap, null, true, WallpaperManager.FLAG_LOCK)
                    } catch (e: Exception) {
                        Log.w("OdysseyWallpaper", "Lock setBitmap failed: ${e.message}")
                    }
                    try {
                        wallpaperManager.setBitmap(customBitmap, null, true, WallpaperManager.FLAG_SYSTEM)
                    } catch (e: Exception) {
                        Log.w("OdysseyWallpaper", "System setBitmap failed: ${e.message}")
                    }
                } else {
                    wallpaperManager.setBitmap(customBitmap)
                }
                restored = true
                Log.d("OdysseyWallpaper", "Successfully restored saved custom wallpaper to both Lock and Home screens")
            }

            // 2. Otherwise restore previous backup bitmap
            if (!restored) {
                val backupFile = File(context.filesDir, "previous_user_wallpaper.png")
                if (backupFile.exists()) {
                    try {
                        val backupBitmap = BitmapFactory.decodeFile(backupFile.absolutePath)
                        if (backupBitmap != null) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                wallpaperManager.setBitmap(backupBitmap, null, true, WallpaperManager.FLAG_LOCK or WallpaperManager.FLAG_SYSTEM)
                                try { wallpaperManager.setBitmap(backupBitmap, null, true, WallpaperManager.FLAG_LOCK) } catch (_: Exception) {}
                                try { wallpaperManager.setBitmap(backupBitmap, null, true, WallpaperManager.FLAG_SYSTEM) } catch (_: Exception) {}
                            } else {
                                wallpaperManager.setBitmap(backupBitmap)
                            }
                            backupFile.delete()
                            restored = true
                            Log.d("OdysseyWallpaper", "Successfully restored user's previous wallpaper from backup")
                        }
                    } catch (e: Exception) {
                        Log.w("OdysseyWallpaper", "Could not restore backup bitmap: ${e.message}")
                    }
                }
            }

            // 3. Fallback: Clear to system default
            if (!restored) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    try { wallpaperManager.clear(WallpaperManager.FLAG_LOCK) } catch (_: Exception) {}
                    try { wallpaperManager.clear(WallpaperManager.FLAG_SYSTEM) } catch (_: Exception) {}
                } else {
                    wallpaperManager.clear()
                }
                Log.d("OdysseyWallpaper", "Cleared wallpaper back to system defaults")
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
            val success = prefs.edit()
                .putString("latest_schedule_json", scheduleJson)
                .putBoolean("wallpaper_enabled", true)
                .commit()
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

                Log.d("OdysseyWallpaper", "Synced schedule data to native preferences, updated wallpapers & armed cadence notification")
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

            val success = prefs.edit()
                .putString("latest_schedule_json", scheduleJson)
                .putBoolean("wallpaper_enabled", true)
                .commit()
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

                Log.d("OdysseyWallpaper", "Verified & synced $blocksCount blocks and $habitsCount habits to native preferences")
                "{\"success\":true,\"blockCount\":$blocksCount,\"habitCount\":$habitsCount,\"streak\":$streak,\"message\":\"Verified: $blocksCount tasks & $habitsCount hobbies saved to Android Live Wallpaper\"}"
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
