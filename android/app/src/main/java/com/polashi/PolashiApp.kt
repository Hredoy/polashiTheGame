package com.polashi

import android.app.Application
import com.polashi.net.SocketManager

/**
 * App container. Holds the single SocketManager for the process. A production build would
 * use a DI framework (Hilt); this manual singleton keeps the scaffold dependency-light.
 */
class PolashiApp : Application() {
    val socketManager: SocketManager by lazy { SocketManager() }

    companion object {
        lateinit var instance: PolashiApp
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }
}
