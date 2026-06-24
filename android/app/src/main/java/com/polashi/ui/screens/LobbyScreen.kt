package com.polashi.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.polashi.game.GameViewModel
import com.polashi.ui.components.DangerButton
import com.polashi.ui.components.GhostButton
import com.polashi.ui.components.PolashiPanel
import com.polashi.ui.components.PrimaryButton
import com.polashi.ui.components.WarBackground
import com.polashi.ui.theme.PolashiColors

/** Waiting lobby: room code, player list + ready state, start/leave controls. */
@Composable
fun LobbyScreen(vm: GameViewModel) {
    val view by vm.view.collectAsState()
    val code by vm.roomCode.collectAsState()
    val session by vm.session.collectAsState()
    val v = view ?: return
    if (v.status != "LOBBY") return // in-game flow handled by GameBoardScreen

    val me = v.players.firstOrNull { it.id == session?.userId }
    val amHost = me != null && v.players.minByOrNull { it.seatIndex }?.id == me.id
    val allReady = v.players.size in 5..10 && v.players.all { it.ready }

    WarBackground {
        Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("রুম কোড", color = PolashiColors.CreamDim, fontSize = 12.sp)
                    Text(code ?: v.roomId.take(6), color = PolashiColors.GoldBright, fontWeight = FontWeight.Black, fontSize = 24.sp)
                }
                Text("প্লেয়ার ${v.players.size}/১০", color = PolashiColors.Cream)
            }

            PolashiPanel(Modifier.fillMaxWidth().weight(1f)) {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(v.players, key = { it.id }) { p ->
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "${p.seatIndex + 1}. ${p.name}" + if (p.id == session?.userId) "  (you)" else "",
                                color = PolashiColors.Ink,
                                fontWeight = if (p.ready) FontWeight.Bold else FontWeight.Normal,
                            )
                            Text(
                                if (p.ready) "রেডি ✓" else "অপেক্ষমান…",
                                color = if (p.ready) PolashiColors.Nawab else PolashiColors.InkSoft,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }

            // Host-only bot fill — always a confirmation (never auto-joined). Highlighted
            // once the server suggests bots (nobody joined within the timeout).
            if (amHost && v.players.size < 10) {
                val maxBots = 10 - v.players.size
                var botCount by remember(v.players.size) {
                    mutableStateOf(minOf(maxBots, maxOf(1, 5 - v.players.size)))
                }
                PolashiPanel(Modifier.fillMaxWidth()) {
                    Text(
                        if (v.botSuggested) "কেউ যোগ দেয়নি — বট যোগ করবেন?" else "বট যোগ করুন",
                        color = if (v.botSuggested) PolashiColors.Eic else PolashiColors.Ink,
                        fontWeight = FontWeight.Bold,
                    )
                    Row(
                        Modifier.fillMaxWidth().padding(top = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        GhostButton("−", onClick = { if (botCount > 1) botCount-- })
                        Text("$botCount", color = PolashiColors.Ink, fontWeight = FontWeight.Black, fontSize = 20.sp)
                        GhostButton("+", onClick = { if (botCount < maxBots) botCount++ })
                        PrimaryButton(
                            "বট যোগ করুন ($botCount)",
                            onClick = { vm.addBots(botCount) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }

            val iAmReady = me?.ready == true
            PrimaryButton(
                if (iAmReady) "রেডি বাতিল" else "রেডি",
                onClick = { vm.setReady(!iAmReady) },
                modifier = Modifier.fillMaxWidth(),
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                DangerButton("রুম ত্যাগ করুন", onClick = { /* TODO: leave + nav home */ }, modifier = Modifier.weight(1f))
                if (amHost) {
                    PrimaryButton(
                        if (allReady) "গেম শুরু করুন" else "অপেক্ষা…",
                        onClick = { vm.startGame() },
                        enabled = allReady,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}
