package com.polashi.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.polashi.game.GameViewModel
import com.polashi.ui.components.ChapterTrack
import com.polashi.ui.components.ScoreBar

/**
 * The in-game board. A persistent header (score + chapter track) sits above phase-specific
 * content chosen by PlayerView.status. The whole thing is a pure render of the latest view.
 */
@Composable
fun GameBoardScreen(vm: GameViewModel, onViewHistory: () -> Unit) {
    val view by vm.view.collectAsState()
    val session by vm.session.collectAsState()
    val v = view ?: return
    val myId = session?.userId
    val amHost = v.players.minByOrNull { it.seatIndex }?.id == myId

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ScoreBar(v)
        ChapterTrack(v, Modifier.padding(vertical = 4.dp).align(Alignment.CenterHorizontally))
        Divider()

        when (v.status) {
            "ROLE_REVEAL" -> RoleRevealContent(v, onAck = vm::ackRole)
            "TEAM_PROPOSAL" -> TeamProposalContent(v, myId, onPropose = vm::proposeTeam)
            "VOTING" -> VotingContent(v, myId, onVote = vm::castVote)
            "MISSION" -> MissionContent(v, myId, onSubmit = vm::submitCard)
            "CHAPTER_RESULT" -> ChapterResultContent(
                v, myId, amHost,
                onAdvance = vm::advanceChapter,
                onInvestigate = vm::investigate,
            )
            "FINAL_GUESS" -> FinalGuessContent(v, myId, onGuess = vm::finalGuess)
            "GAME_OVER" -> GameOverContent(v, myId, onHistory = {
                vm.loadHistory(); onViewHistory()
            })
            else -> Text("Phase: ${v.status}", style = MaterialTheme.typography.titleMedium)
        }
    }
}
