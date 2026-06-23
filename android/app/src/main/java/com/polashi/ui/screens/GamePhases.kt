package com.polashi.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.polashi.model.PlayerView
import com.polashi.ui.Characters
import com.polashi.ui.components.PlayerList
import com.polashi.ui.theme.EicRed
import com.polashi.ui.theme.NawabGreen

/** ROLE_REVEAL: shows the player's own character + power + any night-reveal knowledge. */
@Composable
fun RoleRevealContent(view: PlayerView, onAck: () -> Unit) {
    val self = view.self ?: return
    Column(
        Modifier.fillMaxWidth().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Your character", style = MaterialTheme.typography.titleMedium)
        Card(colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = Characters.sideColor(self.side).copy(alpha = 0.15f))) {
            Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(Characters.name(self.characterKey), style = MaterialTheme.typography.headlineSmall)
                Text(Characters.sideLabel(self.side), color = Characters.sideColor(self.side), fontWeight = FontWeight.Bold)
                Characters.power(self.characterKey)?.let {
                    Text(it, Modifier.padding(top = 8.dp), style = MaterialTheme.typography.bodyMedium)
                }
            }
        }

        if (self.reveals.isNotEmpty()) {
            Text("What you know:", fontWeight = FontWeight.Bold)
            self.reveals.forEach { r ->
                val who = view.players.firstOrNull { it.id == r.playerId }?.name ?: "?"
                val label = when (r.label) {
                    "EIC" -> "$who is EIC"
                    "EIC_ALLY" -> "$who is your EIC ally"
                    "MIR_MODON_CANDIDATE" -> "$who looks like Mir Modon"
                    else -> who
                }
                Text("• $label")
            }
        }

        Button(onClick = onAck, modifier = Modifier.fillMaxWidth()) { Text("I'm ready") }
        Text("Waiting for ${view.players.count { !it.ackedRole }} more…", style = MaterialTheme.typography.bodySmall)
    }
}

/** TEAM_PROPOSAL: the Shobapoti selects the mission team; everyone else waits. */
@Composable
fun TeamProposalContent(view: PlayerView, myUserId: String?, onPropose: (List<String>) -> Unit) {
    val me = view.players.firstOrNull { it.id == myUserId }
    val teamSize = view.chapters.firstOrNull { it.index == view.chapterIndex }?.teamSize ?: 0
    var selected by remember(view.version) { mutableStateOf(setOf<String>()) }

    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (me?.isShobapoti == true) {
            Text("You are Shobapoti — pick $teamSize for the mission", fontWeight = FontWeight.Bold)
            PlayerList(
                view = view,
                myUserId = myUserId,
                modifier = Modifier.fillMaxWidth().weight(1f, fill = false),
                selectable = true,
                selected = selected,
                onToggle = { id ->
                    selected = when {
                        id in selected -> selected - id
                        selected.size < teamSize -> selected + id
                        else -> selected
                    }
                },
            )
            Button(
                onClick = { onPropose(selected.toList()) },
                enabled = selected.size == teamSize,
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Propose team (${selected.size}/$teamSize)") }
        } else {
            val leader = view.players.firstOrNull { it.isShobapoti }?.name ?: "?"
            Text("$leader is choosing a team of $teamSize…", fontWeight = FontWeight.Bold)
            PlayerList(view, myUserId, Modifier.fillMaxWidth())
        }
        if (view.failedProposals > 0) {
            Text("Failed proposals this chapter: ${view.failedProposals}/5", color = EicRed)
        }
    }
}

/** VOTING: approve or reject the proposed team. */
@Composable
fun VotingContent(view: PlayerView, myUserId: String?, onVote: (String) -> Unit) {
    val proposal = view.current ?: return
    val hasVoted = myUserId in proposal.votedPlayerIds
    val teamNames = proposal.memberIds.mapNotNull { id -> view.players.firstOrNull { it.id == id }?.name }

    Column(
        Modifier.fillMaxWidth().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Proposed team", style = MaterialTheme.typography.titleMedium)
        Text(teamNames.joinToString(", "), fontWeight = FontWeight.Bold)

        if (hasVoted) {
            Text("Vote cast. Waiting… (${proposal.votedPlayerIds.size}/${view.players.size})")
        } else {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Button(
                    onClick = { onVote("YES") },
                    colors = ButtonDefaults.buttonColors(containerColor = NawabGreen),
                    modifier = Modifier.weight(1f),
                ) { Text("হ্যাঁ  Yes") }
                Button(
                    onClick = { onVote("NO") },
                    colors = ButtonDefaults.buttonColors(containerColor = EicRed),
                    modifier = Modifier.weight(1f),
                ) { Text("না  No") }
            }
        }
    }
}

/** MISSION: selected team members play a Success/Betrayer card. */
@Composable
fun MissionContent(view: PlayerView, myUserId: String?, onSubmit: (String) -> Unit) {
    val proposal = view.current ?: return
    val onTeam = myUserId in proposal.memberIds
    val isNawab = view.self?.side == "NAWAB"
    var submitted by remember(view.version) { mutableStateOf(false) }

    Column(
        Modifier.fillMaxWidth().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("The mission", style = MaterialTheme.typography.titleMedium)
        if (!onTeam) {
            Text("Not on this mission. Waiting for the team to act…")
            return@Column
        }
        if (submitted) {
            Text("Card played. Waiting for the rest of the team…")
            return@Column
        }
        Text(if (isNawab) "As Nawab, you must play Success." else "Play Success or Betrayer.")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Button(
                onClick = { onSubmit("SUCCESS"); submitted = true },
                colors = ButtonDefaults.buttonColors(containerColor = NawabGreen),
                modifier = Modifier.weight(1f),
            ) { Text("Success") }
            if (!isNawab) {
                Button(
                    onClick = { onSubmit("BETRAYER"); submitted = true },
                    colors = ButtonDefaults.buttonColors(containerColor = EicRed),
                    modifier = Modifier.weight(1f),
                ) { Text("Betrayer") }
            }
        }
    }
}
