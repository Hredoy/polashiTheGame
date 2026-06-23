// Rule tables transcribed from the Bangla rulebook charts (images 4 & 5).
// All indices are explicit so they are easy to audit against the printed book.

import type { CharacterKey, Side } from './types.js';

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;
export const CHAPTER_COUNT = 5;
export const WINS_REQUIRED = 3; // first faction to 3 chapter wins (rulebook image 2)
export const MAX_FAILED_PROPOSALS = 5; // 5 consecutive failed proposals -> EIC wins the chapter

// Faction sizes INCLUDING the signature roles (Mir Modon for Nawab, Mir Zafar for EIC).
// Source: image 5 chart, cross-checked to sum to playerCount.
export const TEAM_DISTRIBUTION: Record<number, Record<Side, number>> = {
  5: { NAWAB: 3, EIC: 2 },
  6: { NAWAB: 4, EIC: 2 },
  7: { NAWAB: 4, EIC: 3 },
  8: { NAWAB: 5, EIC: 3 },
  9: { NAWAB: 6, EIC: 3 },
  10: { NAWAB: 6, EIC: 4 },
};

// Mission team size by [chapterIndex 1..5][playerCount 5..10]. Source: image 4 chart.
export const TEAM_SIZE: Record<number, Record<number, number>> = {
  1: { 5: 2, 6: 2, 7: 2, 8: 3, 9: 3, 10: 3 },
  2: { 5: 3, 6: 3, 7: 3, 8: 4, 9: 4, 10: 4 },
  3: { 5: 2, 6: 4, 7: 3, 8: 4, 9: 4, 10: 4 },
  4: { 5: 3, 6: 3, 7: 4, 8: 5, 9: 5, 10: 5 },
  5: { 5: 3, 6: 4, 7: 4, 8: 5, 9: 5, 10: 5 },
};

// Chapters needing >=2 Betrayer cards for an EIC win (the "*" rows: Ch4 at 7+ players).
export function twoFailRequired(chapterIndex: number, playerCount: number): boolean {
  return chapterIndex === 4 && playerCount >= 7;
}

export function teamSize(chapterIndex: number, playerCount: number): number {
  const row = TEAM_SIZE[chapterIndex];
  const size = row?.[playerCount];
  if (size === undefined) {
    throw new Error(`No team size for chapter ${chapterIndex}, ${playerCount} players`);
  }
  return size;
}

export function distribution(playerCount: number): Record<Side, number> {
  const d = TEAM_DISTRIBUTION[playerCount];
  if (!d) throw new Error(`Unsupported player count: ${playerCount}`);
  return d;
}

// Validate an optional-character selection against the faction sizes for this player count.
// Each optional character occupies one slot on its own side and cannot exceed that side's
// non-signature capacity (side size minus the mandatory signature role).
export function validateOptionalCharacters(
  optional: CharacterKey[],
  playerCount: number,
): { ok: true } | { ok: false; reason: string } {
  const { NAWAB, EIC } = distribution(playerCount);
  const sideOf: Record<CharacterKey, Side> = {
    MIR_MODON: 'NAWAB', NAWAB: 'NAWAB', MOHAN_LAL: 'NAWAB',
    MIR_ZAFAR: 'EIC', EIC: 'EIC', RAI_DURLABH: 'EIC', UMICHAND: 'EIC', GHASETI_BEGUM: 'EIC',
  };
  const nawabSlots = NAWAB - 1; // minus Mir Modon
  const eicSlots = EIC - 1; // minus Mir Zafar
  let nawabUsed = 0;
  let eicUsed = 0;
  const seen = new Set<CharacterKey>();
  for (const c of optional) {
    if (seen.has(c)) return { ok: false, reason: `duplicate optional character ${c}` };
    seen.add(c);
    if (sideOf[c] === 'NAWAB') nawabUsed++;
    else eicUsed++;
  }
  if (nawabUsed > nawabSlots) return { ok: false, reason: 'too many Nawab optional characters' };
  if (eicUsed > eicSlots) return { ok: false, reason: 'too many EIC optional characters' };
  return { ok: true };
}
