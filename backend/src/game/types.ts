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

// Signature roles always present; optional characters are room-configurable add-ons.
export type CharacterKey =
  | 'MIR_MODON' // Nawab — sees EIC at night; must finger Mir Zafar to clinch a Nawab win
  | 'MIR_ZAFAR' // EIC — the traitor Mir Modon hunts
  | 'NAWAB' // plain Nawab loyalist
  | 'EIC' // plain EIC agent
  | 'MOHAN_LAL' // Nawab — learns who Mir Modon is
  | 'RAI_DURLABH' // EIC — hidden from Mir Modon
  | 'UMICHAND' // EIC — isolated; sees no EIC and is seen by no EIC
  | 'GHASETI_BEGUM'; // EIC — appears as Mir Modon to Mohan Lal

export const OPTIONAL_CHARACTERS: CharacterKey[] = [
  'MOHAN_LAL',
  'RAI_DURLABH',
  'UMICHAND',
  'GHASETI_BEGUM',
];

export const CHARACTER_SIDE: Record<CharacterKey, Side> = {
  MIR_MODON: 'NAWAB',
  NAWAB: 'NAWAB',
  MOHAN_LAL: 'NAWAB',
  MIR_ZAFAR: 'EIC',
  EIC: 'EIC',
  RAI_DURLABH: 'EIC',
  UMICHAND: 'EIC',
  GHASETI_BEGUM: 'EIC',
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
