package com.polashi

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache
import com.polashi.audio.SettingsStore
import com.polashi.audio.SoundManager
import com.polashi.net.SocketManager

/**
 * App container. Holds the single SocketManager, and provides the Coil ImageLoader with a
 * persistent disk cache so game assets (logo, character cards, stamps, …) are cached on the
 * device for up to a week (honouring the backend's Cache-Control) instead of re-fetched.
 * Combined with versioned URLs (see AssetCatalog), a new admin upload refetches immediately
 * while everything unchanged is served from disk — minimal server dependency.
 */
class PolashiApp : Application(), ImageLoaderFactory {
    val socketManager: SocketManager by lazy { SocketManager() }
    val soundManager: SoundManager by lazy { SoundManager(this) }

    companion object {
        lateinit var instance: PolashiApp
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        SettingsStore.init(this)
    }

    override fun newImageLoader(): ImageLoader =
        ImageLoader.Builder(this)
            .memoryCache { MemoryCache.Builder(this).maxSizePercent(0.15).build() }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("polashi_image_cache"))
                    .maxSizeBytes(64L * 1024 * 1024) // 64 MB
                    .build()
            }
            .respectCacheHeaders(true) // honour Cache-Control: max-age=1 week
            .build()
}
