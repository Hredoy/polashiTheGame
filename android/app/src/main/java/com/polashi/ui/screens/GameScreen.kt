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
import com.polashi.PolashiApp
import com.polashi.game.GameViewModel
import com.polashi.model.PlayerView

/** True when the current phase requires an action from THIS player (used for haptics). */
private fun needsMyAction(v: PlayerView, myId: String?): Boolean {
    val me = v.players.firstOrNull { it.id == myId } ?: return false
    return when (v.status) {
        "ROLE_REVEAL" -> !me.ackedRole
        "TEAM_PROPOSAL" -> me.isShobapoti
        "VOTING" -> myId !in (v.current?.votedPlayerIds ?: emptyList())
        "MISSION" -> myId in (v.current?.memberIds ?: emptyList())
        "CHAPTER_RESULT" ->
            v.spy?.mustInvestigate == true || v.players.minByOrNull { it.seatIndex }?.id == myId
        "FINAL_GUESS" -> v.finalGuess?.isMine == true
        else -> false
    }
}

/**
 * Top-level in-game container. Dispatches LOBBY -> LobbyScreen, everything else -> board.
 * Surfaces server errors (e.g. RATE_LIMITED, SPY_PENDING) as a snackbar, and buzzes the
 * device when it becomes this player's turn to act.
 */
@Composable
fun GameScreen(vm: GameViewModel, onViewHistory: () -> Unit) {
    val view by vm.view.collectAsState()
    val session by vm.session.collectAsState()
    val error by vm.error.collectAsState()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(error) {
        error?.let {
            snackbar.showSnackbar(it)
            vm.clearError()
        }
    }

    // Haptic nudge when this player needs to act. Keyed on phase + actionability so it fires
    // once on entering an actionable phase, not on every state tick.
    val myId = session?.userId
    val actionable = view?.let { needsMyAction(it, myId) } ?: false
    LaunchedEffect(view?.status, actionable) {
        if (actionable) PolashiApp.instance.soundManager.vibrate()
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
