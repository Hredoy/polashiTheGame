package com.polashi.net

import com.polashi.BuildConfig
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONObject

/**
 * Thin wrapper over socket.io-client. Connects with auth { userId?, name }, exposes
 * connection state and a flow of (event, rawJson) for the ViewModel to parse.
 *
 * Keep this transport-only: no game logic, no parsing decisions beyond stringifying.
 */
class SocketManager {

    private var socket: Socket? = null

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected

    // Emits (eventName, jsonString) for every server->client message we care about.
    private val _events = MutableSharedFlow<Pair<String, String>>(extraBufferCapacity = 64)
    val events: SharedFlow<Pair<String, String>> = _events

    private val serverEvents = listOf(
        "session", "room:created", "room:state", "history:list", "error:game",
    )

    fun connect(userId: String?, name: String) {
        if (socket != null) return
        val opts = IO.Options().apply {
            auth = buildMap {
                if (!userId.isNullOrBlank()) put("userId", userId)
                put("name", name)
            }
            reconnection = true
        }
        socket = IO.socket(BuildConfig.SERVER_URL, opts).apply {
            on(Socket.EVENT_CONNECT) { _connected.tryEmit(true) }
            on(Socket.EVENT_DISCONNECT) { _connected.tryEmit(false) }
            serverEvents.forEach { ev ->
                on(ev) { args ->
                    val payload = (args.getOrNull(0) as? JSONObject)?.toString() ?: "{}"
                    _events.tryEmit(ev to payload)
                }
            }
            connect()
        }
    }

    fun emit(event: String, payload: JSONObject = JSONObject()) {
        socket?.emit(event, payload)
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        _connected.tryEmit(false)
    }
}
