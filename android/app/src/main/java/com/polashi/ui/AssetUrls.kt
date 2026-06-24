package com.polashi.ui

import com.polashi.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.net.HttpURLConnection
import java.net.URL

@Serializable
private data class CatalogResponse(val versions: Map<String, Long?> = emptyMap())

/**
 * Holds the asset version per slot (file mtime from the backend). Versions turn image URLs
 * into `?v=<mtime>` — so a new admin upload changes the URL and refetches immediately, while
 * unchanged images stay served from the week-long disk cache (see PolashiApp's ImageLoader).
 * Refreshed cheaply (small JSON) on each connect; the images themselves are not re-downloaded
 * unless their version changed.
 */
object AssetCatalog {
    @Volatile
    private var versions: Map<String, Long> = emptyMap()

    fun versionOf(slot: String): Long? = versions[slot]

    suspend fun refresh() = withContext(Dispatchers.IO) {
        try {
            val url = URL(AssetUrls.base() + "/assets/catalog")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 5000
                readTimeout = 5000
            }
            val text = conn.inputStream.bufferedReader().use { it.readText() }
            val parsed = Json { ignoreUnknownKeys = true }.decodeFromString<CatalogResponse>(text)
            versions = parsed.versions.filterValues { it != null }.mapValues { it.value!! }
        } catch (_: Exception) {
            // Offline / server down — keep whatever versions we already have (cached images
            // still render). No crash; text fallbacks cover any missing slots.
        }
    }
}

object AssetUrls {
    fun base(): String = BuildConfig.SERVER_URL.trimEnd('/')

    /** Versioned URL for a slot, e.g. .../uploads/game_logo?v=1719250000123. */
    fun slot(slot: String): String {
        val v = AssetCatalog.versionOf(slot)
        return base() + "/uploads/" + slot + if (v != null) "?v=$v" else ""
    }

    fun character(characterKey: String?): String? =
        characterKey?.let { slot("character_$it") }

    fun stamp(side: String): String = slot(if (side == "EIC") "stamp_eic" else "stamp_nawab")

    fun gameLogo(): String = slot("game_logo")

    fun captainCard(): String = slot("captain_card")

    fun mission(win: Boolean): String = slot(if (win) "mission_success" else "mission_betrayer")

    fun vote(yes: Boolean): String = slot(if (yes) "voting_yes" else "voting_no")
}
