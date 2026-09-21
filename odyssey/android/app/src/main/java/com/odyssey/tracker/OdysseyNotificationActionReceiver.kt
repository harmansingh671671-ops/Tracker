package com.odyssey.tracker

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * OdysseyNotificationActionReceiver
 *
 * Handles action button clicks from the Odyssey Cadence notifications outside the app.
 * E.g., when the user taps "Roger that", it dismisses the notification.
 */
class OdysseyNotificationActionReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_ROGER_THAT = "com.odyssey.tracker.ACTION_ROGER_THAT"
        const val EXTRA_NOTIFICATION_ID = "NOTIFICATION_ID"
        private const val TAG = "OdysseyActionReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ACTION_ROGER_THAT) {
            val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, 5757)
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.cancel(notificationId)
            Log.d(TAG, "User acknowledged task cadence notification ($notificationId). Notification dismissed.")
        }
    }
}
