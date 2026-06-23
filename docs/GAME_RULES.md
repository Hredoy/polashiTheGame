# Polashi — Canonical Game Rules (GDD)

Transcribed from the Bangla rulebook images in `instruction/`. This is the authoritative
rules reference; the engine (`backend/src/game/`) implements exactly this.

## 1. Overview

Hidden-role mission game (Avalon/Resistance family), themed on the 1757 Battle of Plassey.
**5–10 players**, two hidden factions over **5 chapters** (missions):

- **Nawab পক্ষ** (green): loyalists. Want missions to succeed.
- **EIC পক্ষ** (red): East India Company traitors. Want missions to fail.

## 2. Team distribution (includes signature roles)

| Players | Nawab (incl. Mir Modon) | EIC (incl. Mir Zafar) |
|--:|:--|:--|
| 5 | 3 (2 + Mir Modon) | 2 (1 + Mir Zafar) |
| 6 | 4 (3 + Mir Modon) | 2 (1 + Mir Zafar) |
| 7 | 4 (3 + Mir Modon) | 3 (2 + Mir Zafar) |
| 8 | 5 (4 + Mir Modon) | 3 (2 + Mir Zafar) |
| 9 | 6 (5 + Mir Modon) | 3 (2 + Mir Zafar) |
| 10 | 6 (5 + Mir Modon) | 4 (3 + Mir Zafar) |

## 3. Mission team size per chapter (rulebook chart)

| Chapter | 5 | 6 | 7 | 8 | 9 | 10 |
|--:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | 2 | 2 | 2 | 3 | 3 | 3 |
| 2 | 3 | 3 | 3 | 4 | 4 | 4 |
| 3 | 2 | 4 | 3 | 4 | 4 | 4 |
| 4 | 3 | 3 | 4\* | 5\* | 5\* | 5\* |
| 5 | 3 | 4 | 4 | 5 | 5 | 5 |

**\*** = "two-fail" chapter: EIC needs **≥2 Betrayer** cards to win (Ch4 at 7+ players).

## 4. Roles

**Signature (always present):**
- **Mir Modon** (Nawab) — at night sees all EIC players; must finger Mir Zafar to clinch a
  Nawab win.
- **Mir Zafar** (EIC) — the traitor Mir Modon hunts.
- Plain **Nawab** / **EIC** fill the rest.

**Optional characters (room toggle; shift balance):**
| Character | Side | Power |
|---|---|---|
| Mohan Lal | Nawab | Learns who Mir Modon is. |
| Rai Durlabh | EIC | Hidden from Mir Modon. |
| Umichand | EIC | Isolated — sees no EIC, seen by no EIC (but Mir Modon still sees him). |
| Ghaseti Begum | EIC | Appears as Mir Modon to Mohan Lal (decoy). |

**Night-reveal script** (rulebook image 7, implemented in `roles.ts:computeKnowledge`):
1. EIC except Umichand see each other.
2. EIC except Rai Durlabh raise thumb → Mir Modon sees them.
3. Mir Modon + Ghaseti Begum raise thumb → Mohan Lal sees them.

## 5. Chapter flow

1. **Team proposal** — current Shobapoti (leader) picks exactly the required number of
   members (may include self).
2. **Yes/No vote** — everyone votes secretly; revealed together.
   - Yes > No → mission. Tie or No-majority → **fail**: leader passes **left**, fail count++.
   - **5 consecutive failed proposals in one chapter → EIC wins that chapter.**
3. **Mission** — selected members submit a card. Nawab **must** play Success; EIC may play
   Success or Betrayer. Any Betrayer → EIC wins the chapter (two-fail chapters need ≥2).
4. **Result** — chapter awarded; leader passes left for the next chapter.

## 6. Win conditions

- First faction to **3 chapter wins** ends the chapter loop.
- EIC reaching 3 (or 5 failed proposals in a chapter) → **EIC wins**.
- Nawab reaching 3 → **Mir Modon final guess**: names a player as Mir Zafar.
  - Correct → Nawab wins. Wrong → EIC wins.

## 7. Spy variant (গুপ্তচর, optional, best at 7+ players)

- Player to the **right** of the first Shobapoti starts as spy.
- After chapters **2 and 3**, the active spy investigates one player and learns their true
  side; that player becomes the next spy.
- **3 spies total**, once each; a spy cannot investigate a previous spy. Spies may lie.
- Chapter advance is blocked until the pending investigation is made.

## 8. Discrepancies (brief vs rulebook — implemented per rulebook)

| # | Topic | Brief | Rulebook (used) |
|--|--|--|--|
| 1 | Win threshold | Nawab needs 4 | First to 3 + Mir Modon guess |
| 2 | Leader rotation | right | left |
| 3 | Tie vote | — | counts as fail |
| 4 | Timeout default | — | auto NO-vote / SUCCESS-card (TODO confirm) |

## 9. Components (from images, for the admin asset catalogue)

Character cards; Success (green flag) / Betrayer (red flag) mission cards; Yes (blue
scroll) / No (red map) vote tokens; crossed-swords team tokens; Shobapoti marker;
double-sided chapter-map cards (green=Nawab / red=EIC win); Loyalty cards (Spy variant).
