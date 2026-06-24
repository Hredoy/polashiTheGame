package com.polashi.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.polashi.game.GameViewModel
import com.polashi.ui.components.GhostButton
import com.polashi.ui.components.PolashiPanel
import com.polashi.ui.components.PrimaryButton
import com.polashi.ui.components.WarBackground
import com.polashi.ui.theme.PolashiColors

/** Guest-name entry. Connects the socket, then continues to Home. */
@Composable
fun LoginScreen(vm: GameViewModel, onContinue: () -> Unit) {
    var name by remember { mutableStateOf("") }

    WarBackground {
        Column(
            Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            PolashiPanel(Modifier.fillMaxWidth()) {
                Text(
                    "আপনার নাম লিখুন",
                    color = PolashiColors.Ink,
                    fontSize = 22.sp,
                    modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                )
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it.take(24) },
                    placeholder = { Text("আপনার নাম") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                PrimaryButton(
                    text = "খেলা শুরু করুন",
                    onClick = {
                        if (name.isNotBlank()) {
                            // TODO: load a saved session token from DataStore for reconnect.
                            vm.connect(token = null, name = name.trim())
                            onContinue()
                        }
                    },
                    enabled = name.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                )
                Text(
                    "অথবা",
                    color = PolashiColors.InkSoft,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                )
                GhostButton(
                    text = "🎭  গেস্ট হিসেবে খেলুন",
                    onClick = {
                        vm.connect(token = null, name = "Guest")
                        onContinue()
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}
