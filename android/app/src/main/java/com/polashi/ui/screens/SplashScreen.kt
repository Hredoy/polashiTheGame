package com.polashi.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.polashi.ui.components.WarBackground
import com.polashi.ui.theme.PolashiColors
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onDone: () -> Unit) {
    LaunchedEffect(Unit) {
        delay(1500)
        onDone()
    }
    WarBackground {
        Column(
            Modifier.fillMaxSize().padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("⚔", fontSize = 56.sp)
            Text(
                "পলাশীর",
                color = PolashiColors.GoldBright,
                fontSize = 52.sp,
                style = androidx.compose.material3.MaterialTheme.typography.displayLarge,
            )
            Text("দ্বিতীয় সংগ্রাম", color = PolashiColors.Cream, fontSize = 22.sp)
            Text(
                "ইতিহাসের সেই গৌরবময় যুদ্ধ",
                color = PolashiColors.CreamDim,
                fontSize = 13.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 12.dp),
            )
        }
        // TODO: scroll-unfurl animation + war drum SFX; battlefield art behind the title.
    }
}
