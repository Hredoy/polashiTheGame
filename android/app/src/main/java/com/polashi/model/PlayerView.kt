package com.polashi.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Kotlin mirror of the backend's PlayerView (see backend/src/game/view.ts).
 * This is the ONLY game state the client ever sees — already filtered per recipient.
 * The client renders this and never computes game outcomes.
 */
@Serializable
data class PlayerView(
    val roomId: String,
    val status: String, // LOBBY | ROLE_REVEAL | TEAM_PROPOSAL | VOTING | MISSION | CHAPTER_RESULT | FINAL_GUESS | GAME_OVER
    val version: Int,
    val players: List<PublicPlayer> = emptyList(),
    val self: SelfInfo? = null,
    val chapterIndex: Int = 0,
    val chapters: List<PublicChapter> = emptyList(),
    val wins: Map<String, Int> = emptyMap(),
    val current: PublicProposal? = null,
    val failedProposals: Int = 0,
    val finalGuess: FinalGuessView? = null,
    val spy: SpyView? = null,
    val winner: String? = null,
    val rolesReveal: Map<String, String>? = null,
)

@Serializable
data class PublicPlayer(
    val id: String,
    val name: String,
    val seatIndex: Int,
    val ready: Boolean,
    val connected: Boolean,
    val ackedRole: Boolean,
    val isShobapoti: Boolean,
    val isBot: Boolean = false,
)

@Serializable
data class SelfInfo(
    val characterKey: String,
    val side: String, // NAWAB | EIC
    val reveals: List<Reveal> = emptyList(),
)

@Serializable
data class Reveal(val playerId: String, val label: String)

@Serializable
data class PublicChapter(
    val index: Int,
    val teamSize: Int,
    val twoFailRequired: Boolean,
    val winner: String? = null,
    val betrayerCount: Int? = null,
)

@Serializable
data class PublicProposal(
    val shobapotiSeat: Int,
    val memberIds: List<String> = emptyList(),
    val votedPlayerIds: List<String> = emptyList(),
    val tally: Tally? = null,
)

@Serializable
data class Tally(val yes: Int, val no: Int)

@Serializable
data class FinalGuessView(
    val isMine: Boolean,
    val targetId: String? = null,
    val correct: Boolean? = null,
)

@Serializable
data class SpyView(
    val enabled: Boolean,
    val currentSpyId: String? = null,
    val amCurrentSpy: Boolean = false,
    val mustInvestigate: Boolean = false,
    val eligibleTargetIds: List<String> = emptyList(),
    val myFindings: List<SpyFinding> = emptyList(),
)

@Serializable
data class SpyFinding(val targetId: String, val seenSide: String, val afterChapter: Int)

@Serializable
data class Session(val userId: String, val name: String, val token: String? = null)

@Serializable
data class RoomCreated(val roomId: String, val code: String? = null)

@Serializable
data class GameError(@SerialName("code") val code: String, val message: String)

@Serializable
data class HistoryItem(
    val roomId: String,
    val code: String,
    val winnerSide: String,
    val characterKey: String,
    val side: String,
    val won: Boolean,
    val finishedAt: String,
)
