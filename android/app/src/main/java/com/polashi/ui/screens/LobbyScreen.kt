package com.polashi.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.polashi.game.GameViewModel

/**
 * Waiting lobby: room code, player list with ready state, and Ready / Start controls.
 * Renders purely from PlayerView. Once status leaves LOBBY, the game-board flow takes over
 * (TODO: a GameBoardScreen that switches by status; this scaffold only handles LOBBY).
 */
@Composable
fun LobbyScreen(vm: GameViewModel) {
    val view by vm.view.collectAsState()
    val code by vm.roomCode.collectAsState()
    val session by vm.session.collectAsState()
    val v = view ?: return

    if (v.status != "LOBBY") {
        // Placeholder until the in-game screens are implemented.
        Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
            Text("Phase: ${v.status}", style = MaterialTheme.typography.headlineSmall)
            Text("Chapter ${v.chapterIndex} • Nawab ${v.wins["NAWAB"] ?: 0} – ${v.wins["EIC"] ?: 0} EIC")
            v.self?.let { Text("You are: ${it.characterKey} (${it.side})") }
        }
        return
    }

    val me = v.players.firstOrNull { it.id == session?.userId }
    val amHost = me != null && v.players.minByOrNull { it.seatIndex }?.id == me.id
    val allReady = v.players.size in 5..10 && v.players.all { it.ready }

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Room ${code ?: v.roomId}", style = MaterialTheme.typography.titleLarge)
        Text("${v.players.size}/10 players (need 5+)", color = MaterialTheme.colorScheme.onSurface)

        LazyColumn(Modifier.fillMaxWidth().weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(v.players, key = { it.id }) { p ->
                Card {
                    Row(
                        Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            p.name + if (p.id == session?.userId) " (you)" else "",
                            fontWeight = if (p.ready) FontWeight.Bold else FontWeight.Normal,
                        )
                        Text(if (p.ready) "Ready" else "…")
                    }
                }
            }
        }

        val iAmReady = me?.ready == true
        Button(onClick = { vm.setReady(!iAmReady) }, modifier = Modifier.fillMaxWidth()) {
            Text(if (iAmReady) "Unready" else "Ready")
        }
        if (amHost) {
            Button(
                onClick = { vm.startGame() },
                enabled = allReady,
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (allReady) "Start Game" else "Waiting for players…") }
        }
    }
}
