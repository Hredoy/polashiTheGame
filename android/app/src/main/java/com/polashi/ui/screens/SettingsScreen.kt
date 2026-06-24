package com.polashi.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.polashi.PolashiApp
import com.polashi.audio.SettingsStore
import com.polashi.ui.components.GhostButton
import com.polashi.ui.components.PolashiPanel
import com.polashi.ui.components.SectionBanner
import com.polashi.ui.components.WarBackground
import com.polashi.ui.theme.PolashiColors

/** Sound + vibration toggles, persisted via SettingsStore. */
@Composable
fun SettingsScreen(onBack: () -> Unit) {
    WarBackground {
        Column(
            Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            SectionBanner("সেটিংস", "শব্দ ও ভাইব্রেশন")

            PolashiPanel(Modifier.fillMaxWidth()) {
                SettingRow(
                    title = "ব্যাকগ্রাউন্ড সাউন্ড",
                    subtitle = "যুদ্ধের আবহ সঙ্গীত",
                    checked = SettingsStore.soundEnabled,
                    onCheckedChange = {
                        SettingsStore.setSound(it)
                        PolashiApp.instance.soundManager.applySoundSetting()
                    },
                )
                SettingRow(
                    title = "ভাইব্রেশন",
                    subtitle = "আপনার পালা এলে কম্পন",
                    checked = SettingsStore.vibrationEnabled,
                    onCheckedChange = {
                        SettingsStore.setVibration(it)
                        if (it) PolashiApp.instance.soundManager.vibrate()
                    },
                )
            }

            GhostButton("ফিরে যান", onClick = onBack, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun SettingRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column {
            Text(title, color = PolashiColors.Ink, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(subtitle, color = PolashiColors.InkSoft, fontSize = 12.sp)
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = PolashiColors.Cream,
                checkedTrackColor = PolashiColors.Nawab,
                uncheckedTrackColor = PolashiColors.ParchmentDeep,
            ),
        )
    }
}
