package com.polashi.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import com.polashi.game.GameViewModel

/** Create a new room or join an existing one by share code. */
@Composable
fun HomeScreen(vm: GameViewModel) {
    var code by remember { mutableStateOf("") }

    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Polashi", style = androidx.compose.material3.MaterialTheme.typography.headlineMedium)

        Button(onClick = { vm.createRoom() }, modifier = Modifier.fillMaxWidth()) {
            Text("Create Room")
        }

        OutlinedTextField(
            value = code,
            onValueChange = { code = it.uppercase().take(6) },
            label = { Text("Room code") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.Characters,
                imeAction = ImeAction.Done,
            ),
        )
        OutlinedButton(
            onClick = { vm.joinRoom(code) },
            enabled = code.length >= 4,
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Join Room") }
        // Navigation into the game flow happens automatically when room:state arrives.
    }
}
