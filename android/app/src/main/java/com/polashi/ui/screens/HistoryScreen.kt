package com.polashi.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.polashi.game.GameViewModel
import com.polashi.ui.Characters

/** Game history / summary for the current user. */
@Composable
fun HistoryScreen(vm: GameViewModel) {
    val history by vm.history.collectAsState()
    LaunchedEffect(Unit) { vm.loadHistory() }

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Your battles", style = MaterialTheme.typography.headlineSmall)
        if (history.isEmpty()) {
            Text("No finished games yet.")
            return
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(history) { h ->
                Card(
                    Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = Characters.sideColor(h.side).copy(alpha = 0.12f),
                    ),
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Text(
                            "${if (h.won) "Won" else "Lost"} as ${Characters.name(h.characterKey)}",
                            fontWeight = FontWeight.Bold,
                            color = Characters.sideColor(h.side),
                        )
                        Text("Room ${h.code} • winner: ${Characters.sideLabel(h.winnerSide)}")
                    }
                }
            }
        }
    }
}
