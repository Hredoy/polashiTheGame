package com.polashi.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.polashi.ui.theme.PolashiBrushes
import com.polashi.ui.theme.PolashiColors

// ---------------------------------------------------------------------------
// Backgrounds
// ---------------------------------------------------------------------------

/** Full-screen dark battlefield vignette used by most in-game screens. */
@Composable
fun WarBackground(content: @Composable () -> Unit) {
    Box(Modifier.fillMaxSize().background(PolashiBrushes.warNight)) { content() }
}

/** Full-screen aged-parchment background for menus/results. */
@Composable
fun ParchmentBackground(content: @Composable () -> Unit) {
    Box(Modifier.fillMaxSize().background(PolashiBrushes.parchment)) { content() }
}

// ---------------------------------------------------------------------------
// Frames & panels
// ---------------------------------------------------------------------------

private val PanelShape = RoundedCornerShape(16.dp)

/** Parchment card with a gold double-frame — the signature container in the mockups. */
@Composable
fun PolashiPanel(
    modifier: Modifier = Modifier,
    fill: Brush = PolashiBrushes.parchment,
    content: @Composable ColumnScope.() -> Unit,
) {
    Box(
        modifier
            .clip(PanelShape)
            .background(fill)
            .border(BorderStroke(2.dp, PolashiBrushes.gold), PanelShape)
            .padding(4.dp)
            .border(BorderStroke(1.dp, PolashiColors.GoldDeep.copy(alpha = 0.5f)), RoundedCornerShape(12.dp))
            .padding(16.dp),
    ) {
        Column(content = content)
    }
}

/** Title bar with gold rails (the section headers like "ইস্ট ইন্ডিয়া কোম্পানি সদস্যরা"). */
@Composable
fun SectionBanner(title: String, subtitle: String? = null, modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Brush.horizontalGradient(listOf(PolashiColors.WarBrownLight, PolashiColors.WarBrown, PolashiColors.WarBrownLight)))
            .border(BorderStroke(1.5.dp, PolashiBrushes.gold), RoundedCornerShape(12.dp))
            .padding(vertical = 12.dp, horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(title, color = PolashiColors.GoldBright, fontWeight = FontWeight.Bold, fontSize = 20.sp, textAlign = TextAlign.Center)
            if (subtitle != null) {
                Text(subtitle, color = PolashiColors.CreamDim, fontSize = 13.sp, textAlign = TextAlign.Center)
            }
        }
    }
}

/** Thin ornate gold divider. */
@Composable
fun OrnateDivider(modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
            .height(2.dp)
            .clip(CircleShape)
            .background(PolashiBrushes.gold),
    )
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

private val ButtonShape = RoundedCornerShape(10.dp)

@Composable
private fun BaseButton(
    text: String,
    onClick: () -> Unit,
    fill: Brush,
    textColor: Color,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    Box(
        modifier
            .clip(ButtonShape)
            .background(if (enabled) fill else Brush.verticalGradient(listOf(Color(0xFF6B6357), Color(0xFF4A4339))))
            .border(BorderStroke(1.5.dp, PolashiColors.GoldDeep), ButtonShape)
            .clickable(enabled = enabled) { onClick() }
            .padding(vertical = 14.dp, horizontal = 20.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, color = textColor, fontWeight = FontWeight.Bold, fontSize = 16.sp, textAlign = TextAlign.Center)
    }
}

/** Primary green (Nawab) CTA with gold trim — the main action button in the mockups. */
@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) =
    BaseButton(text, onClick, Brush.verticalGradient(listOf(PolashiColors.NawabBright, PolashiColors.NawabDeep)), PolashiColors.Cream, modifier, enabled)

/** Brass/gold button (e.g. continue/share accents). */
@Composable
fun GoldButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) =
    BaseButton(text, onClick, PolashiBrushes.gold, PolashiColors.WarNight, modifier, enabled)

/** Red (EIC / leave / danger) button. */
@Composable
fun DangerButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) =
    BaseButton(text, onClick, Brush.verticalGradient(listOf(PolashiColors.EicBright, PolashiColors.EicDeep)), PolashiColors.Cream, modifier, enabled)

/** Outlined "ghost" button on parchment (secondary actions like গেস্ট হিসেবে খেলুন). */
@Composable
fun GhostButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Box(
        modifier
            .clip(ButtonShape)
            .border(BorderStroke(1.5.dp, PolashiBrushes.gold), ButtonShape)
            .clickable(enabled = enabled) { onClick() }
            .padding(vertical = 13.dp, horizontal = 20.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, color = PolashiColors.GoldBright, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
    }
}

// ---------------------------------------------------------------------------
// Vote seals & mission cards
// ---------------------------------------------------------------------------

/** Circular wax-seal vote button (হ্যাঁ green / না red). */
@Composable
fun WaxSeal(label: String, faction: SealFaction, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = when (faction) {
        SealFaction.YES -> listOf(PolashiColors.NawabBright, PolashiColors.SealGreen, PolashiColors.NawabDeep)
        SealFaction.NO -> listOf(PolashiColors.EicBright, PolashiColors.SealRed, PolashiColors.EicDeep)
    }
    Box(
        modifier
            .size(96.dp)
            .clip(CircleShape)
            .background(Brush.radialGradient(colors))
            .border(BorderStroke(3.dp, PolashiBrushes.gold), CircleShape)
            .clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Text(label, color = PolashiColors.Cream, fontWeight = FontWeight.Black, fontSize = 26.sp)
    }
}

enum class SealFaction { YES, NO }

/** Large success/betrayer mission choice card (সফল / ব্যর্থ). */
@Composable
fun MissionCardOption(
    title: String,
    subtitle: String,
    win: Boolean, // true = success (green), false = betrayer (red)
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val fill = if (win) PolashiBrushes.nawabBanner else PolashiBrushes.eicBanner
    Box(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(fill)
            .border(BorderStroke(2.dp, PolashiBrushes.gold), RoundedCornerShape(14.dp))
            .clickable { onClick() }
            .padding(vertical = 28.dp, horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (win) "⚑" else "⚑", color = PolashiColors.Cream, fontSize = 40.sp)
            Text(title, color = PolashiColors.Cream, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            Text(subtitle, color = PolashiColors.CreamDim, fontSize = 12.sp)
        }
    }
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

/** Circular player portrait with faction ring + optional crown (Shobapoti) and name. */
@Composable
fun PlayerAvatar(
    name: String,
    faction: AvatarFaction = AvatarFaction.NEUTRAL,
    isShobapoti: Boolean = false,
    selected: Boolean = false,
    dimmed: Boolean = false,
    size: Int = 56,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val ring = when (faction) {
        AvatarFaction.NAWAB -> PolashiColors.NawabBright
        AvatarFaction.EIC -> PolashiColors.EicBright
        AvatarFaction.NEUTRAL -> PolashiColors.Gold
    }
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = modifier) {
        if (isShobapoti) Text("👑", fontSize = 14.sp)
        Box(
            Modifier
                .size(size.dp)
                .clip(CircleShape)
                .background(Brush.radialGradient(listOf(PolashiColors.WarBrownLight, PolashiColors.WarNight)))
                .border(BorderStroke(if (selected) 3.dp else 2.dp, if (selected) PolashiColors.GoldBright else ring), CircleShape)
                .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                name.take(1).uppercase(),
                color = if (dimmed) PolashiColors.CreamDim else PolashiColors.Cream,
                fontWeight = FontWeight.Bold,
                fontSize = (size / 2.6).sp,
            )
        }
        Text(name, color = PolashiColors.Cream, fontSize = 11.sp, maxLines = 1)
    }
}

enum class AvatarFaction { NAWAB, EIC, NEUTRAL }

/** Faction score header: green banner (Nawab wins) | chapter | red banner (EIC wins). */
@Composable
fun FactionScoreHeader(nawabWins: Int, eicWins: Int, chapterIndex: Int, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        FactionTab("নবাব পক্ষ", nawabWins, PolashiBrushes.nawabBanner)
        Column(Modifier.weight(1f).padding(horizontal = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("অধ্যায় $chapterIndex / ৫", color = PolashiColors.GoldBright, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text("পলাশীর যুদ্ধ", color = PolashiColors.CreamDim, fontSize = 11.sp)
        }
        FactionTab("EIC", eicWins, PolashiBrushes.eicBanner)
    }
}

@Composable
private fun FactionTab(label: String, score: Int, fill: Brush) {
    Box(
        Modifier
            .width(96.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(fill)
            .border(BorderStroke(1.5.dp, PolashiBrushes.gold), RoundedCornerShape(10.dp))
            .padding(vertical = 8.dp, horizontal = 10.dp),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(label, color = PolashiColors.Cream, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Text("$score", color = PolashiColors.GoldBright, fontWeight = FontWeight.Black, fontSize = 20.sp)
        }
    }
}
