// The security boundary. The full GameState (roles + knowledge for ALL players) must never
// leave the server. buildPlayerView() projects state down to exactly what one recipient may
// legally see, based on their own role and the night-reveal knowledge map.

import { CHARACTER_SIDE, type CharacterKey, type GameState, type Side } from './types.js';

export interface PublicPlayer {
  id: string;
  name: string;
  seatIndex: number;
  ready: boolean;
  connected: boolean;
  ackedRole: boolean;
  isShobapoti: boolean;
}

export interface SelfInfo {
  characterKey: CharacterKey;
  side: Side;
  // Players this recipient legally knows something about (from the night reveal).
  reveals: { playerId: string; label: string }[];
}

export interface PublicChapter {
  index: number;
  teamSize: number;
  twoFailRequired: boolean;
  winner: Side | null;
  // Card values are only exposed AFTER the chapter resolves, and even then anonymised
  // (counts only) to avoid leaking who betrayed.
  betrayerCount?: number;
}

export interface PublicProposal {
  shobapotiSeat: number;
  memberIds: string[];
  votedPlayerIds: string[]; // who has voted (not how) while VOTING
  tally?: { yes: number; no: number }; // revealed once voting completes
}

export interface PlayerView {
  roomId: string;
  status: GameState['status'];
  version: number;
  players: PublicPlayer[];
  self: SelfInfo | null; // null in LOBBY before roles dealt
  chapterIndex: number;
  chapters: PublicChapter[];
  wins: Record<Side, number>;
  current: PublicProposal | null;
  failedProposals: number;
  // Only meaningful to Mir Modon during FINAL_GUESS; null otherwise.
  finalGuess: { isMine: boolean; targetId?: string; correct?: boolean } | null;
  winner: Side | null;
  // Revealed to everyone only at GAME_OVER.
  rolesReveal?: Record<string, CharacterKey>;
}

export function buildPlayerView(state: GameState, recipientId: string): PlayerView {
  const isOver = state.status === 'GAME_OVER';
  const shobapotiId = state.players.find((p) => p.seatIndex === state.shobapotiSeat)?.id;

  const players: PublicPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    seatIndex: p.seatIndex,
    ready: p.ready,
    connected: p.connected,
    ackedRole: p.ackedRole,
    isShobapoti: p.id === shobapotiId,
  }));

  const myRole = state.roles[recipientId];
  const self: SelfInfo | null = myRole
    ? {
        characterKey: myRole,
        side: CHARACTER_SIDE[myRole],
        reveals: (state.knowledge[recipientId] ?? []).map((k) => ({
          playerId: k.aboutPlayerId,
          label: k.label,
        })),
      }
    : null;

  const chapters: PublicChapter[] = state.chapters.map((c) => ({
    index: c.index,
    teamSize: c.teamSize,
    twoFailRequired: c.twoFailRequired,
    winner: c.winner,
    ...(c.betrayerCount !== undefined ? { betrayerCount: c.betrayerCount } : {}),
  }));

  let current: PublicProposal | null = null;
  if (state.current) {
    const votedPlayerIds = Object.keys(state.current.votes);
    const everyoneVoted = votedPlayerIds.length === state.players.length;
    current = {
      shobapotiSeat: state.current.shobapotiSeat,
      memberIds: state.current.memberIds,
      votedPlayerIds,
      // Individual votes stay secret; only the aggregate tally is revealed, and only
      // once everyone has voted (or the proposal has already resolved).
      ...(everyoneVoted || state.status !== 'VOTING'
        ? {
            tally: {
              yes: Object.values(state.current.votes).filter((v) => v === 'YES').length,
              no: Object.values(state.current.votes).filter((v) => v === 'NO').length,
            },
          }
        : {}),
    };
  }

  const finalGuess = state.finalGuess
    ? {
        isMine: state.finalGuess.mirModonId === recipientId,
        ...(state.finalGuess.targetId ? { targetId: state.finalGuess.targetId } : {}),
        ...(state.finalGuess.correct !== undefined ? { correct: state.finalGuess.correct } : {}),
      }
    : null;

  return {
    roomId: state.roomId,
    status: state.status,
    version: state.version,
    players,
    self,
    chapterIndex: state.chapterIndex,
    chapters,
    wins: state.wins,
    current,
    failedProposals: state.failedProposals,
    finalGuess,
    winner: state.winner,
    ...(isOver ? { rolesReveal: state.roles } : {}),
  };
}
