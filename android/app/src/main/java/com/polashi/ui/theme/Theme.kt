package com.polashi.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Battle-of-Plassey palette: Nawab green vs EIC red on aged-paper neutrals.
val NawabGreen = Color(0xFF2E6B3E)
val NawabGreenDark = Color(0xFF1B4727)
val EicRed = Color(0xFF9E2B25)
val EicRedDark = Color(0xFF6E1812)
val Parchment = Color(0xFFF3E9D2)
val ParchmentDark = Color(0xFF2A2419)
val InkBrown = Color(0xFF3A2E1E)

private val LightColors = lightColorScheme(
    primary = NawabGreen,
    secondary = EicRed,
    background = Parchment,
    surface = Parchment,
    onPrimary = Parchment,
    onBackground = InkBrown,
    onSurface = InkBrown,
)

private val DarkColors = darkColorScheme(
    primary = NawabGreen,
    secondary = EicRed,
    background = ParchmentDark,
    surface = ParchmentDark,
    onPrimary = Parchment,
)

@Composable
fun PolashiTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
    // TODO: paper-texture background, ancient Bengali display typeface, war SFX (see brief).
}
