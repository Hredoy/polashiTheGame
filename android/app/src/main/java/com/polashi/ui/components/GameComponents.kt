package com.polashi.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.polashi.model.PlayerView
import com.polashi.model.PublicPlayer
import com.polashi.ui.theme.EicRed
import com.polashi.ui.theme.NawabGreen

/** Chapter win track: 5 pips, green=Nawab, red=EIC, hollow=unplayed; ring = current chapter. */
@Composable
fun ChapterTrack(view: PlayerView, modifier: Modifier = Modifier) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
        for (i in 1..5) {
            val ch = view.chapters.firstOrNull { it.index == i }
            val color = when (ch?.winner) {
                "NAWAB" -> NawabGreen
                "EIC" -> EicRed
                else -> Color(0x33000000)
            }
            val isCurrent = i == view.chapterIndex && view.winner == null
            Box(
                Modifier
                    .size(if (isCurrent) 22.dp else 18.dp)
                    .clip(CircleShape)
                    .background(color)
                    .then(if (isCurrent) Modifier.border(2.dp, MaterialTheme.colorScheme.onSurface, CircleShape) else Modifier),
                contentAlignment = Alignment.Center,
            ) {
                if (ch?.twoFailRequired == true) Text("2", color = Color.White, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

/** Score header: Nawab vs EIC chapter wins. */
@Composable
fun ScoreBar(view: PlayerView, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text("নবাব  ${view.wins["NAWAB"] ?: 0}", color = NawabGreen, fontWeight = FontWeight.Bold)
        Text("Chapter ${view.chapterIndex}/5")
        Text("${view.wins["EIC"] ?: 0}  EIC", color = EicRed, fontWeight = FontWeight.Bold)
    }
}

/**
 * Player list with optional selection (Make-Team) and vote/team status markers.
 * - [selectable] enables tap-to-select with [selected]/[onToggle].
 * - markers: ⚔ shobapoti, ● on team, ✓ voted (during voting), ○ offline.
 */
@Composable
fun PlayerList(
    view: PlayerView,
    myUserId: String?,
    modifier: Modifier = Modifier,
    selectable: Boolean = false,
    selected: Set<String> = emptySet(),
    onToggle: (String) -> Unit = {},
) {
    val teamIds = view.current?.memberIds?.toSet() ?: emptySet()
    val votedIds = view.current?.votedPlayerIds?.toSet() ?: emptySet()
    LazyColumn(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        items(view.players, key = { it.id }) { p ->
            PlayerRow(
                player = p,
                isMe = p.id == myUserId,
                onTeam = p.id in teamIds,
                voted = view.status == "VOTING" && p.id in votedIds,
                selectable = selectable,
                isSelected = p.id in selected,
                onClick = { if (selectable) onToggle(p.id) },
            )
        }
    }
}

@Composable
private fun PlayerRow(
    player: PublicPlayer,
    isMe: Boolean,
    onTeam: Boolean,
    voted: Boolean,
    selectable: Boolean,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (selectable) Modifier.clickable(onClick = onClick) else Modifier),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) NawabGreen.copy(alpha = 0.25f) else MaterialTheme.colorScheme.surface,
        ),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (player.isShobapoti) Text("⚔")
                Text(
                    player.name + if (isMe) " (you)" else "",
                    fontWeight = if (onTeam || isSelected) FontWeight.Bold else FontWeight.Normal,
                    color = if (!player.connected) Color.Gray else MaterialTheme.colorScheme.onSurface,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                if (onTeam) Text("●", color = NawabGreen)
                if (voted) Text("✓")
                if (!player.connected) Text("○", color = Color.Gray)
            }
        }
    }
}
