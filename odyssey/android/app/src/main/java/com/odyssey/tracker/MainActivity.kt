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

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // OLED dark system bars matching Odyssey aesthetic
        window.statusBarColor = Color.BLACK
        window.navigationBarColor = Color.BLACK

        val prefs = getSharedPreferences("odyssey_prefs", Context.MODE_PRIVATE)
        val defaultUrl = getString(R.string.default_vercel_url)
        val targetUrl = intent.getStringExtra("TARGET_URL") ?: prefs.getString("live_vercel_url", defaultUrl) ?: defaultUrl

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

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url?.toString() ?: return false
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
