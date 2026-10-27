package com.lite.herotv

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class StopPlaybackReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val i = Intent("com.lite.herotv.ACTION_STOP_PLAYBACK").apply {
            setPackage(context.packageName)
        }
        context.sendBroadcast(i)
    }
}
