package com.polashi.ui.components

import android.media.AudioManager
import android.media.ToneGenerator
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.polashi.ui.theme.PolashiBrushes
import com.polashi.ui.theme.PolashiColors
import kotlinx.coroutines.delay
import kotlin.math.roundToInt

@Composable
fun VictorySoundEffect(side: String?) {
    val tones = remember(side) {
        if (side == "EIC") {
            listOf(ToneGenerator.TONE_PROP_BEEP, ToneGenerator.TONE_PROP_NACK, ToneGenerator.TONE_PROP_BEEP2)
        } else {
            listOf(ToneGenerator.TONE_PROP_ACK, ToneGenerator.TONE_PROP_BEEP2, ToneGenerator.TONE_PROP_ACK)
        }
    }
    LaunchedEffect(side) {
        if (side == null) return@LaunchedEffect
        val tone = ToneGenerator(AudioManager.STREAM_MUSIC, 75)
        try {
            tones.forEach {
                tone.startTone(it, 160)
                delay(210)
            }
        } finally {
            tone.release()
        }
    }
}

@Composable
fun VictoryBattleScene(side: String?, modifier: Modifier = Modifier) {
    val nawabWon = side == "NAWAB"
    val transition = rememberInfiniteTransition(label = "battle")
    val charge by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(2300, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "charge",
    )
    val banner by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1200, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "banner",
    )
    val flash by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(900), RepeatMode.Reverse),
        label = "flash",
    )

    val winColor = if (nawabWon) PolashiColors.NawabBright else PolashiColors.EicBright
    val loseColor = if (nawabWon) PolashiColors.EicBright else PolashiColors.NawabBright

    Box(
        modifier
            .fillMaxWidth()
            .height(250.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(
                Brush.verticalGradient(
                    listOf(
                        if (nawabWon) Color(0xFF123C24) else Color(0xFF4A1014),
                        PolashiColors.WarNight,
                    ),
                ),
            ),
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height
            val ground = h * 0.76f

            drawCircle(winColor.copy(alpha = 0.12f + flash * 0.08f), radius = w * 0.45f, center = Offset(w * 0.5f, h * 0.25f))
            drawRect(Color(0xFF2F2418), topLeft = Offset(0f, ground), size = Size(w, h - ground))
            drawLine(Color(0xFFE0B75B).copy(alpha = 0.65f), Offset(0f, ground), Offset(w, ground), strokeWidth = 4f)

            val leftAdvance = charge * w * 0.11f
            val rightAdvance = charge * w * 0.11f
            drawArmy(
                origin = Offset(w * 0.16f + leftAdvance, ground),
                color = if (nawabWon) winColor else loseColor,
                facing = 1f,
                strong = nawabWon,
            )
            drawArmy(
                origin = Offset(w * 0.84f - rightAdvance, ground),
                color = if (nawabWon) loseColor else winColor,
                facing = -1f,
                strong = !nawabWon,
            )

            repeat(5) { i ->
                val x = (w * 0.25f + i * w * 0.12f + charge * w * 0.2f) % w
                val y = h * (0.34f + (i % 2) * 0.06f)
                drawLine(PolashiColors.GoldBright, Offset(x, y), Offset(x + 34f, y - 18f), strokeWidth = 3f, cap = StrokeCap.Round)
                drawLine(PolashiColors.GoldBright, Offset(w - x, y + 12f), Offset(w - x - 34f, y - 6f), strokeWidth = 3f, cap = StrokeCap.Round)
            }
        }

        BattleBadge(
            text = if (nawabWon) "নবাব বাহিনী" else "EIC Army",
            color = if (nawabWon) PolashiColors.NawabBright else PolashiColors.EicBright,
            modifier = Modifier.align(Alignment.TopStart).padding(12.dp).offset { IntOffset((banner * 8).roundToInt(), 0) },
        )
        BattleBadge(
            text = if (nawabWon) "EIC Army" else "নবাব বাহিনী",
            color = if (nawabWon) PolashiColors.EicBright else PolashiColors.NawabBright,
            modifier = Modifier.align(Alignment.TopEnd).padding(12.dp).offset { IntOffset(-(banner * 8).roundToInt(), 0) },
        )
    }
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawArmy(
    origin: Offset,
    color: Color,
    facing: Float,
    strong: Boolean,
) {
    val alpha = if (strong) 1f else 0.62f
    repeat(3) { i ->
        val x = origin.x + facing * i * 32f
        val y = origin.y - i * 5f
        drawSwordMan(Offset(x, y), color.copy(alpha = alpha), facing)
    }
    repeat(2) { i ->
        val x = origin.x - facing * (42f + i * 34f)
        drawArcher(Offset(x, origin.y - 22f - i * 4f), color.copy(alpha = alpha), facing)
    }
    drawHorseman(Offset(origin.x - facing * 18f, origin.y + 8f), color.copy(alpha = alpha), facing)
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawSwordMan(base: Offset, color: Color, facing: Float) {
    drawCircle(color, radius = 8f, center = Offset(base.x, base.y - 48f))
    drawLine(color, Offset(base.x, base.y - 40f), Offset(base.x, base.y - 18f), strokeWidth = 6f, cap = StrokeCap.Round)
    drawLine(color, Offset(base.x, base.y - 30f), Offset(base.x + facing * 20f, base.y - 44f), strokeWidth = 5f, cap = StrokeCap.Round)
    drawLine(PolashiColors.GoldBright, Offset(base.x + facing * 20f, base.y - 44f), Offset(base.x + facing * 38f, base.y - 62f), strokeWidth = 3f, cap = StrokeCap.Round)
    drawLine(color, Offset(base.x, base.y - 18f), Offset(base.x - 10f, base.y), strokeWidth = 5f, cap = StrokeCap.Round)
    drawLine(color, Offset(base.x, base.y - 18f), Offset(base.x + 10f, base.y), strokeWidth = 5f, cap = StrokeCap.Round)
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawArcher(base: Offset, color: Color, facing: Float) {
    drawCircle(color, radius = 7f, center = Offset(base.x, base.y - 38f))
    drawLine(color, Offset(base.x, base.y - 30f), Offset(base.x, base.y - 12f), strokeWidth = 5f, cap = StrokeCap.Round)
    drawArc(
        color = PolashiColors.Gold,
        startAngle = if (facing > 0) -70f else 110f,
        sweepAngle = 140f,
        useCenter = false,
        topLeft = Offset(base.x - 12f, base.y - 42f),
        size = Size(24f, 34f),
        style = Stroke(width = 3f),
    )
    drawLine(PolashiColors.GoldBright, Offset(base.x, base.y - 24f), Offset(base.x + facing * 30f, base.y - 26f), strokeWidth = 2.5f)
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawHorseman(base: Offset, color: Color, facing: Float) {
    drawOval(color.copy(alpha = 0.9f), topLeft = Offset(base.x - 24f, base.y - 26f), size = Size(52f, 24f))
    drawCircle(color.copy(alpha = 0.9f), radius = 8f, center = Offset(base.x + facing * 30f, base.y - 23f))
    drawLine(color, Offset(base.x - 16f, base.y - 5f), Offset(base.x - 22f, base.y + 16f), strokeWidth = 5f, cap = StrokeCap.Round)
    drawLine(color, Offset(base.x + 14f, base.y - 5f), Offset(base.x + 20f, base.y + 16f), strokeWidth = 5f, cap = StrokeCap.Round)
    drawCircle(PolashiColors.Cream, radius = 7f, center = Offset(base.x, base.y - 52f))
    drawLine(PolashiColors.Cream, Offset(base.x, base.y - 45f), Offset(base.x, base.y - 27f), strokeWidth = 5f, cap = StrokeCap.Round)
    drawLine(PolashiColors.GoldBright, Offset(base.x, base.y - 42f), Offset(base.x + facing * 32f, base.y - 58f), strokeWidth = 3f, cap = StrokeCap.Round)
}

@Composable
private fun BattleBadge(text: String, color: Color, modifier: Modifier = Modifier) {
    Box(
        modifier
            .clip(RoundedCornerShape(999.dp))
            .background(color.copy(alpha = 0.28f))
            .padding(horizontal = 12.dp, vertical = 6.dp),
    ) {
        Text(text, color = PolashiColors.Cream, fontWeight = FontWeight.Bold, fontSize = 12.sp)
    }
}

@Composable
fun VictoryModal(side: String?, iWon: Boolean, modifier: Modifier = Modifier) {
    val nawabWon = side == "NAWAB"
    PolashiPanel(
        modifier,
        fill = if (nawabWon) PolashiBrushes.nawabBanner else PolashiBrushes.eicBanner,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                if (nawabWon) "Nobab Team Win" else "EIC Team Win",
                color = PolashiColors.Cream,
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                if (iWon) "আপনার দল বিজয়ী" else "প্রতিপক্ষ বিজয়ী",
                color = PolashiColors.CreamDim,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
