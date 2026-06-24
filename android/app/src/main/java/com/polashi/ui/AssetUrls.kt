package com.polashi.ui

import com.polashi.BuildConfig

object AssetUrls {
    private fun base(): String = BuildConfig.SERVER_URL.trimEnd('/')

    fun slot(slot: String): String = "${base()}/uploads/$slot"

    fun character(characterKey: String?): String? =
        characterKey?.let { slot("character_$it") }

    fun stamp(side: String): String =
        slot(if (side == "EIC") "stamp_eic" else "stamp_nawab")

    fun gameLogo(): String = slot("game_logo")

    fun captainCard(): String = slot("captain_card")

    fun mission(win: Boolean): String =
        slot(if (win) "mission_success" else "mission_betrayer")

    fun vote(yes: Boolean): String =
        slot(if (yes) "voting_yes" else "voting_no")
}
