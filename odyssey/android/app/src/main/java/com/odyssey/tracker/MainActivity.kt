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

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream

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
    private var filePathCallback: android.webkit.ValueCallback<Array<Uri>>? = null

    private val photoPickerLauncher = registerForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK && result.data != null) {
            val uri = result.data?.data ?: result.data?.clipData?.getItemAt(0)?.uri
            if (uri != null) {
                handleSelectedPhotoUri(uri)
            }
        }
    }

    private val fileChooserLauncher = registerForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (filePathCallback != null) {
            val uris = if (result.resultCode == RESULT_OK && result.data != null) {
                val dataUri = result.data?.data
                val clipData = result.data?.clipData
                when {
                    dataUri != null -> arrayOf(dataUri)
                    clipData != null -> (0 until clipData.itemCount).map { clipData.getItemAt(it).uri }.toTypedArray()
                    else -> null
                }
            } else {
                null
            }
            filePathCallback?.onReceiveValue(uris)
            filePathCallback = null
        }
    }

    fun launchPhotoPicker() {
        val pickIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "image/*"
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        val chooser = Intent.createChooser(pickIntent, "Select Wallpaper Photo")
        try {
            photoPickerLauncher.launch(chooser)
        } catch (e: Exception) {
            try {
                val galleryIntent = Intent(Intent.ACTION_PICK, android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
                photoPickerLauncher.launch(galleryIntent)
            } catch (e2: Exception) {
                android.util.Log.e("OdysseyNative", "Could not launch photo picker: ${e2.message}")
            }
        }
    }

    private fun handleSelectedPhotoUri(uri: Uri) {
        Thread {
            try {
                val inputStream = contentResolver.openInputStream(uri) ?: return@Thread
                val originalBitmap = BitmapFactory.decodeStream(inputStream)
                inputStream.close()
                if (originalBitmap == null) return@Thread

                // Scale to max 1440x2560 maintaining aspect ratio
                val maxW = 1440
                val maxH = 2560
                val width = originalBitmap.width
                val height = originalBitmap.height
                val scaledBitmap = if (width > maxW || height > maxH) {
                    val ratio = Math.min(maxW.toFloat() / width, maxH.toFloat() / height)
                    val newW = (width * ratio).toInt()
                    val newH = (height * ratio).toInt()
                    Bitmap.createScaledBitmap(originalBitmap, newW, newH, true)
                } else {
                    originalBitmap
                }

                // Save to internal app storage custom_restoration_wallpaper.png
                val file = File(filesDir, "custom_restoration_wallpaper.png")
                FileOutputStream(file).use { out ->
                    scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 90, out)
                }

                // Convert to Base64
                val baos = ByteArrayOutputStream()
                scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 90, baos)
                val base64Bytes = baos.toByteArray()
                val base64Str = "data:image/jpeg;base64," + Base64.encodeToString(base64Bytes, Base64.NO_WRAP)

                val prefs = getSharedPreferences("odyssey_prefs", Context.MODE_PRIVATE)
                prefs.edit()
                    .putString("saved_custom_wallpaper", base64Str)
                    .putString("alternate_lock_wallpaper", base64Str)
                    .putString("alternate_home_wallpaper", base64Str)
                    .commit()

                // Notify WebView JavaScript
                runOnUiThread {
                    val escapedBase64 = base64Str.replace("'", "\\'")
                    val js = "(function(){ window.dispatchEvent(new CustomEvent('odyssey:custom-wallpaper-selected', { detail: { base64: '$escapedBase64' } })); })();"
                    webView.evaluateJavascript(js, null)
                }
                android.util.Log.d("OdysseyNative", "Successfully selected and stored custom restoration wallpaper")
            } catch (e: Exception) {
                android.util.Log.e("OdysseyNative", "Error processing selected wallpaper uri: ${e.message}", e)
            }
        }.start()
    }

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
            val bridge = OdysseyWallpaperBridge(this@MainActivity, this@MainActivity)
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

            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: android.webkit.ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = filePathCallback

                    val chooserIntent = try {
                        val pickIntent = Intent(Intent.ACTION_PICK, android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI).apply {
                            type = "image/*"
                        }
                        Intent.createChooser(pickIntent, "Select Wallpaper Photo")
                    } catch (e: Exception) {
                        fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                            type = "image/*"
                            addCategory(Intent.CATEGORY_OPENABLE)
                        }
                    }

                    return try {
                        fileChooserLauncher.launch(chooserIntent)
                        true
                    } catch (e: Exception) {
                        try {
                            val fallbackIntent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                                type = "image/*"
                            }
                            fileChooserLauncher.launch(fallbackIntent)
                            true
                        } catch (e2: Exception) {
                            this@MainActivity.filePathCallback?.onReceiveValue(null)
                            this@MainActivity.filePathCallback = null
                            false
                        }
                    }
                }
            }
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

