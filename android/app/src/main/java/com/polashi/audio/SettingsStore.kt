package com.polashi.audio

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * App settings backed by SharedPreferences and exposed as Compose state so toggles recompose
 * instantly. Sound (background tune) and vibration (haptics on your turn) default ON.
 */
object SettingsStore {
    var soundEnabled by mutableStateOf(true)
        private set
    var vibrationEnabled by mutableStateOf(true)
        private set

    private var prefs: SharedPreferences? = null

    fun init(context: Context) {
        val p = context.applicationContext.getSharedPreferences("polashi_settings", Context.MODE_PRIVATE)
        prefs = p
        soundEnabled = p.getBoolean("sound", true)
        vibrationEnabled = p.getBoolean("vibration", true)
    }

    fun setSound(enabled: Boolean) {
        soundEnabled = enabled
        prefs?.edit()?.putBoolean("sound", enabled)?.apply()
    }

    fun setVibration(enabled: Boolean) {
        vibrationEnabled = enabled
        prefs?.edit()?.putBoolean("vibration", enabled)?.apply()
    }
}
