package com.polashi.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.polashi.model.PlayerView
import com.polashi.ui.Characters
import com.polashi.ui.theme.EicRed
import com.polashi.ui.theme.NawabGreen

/** CHAPTER_RESULT: who won the chapter, plus host's Advance or the spy's Investigate. */
@Composable
fun ChapterResultContent(
    view: PlayerView,
    myUserId: String?,
    amHost: Boolean,
    onAdvance: () -> Unit,
    onInvestigate: (String) -> Unit,
) {
    val chapter = view.chapters.firstOrNull { it.index == view.chapterIndex }
    val winner = chapter?.winner
    Column(
        Modifier.fillMaxWidth().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Chapter ${view.chapterIndex} result", style = MaterialTheme.typography.titleMedium)
        Text(
            if (winner == "NAWAB") "নবাব পক্ষ won the chapter" else "EIC পক্ষ won the chapter",
            color = Characters.sideColor(winner),
            fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.headlineSmall,
        )
        chapter?.betrayerCount?.let { Text("Betrayer cards played: $it") }

        // Spy variant: the current spy must investigate before the chapter advances.
        val spy = view.spy
        if (spy?.mustInvestigate == true) {
            Text("Gupchor: investigate one player's loyalty", fontWeight = FontWeight.Bold)
            spy.eligibleTargetIds.forEach { id ->
                val name = view.players.firstOrNull { it.id == id }?.name ?: "?"
                OutlinedButton(onClick = { onInvestigate(id) }, modifier = Modifier.fillMaxWidth()) {
                    Text("Investigate $name")
                }
            }
        } else {
            spy?.myFindings?.lastOrNull()?.let { f ->
                val name = view.players.firstOrNull { it.id == f.targetId }?.name ?: "?"
                Text("You learned: $name plays for ${Characters.sideLabel(f.seenSide)}", color = Characters.sideColor(f.seenSide))
            }
            if (amHost) {
                Button(onClick = onAdvance, modifier = Modifier.fillMaxWidth()) {
                    Text(if (view.chapterIndex >= 5 || view.wins.values.any { it >= 3 }) "Continue" else "Next chapter")
                }
            } else {
                Text("Waiting for the host…", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

/** FINAL_GUESS: Mir Modon names Mir Zafar to clinch the Nawab victory. */
@Composable
fun FinalGuessContent(view: PlayerView, myUserId: String?, onGuess: (String) -> Unit) {
    Column(
        Modifier.fillMaxWidth().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (view.finalGuess?.isMine == true) {
            Text("Nawab won 3 chapters!", color = NawabGreen, fontWeight = FontWeight.Bold)
            Text("You are Mir Modon. Name Mir Zafar to win it all:")
            view.players.filter { it.id != myUserId }.forEach { p ->
                OutlinedButton(onClick = { onGuess(p.id) }, modifier = Modifier.fillMaxWidth()) {
                    Text(p.name)
                }
            }
        } else {
            Text("Mir Modon is identifying Mir Zafar…", fontWeight = FontWeight.Bold)
        }
    }
}

/** GAME_OVER: winner banner + full role reveal. */
@Composable
fun GameOverContent(view: PlayerView, myUserId: String?, onHistory: () -> Unit) {
    val winner = view.winner
    val mySide = view.self?.side
    val iWon = mySide != null && mySide == winner
    Column(
        Modifier.fillMaxWidth().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            if (winner == "NAWAB") "নবাব পক্ষ জয়ী" else "EIC পক্ষ জয়ী",
            color = Characters.sideColor(winner),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
        )
        Text(if (iWon) "Victory!" else "Defeat.", fontWeight = FontWeight.Bold)
        view.finalGuess?.let { fg ->
            if (fg.targetId != null) {
                val name = view.players.firstOrNull { it.id == fg.targetId }?.name ?: "?"
                Text("Mir Modon accused $name — ${if (fg.correct == true) "correct!" else "wrong."}")
            }
        }

        Text("Roles revealed:", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
        view.players.forEach { p ->
            val key = view.rolesReveal?.get(p.id)
            val side = if (key != null) sideOf(key) else null
            Card(
                Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Characters.sideColor(side).copy(alpha = 0.12f)),
            ) {
                androidx.compose.foundation.layout.Row(
                    Modifier.fillMaxWidth().padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(p.name + if (p.id == myUserId) " (you)" else "")
                    Text(Characters.name(key), color = Characters.sideColor(side), fontWeight = FontWeight.Bold)
                }
            }
        }

        Button(onClick = onHistory, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
            Text("View history")
        }
    }
}

// Local side lookup for the role-reveal list (mirrors backend CHARACTER_SIDE).
private fun sideOf(key: String): String = when (key) {
    "MIR_MODON", "NAWAB", "MOHAN_LAL" -> "NAWAB"
    else -> "EIC"
}
