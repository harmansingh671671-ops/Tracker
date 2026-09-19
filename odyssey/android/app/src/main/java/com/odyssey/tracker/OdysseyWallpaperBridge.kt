package com.odyssey.tracker

import android.app.WallpaperManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import android.widget.Toast

/**
 * OdysseyWallpaperBridge
 * 
 * Injected into the WebView as `window.OdysseyAndroid` or `window.Android`.
 * Provides zero-friction, privacy-safe 1-tap lockscreen wallpaper updates
 * using Android's standard WallpaperManager (Install-time normal permission, 0 runtime popups).
 */
class OdysseyWallpaperBridge(private val context: Context) {

    private val prefs = context.getSharedPreferences("odyssey_prefs", Context.MODE_PRIVATE)

    /**
     * Directly applies the base64 PNG image onto the Android Lock Screen.
     * Uses WallpaperManager.FLAG_LOCK on Android 7.0+ (API 24+).
     */
    @JavascriptInterface
    fun setLockscreenWallpaper(base64Image: String): Boolean {
        return try {
            val cleanBase64 = base64Image
                .replace("data:image/png;base64,", "")
                .replace("data:image/jpeg;base64,", "")
            val decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)

            val wallpaperManager = WallpaperManager.getInstance(context)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                // Apply directly to the Lock Screen (FLAG_LOCK)
                wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
            } else {
                wallpaperManager.setBitmap(bitmap)
            }

            Log.d("OdysseyWallpaper", "Successfully applied lockscreen wallpaper directly via WallpaperManager")
            true
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to apply wallpaper directly: ${e.message}", e)
            false
        }
    }

    /**
     * Clears custom lockscreen wallpaper and restores the system default.
     * Also cancels the background hourly auto-update worker.
     */
    @JavascriptInterface
    fun clearLockscreenWallpaper(): Boolean {
        return try {
            val wallpaperManager = WallpaperManager.getInstance(context)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                wallpaperManager.clear(WallpaperManager.FLAG_LOCK)
            } else {
                wallpaperManager.clear()
            }
            OdysseyHourlyWallpaperWorker.cancelHourlyUpdate(context)
            Log.d("OdysseyWallpaper", "Successfully cleared lockscreen wallpaper and restored system default")
            true
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Failed to clear lockscreen wallpaper: ${e.message}", e)
            false
        }
    }

    /**
     * Saves today's schedule JSON into SharedPreferences so the
     * OdysseyLiveWallpaperService can draw and center the active hour
     * dynamically in real time whenever the phone screen turns on.
     */
    @JavascriptInterface
    fun syncSchedule(scheduleJson: String) {
        try {
            prefs.edit().putString("latest_schedule_json", scheduleJson).apply()
            Log.d("OdysseyWallpaper", "Synced schedule data to native preferences for Live Wallpaper")
        } catch (e: Exception) {
            Log.e("OdysseyWallpaper", "Error saving schedule: ${e.message}")
        }
    }

    /**
     * Opens Android's system Live Wallpaper picker to preview & apply
     * the real-time dynamic lockscreen wallpaper.
     */
    @JavascriptInterface
    fun launchLiveWallpaperPicker() {
        try {
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

    @JavascriptInterface
    fun isSupported(): Boolean = true
}
