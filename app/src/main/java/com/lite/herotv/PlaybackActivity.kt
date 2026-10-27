@file:OptIn(androidx.media3.common.util.UnstableApi::class)
package com.lite.herotv

import android.net.Uri
import android.os.Bundle
import android.content.Intent
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.Button
import androidx.compose.material3.TextButton
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.CropFree
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Cast
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.material3.MaterialTheme
import androidx.media3.common.MediaItem
import androidx.media3.common.C
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.MimeTypes
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import android.content.pm.ActivityInfo
import androidx.mediarouter.app.MediaRouteButton
import androidx.mediarouter.media.MediaRouteSelector
import androidx.mediarouter.media.MediaControlIntent
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color as AndroidColor
import com.google.android.gms.cast.framework.CastButtonFactory
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.cast.framework.Session
import com.google.android.gms.cast.framework.SessionManager
import com.google.android.gms.cast.framework.SessionManagerListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.cast.MediaInfo
import com.google.android.gms.cast.MediaLoadRequestData
import com.google.android.gms.cast.MediaMetadata
import com.google.android.gms.cast.MediaTrack
import com.google.android.gms.cast.CastMediaControlIntent
import android.content.BroadcastReceiver
import android.content.IntentFilter
import androidx.core.app.NotificationCompat
import android.app.PendingIntent
 
private const val INTERSTITIAL_UNIT_ID = "ca-app-pub-2164158909071464/1677161639"

class PlaybackActivity : AppCompatActivity() {
    private var stopReceiver: BroadcastReceiver? = null
    private var playerRef: ExoPlayer? = null
    private var interstitialAd: InterstitialAd? = null
    private var isAdHandled: Boolean = false
    private var isAdShownInThisSession: Boolean = false
    private fun createNotificationChannelIfNeeded() {
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            val channel = android.app.NotificationChannel(
                "hero_tv_status",
                "Hero TV Status",
                android.app.NotificationManager.IMPORTANCE_DEFAULT
            )
            val manager = getSystemService(android.app.NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }
    private fun showAdIfExternal(onReady: () -> Unit) {
        if (isAdHandled || isAdShownInThisSession) {
            onReady()
            return
        }
        val isExternal = Intent.ACTION_VIEW == intent?.action || intent?.data != null
        if (!isExternal) {
            isAdHandled = true
            onReady()
            return
        }
        val alreadyLoaded = interstitialAd
        if (alreadyLoaded != null && !isAdShownInThisSession) {
            alreadyLoaded.fullScreenContentCallback = object : FullScreenContentCallback() {
                override fun onAdDismissedFullScreenContent() {
                    interstitialAd = null
                    isAdHandled = true
                    onReady()
                }
                override fun onAdFailedToShowFullScreenContent(adError: com.google.android.gms.ads.AdError) {
                    interstitialAd = null
                    isAdHandled = true
                    onReady()
                }
            }
            try {
                enterImmersiveMode()
                alreadyLoaded.show(this@PlaybackActivity)
                isAdShownInThisSession = true
            } catch (_: Exception) {
                interstitialAd = null
                isAdHandled = true
                onReady()
            }
            return
        }
        val request = AdRequest.Builder().build()
        InterstitialAd.load(
            this,
            INTERSTITIAL_UNIT_ID,
            request,
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialAd = ad
                    ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                        override fun onAdDismissedFullScreenContent() {
                            interstitialAd = null
                            isAdHandled = true
                            onReady()
                        }
                        override fun onAdFailedToShowFullScreenContent(adError: com.google.android.gms.ads.AdError) {
                            interstitialAd = null
                            isAdHandled = true
                            onReady()
                        }
                    }
                    try {
                        enterImmersiveMode()
                        ad.show(this@PlaybackActivity)
                        isAdShownInThisSession = true
                    } catch (_: Exception) {
                        interstitialAd = null
                        isAdHandled = true
                        onReady()
                    }
                }
                override fun onAdFailedToLoad(error: com.google.android.gms.ads.LoadAdError) {
                    interstitialAd = null
                    isAdHandled = true
                    onReady()
                }
            }
        )
    }
    @OptIn(UnstableApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            CastContext.getSharedInstance(this)
        } catch (_: Exception) {}
        stopReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: android.content.Context?, intent: Intent?) {
                try {
                    NotificationManagerCompat.from(this@PlaybackActivity).cancel(1001)
                } catch (_: SecurityException) {}
                try {
                    playerRef?.stop()
                    playerRef?.release()
                } catch (_: Exception) {}
                finish()
            }
        }
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            registerReceiver(stopReceiver, IntentFilter("com.lite.herotv.ACTION_STOP_PLAYBACK"), android.content.Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(stopReceiver, IntentFilter("com.lite.herotv.ACTION_STOP_PLAYBACK"))
        }
        val url = intent.getStringExtra("EXTRA_URL") ?: intent.dataString ?: ""
        val title = intent.getStringExtra("EXTRA_TITLE") ?: intent.data?.lastPathSegment ?: "Stream"
        val userAgent = intent.getStringExtra("EXTRA_USER_AGENT")
        val subUrl = intent.getStringExtra("EXTRA_SUBTITLE_URL")
        val subLang = intent.getStringExtra("EXTRA_SUBTITLE_LANG") ?: "en"
        if (url.isBlank()) {
            Toast.makeText(this, "Invalid stream URL", Toast.LENGTH_SHORT).show()
            finish()
            return
        }
        if (!isValidHttpUrl(url)) {
            Toast.makeText(this, "Invalid stream URL", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        enterImmersiveMode()
        setContent {
            val context = this
            val httpFactory = DefaultHttpDataSource.Factory().apply {
                val ua = userAgent?.takeIf { it.isNotBlank() } ?: "HeroTv/1.0"
                setUserAgent(ua)
                setConnectTimeoutMs(15_000)
                setReadTimeoutMs(30_000)
            }
            val dataSourceFactory = DefaultDataSource.Factory(context, httpFactory)
            val player = remember {
                ExoPlayer.Builder(context)
                    .setMediaSourceFactory(DefaultMediaSourceFactory(dataSourceFactory))
                    .build().apply {
                        setVideoScalingMode(C.VIDEO_SCALING_MODE_SCALE_TO_FIT)
                        playWhenReady = true
                        playerRef = this
                    }
            }
            var canStartVideo by remember { mutableStateOf(false) }
            LaunchedEffect(Unit) {
                showAdIfExternal { canStartVideo = true }
            }
            LaunchedEffect(url, canStartVideo) {
                if (url.isNotBlank() && canStartVideo) {
                    val item = buildMediaItem(url, title, userAgent, subUrl, subLang)
                    player.setMediaItem(item)
                    player.prepare()
                    player.play()
                }
            }

            LaunchedEffect(Unit) {
                enterImmersiveMode()
            }

            var overlayVisible by remember { mutableStateOf(true) }
            var autoHideKey by remember { mutableStateOf(0) }
            var loopEnabled by remember { mutableStateOf(false) }
            var scaleToFit by remember { mutableStateOf(true) }
            var positionMs by remember { mutableStateOf(0L) }
            var durationMs by remember { mutableStateOf(0L) }
            var selectedSpeed by remember { mutableStateOf(1.0f) }
            var selectedQuality by remember { mutableStateOf("Auto") }
            var showSettings by remember { mutableStateOf(false) }

            LaunchedEffect(overlayVisible, autoHideKey, showSettings) {
                if (overlayVisible && !showSettings) {
                    kotlinx.coroutines.delay(5000)
                    overlayVisible = false
                    enterImmersiveMode()
                }
            }

            LaunchedEffect(player) {
                loopEnabled = player.repeatMode == androidx.media3.common.Player.REPEAT_MODE_ONE
                while (true) {
                    positionMs = player.currentPosition
                    val d = player.duration
                    if (d > 0) durationMs = d
                    kotlinx.coroutines.delay(250)
                }
            }

            DisposableEffect(Unit) {
                onDispose {
                    player.release()
                }
            }
            DisposableEffect(Unit) {
                onDispose {
                    interstitialAd?.fullScreenContentCallback = null
                    interstitialAd = null
                }
            }

            var playerViewRef by remember { mutableStateOf<PlayerView?>(null) }
            Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = {
                        PlayerView(it).apply {
                            this.player = player
                            this.keepScreenOn = true
                            this.setUseController(false)
                            this.setBackgroundColor(AndroidColor.BLACK)
                            this.setShutterBackgroundColor(AndroidColor.BLACK)
                            playerViewRef = this
                        }
                    }
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .clickable {
                            overlayVisible = !overlayVisible
                            autoHideKey++
                        }
                )
                AnimatedVisibility(
                    visible = overlayVisible,
                    enter = fadeIn(),
                    exit = fadeOut()
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                    ) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.TopCenter)
                                .fillMaxWidth()
                                .padding(16.dp)
                        ) {
                            Text(
                                text = title,
                                color = Color.White,
                                fontSize = 18.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.align(Alignment.Center)
                            )
                            AndroidView(
                                modifier = Modifier.align(Alignment.CenterEnd),
                                factory = { ctx ->
                                    MediaRouteButton(ctx).apply {
                                        CastButtonFactory.setUpMediaRouteButton(ctx, this)
                                        val selector = MediaRouteSelector.Builder()
                                            .addControlCategory(
                                                com.google.android.gms.cast.CastMediaControlIntent.categoryForCast(
                                                    com.google.android.gms.cast.CastMediaControlIntent.DEFAULT_MEDIA_RECEIVER_APPLICATION_ID
                                                )
                                            )
                                            .build()
                                        this.routeSelector = selector
                                    }
                                }
                            )
                        }
                        Box(
                            modifier = Modifier
                                .size(88.dp)
                                .clip(CircleShape)
                        .background(Color.White)
                        .align(Alignment.Center)
                                .clickable {
                                    val nowPlaying = player.playWhenReady
                                    player.playWhenReady = !nowPlaying
                                    overlayVisible = true
                                    autoHideKey++
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = if (player.playWhenReady) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                                contentDescription = null,
                                tint = Color.Black,
                                modifier = Modifier.size(40.dp)
                            )
                        }
                        Column(
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(text = formatTime(positionMs), color = Color.White, fontSize = 12.sp)
                                    Icon(
                                        imageVector = Icons.Filled.Repeat,
                                        contentDescription = null,
                                        tint = if (loopEnabled) MaterialTheme.colorScheme.primary else Color.White,
                                        modifier = Modifier.clickable {
                                            loopEnabled = !loopEnabled
                                            player.repeatMode =
                                                if (loopEnabled) androidx.media3.common.Player.REPEAT_MODE_ONE
                                                else androidx.media3.common.Player.REPEAT_MODE_OFF
                                            overlayVisible = true
                                            autoHideKey++
                                        }
                                    )
                                }
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.CropFree,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.clickable {
                                            val pv = playerViewRef
                                            if (pv != null) {
                                                val modes = listOf("FIT", "FILL", "16:9", "4:3")
                                                val currentIndex = if (scaleToFit) 0 else 1
                                                val nextIndex = (currentIndex + 1) % modes.size
                                                when (modes[nextIndex]) {
                                                    "FIT" -> {
                                                        scaleToFit = true
                                                        pv.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT)
                                                        player.videoScalingMode = C.VIDEO_SCALING_MODE_SCALE_TO_FIT
                                                    }
                                                    "FILL" -> {
                                                        scaleToFit = false
                                                        pv.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_ZOOM)
                                                        player.videoScalingMode = C.VIDEO_SCALING_MODE_SCALE_TO_FIT_WITH_CROPPING
                                                    }
                                                    "16:9" -> {
                                                        pv.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT)
                                                        val frame = pv.findViewById<AspectRatioFrameLayout>(androidx.media3.ui.R.id.exo_content_frame)
                                                        frame?.setAspectRatio(16f / 9f)
                                                    }
                                                    "4:3" -> {
                                                        pv.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT)
                                                        val frame = pv.findViewById<AspectRatioFrameLayout>(androidx.media3.ui.R.id.exo_content_frame)
                                                        frame?.setAspectRatio(4f / 3f)
                                                    }
                                                }
                                            }
                                            overlayVisible = true
                                            autoHideKey++
                                        }
                                    )
                                    Icon(
                                        imageVector = Icons.Filled.MoreVert,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.clickable {
                                            showSettings = true
                                            overlayVisible = true
                                            autoHideKey++
                                        }
                                    )
                                    Text(text = formatTime(durationMs), color = Color.White, fontSize = 12.sp)
                                }
                            }
                            Slider(
                                value = if (durationMs > 0) positionMs.toFloat() / durationMs.toFloat() else 0f,
                                onValueChange = { v ->
                                    if (durationMs > 0) {
                                        val target = (v * durationMs).toLong()
                                        positionMs = target
                                        overlayVisible = true
                                        autoHideKey++
                                    }
                                },
                                onValueChangeFinished = {
                                    if (durationMs > 0) {
                                        player.seekTo(positionMs)
                                    }
                                },
                                colors = SliderDefaults.colors(
                                    thumbColor = MaterialTheme.colorScheme.primary,
                                    activeTrackColor = MaterialTheme.colorScheme.primary,
                                    inactiveTrackColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
                                )
                            )
                        }
                    }
                }
                if (showSettings) {
                    LaunchedEffect(Unit) {
                        selectedSpeed = player.playbackParameters.speed
                        selectedQuality = "Auto"
                    }
                    Box(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .widthIn(max = 360.dp)
                            .heightIn(max = 260.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.White)
                            .padding(16.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Playback Settings", color = Color.Black, fontSize = 16.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                TextButton(onClick = { showSettings = false }) { Text("Close", color = Color.Black, maxLines = 1, overflow = TextOverflow.Ellipsis) }
                            }
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Speed", color = Color.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                val speeds = listOf(0.5f, 1.0f, 1.25f, 1.5f, 2.0f, 5.0f)
                                val firstRow = speeds.take(3)
                                val secondRow = speeds.drop(3)
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    firstRow.forEach { sp ->
                                        Button(
                                            onClick = {
                                                selectedSpeed = sp
                                                player.playbackParameters = PlaybackParameters(sp)
                                                overlayVisible = true
                                                autoHideKey++
                                            },
                                            modifier = Modifier.weight(1f),
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = if (selectedSpeed == sp) MaterialTheme.colorScheme.primary else Color.White,
                                                contentColor = if (selectedSpeed == sp) MaterialTheme.colorScheme.onPrimary else Color.Black
                                            )
                                        ) { Text("${sp}x") }
                                    }
                                }
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    secondRow.forEach { sp ->
                                        Button(
                                            onClick = {
                                                selectedSpeed = sp
                                                player.playbackParameters = PlaybackParameters(sp)
                                                overlayVisible = true
                                                autoHideKey++
                                            },
                                            modifier = Modifier.weight(1f),
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = if (selectedSpeed == sp) MaterialTheme.colorScheme.primary else Color.White,
                                                contentColor = if (selectedSpeed == sp) MaterialTheme.colorScheme.onPrimary else Color.Black
                                            )
                                        ) { Text("${sp}x") }
                                    }
                                }
                            }
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Quality", color = Color.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    val applyParams: (String) -> Unit = { choice ->
                                        val builder = player.trackSelectionParameters.buildUpon()
                                        when (choice) {
                                            "Auto" -> {
                                                builder.setForceHighestSupportedBitrate(false)
                                                builder.setMaxVideoBitrate(Int.MAX_VALUE)
                                            }
                                            "Medium" -> {
                                                builder.setForceHighestSupportedBitrate(false)
                                                builder.setMaxVideoBitrate(3_000_000)
                                            }
                                            "Low" -> {
                                                builder.setForceHighestSupportedBitrate(false)
                                                builder.setMaxVideoBitrate(800_000)
                                            }
                                        }
                                        player.trackSelectionParameters = builder.build()
                                        selectedQuality = choice
                                        overlayVisible = true
                                        autoHideKey++
                                    }
                                    listOf("Auto", "Medium", "Low").forEach { q ->
                                        Button(
                                            onClick = { applyParams(q) },
                                            modifier = Modifier.weight(1f),
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = if (selectedQuality == q) MaterialTheme.colorScheme.primary else Color.White,
                                                contentColor = if (selectedQuality == q) MaterialTheme.colorScheme.onPrimary else Color.Black
                                            )
                                        ) { Text(q, maxLines = 1, overflow = TextOverflow.Ellipsis, softWrap = false) }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        setupCastSessionListeners(url, title, subUrl)
    }

    override fun onResume() {
        super.onResume()
        enterImmersiveMode()
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            if (granted) {
                try {
                    NotificationManagerCompat.from(this).cancel(1001)
                } catch (_: SecurityException) {}
            }
        } else {
            try {
                NotificationManagerCompat.from(this).cancel(1001)
            } catch (_: SecurityException) {}
        }
    }
    override fun onStop() {
        super.onStop()
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        }
        createNotificationChannelIfNeeded()
        val flags = if (android.os.Build.VERSION.SDK_INT >= 23) PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE else PendingIntent.FLAG_UPDATE_CURRENT
        val reopen = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), flags)
        val stopIntent = Intent(this, StopPlaybackReceiver::class.java).apply { action = "com.lite.herotv.ACTION_STOP_PLAYBACK" }
        val stop = PendingIntent.getBroadcast(this, 1, stopIntent, flags)
        val builder = NotificationCompat.Builder(this, "hero_tv_status")
            .setSmallIcon(com.lite.herotv.R.drawable.ic_stat_bell)
            .setLargeIcon(android.graphics.BitmapFactory.decodeResource(resources, com.lite.herotv.R.mipmap.ic_launcher))
            .setContentTitle("Hero TV is playing")
            .setContentText("Tap to return or stop playback")
            .setContentIntent(reopen)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_media_pause, "Stop", stop)
        try {
            NotificationManagerCompat.from(this).notify(1001, builder.build())
        } catch (_: SecurityException) {}
    }
    override fun onDestroy() {
        super.onDestroy()
        stopReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (_: Exception) {}
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            enterImmersiveMode()
        }
    }

    private fun enterImmersiveMode() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }
    private fun exitImmersiveMode() {
        WindowCompat.setDecorFitsSystemWindows(window, true)
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.show(WindowInsetsCompat.Type.systemBars())
    }

    private fun formatTime(ms: Long): String {
        val totalSeconds = ms / 1000
        val seconds = (totalSeconds % 60).toInt()
        val minutes = ((totalSeconds / 60) % 60).toInt()
        val hours = (totalSeconds / 3600).toInt()
        return if (hours > 0) "%d:%02d:%02d".format(hours, minutes, seconds) else "%02d:%02d".format(minutes, seconds)
    }

    private fun isValidHttpUrl(url: String): Boolean {
        return try {
            val uri = Uri.parse(url)
            uri != null && (
                uri.scheme == "http" ||
                uri.scheme == "https" ||
                uri.scheme == "rtsp" ||
                uri.scheme == "file" ||
                uri.scheme == "content"
            )
        } catch (_: Exception) {
            false
        }
    }

    private fun buildMediaItem(url: String, title: String, userAgent: String?, subUrl: String?, subLang: String): MediaItem {
        val uri = Uri.parse(url)
        val builder = MediaItem.Builder()
            .setUri(uri)
            .setMediaId(title)
        val lower = url.lowercase()
        when {
            lower.endsWith(".m3u8") -> builder.setMimeType(MimeTypes.APPLICATION_M3U8)
            lower.endsWith(".mpd") -> builder.setMimeType(MimeTypes.APPLICATION_MPD)
            lower.contains(".ism") || lower.contains("manifest") -> builder.setMimeType(MimeTypes.APPLICATION_SS)
            lower.startsWith("rtsp://") -> {}
            lower.endsWith(".mp4") -> builder.setMimeType(MimeTypes.VIDEO_MP4)
            lower.endsWith(".webm") -> builder.setMimeType(MimeTypes.VIDEO_WEBM)
            lower.endsWith(".mkv") -> builder.setMimeType(MimeTypes.VIDEO_MATROSKA)
            lower.endsWith(".avi") -> builder.setMimeType("video/avi")
            lower.endsWith(".mov") -> builder.setMimeType("video/quicktime")
            lower.endsWith(".wmv") -> builder.setMimeType("video/x-ms-wmv")
            lower.endsWith(".flv") -> builder.setMimeType("video/x-flv")
            lower.endsWith(".ts") -> builder.setMimeType(MimeTypes.VIDEO_MP2T)
            lower.endsWith(".mp3") -> builder.setMimeType(MimeTypes.AUDIO_MPEG)
            lower.endsWith(".aac") -> builder.setMimeType(MimeTypes.AUDIO_AAC)
            lower.endsWith(".flac") -> builder.setMimeType(MimeTypes.AUDIO_FLAC)
            lower.endsWith(".ogg") || lower.endsWith(".ogv") || lower.endsWith(".oga") -> builder.setMimeType(MimeTypes.AUDIO_OGG)
            lower.endsWith(".wav") -> builder.setMimeType(MimeTypes.AUDIO_WAV)
            else -> {}
        }
        val subs = mutableListOf<MediaItem.SubtitleConfiguration>()
        if (!subUrl.isNullOrBlank()) {
            val sUri = Uri.parse(subUrl)
            val sLower = subUrl.lowercase()
            val mime = when {
                sLower.endsWith(".vtt") -> MimeTypes.TEXT_VTT
                sLower.endsWith(".srt") -> MimeTypes.APPLICATION_SUBRIP
                sLower.endsWith(".ttml") || sLower.endsWith(".xml") -> MimeTypes.APPLICATION_TTML
                else -> MimeTypes.TEXT_VTT
            }
            subs.add(
                MediaItem.SubtitleConfiguration.Builder(sUri)
                    .setMimeType(mime)
                    .setLanguage(subLang)
                    .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
                    .build()
            )
        }
        if (subs.isNotEmpty()) {
            builder.setSubtitleConfigurations(subs)
        }
        return builder.build()
    }

    private fun setupCastSessionListeners(url: String, title: String, subUrl: String?) {
        val ctx = try { CastContext.getSharedInstance(this) } catch (_: Exception) { null }
        val sessionManager: SessionManager = ctx?.sessionManager ?: return
        val listener = object : SessionManagerListener<Session> {
            override fun onSessionStarted(session: Session, sessionId: String) {
                castLoadMedia(url, title, subUrl)
            }
            override fun onSessionResumed(session: Session, wasSuspended: Boolean) {
                castLoadMedia(url, title, subUrl)
            }
            override fun onSessionEnding(session: Session) {}
            override fun onSessionEnded(session: Session, error: Int) {}
            override fun onSessionSuspended(session: Session, reason: Int) {}
            override fun onSessionStarting(session: Session) {}
            override fun onSessionResuming(session: Session, sessionId: String) {}
            override fun onSessionStartFailed(session: Session, error: Int) {}
            override fun onSessionResumeFailed(session: Session, error: Int) {}
        }
        sessionManager.addSessionManagerListener(listener, Session::class.java)
        // Remove listener when activity goes away
        lifecycle.addObserver(object : androidx.lifecycle.DefaultLifecycleObserver {
            override fun onDestroy(owner: androidx.lifecycle.LifecycleOwner) {
                sessionManager.removeSessionManagerListener(listener, Session::class.java)
            }
        })
    }

    private fun castLoadMedia(url: String, title: String, subUrl: String?) {
        val ctx = try { CastContext.getSharedInstance(this) } catch (_: Exception) { null } ?: return
        val castSession = ctx.sessionManager.currentCastSession ?: return
        val client = castSession.remoteMediaClient ?: return
        val metadata = MediaMetadata(MediaMetadata.MEDIA_TYPE_MOVIE).apply {
            putString(MediaMetadata.KEY_TITLE, title)
        }
        val tracks = mutableListOf<MediaTrack>()
        if (!subUrl.isNullOrBlank()) {
            val id = 1L
            val subtype = MediaTrack.SUBTYPE_SUBTITLES
            val track = MediaTrack.Builder(id, MediaTrack.TYPE_TEXT)
                .setName("Subtitles")
                .setSubtype(subtype)
                .setContentId(subUrl)
                .setLanguage("en")
                .setContentType("text/vtt")
                .build()
            tracks.add(track)
        }
        val contentType = guessContentType(url)
        val info = MediaInfo.Builder(url)
            .setStreamType(MediaInfo.STREAM_TYPE_BUFFERED)
            .setContentType(contentType)
            .setMetadata(metadata)
            .setMediaTracks(tracks)
            .build()
        val request = MediaLoadRequestData.Builder()
            .setMediaInfo(info)
            .setAutoplay(true)
            .build()
        client.load(request)
    }

    private fun guessContentType(url: String): String {
        val lower = url.lowercase()
        return when {
            lower.endsWith(".m3u8") -> "application/x-mpegurl"
            lower.endsWith(".mpd") -> "application/dash+xml"
            lower.endsWith(".mp4") -> "video/mp4"
            lower.endsWith(".webm") -> "video/webm"
            lower.endsWith(".mkv") -> "video/x-matroska"
            lower.endsWith(".ts") -> "video/mp2t"
            lower.endsWith(".mp3") -> "audio/mpeg"
            lower.endsWith(".aac") -> "audio/aac"
            lower.endsWith(".flac") -> "audio/flac"
            lower.endsWith(".ogg") || lower.endsWith(".oga") -> "audio/ogg"
            lower.endsWith(".wav") -> "audio/wav"
            else -> "application/octet-stream"
        }
    }
}
