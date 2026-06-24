package com.polashi.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.polashi.model.PlayerView
import com.polashi.ui.Characters
import com.polashi.ui.components.AvatarFaction
import com.polashi.ui.components.MissionCardOption
import com.polashi.ui.components.PlayerAvatar
import com.polashi.ui.components.PolashiPanel
import com.polashi.ui.components.PrimaryButton
import com.polashi.ui.components.SealFaction
import com.polashi.ui.components.SectionBanner
import com.polashi.ui.components.WaxSeal
import com.polashi.ui.theme.PolashiColors

private fun sideFaction(side: String?) = when (side) {
    "NAWAB" -> AvatarFaction.NAWAB
    "EIC" -> AvatarFaction.EIC
    else -> AvatarFaction.NEUTRAL
}

/** A wrap of player avatars (chunked into rows of 4), with optional selection. */
@Composable
private fun AvatarGrid(
    view: PlayerView,
    myUserId: String?,
    selectable: Boolean = false,
    selected: Set<String> = emptySet(),
    onToggle: (String) -> Unit = {},
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        view.players.chunked(4).forEach { rowPlayers ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                rowPlayers.forEach { p ->
                    PlayerAvatar(
                        name = p.name,
                        faction = if (p.id == myUserId) sideFaction(view.self?.side) else AvatarFaction.NEUTRAL,
                        isShobapoti = p.isShobapoti,
                        selected = p.id in selected || p.id in (view.current?.memberIds ?: emptyList()),
                        dimmed = !p.connected,
                        onClick = if (selectable) ({ onToggle(p.id) }) else null,
                    )
                }
            }
        }
    }
}

/** ROLE_REVEAL: own character + power + night-reveal knowledge. */
@Composable
fun RoleRevealContent(view: PlayerView, onAck: () -> Unit) {
    val self = view.self ?: return
    PolashiPanel(Modifier.fillMaxWidth()) {
        Text("আপনার চরিত্র", color = PolashiColors.InkSoft, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
        Text(
            Characters.name(self.characterKey),
            color = Characters.sideColor(self.side),
            fontWeight = FontWeight.Black,
            fontSize = 30.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
        )
        Text(Characters.sideLabel(self.side), color = PolashiColors.Ink, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
        Characters.power(self.characterKey)?.let {
            Text(it, color = PolashiColors.InkSoft, fontSize = 14.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
        }
        if (self.reveals.isNotEmpty()) {
            Text("আপনি যা জানেন:", color = PolashiColors.Ink, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 12.dp))
            self.reveals.forEach { r ->
                val who = view.players.firstOrNull { it.id == r.playerId }?.name ?: "?"
                val label = when (r.label) {
                    "EIC" -> "$who — ইস্ট ইন্ডিয়া কোম্পানি"
                    "EIC_ALLY" -> "$who — আপনার সহযোগী"
                    "MIR_MODON_CANDIDATE" -> "$who — মীর মদন হতে পারে"
                    else -> who
                }
                Text("• $label", color = PolashiColors.InkSoft)
            }
        }
        PrimaryButton("বোঝেছি", onClick = onAck, modifier = Modifier.fillMaxWidth().padding(top = 16.dp))
        Text(
            "বাকি ${view.players.count { !it.ackedRole }} জনের অপেক্ষা…",
            color = PolashiColors.InkSoft,
            fontSize = 12.sp,
            modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
            textAlign = TextAlign.Center,
        )
    }
}

/** TEAM_PROPOSAL: Shobapoti selects the mission team; others wait. */
@Composable
fun TeamProposalContent(view: PlayerView, myUserId: String?, onPropose: (List<String>) -> Unit) {
    val me = view.players.firstOrNull { it.id == myUserId }
    val teamSize = view.chapters.firstOrNull { it.index == view.chapterIndex }?.teamSize ?: 0
    var selected by remember(view.version) { mutableStateOf(setOf<String>()) }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        if (me?.isShobapoti == true) {
            SectionBanner("টিম নির্বাচন করুন", "প্রয়োজনীয় সদস্য: $teamSize জন")
            PolashiPanel(Modifier.fillMaxWidth(), fill = com.polashi.ui.theme.PolashiBrushes.warNight) {
                AvatarGrid(view, myUserId, selectable = true, selected = selected, onToggle = { id ->
                    selected = when {
                        id in selected -> selected - id
                        selected.size < teamSize -> selected + id
                        else -> selected
                    }
                })
            }
            PrimaryButton(
                "টিম প্রস্তাব করুন (${selected.size}/$teamSize)",
                onClick = { onPropose(selected.toList()) },
                enabled = selected.size == teamSize,
                modifier = Modifier.fillMaxWidth(),
            )
        } else {
            val leader = view.players.firstOrNull { it.isShobapoti }?.name ?: "?"
            SectionBanner("$leader টিম নির্বাচন করছেন", "$teamSize জন প্রয়োজন")
            AvatarGrid(view, myUserId)
        }
        if (view.failedProposals > 0) {
            Text("ব্যর্থ প্রস্তাব: ${view.failedProposals} / ৫", color = PolashiColors.EicBright, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
        }
    }
}

/** VOTING: approve/reject the proposed team with wax seals. */
@Composable
fun VotingContent(view: PlayerView, myUserId: String?, onVote: (String) -> Unit) {
    val proposal = view.current ?: return
    val hasVoted = myUserId in proposal.votedPlayerIds
    val teamNames = proposal.memberIds.mapNotNull { id -> view.players.firstOrNull { it.id == id }?.name }

    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionBanner("টিম অনুমোদন ভোট", "প্রস্তাবিত: ${teamNames.joinToString(", ")}")
        if (hasVoted) {
            Text(
                "ভোট দেওয়া হয়েছে। অপেক্ষা… (${proposal.votedPlayerIds.size}/${view.players.size})",
                color = PolashiColors.Cream, textAlign = TextAlign.Center,
            )
        } else {
            Text("এই টিম অনুমোদন করবেন?", color = PolashiColors.Cream, fontSize = 16.sp)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                WaxSeal("হ্যাঁ", SealFaction.YES, onClick = { onVote("YES") })
                WaxSeal("না", SealFaction.NO, onClick = { onVote("NO") })
            }
        }
    }
}

/** MISSION: selected members play a Success/Betrayer card. */
@Composable
fun MissionContent(view: PlayerView, myUserId: String?, onSubmit: (String) -> Unit) {
    val proposal = view.current ?: return
    val onTeam = myUserId in proposal.memberIds
    val isNawab = view.self?.side == "NAWAB"
    var submitted by remember(view.version) { mutableStateOf(false) }

    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionBanner("মিশন কার্ড জমা দিন", "আপনি নির্বাচিত সদস্য")
        when {
            !onTeam -> Text("আপনি এই মিশনে নেই। অপেক্ষা করুন…", color = PolashiColors.Cream)
            submitted -> Text("কার্ড জমা হয়েছে। বাকিদের অপেক্ষা…", color = PolashiColors.Cream)
            else -> {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    MissionCardOption("সফল", "নবাবের জয়", win = true, onClick = { onSubmit("SUCCESS"); submitted = true }, modifier = Modifier.weight(1f))
                    if (!isNawab) {
                        MissionCardOption("ব্যর্থ", "ইস্ট ইন্ডিয়ার জয়", win = false, onClick = { onSubmit("BETRAYER"); submitted = true }, modifier = Modifier.weight(1f))
                    }
                }
                if (isNawab) Text("নবাব পক্ষ হিসেবে আপনাকে সফল কার্ড খেলতে হবে।", color = PolashiColors.CreamDim, fontSize = 12.sp)
            }
        }
    }
}
