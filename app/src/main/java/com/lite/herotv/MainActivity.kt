package com.lite.herotv

import android.os.Bundle
import android.content.Intent
import android.net.Uri
import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.os.Build
import android.content.pm.PackageManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.Crossfade
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.rounded.AddCircle
import androidx.compose.material.icons.rounded.Fingerprint
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.PlayCircleFilled
import androidx.compose.material.icons.filled.Edit
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.core.tween
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.Divider
import androidx.compose.material3.Switch
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.platform.LocalContext
import com.lite.herotv.ui.theme.HeroTvTheme
import android.content.Context
import androidx.compose.foundation.clickable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
 
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.app.ActivityCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import android.graphics.BitmapFactory
import coil.compose.AsyncImage
import coil.request.ImageRequest
import androidx.compose.ui.layout.ContentScale
 
 

private const val BANNER_UNIT_ID = "ca-app-pub-2164158909071464/7039484748"
private const val INTERSTITIAL_UNIT_ID = "ca-app-pub-2164158909071464/1677161639"
private const val NOTIF_CHANNEL_ID = "hero_tv_status"
private const val NOTIF_ID_ACTIVE = 1001
private const val REQ_POST_NOTIFICATIONS = 9001

class MainActivity : ComponentActivity() {
    private var interstitialAd: InterstitialAd? = null
    private var isLoadingInterstitial: Boolean = false
    private lateinit var prefs: android.content.SharedPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val incomingAction = intent?.action
        val incomingData = intent?.data
        if (Intent.ACTION_VIEW == incomingAction || incomingData != null) {
            val external = parseIncomingIntent(intent)
            val url = external.url
            if (!url.isNullOrBlank()) {
                launchPlayback(this, url, external.title ?: "Stream", external.userAgent)
                finish()
                return
            }
        }
        MobileAds.initialize(this)
        preloadInterstitial()
        prefs = getSharedPreferences("HeroTv", Context.MODE_PRIVATE)
        val savedDark = prefs.getBoolean("dark_mode", false)
        val savedEnableNotifications = prefs.getBoolean("enable_notifications", true)
        val savedAutoPlay = prefs.getBoolean("auto_play", false)
        createNotificationChannel()
        ensureNotificationPermission()

        enableEdgeToEdge()
        WindowCompat.setDecorFitsSystemWindows(window, false)
        hideSystemBars()
        setContent {
            var darkTheme by remember { mutableStateOf(savedDark) }
            var showSettings by rememberSaveable { mutableStateOf(false) }
            val external = parseIncomingIntent(intent)
            Crossfade(targetState = darkTheme, label = "Theme") { isDark ->
                HeroTvTheme(darkTheme = isDark, dynamicColor = false) {
                    AppScaffold(
                        darkTheme = isDark,
                        onToggleTheme = {
                            darkTheme = !darkTheme
                            prefs.edit().putBoolean("dark_mode", darkTheme).apply()
                        },
                        showSettings = showSettings,
                        onShowSettingsChange = { showSettings = it },
                        rootDarkTheme = darkTheme,
                        initialTitle = external.title,
                        initialUrl = external.url,
                        initialUserAgent = external.userAgent,
                        autoPlayOnStart = external.autoPlay,
                        initialEnableNotifications = savedEnableNotifications,
                        initialAutoPlay = savedAutoPlay,
                        onEnableNotificationsChanged = { enabled ->
                            prefs.edit().putBoolean("enable_notifications", enabled).apply()
                        },
                        onAutoPlayChanged = { enabled ->
                            prefs.edit().putBoolean("auto_play", enabled).apply()
                        }
                    )
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        cancelActiveNotification()
        hideSystemBars()
    }

    override fun onStop() {
        super.onStop()
        if (prefs.getBoolean("enable_notifications", true)) {
            showActiveNotification()
        }
    }

    private fun preloadInterstitial() {
        if (isLoadingInterstitial) return
        isLoadingInterstitial = true
        val request = AdRequest.Builder().build()
        InterstitialAd.load(
            this,
            INTERSTITIAL_UNIT_ID,
            request,
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialAd = ad
                    isLoadingInterstitial = false
                }
                override fun onAdFailedToLoad(error: com.google.android.gms.ads.LoadAdError) {
                    interstitialAd = null
                    isLoadingInterstitial = false
                }
            }
        )
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIF_CHANNEL_ID,
                "Hero TV Status",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Status notifications for Hero TV"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun ensureNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED
            val prompted = prefs.getBoolean("notif_prompted", false)
            if (!granted && !prompted) {
                prefs.edit().putBoolean("notif_prompted", true).apply()
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQ_POST_NOTIFICATIONS)
            }
        }
    }

    private fun showActiveNotification() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        }
        val intent = Intent(this, MainActivity::class.java)
        val flags = if (Build.VERSION.SDK_INT >= 23) PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE else PendingIntent.FLAG_UPDATE_CURRENT
        val pending = PendingIntent.getActivity(this, 0, intent, flags)
        val stopIntent = Intent(this, StopPlaybackReceiver::class.java).apply {
            action = "com.lite.herotv.ACTION_STOP_PLAYBACK"
        }
        val stopPending = PendingIntent.getBroadcast(this, 1, stopIntent, flags)
        val builder = NotificationCompat.Builder(this, NOTIF_CHANNEL_ID)
            .setSmallIcon(com.lite.herotv.R.drawable.ic_stat_bell)
            .setLargeIcon(BitmapFactory.decodeResource(resources, com.lite.herotv.R.mipmap.ic_launcher))
            .setContentTitle("Hero TV is active")
            .setContentText("Tap to return to the app")
            .setContentIntent(pending)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .addAction(android.R.drawable.ic_media_pause, "Stop", stopPending)
            .setDeleteIntent(PendingIntent.getBroadcast(this, 2, stopIntent, flags))
        try {
            NotificationManagerCompat.from(this).notify(NOTIF_ID_ACTIVE, builder.build())
        } catch (_: SecurityException) {}
    }

    private fun cancelActiveNotification() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        }
        try {
            NotificationManagerCompat.from(this).cancel(NOTIF_ID_ACTIVE)
        } catch (_: SecurityException) {}
    }

    private fun hideSystemBars() {
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.navigationBars())
    }

    fun showInterstitialThen(action: () -> Unit) {
        val ad = interstitialAd
        if (ad != null) {
            ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                override fun onAdDismissedFullScreenContent() {
                    interstitialAd = null
                    preloadInterstitial()
                    action()
                }
                override fun onAdFailedToShowFullScreenContent(adError: com.google.android.gms.ads.AdError) {
                    interstitialAd = null
                    preloadInterstitial()
                    action()
                }
            }
            ad.show(this)
        } else {
            action()
            preloadInterstitial()
        }
    }

 

 
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppScaffold(
    darkTheme: Boolean,
    onToggleTheme: () -> Unit,
    showSettings: Boolean,
    onShowSettingsChange: (Boolean) -> Unit,
    rootDarkTheme: Boolean,
    initialTitle: String?,
    initialUrl: String?,
    initialUserAgent: String?,
    autoPlayOnStart: Boolean,
    initialEnableNotifications: Boolean,
    initialAutoPlay: Boolean,
    onEnableNotificationsChanged: (Boolean) -> Unit,
    onAutoPlayChanged: (Boolean) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var url by remember { mutableStateOf("") }
    var userAgent by remember { mutableStateOf("") }
    var enableNotifications by rememberSaveable { mutableStateOf(initialEnableNotifications) }
    var autoPlay by rememberSaveable { mutableStateOf(initialAutoPlay) }
    var currentTab by rememberSaveable { mutableStateOf(0) }
    val selectedPlaylistSaver: Saver<MutableState<LinkItem?>, Map<String, String>> = Saver(
        save = { state ->
            val pl = state.value
            if (pl != null) mapOf("title" to pl.title, "url" to pl.url, "ua" to (pl.userAgent ?: "")) else emptyMap()
        },
        restore = { map ->
            mutableStateOf(
                if (map.isNotEmpty()) {
                    LinkItem(
                        map["title"] ?: "",
                        map["url"] ?: "",
                        (map["ua"] ?: "").ifBlank { null }
                    )
                } else null
            )
        }
    )
    var selectedPlaylist by rememberSaveable(saver = selectedPlaylistSaver) { mutableStateOf<LinkItem?>(null) }
    val context = LocalContext.current
    LaunchedEffect(initialTitle, initialUrl, initialUserAgent) {
        if (!initialTitle.isNullOrBlank()) title = initialTitle
        if (!initialUrl.isNullOrBlank()) url = initialUrl
        if (!initialUserAgent.isNullOrBlank()) userAgent = initialUserAgent
    }
    LaunchedEffect(autoPlayOnStart, autoPlay) {
        if (autoPlayOnStart && autoPlay && isValidHttpUrl(url)) {
            val activity = (context as? MainActivity)
            if (activity != null) {
                activity.showInterstitialThen {
                    launchPlayback(context, url, title.ifBlank { "Stream" }, userAgent)
                }
            } else {
                launchPlayback(context, url, title.ifBlank { "Stream" }, userAgent)
            }
        }
    }
    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("HERO TV", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    if (currentTab == 1 && selectedPlaylist != null) {
                        IconButton(onClick = { selectedPlaylist = null }) {
                            Icon(imageVector = Icons.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { onShowSettingsChange(true) }) {
                        Icon(imageVector = Icons.Filled.Settings, contentDescription = "Settings")
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            Column(modifier = Modifier.fillMaxWidth()) {
                if (currentTab == 1) {
                    BannerAd(modifier = Modifier.fillMaxWidth())
                }
                Divider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = if (darkTheme) 0.15f else 0.12f))
                val footerHeight = 68.dp
                val iconSize = 31.dp
                val selectedGlowSize = 38.dp
                val pressedGlowSize = 44.dp
                val glowColor = MaterialTheme.colorScheme.primary
                var pressedAdd by remember { mutableStateOf(false) }
                var pressedPl by remember { mutableStateOf(false) }
                Box(
                    modifier = Modifier
                        .height(footerHeight)
                        .fillMaxWidth()
                        .background(if (darkTheme) MaterialTheme.colorScheme.surface else Color.White)
                ) {
                    Row(
                        modifier = Modifier.fillMaxSize(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                                .align(Alignment.CenterVertically)
                                .pointerInput(Unit) {
                                    detectTapGestures(
                                        onPress = {
                                            pressedAdd = true
                                            val released = tryAwaitRelease()
                                            pressedAdd = false
                                            if (released) currentTab = 0
                                        }
                                    )
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            if (currentTab == 0) {
                                Box(
                                    modifier = Modifier
                                        .size(selectedGlowSize)
                                        .background(glowColor.copy(alpha = 0.06f), shape = CircleShape)
                                )
                            }
                            if (pressedAdd) {
                                Box(
                                    modifier = Modifier
                                        .size(pressedGlowSize)
                                        .background(glowColor.copy(alpha = 0.12f), shape = CircleShape)
                                )
                            }
                            Icon(
                                painter = painterResource(id = R.drawable.add_icon),
                                contentDescription = "Add",
                                modifier = Modifier.size(iconSize),
                                tint = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                                .align(Alignment.CenterVertically)
                                .pointerInput(Unit) {
                                    detectTapGestures(
                                        onPress = {
                                            pressedPl = true
                                            val released = tryAwaitRelease()
                                            pressedPl = false
                                            if (released) currentTab = 1
                                        }
                                    )
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            if (currentTab == 1) {
                                Box(
                                    modifier = Modifier
                                        .size(selectedGlowSize)
                                        .background(glowColor.copy(alpha = 0.06f), shape = CircleShape)
                                )
                            }
                            if (pressedPl) {
                                Box(
                                    modifier = Modifier
                                        .size(pressedGlowSize)
                                        .background(glowColor.copy(alpha = 0.12f), shape = CircleShape)
                                )
                            }
                            Icon(
                                painter = painterResource(id = R.drawable.playlist_icon),
                                contentDescription = "Playlist",
                                modifier = Modifier.size(iconSize),
                                tint = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    ) { innerPadding ->
        val scrollState = rememberScrollState()
        val contentModifier = if (currentTab == 1 && selectedPlaylist != null) {
            Modifier
                .padding(innerPadding)
                .padding(horizontal = 24.dp)
                .fillMaxSize()
        } else {
            Modifier
                .padding(innerPadding)
                .padding(horizontal = 24.dp)
                .verticalScroll(scrollState)
                .fillMaxWidth()
        }
        Column(
            modifier = contentModifier,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            when (currentTab) {
                0 -> {
                    Spacer(modifier = Modifier.height(24.dp))
                    Icon(
                        imageVector = Icons.Rounded.PlayCircleFilled,
                        contentDescription = "Play",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(72.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Welcome to Hero TV",
                        style = MaterialTheme.typography.titleLarge,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Thank you for choosing Hero TV. Add your video link details below to start streaming your favorite content.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        OutlinedTextField(
                            value = title,
                            onValueChange = { title = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Title") },
                            placeholder = { Text("My Awesome Stream") },
                            leadingIcon = { Icon(imageVector = Icons.Filled.Edit, contentDescription = null) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedLeadingIconColor = MaterialTheme.colorScheme.primary,
                                unfocusedLeadingIconColor = MaterialTheme.colorScheme.primary,
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                cursorColor = MaterialTheme.colorScheme.primary,
                                focusedLabelColor = MaterialTheme.colorScheme.primary
                            )
                        )
                        OutlinedTextField(
                            value = url,
                            onValueChange = { url = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Video URL") },
                            placeholder = { Text("https://example.com/stream.m3u8") },
                            leadingIcon = { Icon(imageVector = Icons.Rounded.Link, contentDescription = null) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedLeadingIconColor = MaterialTheme.colorScheme.primary,
                                unfocusedLeadingIconColor = MaterialTheme.colorScheme.primary,
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                cursorColor = MaterialTheme.colorScheme.primary,
                                focusedLabelColor = MaterialTheme.colorScheme.primary
                            )
                        )
                        OutlinedTextField(
                            value = userAgent,
                            onValueChange = { userAgent = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("User Agent") },
                            placeholder = { Text("Mozilla/5.0...") },
                            leadingIcon = { Icon(imageVector = Icons.Rounded.Fingerprint, contentDescription = null) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedLeadingIconColor = MaterialTheme.colorScheme.primary,
                                unfocusedLeadingIconColor = MaterialTheme.colorScheme.primary,
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                cursorColor = MaterialTheme.colorScheme.primary,
                                focusedLabelColor = MaterialTheme.colorScheme.primary
                            )
                        )
                        Text(
                            text = "Specify a custom user agent if required by the stream source.",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = {
                                if (isValidHttpUrl(url)) {
                                    if (isPlaylistUrl(url)) {
                                        val plName = if (title.isBlank()) derivePlaylistName(url) else title
                                        savePlaylistLink(context, plName, url, userAgent)
                                        selectedPlaylist = LinkItem(plName, url, userAgent)
                                        currentTab = 1
                                        title = ""
                                        url = ""
                                        userAgent = ""
                                    } else {
                                        val activity = (context as? MainActivity)
                                        if (activity != null) {
                                            activity.showInterstitialThen {
                                                launchPlayback(context, url, title.ifBlank { "Stream" }, userAgent)
                                                title = ""
                                                url = ""
                                                userAgent = ""
                                            }
                                        } else {
                                            launchPlayback(context, url, title.ifBlank { "Stream" }, userAgent)
                                            title = ""
                                            url = ""
                                            userAgent = ""
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        , colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary,
                                contentColor = MaterialTheme.colorScheme.onPrimary
                            )
                        ) {
                            Icon(imageVector = Icons.Filled.Save, contentDescription = null)
                            Spacer(modifier = Modifier.size(8.dp))
                            Text("Save Stream")
                        }
                    }
                }
                1 -> {
                    val links = remember { mutableStateListOf<LinkItem>() }
                    LaunchedEffect(Unit) {
                        links.clear()
                        links.addAll(getPlaylistLinks(context))
                    }
                    if (selectedPlaylist == null) Spacer(modifier = Modifier.height(24.dp))
                    if (selectedPlaylist == null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        if (links.isEmpty()) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 80.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Folder,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.25f),
                                    modifier = Modifier.size(96.dp)
                                )
                                Text(
                                    text = "Your Playlist is empty",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                                    textAlign = TextAlign.Center
                                )
                            }
                        } else {
                            var animateIn by remember { mutableStateOf(false) }
                            LaunchedEffect(Unit) { animateIn = true }
                            links.forEachIndexed { index, pl ->
                                AnimatedVisibility(
                                    visible = animateIn,
                                    enter = fadeIn(animationSpec = tween(durationMillis = 300, delayMillis = index * 50))
                                ) {
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 6.dp)
                                            .border(1.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(16.dp))
                                            .clickable { selectedPlaylist = pl },
                                        shape = RoundedCornerShape(16.dp),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                        colors = CardDefaults.cardColors(
                                            containerColor = MaterialTheme.colorScheme.surface
                                        )
                                    ) {
                                        var count by remember { mutableStateOf<Int?>(null) }
                                        LaunchedEffect(pl.url) {
                                            try {
                                                val items = fetchPlaylistChannels(pl.url, pl.userAgent)
                                                count = items.size
                                            } catch (_: Exception) {
                                                count = null
                                            }
                                        }
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(horizontal = 16.dp, vertical = 12.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column(
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Text(
                                                    pl.title,
                                                    style = MaterialTheme.typography.titleMedium,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                                Text(
                                                    text = if (count != null) "${count} channels" else "Loading…",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                            IconButton(
                                                onClick = {
                                                    removePlaylistLink(context, pl)
                                                    links.remove(pl)
                                                    if (selectedPlaylist == pl) selectedPlaylist = null
                                                }
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Filled.Delete,
                                                    contentDescription = "Remove",
                                                    tint = MaterialTheme.colorScheme.error
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        val channels = remember { mutableStateListOf<ChannelItem>() }
                        val categories = remember { mutableStateListOf<String>() }
                        val selectedCategory = remember { mutableStateOf<String?>(null) }
                        val isLoadingChannels = remember { mutableStateOf(false) }
                        val byCategory = remember { mutableStateMapOf<String, MutableList<ChannelItem>>() }
                        LaunchedEffect(selectedPlaylist!!.url) {
                            channels.clear()
                            categories.clear()
                            byCategory.clear()
                            selectedCategory.value = null
                            isLoadingChannels.value = true
                            val items = fetchPlaylistChannels(selectedPlaylist!!.url, selectedPlaylist!!.userAgent)
                            val limited = items.take(500)
                            channels.addAll(limited)
                            val grouped = mutableMapOf<String, MutableList<ChannelItem>>()
                            limited.forEach { ch ->
                                val cat = ch.category
                                if (cat != null) grouped.getOrPut(cat) { mutableListOf() }.add(ch)
                            }
                            byCategory.putAll(grouped)
                            val cats = limited.mapNotNull { it.category }.distinct()
                            categories.addAll(cats)
                            isLoadingChannels.value = false
                        }
                        if (!isLoadingChannels.value && categories.isNotEmpty()) {
                            androidx.compose.foundation.lazy.LazyRow(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    ,
                                horizontalArrangement = Arrangement.spacedBy(7.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                item {
                                    val allSelected = selectedCategory.value == null
                                    Card(
                                        shape = RoundedCornerShape(12.dp),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                                        colors = CardDefaults.cardColors(
                                            containerColor = if (allSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surface
                                        ),
                                        modifier = Modifier
                                            .border(1.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(12.dp))
                                            .clickable {
                                            selectedCategory.value = null
                                        }
                                    ) {
                                        Text(
                                            "All",
                                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                                style = MaterialTheme.typography.labelLarge,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                                items(categories.size) { idx ->
                                    val cat = categories[idx]
                                    val selected = selectedCategory.value == cat
                                    Card(
                                        shape = RoundedCornerShape(12.dp),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                                        colors = CardDefaults.cardColors(
                                            containerColor = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surface
                                        ),
                                        modifier = Modifier
                                            .border(1.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(12.dp))
                                            .clickable {
                                            selectedCategory.value = cat
                                        }
                                    ) {
                                        Text(
                                            cat,
                                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                                style = MaterialTheme.typography.labelLarge,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(24.dp))
                        }
                        if (isLoadingChannels.value) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 80.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                                Text(
                                    text = "Fetching channels…",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                )
                            }
                        } else if (channels.isEmpty()) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 80.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Text(
                                    text = "No channels found.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                )
                            }
                        } else {
                            val filtered = if (selectedCategory.value == null) channels else (byCategory[selectedCategory.value] ?: emptyList())
                            val chunked = filtered.chunked(3)
                            LazyColumn(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f, fill = true),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                                contentPadding = PaddingValues(bottom = 80.dp)
                            ) {
                                items(chunked) { rowItems ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 4.dp),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        rowItems.forEach { ch ->
                                            Card(
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .aspectRatio(1f)
                                                    .border(1.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(12.dp))
                                                    .clickable {
                                                        val activity = (context as? MainActivity)
                                                        if (activity != null) {
                                                            activity.showInterstitialThen {
                                                                launchPlayback(context, ch.url, ch.name, selectedPlaylist!!.userAgent)
                                                            }
                                                        } else {
                                                            launchPlayback(context, ch.url, ch.name, selectedPlaylist!!.userAgent)
                                                        }
                                                    },
                                                shape = RoundedCornerShape(12.dp),
                                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                                colors = CardDefaults.cardColors(
                                                    containerColor = MaterialTheme.colorScheme.surface
                                                )
                                            ) {
                                                Column(
                                                    modifier = Modifier
                                                        .fillMaxSize()
                                                        .padding(8.dp),
                                                    verticalArrangement = Arrangement.Top,
                                                    horizontalAlignment = Alignment.CenterHorizontally
                                                ) {
                                                    Box(
                                                        modifier = Modifier
                                                            .fillMaxWidth()
                                                            .weight(1f),
                                                        contentAlignment = Alignment.Center
                                                    ) {
                                                        if (!ch.logo.isNullOrBlank()) {
                                                            AsyncImage(
                                                                model = ImageRequest.Builder(LocalContext.current)
                                                                    .data(ch.logo)
                                                                    .crossfade(true)
                                                                    .build(),
                                                                contentDescription = null,
                                                                modifier = Modifier
                                                                    .fillMaxSize()
                                                                    .clip(RoundedCornerShape(12.dp)),
                                                                contentScale = ContentScale.Crop
                                                            )
                                                        } else {
                                                            Box(
                                                                modifier = Modifier
                                                                    .fillMaxSize()
                                                                    .clip(RoundedCornerShape(12.dp))
                                                                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                                                                contentAlignment = Alignment.Center
                                                            ) {
                                                                Text(
                                                                    text = ch.name.firstOrNull()?.uppercaseChar()?.toString() ?: "",
                                                                    style = MaterialTheme.typography.titleLarge
                                                                )
                                                            }
                                                        }
                                                    }
                                                    Spacer(modifier = Modifier.height(8.dp))
                                                    Text(
                                                        ch.name,
                                                        style = MaterialTheme.typography.bodySmall,
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis,
                                                        textAlign = TextAlign.Center
                                                    )
                                                }
                                            }
                                        }
                                        repeat(3 - rowItems.size) {
                                            Spacer(modifier = Modifier.weight(1f))
                                        }
                                    }
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                }
            }
            Spacer(modifier = Modifier.height(80.dp))
        }
        if (showSettings && darkTheme == rootDarkTheme) {
            AlertDialog(
                modifier = Modifier.border(1.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(16.dp)),
                onDismissRequest = { },
                title = { Text("Settings") },
                text = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Dark mode")
                            Switch(checked = darkTheme, onCheckedChange = { onToggleTheme() })
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Enable notifications")
                            Switch(
                                checked = enableNotifications,
                                onCheckedChange = {
                                    enableNotifications = it
                                    onEnableNotificationsChanged(it)
                                }
                            )
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Auto-play")
                            Switch(
                                checked = autoPlay,
                                onCheckedChange = {
                                    autoPlay = it
                                    onAutoPlayChanged(it)
                                }
                            )
                        }
                    }
                },
                containerColor = if (darkTheme) MaterialTheme.colorScheme.surface else Color.White,
                shape = RoundedCornerShape(16.dp),
                confirmButton = {
                    TextButton(onClick = { onShowSettingsChange(false) }) {
                        Text("Close")
                    }
                }
            )
        }
    }
}

@Composable
fun BannerAd(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    AndroidView(
        modifier = modifier,
        factory = { ctx: android.content.Context ->
            AdView(ctx).apply {
                adUnitId = BANNER_UNIT_ID
                setAdSize(AdSize.BANNER)
                loadAd(AdRequest.Builder().build())
            }
        }
    )
}

 

@Preview(showBackground = true)
@Composable
fun AppPreview() {
    HeroTvTheme {
        AppScaffold(
            darkTheme = false,
            onToggleTheme = {},
            showSettings = false,
            onShowSettingsChange = {},
            rootDarkTheme = false,
            initialTitle = null,
            initialUrl = null,
            initialUserAgent = null,
            autoPlayOnStart = false,
            initialEnableNotifications = true,
            initialAutoPlay = false,
            onEnableNotificationsChanged = {},
            onAutoPlayChanged = {}
        )
    }
}


private data class LinkItem(
    val title: String,
    val url: String,
    val userAgent: String?
)

private data class ChannelItem(
    val name: String,
    val url: String,
    val category: String? = null,
    val logo: String? = null
)

private data class ExternalStream(
    val title: String?,
    val url: String?,
    val userAgent: String?,
    val autoPlay: Boolean
)

private fun ComponentActivity.parseIncomingIntent(intent: Intent): ExternalStream {
    val action = intent.action
    var title: String? = null
    var url: String? = null
    var ua: String? = null
    var sub: String? = null
    var subLang: String? = null
    var autoPlay = false
    if (Intent.ACTION_VIEW == action) {
        intent.data?.let { uri ->
            url = uri.toString()
            title = uri.getQueryParameter("title") ?: uri.lastPathSegment ?: uri.host
            ua = uri.getQueryParameter("ua")
            sub = uri.getQueryParameter("sub")
            subLang = uri.getQueryParameter("sublang") ?: uri.getQueryParameter("lang")
            autoPlay = !url.isNullOrBlank()
        }
    } else if (Intent.ACTION_SEND == action) {
        val text = intent.getStringExtra(Intent.EXTRA_TEXT)
        text?.let {
            val extracted = extractUrl(it)
            if (extracted != null) {
                url = extracted
                title = "Shared Stream"
                autoPlay = true
            }
        }
    } else {
        val eUrl = intent.getStringExtra("EXTRA_URL")
            ?: intent.getStringExtra("url")
            ?: intent.getStringExtra("uri")
            ?: intent.getStringExtra("video_url")
            ?: intent.getStringExtra("stream_url")
        if (!eUrl.isNullOrBlank()) {
            url = eUrl
            title = intent.getStringExtra("EXTRA_TITLE")
                ?: intent.getStringExtra("title")
                ?: intent.getStringExtra("name")
                ?: try { Uri.parse(eUrl).lastPathSegment ?: Uri.parse(eUrl).host } catch (_: Exception) { null }
            ua = intent.getStringExtra("EXTRA_USER_AGENT")
                ?: intent.getStringExtra("ua")
                ?: intent.getStringExtra("user_agent")
            sub = intent.getStringExtra("EXTRA_SUBTITLE_URL")
                ?: intent.getStringExtra("sub")
            subLang = intent.getStringExtra("EXTRA_SUBTITLE_LANG")
                ?: intent.getStringExtra("sublang")
                ?: intent.getStringExtra("lang")
            autoPlay = true
        }
    }
    return ExternalStream(title = title, url = url, userAgent = ua, autoPlay = autoPlay).copy().also {
        // store subtitle info in intent extras for later
        if (!sub.isNullOrBlank()) {
            intent.putExtra("EXTRA_SUBTITLE_URL", sub)
        }
        if (!subLang.isNullOrBlank()) {
            intent.putExtra("EXTRA_SUBTITLE_LANG", subLang)
        }
    }
}

private fun extractUrl(text: String): String? {
    val regex = Regex("""https?://\S+""")
    return regex.find(text)?.value
}

private fun isValidHttpUrl(url: String?): Boolean {
    if (url.isNullOrBlank()) return false
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

private fun isPlaylistUrl(url: String): Boolean {
    val lower = url.lowercase()
    return lower.endsWith(".m3u") || lower.endsWith(".m3u8")
}

private fun derivePlaylistName(url: String): String {
    return try {
        val uri = Uri.parse(url)
        val title = uri.getQueryParameter("title")
        val last = uri.lastPathSegment
        val host = uri.host
        when {
            !title.isNullOrBlank() -> title
            !last.isNullOrBlank() -> last
            !host.isNullOrBlank() -> host
            else -> "Playlist"
        }
    } catch (_: Exception) {
        "Playlist"
    }
}

private fun savePlaylistLink(context: Context, title: String, url: String, userAgent: String?) {
    val prefs = context.getSharedPreferences("HeroTv", Context.MODE_PRIVATE)
    val set = prefs.getStringSet("playlist_links", mutableSetOf())?.toMutableSet() ?: mutableSetOf()
    set.add(listOf(title, url, userAgent ?: "").joinToString("|"))
    prefs.edit().putStringSet("playlist_links", set).apply()
}

private fun getPlaylistLinks(context: Context): List<LinkItem> {
    val prefs = context.getSharedPreferences("HeroTv", Context.MODE_PRIVATE)
    val set = prefs.getStringSet("playlist_links", mutableSetOf()) ?: emptySet()
    return set.mapNotNull {
        val parts = it.split("|")
        val t = parts.getOrNull(0)
        val u = parts.getOrNull(1)
        val ua = parts.getOrNull(2)
        if (t != null && u != null) LinkItem(t, u, ua?.ifBlank { null }) else null
    }.sortedBy { it.title.lowercase() }
}


private suspend fun fetchPlaylistChannels(url: String, userAgent: String?): List<ChannelItem> {
    return withContext(Dispatchers.IO) {
        try {
            val connection = java.net.URL(url).openConnection() as java.net.HttpURLConnection
            if (!userAgent.isNullOrBlank()) connection.setRequestProperty("User-Agent", userAgent)
            connection.connectTimeout = 8000
            connection.readTimeout = 20000
            connection.inputStream.bufferedReader().use { reader ->
                val text = reader.readText()
                parseM3U(text, url)
            }
        } catch (_: Exception) {
            emptyList()
        }
    }
}

private suspend fun fetchPlaylistChannelsStream(
    url: String,
    userAgent: String?,
    onChannel: (ChannelItem) -> Unit
) {
    withContext(Dispatchers.IO) {
        try {
            val connection = java.net.URL(url).openConnection() as java.net.HttpURLConnection
            if (!userAgent.isNullOrBlank()) connection.setRequestProperty("User-Agent", userAgent)
            connection.connectTimeout = 8000
            connection.readTimeout = 20000
            connection.inputStream.bufferedReader().useLines { lines ->
                var lastName: String? = null
                var lastCategory: String? = null
                var lastLogo: String? = null
                lines.forEach { raw ->
                    val line = raw.trim()
                    if (line.startsWith("#EXTINF")) {
                        val commaIndex = line.indexOf(',')
                        val name = if (commaIndex >= 0 && commaIndex + 1 < line.length) line.substring(commaIndex + 1).trim() else "Channel"
                        lastName = name
                        if (commaIndex > 0) {
                            val attrs = line.substring(0, commaIndex)
                            val catMatch = Regex("""group-title=['"](.*?)['"]""").find(attrs)
                            val logoMatch = Regex("""tvg-logo=['"](.*?)['"]""").find(attrs)
                            lastCategory = catMatch?.groupValues?.getOrNull(1)
                            lastLogo = logoMatch?.groupValues?.getOrNull(1)
                        } else {
                            lastCategory = null
                            lastLogo = null
                        }
                    } else if (line.isNotBlank() && !line.startsWith("#")) {
                        val urlLine = resolveUrl(url, line)
                        val name = lastName ?: "Channel"
                        onChannel(ChannelItem(name = name, url = urlLine, category = lastCategory, logo = lastLogo))
                        lastName = null
                        lastCategory = null
                        lastLogo = null
                    }
                }
            }
        } catch (_: Exception) { }
    }
}

private fun parseM3U(text: String, baseUrl: String): List<ChannelItem> {
    val lines = text.split("\n")
    val result = mutableListOf<ChannelItem>()
    var lastName: String? = null
    var lastCategory: String? = null
    var lastLogo: String? = null
    lines.forEach { raw ->
        val line = raw.trim()
        if (line.startsWith("#EXTINF")) {
            val commaIndex = line.indexOf(',')
            val name = if (commaIndex >= 0 && commaIndex + 1 < line.length) line.substring(commaIndex + 1).trim() else "Channel"
            lastName = name
            if (commaIndex > 0) {
                val attrs = line.substring(0, commaIndex)
                val catMatch = Regex("""group-title=['"](.*?)['"]""").find(attrs)
                val logoMatch = Regex("""tvg-logo=['"](.*?)['"]""").find(attrs)
                lastCategory = catMatch?.groupValues?.getOrNull(1)
                lastLogo = logoMatch?.groupValues?.getOrNull(1)
            } else {
                lastCategory = null
                lastLogo = null
            }
        } else if (line.isNotBlank() && !line.startsWith("#")) {
            val urlLine = resolveUrl(baseUrl, line)
            val name = lastName ?: "Channel"
            result.add(ChannelItem(name = name, url = urlLine, category = lastCategory, logo = lastLogo))
            lastName = null
            lastCategory = null
            lastLogo = null
        }
    }
    return result
}

private fun resolveUrl(base: String, item: String): String {
    return try {
        val trimmed = item.trim()
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            trimmed
        } else {
            val baseUrl = java.net.URL(base)
            java.net.URL(baseUrl, trimmed).toString()
        }
    } catch (_: Exception) {
        item
    }
}

private fun removePlaylistLink(context: Context, link: LinkItem) {
    val prefs = context.getSharedPreferences("HeroTv", Context.MODE_PRIVATE)
    val set = prefs.getStringSet("playlist_links", mutableSetOf())?.toMutableSet() ?: mutableSetOf()
    val key = listOf(link.title, link.url, link.userAgent ?: "").joinToString("|")
    if (set.remove(key)) {
        prefs.edit().putStringSet("playlist_links", set).apply()
    }
}

private fun clearPlaylistLinks(context: Context) {
    val prefs = context.getSharedPreferences("HeroTv", Context.MODE_PRIVATE)
    prefs.edit().remove("playlist_links").apply()
}

private fun launchPlayback(
    context: android.content.Context,
    url: String,
    title: String,
    userAgent: String?
) {
    val intent = Intent(context, PlaybackActivity::class.java).apply {
        putExtra("EXTRA_URL", url)
        putExtra("EXTRA_TITLE", title)
        if (!userAgent.isNullOrBlank()) {
            putExtra("EXTRA_USER_AGENT", userAgent)
        }
        val uri = try { Uri.parse(url) } catch (_: Exception) { null }
        val sub = uri?.getQueryParameter("sub")
        val lang = uri?.getQueryParameter("sublang") ?: uri?.getQueryParameter("lang")
        if (!sub.isNullOrBlank()) {
            putExtra("EXTRA_SUBTITLE_URL", sub)
        }
        if (!lang.isNullOrBlank()) {
            putExtra("EXTRA_SUBTITLE_LANG", lang)
        }
    }
    context.startActivity(intent)
}
