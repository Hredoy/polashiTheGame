package com.polashi.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.ui.graphics.graphicsLayer
import com.polashi.model.PlayerView
import com.polashi.ui.Characters
import com.polashi.ui.components.GhostButton
import com.polashi.ui.components.GoldButton
import com.polashi.ui.components.PolashiPanel
import com.polashi.ui.components.PrimaryButton
import com.polashi.ui.components.SectionBanner
import com.polashi.ui.components.VictoryBattleScene
import com.polashi.ui.components.VictoryModal
import com.polashi.ui.components.VictorySoundEffect
import com.polashi.ui.theme.PolashiColors
import kotlinx.coroutines.delay

/** Big faction-win banner used by chapter results and game over. */
@Composable
private fun WinBanner(side: String?) {
    val nawab = side == "NAWAB"
    PolashiPanel(
        Modifier.fillMaxWidth(),
        fill = if (nawab) com.polashi.ui.theme.PolashiBrushes.nawabBanner else com.polashi.ui.theme.PolashiBrushes.eicBanner,
    ) {
        Text(if (nawab) "⚑" else "⚑", color = PolashiColors.Cream, fontSize = 40.sp, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
        Text(
            if (nawab) "নবাব পক্ষ জয়ী!" else "ইস্ট ইন্ডিয়া কোম্পানি জয়ী!",
            color = PolashiColors.Cream, fontWeight = FontWeight.Black, fontSize = 26.sp,
            textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** CHAPTER_RESULT: win banner + card tally + host advance / spy investigate. */
@Composable
fun ChapterResultContent(
    view: PlayerView,
    myUserId: String?,
    amHost: Boolean,
    onAdvance: () -> Unit,
    onInvestigate: (String) -> Unit,
) {
    val chapter = view.chapters.firstOrNull { it.index == view.chapterIndex }
    val betrayers = chapter?.betrayerCount ?: 0
    val success = (chapter?.teamSize ?: 0) - betrayers

    Column(verticalArrangement = Arrangement.spacedBy(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        WinBanner(chapter?.winner)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            TallyChip("সফল কার্ড", success, PolashiColors.Nawab)
            TallyChip("ব্যর্থ কার্ড", betrayers, PolashiColors.Eic)
        }

        val spy = view.spy
        if (spy?.mustInvestigate == true) {
            SectionBanner("গুপ্তচর তদন্ত", "একজনের আনুগত্য যাচাই করুন")
            spy.eligibleTargetIds.forEach { id ->
                val name = view.players.firstOrNull { it.id == id }?.name ?: "?"
                GhostButton("তদন্ত: $name", onClick = { onInvestigate(id) }, modifier = Modifier.fillMaxWidth())
            }
        } else {
            spy?.myFindings?.lastOrNull()?.let { f ->
                val name = view.players.firstOrNull { it.id == f.targetId }?.name ?: "?"
                Text("আপনি জানলেন: $name → ${Characters.sideLabel(f.seenSide)}", color = Characters.sideColor(f.seenSide))
            }
            if (amHost) {
                PrimaryButton("চালিয়ে যান", onClick = onAdvance, modifier = Modifier.fillMaxWidth())
            } else {
                Text("সেনাপতির অপেক্ষা…", color = PolashiColors.CreamDim, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun TallyChip(label: String, value: Int, color: androidx.compose.ui.graphics.Color) {
    PolashiPanel(Modifier.padding(4.dp)) {
        Text(label, color = PolashiColors.InkSoft, fontSize = 12.sp, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
        Text("$value", color = color, fontWeight = FontWeight.Black, fontSize = 30.sp, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
    }
}

/** FINAL_GUESS: Mir Modon names Mir Zafar. */
@Composable
fun FinalGuessContent(view: PlayerView, myUserId: String?, onGuess: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        SectionBanner("শেষ সুযোগ", "মীর জাফরকে চিহ্নিত করুন")
        if (view.finalGuess?.isMine == true) {
            PolashiPanel(Modifier.fillMaxWidth()) {
                Text(
                    "নবাব পক্ষ ৩ অধ্যায় জিতেছে। মীর মদন, আপনি মীর জাফরকে চিহ্নিত করুন।",
                    color = PolashiColors.Ink, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth(),
                )
            }
            view.players.filter { it.id != myUserId }.forEach { p ->
                GhostButton(p.name, onClick = { onGuess(p.id) }, modifier = Modifier.fillMaxWidth())
            }
        } else {
            Text("মীর মদন মীর জাফরকে খুঁজছেন…", color = PolashiColors.Cream, fontWeight = FontWeight.Bold)
        }
    }
}

/** GAME_OVER: victory/defeat banner + full role reveal. */
@Composable
fun GameOverContent(view: PlayerView, myUserId: String?, onHistory: () -> Unit) {
    val winner = view.winner
    val iWon = view.self?.side != null && view.self?.side == winner
    var showModal by remember(winner) { mutableStateOf(false) }
    val revealAlpha by animateFloatAsState(
        targetValue = if (showModal) 1f else 0.72f,
        animationSpec = tween(700, easing = FastOutSlowInEasing),
        label = "revealAlpha",
    )
    val modalScale by animateFloatAsState(
        targetValue = if (showModal) 1f else 0.86f,
        animationSpec = tween(450, easing = FastOutSlowInEasing),
        label = "modalScale",
    )

    VictorySoundEffect(winner)
    LaunchedEffect(winner) {
        showModal = false
        delay(750)
        showModal = true
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            VictoryBattleScene(winner)
            VictoryModal(
                winner,
                iWon,
                Modifier
                    .fillMaxWidth(0.86f)
                    .graphicsLayer {
                        alpha = if (showModal) 1f else 0f
                        scaleX = modalScale
                        scaleY = modalScale
                    },
            )
        }
        Text(if (iWon) "🎉 জয়!" else "পরাজয়", color = PolashiColors.Cream, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        view.finalGuess?.takeIf { it.targetId != null }?.let { fg ->
            val name = view.players.firstOrNull { it.id == fg.targetId }?.name ?: "?"
            Text("মীর মদন $name-কে চিহ্নিত করেছেন — ${if (fg.correct == true) "সঠিক!" else "ভুল।"}", color = PolashiColors.CreamDim, textAlign = TextAlign.Center)
        }

        PolashiPanel(Modifier.fillMaxWidth().graphicsLayer { alpha = revealAlpha }) {
            Text("চরিত্র প্রকাশ", color = PolashiColors.Ink, fontWeight = FontWeight.Bold, modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp), textAlign = TextAlign.Center)
            view.players.forEach { p ->
                val key = view.rolesReveal?.get(p.id)
                Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(p.name + if (p.id == myUserId) " (you)" else "", color = PolashiColors.Ink)
                    Text(Characters.name(key), color = Characters.sideColor(sideOf(key)), fontWeight = FontWeight.Bold)
                }
            }
        }
        GoldButton("খেলার ইতিহাস", onClick = onHistory, modifier = Modifier.fillMaxWidth())
    }
}

private fun sideOf(key: String?): String? = when (key) {
    null -> null
    "SIRAJ", "MIR_MODON", "NAWAB", "MOHAN_LAL", "SAINT_FRAIS", "DEBUSI", "LUTFUNNESSA" -> "NAWAB"
    else -> "EIC"
}
