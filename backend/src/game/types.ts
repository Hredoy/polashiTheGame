// Core domain types for the Polashi game engine.
// The engine is a pure, deterministic reducer over GameState — no I/O, no DB, no sockets.
// Persistence (Postgres) and transport (Socket.IO) wrap this layer.

export type Side = 'NAWAB' | 'EIC';

export type Phase =
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'TEAM_PROPOSAL'
  | 'VOTING'
  | 'MISSION'
  | 'CHAPTER_RESULT'
  | 'FINAL_GUESS'
  | 'GAME_OVER';

// Mandatory roles are always present (Nawab: Siraj + Mir Modon; EIC: Mir Zafar + Ghaseti).
// Optional characters are room-configurable add-ons. New roles (Siraj, Saint Frais, Debusi,
// Lutfunnessa) are themed names for plain members — no special power.
export type CharacterKey =
  | 'SIRAJ' // Nawab — Siraj-ud-Daulah, the Nawab (mandatory, no power)
  | 'MIR_MODON' // Nawab — sees EIC at night; must finger Mir Zafar to clinch a Nawab win (mandatory)
  | 'NAWAB' // plain Nawab loyalist
  | 'MOHAN_LAL' // Nawab — learns who Mir Modon is (optional)
  | 'SAINT_FRAIS' // Nawab — themed name, no power (optional)
  | 'DEBUSI' // Nawab — themed name, no power (optional)
  | 'LUTFUNNESSA' // Nawab — Lutfunnessa Begum, themed name, no power (optional)
  | 'MIR_ZAFAR' // EIC — the traitor Mir Modon hunts (mandatory)
  | 'GHASETI_BEGUM' // EIC — appears as Mir Modon to Mohan Lal (mandatory)
  | 'EIC' // plain EIC agent
  | 'RAI_DURLABH' // EIC — hidden from Mir Modon (optional)
  | 'UMICHAND'; // EIC — isolated; sees no EIC and is seen by no EIC (optional)

// Always dealt, one each, on their side.
export const MANDATORY_NAWAB: CharacterKey[] = ['SIRAJ', 'MIR_MODON'];
export const MANDATORY_EIC: CharacterKey[] = ['MIR_ZAFAR', 'GHASETI_BEGUM'];

export const OPTIONAL_CHARACTERS: CharacterKey[] = [
  'MOHAN_LAL',
  'SAINT_FRAIS',
  'DEBUSI',
  'LUTFUNNESSA',
  'RAI_DURLABH',
  'UMICHAND',
];

export const CHARACTER_SIDE: Record<CharacterKey, Side> = {
  SIRAJ: 'NAWAB',
  MIR_MODON: 'NAWAB',
  NAWAB: 'NAWAB',
  MOHAN_LAL: 'NAWAB',
  SAINT_FRAIS: 'NAWAB',
  DEBUSI: 'NAWAB',
  LUTFUNNESSA: 'NAWAB',
  MIR_ZAFAR: 'EIC',
  GHASETI_BEGUM: 'EIC',
  EIC: 'EIC',
  RAI_DURLABH: 'EIC',
  UMICHAND: 'EIC',
};

export type MissionCard = 'SUCCESS' | 'BETRAYER';
export type VoteValue = 'YES' | 'NO';

export interface PlayerState {
  id: string;
  name: string;
  seatIndex: number; // fixed turn order around the table
  ready: boolean;
  connected: boolean;
  ackedRole: boolean;
  isBot?: boolean; // auto-filled bot driven server-side; absent/false = human
}

export interface RoomSettings {
  optionalCharacters: CharacterKey[]; // subset of OPTIONAL_CHARACTERS, validated against side balance
  spyVariant: boolean; // TODO: implemented after core game
}

// What a single player is legally allowed to know after the night reveal.
export interface KnowledgeEntry {
  aboutPlayerId: string;
  label: 'EIC' | 'EIC_ALLY' | 'MIR_MODON_CANDIDATE';
}

export interface ProposalState {
  shobapotiSeat: number;
  memberIds: string[];
  votes: Record<string, VoteValue>; // playerId -> vote (server-private until reveal)
}

export interface ChapterState {
  index: number; // 1..5
  teamSize: number;
  twoFailRequired: boolean;
  winner: Side | null;
  // populated once resolved:
  cards?: Record<string, MissionCard>; // playerId -> card
  betrayerCount?: number;
  failedByProposals?: boolean; // chapter lost by 5 failed proposals
}

export interface FinalGuessState {
  mirModonId: string;
  targetId?: string;
  correct?: boolean;
}

// Spy (গুপ্তচর) variant. The active spy investigates one player's true allegiance after
// chapters 2 and 3; the investigated player becomes the next spy. Three spies total.
export interface SpyInvestigation {
  afterChapter: number; // 2 or 3
  spyId: string;
  targetId: string;
  seenSide: Side; // private to the spy
}

export interface SpyState {
  currentSpyId: string;
  pastSpyIds: string[]; // everyone who has held the spy role (cannot be investigated)
  investigations: SpyInvestigation[];
}

export interface GameState {
  roomId: string;
  hostId: string; // player id of the room host (creator); may reassign if host leaves in lobby
  status: Phase;
  players: PlayerState[]; // ordered by seatIndex
  settings: RoomSettings;

  // SECRET — never serialized to clients wholesale. Filtered per-recipient.
  roles: Record<string, CharacterKey>;
  knowledge: Record<string, KnowledgeEntry[]>;

  shobapotiSeat: number;
  chapterIndex: number; // 1..5; 0 before game start
  chapters: ChapterState[];
  current: ProposalState | null;
  failedProposals: number; // consecutive failures in current chapter (0..5)
  wins: Record<Side, number>;
  finalGuess: FinalGuessState | null;
  spy: SpyState | null; // non-null only when settings.spyVariant is enabled
  botSuggested: boolean; // lobby: nobody joined within the timeout — prompt the host re: bots
  winner: Side | null;

  version: number; // optimistic-lock / event ordering
}

export class GameError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'GameError';
  }
}
