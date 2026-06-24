package com.polashi.audio

import android.content.Context
import android.media.MediaPlayer
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.polashi.R

/**
 * Owns the looping battle background tune (MediaPlayer over R.raw.battle_theme) and haptic
 * feedback. Both respect SettingsStore. The music is paused/resumed with the activity
 * lifecycle so it never plays in the background.
 */
class SoundManager(private val context: Context) {

    private var player: MediaPlayer? = null

    /** Start (or resume) the looping tune if sound is enabled. Safe to call repeatedly. */
    fun startMusic() {
        if (!SettingsStore.soundEnabled) return
        try {
            if (player == null) {
                player = MediaPlayer.create(context, R.raw.battle_theme)?.apply {
                    isLooping = true
                    setVolume(0.45f, 0.45f)
                }
            }
            player?.let { if (!it.isPlaying) it.start() }
        } catch (_: Exception) {
            // Audio unavailable — fail silently; the game is fully playable without sound.
        }
    }

    fun pauseMusic() {
        try {
            player?.let { if (it.isPlaying) it.pause() }
        } catch (_: Exception) {
        }
    }

    fun releaseMusic() {
        try {
            player?.release()
        } catch (_: Exception) {
        }
        player = null
    }

    /** Reflect a sound-setting change immediately. */
    fun applySoundSetting() {
        if (SettingsStore.soundEnabled) startMusic() else pauseMusic()
    }

    /** Short haptic pulse — used when it becomes this player's turn / an action is needed. */
    @Suppress("DEPRECATION")
    fun vibrate(ms: Long = 140) {
        if (!SettingsStore.vibrationEnabled) return
        try {
            val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
            } else {
                context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                vibrator?.vibrate(ms)
            }
        } catch (_: Exception) {
        }
    }
}
