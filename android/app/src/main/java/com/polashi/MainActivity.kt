package com.polashi

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.Factory
import androidx.lifecycle.ViewModel
import com.polashi.game.GameViewModel
import com.polashi.ui.nav.PolashiNavGraph
import com.polashi.ui.theme.PolashiTheme

class MainActivity : ComponentActivity() {

    private lateinit var viewModel: GameViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val socket = PolashiApp.instance.socketManager
        val factory = object : Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                GameViewModel(socket) as T
        }
        viewModel = ViewModelProvider(this, factory)[GameViewModel::class.java]

        setContent {
            PolashiTheme {
                PolashiNavGraph(viewModel)
            }
        }
    }

    // Background tune follows the activity lifecycle (and the sound setting).
    override fun onResume() {
        super.onResume()
        PolashiApp.instance.soundManager.startMusic()
    }

    override fun onPause() {
        super.onPause()
        PolashiApp.instance.soundManager.pauseMusic()
    }

    override fun onDestroy() {
        super.onDestroy()
        if (isFinishing) PolashiApp.instance.soundManager.releaseMusic()
    }
}
