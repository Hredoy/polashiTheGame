package com.polashi.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.polashi.game.GameViewModel
import com.polashi.ui.components.GoldButton
import com.polashi.ui.components.PolashiPanel
import com.polashi.ui.components.PrimaryButton
import com.polashi.ui.components.WarBackground
import com.polashi.ui.theme.PolashiColors

/** Create a new room or join an existing one by share code. */
@Composable
fun HomeScreen(vm: GameViewModel, onSettings: () -> Unit = {}) {
    var code by remember { mutableStateOf("") }

    WarBackground {
        Column(
            Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp, Alignment.CenterVertically),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            androidx.compose.foundation.layout.Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("পলাশীর যুদ্ধ", color = PolashiColors.GoldBright, fontSize = 30.sp)
                com.polashi.ui.components.GhostButton("⚙", onClick = onSettings)
            }

            PolashiPanel(Modifier.fillMaxWidth()) {
                Text("রুম তৈরি করুন", color = PolashiColors.Ink, fontSize = 20.sp, modifier = Modifier.padding(bottom = 12.dp))
                PrimaryButton("🏰  রুম তৈরি করুন", onClick = { vm.createRoom() }, modifier = Modifier.fillMaxWidth())
            }

            PolashiPanel(Modifier.fillMaxWidth()) {
                Text("রুমে যোগ দিন", color = PolashiColors.Ink, fontSize = 20.sp, modifier = Modifier.padding(bottom = 12.dp))
                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it.uppercase().take(6) },
                    placeholder = { Text("রুম কোড লিখুন") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.Characters,
                        imeAction = ImeAction.Done,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                )
                GoldButton(
                    "রুমে যোগ দিন",
                    onClick = { vm.joinRoom(code) },
                    enabled = code.length >= 4,
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                )
            }
            // Navigation into the game flow happens automatically when room:state arrives.
        }
    }
}
