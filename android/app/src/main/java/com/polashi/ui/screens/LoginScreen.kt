package com.polashi.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.polashi.game.GameViewModel

/** Guest-name entry. Connects the socket with the chosen name, then continues home. */
@Composable
fun LoginScreen(vm: GameViewModel, onContinue: () -> Unit) {
    var name by remember { mutableStateOf("") }
    val connected by vm.connected.collectAsState()

    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Enter the battlefield")
        OutlinedTextField(
            value = name,
            onValueChange = { name = it.take(24) },
            label = { Text("Your name") },
        )
        Button(
            enabled = name.isNotBlank(),
            onClick = {
                // TODO: load saved userId from DataStore for reconnect continuity.
                vm.connect(userId = null, name = name.trim())
                onContinue()
            },
        ) { Text(if (connected) "Continue" else "Connect & Continue") }
    }
}
