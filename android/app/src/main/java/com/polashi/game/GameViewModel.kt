package com.polashi.game

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.polashi.model.GameError
import com.polashi.model.HistoryItem
import com.polashi.model.PlayerView
import com.polashi.model.RoomCreated
import com.polashi.model.Session
import com.polashi.net.SocketManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import org.json.JSONArray
import org.json.JSONObject

/**
 * Single source of UI state. Holds the latest PlayerView from the server and exposes
 * thin intent methods that emit socket events. No game rules here — the server decides.
 */
class GameViewModel(
    private val socket: SocketManager,
) : ViewModel() {

    private val json = Json { ignoreUnknownKeys = true }

    private val _view = MutableStateFlow<PlayerView?>(null)
    val view: StateFlow<PlayerView?> = _view

    private val _session = MutableStateFlow<Session?>(null)
    val session: StateFlow<Session?> = _session

    private val _roomCode = MutableStateFlow<String?>(null)
    val roomCode: StateFlow<String?> = _roomCode

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val _history = MutableStateFlow<List<HistoryItem>>(emptyList())
    val history: StateFlow<List<HistoryItem>> = _history

    val connected: StateFlow<Boolean> get() = socket.connected

    init {
        viewModelScope.launch {
            socket.events.collect { (event, raw) ->
                when (event) {
                    "session" -> _session.value = json.decodeFromString<Session>(raw)
                    "room:state" -> _view.value = json.decodeFromString<PlayerView>(raw)
                    "room:created" -> _roomCode.value =
                        json.decodeFromString<RoomCreated>(raw).code
                    "error:game" -> _error.value =
                        json.decodeFromString<GameError>(raw).message
                    "history:list" -> _history.value =
                        json.decodeFromString<List<HistoryItem>>(raw)
                }
            }
        }
    }

    // ---- connection ----
    // Pass a previously saved token to keep the same identity; null on first launch.
    // After `session` arrives, persist session.value.token (DataStore) for next time.
    fun connect(token: String?, name: String) = socket.connect(token, name)

    // ---- room lifecycle ----
    fun createRoom() = socket.emit("room:create")
    fun joinRoom(code: String) = socket.emit("room:join", JSONObject().put("code", code))
    fun resume(roomId: String) = socket.emit("room:resume", JSONObject().put("roomId", roomId))

    // ---- lobby ----
    fun setReady(ready: Boolean) = socket.emit("player:ready", JSONObject().put("ready", ready))
    fun addBots(count: Int) = socket.emit("bots:add", JSONObject().put("count", count))
    fun startGame() = socket.emit("game:start")

    // ---- in-game ----
    fun ackRole() = socket.emit("role:ack")
    fun proposeTeam(memberIds: List<String>) =
        socket.emit("team:propose", JSONObject().put("memberIds", JSONArray(memberIds)))
    fun castVote(value: String) = socket.emit("vote:cast", JSONObject().put("value", value))
    fun submitCard(card: String) = socket.emit("mission:submit", JSONObject().put("card", card))
    fun advanceChapter() = socket.emit("chapter:advance")
    fun investigate(targetId: String) =
        socket.emit("spy:investigate", JSONObject().put("targetId", targetId))
    fun finalGuess(targetId: String) =
        socket.emit("final:guess", JSONObject().put("targetId", targetId))
    fun loadHistory() = socket.emit("history:list")

    fun clearError() { _error.value = null }
}
