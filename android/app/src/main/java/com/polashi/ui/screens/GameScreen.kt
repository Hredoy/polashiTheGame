package com.polashi.ui.screens

import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.padding
import com.polashi.game.GameViewModel

/**
 * Top-level in-game container. Dispatches LOBBY -> LobbyScreen, everything else -> board.
 * Surfaces server errors (e.g. RATE_LIMITED, SPY_PENDING) as a snackbar.
 */
@Composable
fun GameScreen(vm: GameViewModel, onViewHistory: () -> Unit) {
    val view by vm.view.collectAsState()
    val error by vm.error.collectAsState()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(error) {
        error?.let {
            snackbar.showSnackbar(it)
            vm.clearError()
        }
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbar) }) { pad ->
        androidx.compose.foundation.layout.Box(Modifier.padding(pad)) {
            when (view?.status) {
                null, "LOBBY" -> LobbyScreen(vm)
                else -> GameBoardScreen(vm, onViewHistory)
            }
        }
    }
}
