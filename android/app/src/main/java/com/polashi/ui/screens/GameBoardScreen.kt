package com.polashi.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.polashi.game.GameViewModel
import com.polashi.ui.components.FactionScoreHeader
import com.polashi.ui.components.OrnateDivider
import com.polashi.ui.components.WarBackground
import com.polashi.ui.theme.PolashiColors

/**
 * In-game board. Persistent faction score header above phase-specific content chosen by
 * PlayerView.status. Pure render of the latest view.
 */
@Composable
fun GameBoardScreen(vm: GameViewModel, onViewHistory: () -> Unit) {
    val view by vm.view.collectAsState()
    val session by vm.session.collectAsState()
    val v = view ?: return
    val myId = session?.userId
    val amHost = v.players.minByOrNull { it.seatIndex }?.id == myId

    WarBackground {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            FactionScoreHeader(
                nawabWins = v.wins["NAWAB"] ?: 0,
                eicWins = v.wins["EIC"] ?: 0,
                chapterIndex = v.chapterIndex,
            )
            OrnateDivider()

            AnimatedContent(
                targetState = v.status,
                transitionSpec = {
                    (fadeIn(tween(280)) togetherWith fadeOut(tween(180)))
                        .using(SizeTransform(clip = false))
                },
                label = "phaseTransition",
            ) { status ->
                when (status) {
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
                    "GAME_OVER" -> GameOverContent(v, myId, onHistory = { vm.loadHistory(); onViewHistory() })
                    else -> Text("Phase: ${v.status}", color = PolashiColors.Cream)
                }
            }
        }
    }
}
