// Role dealing and the night-reveal knowledge map.
// Pure functions: given players + settings + an RNG, produce the secret role map and the
// per-player knowledge that the night phase legally grants.

import { distribution } from './config.js';
import {
  CHARACTER_SIDE,
  type CharacterKey,
  type KnowledgeEntry,
  type PlayerState,
  type RoomSettings,
} from './types.js';

export type Rng = () => number; // returns [0,1)

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// Build the full deck of character keys for a game, honouring optional characters.
export function buildDeck(playerCount: number, settings: RoomSettings): CharacterKey[] {
  const { NAWAB, EIC } = distribution(playerCount);
  const optional = new Set(settings.optionalCharacters);

  const deck: CharacterKey[] = [];

  // Nawab side: Mir Modon + optional Nawab characters + plain Nawab to fill.
  deck.push('MIR_MODON');
  if (optional.has('MOHAN_LAL')) deck.push('MOHAN_LAL');
  while (deck.filter((c) => CHARACTER_SIDE[c] === 'NAWAB').length < NAWAB) deck.push('NAWAB');

  // EIC side: Mir Zafar + optional EIC characters + plain EIC to fill.
  deck.push('MIR_ZAFAR');
  for (const c of ['RAI_DURLABH', 'UMICHAND', 'GHASETI_BEGUM'] as CharacterKey[]) {
    if (optional.has(c)) deck.push(c);
  }
  while (deck.filter((c) => CHARACTER_SIDE[c] === 'EIC').length < EIC) deck.push('EIC');

  if (deck.length !== playerCount) {
    throw new Error(`Deck size ${deck.length} != player count ${playerCount}`);
  }
  return deck;
}

// Assign shuffled deck to players by seat. Returns playerId -> CharacterKey.
export function dealRoles(
  players: PlayerState[],
  settings: RoomSettings,
  rng: Rng,
): Record<string, CharacterKey> {
  const deck = shuffle(buildDeck(players.length, settings), rng);
  const roles: Record<string, CharacterKey> = {};
  players.forEach((p, i) => {
    roles[p.id] = deck[i]!;
  });
  return roles;
}

// Compute what each player legally knows after the night reveal.
// Encodes the optional-character exceptions from rulebook image 1.
export function computeKnowledge(
  roles: Record<string, CharacterKey>,
): Record<string, KnowledgeEntry[]> {
  const ids = Object.keys(roles);
  const byKey = (k: CharacterKey) => ids.filter((id) => roles[id] === k);
  const eicIds = ids.filter((id) => CHARACTER_SIDE[roles[id]!] === 'EIC');

  const knowledge: Record<string, KnowledgeEntry[]> = {};
  for (const id of ids) knowledge[id] = [];

  // 1) Mir Modon sees all EIC EXCEPT Rai Durlabh (hidden). Umichand is still seen.
  const mirModon = byKey('MIR_MODON')[0];
  if (mirModon) {
    for (const id of eicIds) {
      if (roles[id] === 'RAI_DURLABH') continue;
      knowledge[mirModon]!.push({ aboutPlayerId: id, label: 'EIC' });
    }
  }

  // 2) EIC players see their EIC allies, EXCEPT Umichand (isolated both directions).
  const eicVisible = eicIds.filter((id) => roles[id] !== 'UMICHAND');
  for (const viewer of eicIds) {
    if (roles[viewer] === 'UMICHAND') continue; // Umichand sees no one
    for (const ally of eicVisible) {
      if (ally === viewer) continue;
      knowledge[viewer]!.push({ aboutPlayerId: ally, label: 'EIC_ALLY' });
    }
  }

  // 3) Mohan Lal sees Mir Modon AND Ghaseti Begum (cannot tell which is the real one).
  const mohanLal = byKey('MOHAN_LAL')[0];
  if (mohanLal) {
    for (const id of [...byKey('MIR_MODON'), ...byKey('GHASETI_BEGUM')]) {
      knowledge[mohanLal]!.push({ aboutPlayerId: id, label: 'MIR_MODON_CANDIDATE' });
    }
  }

  return knowledge;
}
