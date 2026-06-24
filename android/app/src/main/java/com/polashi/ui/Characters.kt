package com.polashi.ui

import androidx.compose.ui.graphics.Color
import com.polashi.ui.theme.EicRed
import com.polashi.ui.theme.NawabGreen

/**
 * Display metadata for character keys and sides. The server only sends logical keys; the
 * client maps them to names/art. (Art URLs will later come from the asset catalogue — see
 * docs/ADMIN_PLAN.md. For now we use Bengali display names and the team palette.)
 */
object Characters {
    private val names = mapOf(
        "SIRAJ" to "নবাব সিরাজউদ্দৌলা",
        "MIR_MODON" to "মীর মদন",
        "NAWAB" to "নবাব সৈনিক",
        "MOHAN_LAL" to "মোহন লাল",
        "SAINT_FRAIS" to "সেন্ট ফ্রে",
        "DEBUSI" to "দেবুসি",
        "LUTFUNNESSA" to "লুৎফুন্নেসা বেগম",
        "MIR_ZAFAR" to "মীর জাফর",
        "GHASETI_BEGUM" to "ঘসেটি বেগম",
        "EIC" to "ইস্ট ইন্ডিয়া এজেন্ট",
        "RAI_DURLABH" to "রায় দুর্লভ",
        "UMICHAND" to "উমিচাঁদ",
    )

    fun name(key: String?): String = key?.let { names[it] ?: it } ?: "?"

    fun sideLabel(side: String?): String = when (side) {
        "NAWAB" -> "নবাব পক্ষ"
        "EIC" -> "EIC পক্ষ"
        else -> ""
    }

    fun sideColor(side: String?): Color = when (side) {
        "NAWAB" -> NawabGreen
        "EIC" -> EicRed
        else -> Color.Gray
    }

    fun power(key: String?): String? = when (key) {
        "MIR_MODON" -> "You see the EIC traitors. Stay hidden — and unmask Mir Zafar."
        "MIR_ZAFAR" -> "The arch-traitor. Don't get caught."
        "MOHAN_LAL" -> "You know who Mir Modon is. Protect them."
        "RAI_DURLABH" -> "You are hidden from Mir Modon."
        "UMICHAND" -> "You don't know your fellow EIC agents."
        "GHASETI_BEGUM" -> "You appear as Mir Modon to Mohan Lal."
        else -> null
    }
}
