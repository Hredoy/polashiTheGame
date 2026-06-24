package com.polashi.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Polashi (Battle of Plassey) visual language, matched to the game mockups:
 * aged parchment, gold/brass frames, Nawab green vs EIC red, ink-brown text.
 * Colours live in [PolashiColors]; reusable brushes for paper/gold gradients are here too.
 */
object PolashiColors {
    // Parchment / paper
    val Parchment = Color(0xFFE7D6AC)
    val ParchmentLight = Color(0xFFF1E4C3)
    val ParchmentDeep = Color(0xFFCBB382)
    val ParchmentEdge = Color(0xFF8A6E3F)

    // Dark "war" backgrounds (in-game board, reveals, results)
    val WarNight = Color(0xFF17110B)
    val WarBrown = Color(0xFF241A10)
    val WarBrownLight = Color(0xFF34271A)

    // Gold / brass (frames, buttons, dividers)
    val Gold = Color(0xFFC9A24B)
    val GoldBright = Color(0xFFE7C873)
    val GoldDeep = Color(0xFF8A6A2E)

    // Nawab (green faction)
    val Nawab = Color(0xFF2E6B3E)
    val NawabBright = Color(0xFF4E9A52)
    val NawabDeep = Color(0xFF173F22)
    val SealGreen = Color(0xFF3E7D44)

    // EIC (red faction)
    val Eic = Color(0xFF9E2B25)
    val EicBright = Color(0xFFC4413A)
    val EicDeep = Color(0xFF5E1812)
    val SealRed = Color(0xFFA62B26)

    // Ink / text
    val Ink = Color(0xFF3A2E1E)
    val InkSoft = Color(0xFF5B4A33)
    val Cream = Color(0xFFF3E9D2)
    val CreamDim = Color(0xFFCDBE9C)
}

// Convenience aliases used across components/screens.
val NawabGreen = PolashiColors.Nawab
val EicRed = PolashiColors.Eic

object PolashiBrushes {
    /** Aged-paper panel fill (light → deep tan, like a parchment card). */
    val parchment = Brush.verticalGradient(
        listOf(PolashiColors.ParchmentLight, PolashiColors.Parchment, PolashiColors.ParchmentDeep),
    )

    /** Dark vignette battlefield background for in-game screens. */
    val warNight = Brush.verticalGradient(
        listOf(PolashiColors.WarBrownLight, PolashiColors.WarBrown, PolashiColors.WarNight),
    )

    /** Brass sheen for buttons and frames. */
    val gold = Brush.verticalGradient(
        listOf(PolashiColors.GoldBright, PolashiColors.Gold, PolashiColors.GoldDeep),
    )

    val nawabBanner = Brush.verticalGradient(listOf(PolashiColors.Nawab, PolashiColors.NawabDeep))
    val eicBanner = Brush.verticalGradient(listOf(PolashiColors.Eic, PolashiColors.EicDeep))
}

// Bengali renders on the system font by default. A custom display face (e.g. a Bengali
// "ancient" typeface in res/font) can be slotted into displayLarge/headline later.
private val PolashiType = Typography(
    displayLarge = TextStyle(fontWeight = FontWeight.Black, fontSize = 40.sp, letterSpacing = 0.5.sp),
    headlineMedium = TextStyle(fontWeight = FontWeight.Bold, fontSize = 26.sp),
    headlineSmall = TextStyle(fontWeight = FontWeight.Bold, fontSize = 22.sp),
    titleLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 20.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 17.sp),
    bodyMedium = TextStyle(fontSize = 15.sp),
    labelSmall = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 11.sp),
)

private val PolashiColorScheme = darkColorScheme(
    primary = PolashiColors.Gold,
    onPrimary = PolashiColors.WarNight,
    secondary = PolashiColors.Nawab,
    tertiary = PolashiColors.Eic,
    background = PolashiColors.WarNight,
    onBackground = PolashiColors.Cream,
    surface = PolashiColors.Parchment,
    onSurface = PolashiColors.Ink,
    surfaceVariant = PolashiColors.ParchmentDeep,
    onSurfaceVariant = PolashiColors.InkSoft,
)

@Composable
fun PolashiTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = PolashiColorScheme,
        typography = PolashiType,
        content = content,
    )
}
