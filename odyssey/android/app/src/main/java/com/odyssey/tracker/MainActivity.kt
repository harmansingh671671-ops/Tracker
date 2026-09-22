package com.odyssey.tracker

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

/**
 * MainActivity: Smart Native Hybrid Shell for Odyssey.
 *
 * RAPID PROTOTYPING & INSTANT PRODUCTION DEPLOYMENTS:
 * This Activity loads your live Vercel deployment URL inside an optimized Android WebView
 * while injecting native bridge interfaces (WallpaperManager, Background Hourly Updates).
 *
 * Benefits:
 * 1. You push code to GitHub -> Vercel deploys in ~30 seconds.
 * 2. Opening the APK immediately serves the newest Vercel code over the air.
 * 3. Zero APK rebuilds needed when iterating on UI, habits, charts, or logic.
 * 4. The native bridge allows the Vercel site to silently update the phone's lockscreen.
 */
class MainActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_OPEN_HOUR_EDIT = "EXTRA_OPEN_HOUR_EDIT"
        private const val PERMISSION_REQUEST_CODE = 8821
    }

    private lateinit var webView: WebView
    private var pendingOpenHour: Int = -1

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // OLED dark system bars matching Odyssey aesthetic
        window.statusBarColor = Color.BLACK
        window.navigationBarColor = Color.BLACK

        // Ensure notification channel is created
        OdysseyCadenceNotificationWorker.ensureNotificationChannel(this)

        // Request POST_NOTIFICATIONS permission on Android 13+ (API 33+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), PERMISSION_REQUEST_CODE)
            }
        }

        // Schedule next cadence notification alarm if enabled or first run
        val prefs = getSharedPreferences("odyssey_prefs", Context.MODE_PRIVATE)
        val notificationsEnabled = prefs.getBoolean("cadence_notifications_enabled", true)
        if (notificationsEnabled) {
            OdysseyCadenceNotificationWorker.scheduleNextCadenceNotification(this)
        }

        pendingOpenHour = intent.getIntExtra(EXTRA_OPEN_HOUR_EDIT, -1)

        val defaultUrl = getString(R.string.default_vercel_url)
        var targetUrl = intent.getStringExtra("TARGET_URL") ?: prefs.getString("live_vercel_url", defaultUrl) ?: defaultUrl

        if (pendingOpenHour in 0..23) {
            val delimiter = if (targetUrl.contains("?")) "&" else "?"
            targetUrl = "$targetUrl${delimiter}openHour=$pendingOpenHour"
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.BLACK)

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                useWideViewPort = true
                loadWithOverviewMode = true
                userAgentString = "$userAgentString OdysseyNativeShell/1.0"
            }

            // Injects Odyssey Wallpaper Bridge into window.OdysseyAndroid and window.Android
            val bridge = OdysseyWallpaperBridge(this@MainActivity)
            addJavascriptInterface(bridge, "OdysseyAndroid")
            addJavascriptInterface(bridge, "Android")

            setDownloadListener { url, _, _, _, _ ->
                try {
                    val downloadIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(downloadIntent)
                } catch (e: Exception) {
                    android.util.Log.e("OdysseyNative", "Failed to handle download: ${e.message}")
                }
            }

            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    if (pendingOpenHour in 0..23) {
                        val js = "(function(){ setTimeout(function(){ window.dispatchEvent(new CustomEvent('odyssey:open-hour-edit', { detail: { hour: $pendingOpenHour } })); }, 600); })();"
                        view?.evaluateJavascript(js, null)
                        pendingOpenHour = -1
                    }
                }

                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url?.toString() ?: return false
                    // APK downloads always open externally in system downloader/browser
                    if (url.endsWith(".apk") || url.contains("/downloads/")) {
                        return try {
                            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                            true
                        } catch (e: Exception) {
                            false
                        }
                    }
                    // Keep internal app navigation within WebView
                    if (url.contains("vercel.app") || url.contains("localhost") || url.startsWith("file://")) {
                        return false
                    }
                    // External links open in device browser
                    return try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    } catch (e: Exception) {
                        false
                    }
                }
            }

            webChromeClient = WebChromeClient()
        }

        setContentView(webView)

        // Navigate WebView history on back press
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        webView.loadUrl(targetUrl)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleOpenHourIntent(intent)
    }

    private fun handleOpenHourIntent(intent: Intent) {
        val hour = intent.getIntExtra(EXTRA_OPEN_HOUR_EDIT, -1)
        if (hour in 0..23) {
            val js = "window.dispatchEvent(new CustomEvent('odyssey:open-hour-edit', { detail: { hour: $hour } }));"
            webView.evaluateJavascript(js, null)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                OdysseyCadenceNotificationWorker.scheduleNextCadenceNotification(this)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}

