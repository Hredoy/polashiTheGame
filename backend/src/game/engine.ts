// The authoritative Polashi state machine. Pure and deterministic:
// reduce(state, action) -> new state, or throws GameError on an illegal action.
// Every rule lives here so the transport/persistence layers can stay dumb.

import {
  CHAPTER_COUNT,
  EIC_WINS_REQUIRED,
  MAX_FAILED_PROPOSALS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NAWAB_WINS_REQUIRED,
  teamSize,
  twoFailRequired,
  validateOptionalCharacters,
} from './config.js';
import { computeKnowledge, dealRoles, type Rng } from './roles.js';
import {
  CHARACTER_SIDE,
  GameError,
  type ChapterState,
  type GameState,
  type MissionCard,
  type PlayerState,
  type RoomSettings,
  type Side,
  type VoteValue,
} from './types.js';

export type Action =
  // Lobby actions
  | { type: 'JOIN'; actorId: string; name: string }
  | { type: 'LEAVE'; actorId: string }
  | { type: 'SET_READY'; actorId: string; ready: boolean }
  | { type: 'SET_CONNECTED'; actorId: string; connected: boolean }
  | { type: 'SET_SETTINGS'; actorId: string; settings: RoomSettings }
  // Game actions
  | { type: 'START_GAME'; actorId: string }
  | { type: 'ACK_ROLE'; actorId: string }
  | { type: 'PROPOSE_TEAM'; actorId: string; memberIds: string[] }
  | { type: 'CAST_VOTE'; actorId: string; value: VoteValue }
  | { type: 'SUBMIT_CARD'; actorId: string; card: MissionCard }
  | { type: 'ADVANCE_CHAPTER'; actorId: string }
  | { type: 'INVESTIGATE'; actorId: string; targetId: string }
  | { type: 'FINAL_GUESS'; actorId: string; targetId: string };

interface ReduceContext {
  rng: Rng;
}

function requireHost(state: GameState, actorId: string) {
  if (actorId !== state.hostId) throw new GameError('NOT_HOST', 'Only the host may do this');
}

// ---------- helpers ----------

const sideOfRole = (state: GameState, playerId: string): Side =>
  CHARACTER_SIDE[state.roles[playerId]!];

function playerBySeat(state: GameState, seat: number): PlayerState {
  const p = state.players.find((x) => x.seatIndex === seat);
  if (!p) throw new GameError('BAD_SEAT', `No player at seat ${seat}`);
  return p;
}

// Rotation is "to the left" per rulebook image 3: next seat clockwise.
function nextSeat(state: GameState, seat: number): number {
  return (seat + 1) % state.players.length;
}

function requirePhase(state: GameState, ...allowed: GameState['status'][]) {
  if (!allowed.includes(state.status)) {
    throw new GameError('WRONG_PHASE', `Action not allowed in phase ${state.status}`);
  }
}

function bump(state: GameState): GameState {
  return { ...state, version: state.version + 1 };
}

// ---------- factory ----------

export function createLobby(
  roomId: string,
  players: PlayerState[],
  settings: RoomSettings,
  hostId?: string,
): GameState {
  return {
    roomId,
    hostId: hostId ?? players[0]?.id ?? '',
    status: 'LOBBY',
    players: [...players].sort((a, b) => a.seatIndex - b.seatIndex),
    settings,
    roles: {},
    knowledge: {},
    shobapotiSeat: 0,
    chapterIndex: 0,
    chapters: [],
    current: null,
    failedProposals: 0,
    wins: { NAWAB: 0, EIC: 0 },
    finalGuess: null,
    spy: null,
    winner: null,
    version: 0,
  };
}

// Create an empty room with the host as the first seated player.
export function createRoom(
  roomId: string,
  hostId: string,
  hostName: string,
  settings: RoomSettings,
): GameState {
  const host: PlayerState = {
    id: hostId,
    name: hostName,
    seatIndex: 0,
    ready: false,
    connected: true,
    ackedRole: false,
  };
  return createLobby(roomId, [host], settings, hostId);
}

// ---------- reducer ----------

export function reduce(state: GameState, action: Action, ctx: ReduceContext): GameState {
  switch (action.type) {
    case 'JOIN':
      return join(state, action.actorId, action.name);
    case 'LEAVE':
      return leave(state, action.actorId);
    case 'SET_READY':
      return setReady(state, action.actorId, action.ready);
    case 'SET_CONNECTED':
      return setConnected(state, action.actorId, action.connected);
    case 'SET_SETTINGS':
      return setSettings(state, action.actorId, action.settings);
    case 'START_GAME':
      return startGame(state, action.actorId, ctx);
    case 'ACK_ROLE':
      return ackRole(state, action.actorId);
    case 'PROPOSE_TEAM':
      return proposeTeam(state, action.actorId, action.memberIds);
    case 'CAST_VOTE':
      return castVote(state, action.actorId, action.value);
    case 'SUBMIT_CARD':
      return submitCard(state, action.actorId, action.card);
    case 'ADVANCE_CHAPTER':
      return advanceChapter(state, action.actorId, ctx);
    case 'INVESTIGATE':
      return investigate(state, action.actorId, action.targetId);
    case 'FINAL_GUESS':
      return finalGuess(state, action.actorId, action.targetId);
  }
}

// Chapters after which the active spy must investigate before the game advances.
const SPY_INVESTIGATION_CHAPTERS = [2, 3];

function spyInvestigationPending(state: GameState): boolean {
  if (!state.spy) return false;
  if (!SPY_INVESTIGATION_CHAPTERS.includes(state.chapterIndex)) return false;
  return !state.spy.investigations.some((i) => i.afterChapter === state.chapterIndex);
}

function investigate(state: GameState, actorId: string, targetId: string): GameState {
  requirePhase(state, 'CHAPTER_RESULT');
  if (!state.spy) throw new GameError('NO_SPY', 'Spy variant is not enabled');
  if (!spyInvestigationPending(state)) {
    throw new GameError('NO_INVESTIGATION', 'No investigation is pending this chapter');
  }
  if (actorId !== state.spy.currentSpyId) {
    throw new GameError('NOT_SPY', 'Only the current spy may investigate');
  }
  if (targetId === actorId) throw new GameError('BAD_TARGET', 'Cannot investigate yourself');
  if (state.spy.pastSpyIds.includes(targetId)) {
    throw new GameError('PREV_SPY', 'Cannot investigate a previous spy');
  }
  if (!state.players.some((p) => p.id === targetId)) {
    throw new GameError('BAD_TARGET', 'Unknown target');
  }
  const seenSide = sideOfRole(state, targetId);
  const spy: typeof state.spy = {
    currentSpyId: targetId,
    pastSpyIds: [...state.spy.pastSpyIds, targetId],
    investigations: [
      ...state.spy.investigations,
      { afterChapter: state.chapterIndex, spyId: actorId, targetId, seenSide },
    ],
  };
  return bump({ ...state, spy });
}

function reindexSeats(players: PlayerState[]): PlayerState[] {
  return [...players]
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .map((p, i) => ({ ...p, seatIndex: i }));
}

function join(state: GameState, actorId: string, name: string): GameState {
  requirePhase(state, 'LOBBY');
  if (state.players.some((p) => p.id === actorId)) {
    // Idempotent re-join (e.g. reopened app): just mark connected.
    return bump({
      ...state,
      players: state.players.map((p) => (p.id === actorId ? { ...p, connected: true } : p)),
    });
  }
  if (state.players.length >= MAX_PLAYERS) throw new GameError('ROOM_FULL', 'Room is full');
  const player: PlayerState = {
    id: actorId,
    name,
    seatIndex: state.players.length,
    ready: false,
    connected: true,
    ackedRole: false,
  };
  return bump({ ...state, players: [...state.players, player] });
}

function leave(state: GameState, actorId: string): GameState {
  if (state.status !== 'LOBBY') {
    // Mid-game: never remove a seat (it would corrupt roles/turn order). Mark disconnected.
    return setConnected(state, actorId, false);
  }
  const remaining = reindexSeats(state.players.filter((p) => p.id !== actorId));
  let hostId = state.hostId;
  if (actorId === hostId) hostId = remaining[0]?.id ?? ''; // reassign host
  return bump({ ...state, players: remaining, hostId });
}

function setReady(state: GameState, actorId: string, ready: boolean): GameState {
  requirePhase(state, 'LOBBY');
  if (!state.players.some((p) => p.id === actorId)) throw new GameError('NOT_PLAYER', 'Not in room');
  return bump({
    ...state,
    players: state.players.map((p) => (p.id === actorId ? { ...p, ready } : p)),
  });
}

function setConnected(state: GameState, actorId: string, connected: boolean): GameState {
  if (!state.players.some((p) => p.id === actorId)) return state; // ignore unknown sockets
  return bump({
    ...state,
    players: state.players.map((p) => (p.id === actorId ? { ...p, connected } : p)),
  });
}

function setSettings(state: GameState, actorId: string, settings: RoomSettings): GameState {
  requirePhase(state, 'LOBBY');
  requireHost(state, actorId);
  const opt = validateOptionalCharacters(settings.optionalCharacters, state.players.length);
  if (!opt.ok) throw new GameError('BAD_SETTINGS', opt.reason);
  return bump({ ...state, settings });
}

function startGame(state: GameState, actorId: string, ctx: ReduceContext): GameState {
  requirePhase(state, 'LOBBY');
  requireHost(state, actorId);
  const n = state.players.length;
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) {
    throw new GameError('BAD_PLAYER_COUNT', `Need ${MIN_PLAYERS}-${MAX_PLAYERS} players, have ${n}`);
  }
  if (!state.players.every((p) => p.ready)) {
    throw new GameError('NOT_ALL_READY', 'All players must be ready');
  }
  const opt = validateOptionalCharacters(state.settings.optionalCharacters, n);
  if (!opt.ok) throw new GameError('BAD_SETTINGS', opt.reason);

  const roles = dealRoles(state.players, state.settings, ctx.rng);
  const knowledge = computeKnowledge(roles);
  const shobapotiSeat = Math.floor(ctx.rng() * n);

  // Spy variant: the player to the RIGHT of the first Shobapoti starts as the spy.
  let spy: GameState['spy'] = null;
  if (state.settings.spyVariant) {
    const rightSeat = (shobapotiSeat - 1 + n) % n;
    const firstSpyId = playerBySeat(state, rightSeat).id;
    spy = { currentSpyId: firstSpyId, pastSpyIds: [firstSpyId], investigations: [] };
  }

  return bump({
    ...state,
    status: 'ROLE_REVEAL',
    roles,
    knowledge,
    shobapotiSeat,
    spy,
    players: state.players.map((p) => ({ ...p, ackedRole: false })),
  });
}

function ackRole(state: GameState, actorId: string): GameState {
  requirePhase(state, 'ROLE_REVEAL');
  const players = state.players.map((p) => (p.id === actorId ? { ...p, ackedRole: true } : p));
  const allAcked = players.every((p) => p.ackedRole);
  const next: GameState = { ...state, players };
  return allAcked ? bump(beginChapter(next, 1)) : bump(next);
}

function beginChapter(state: GameState, index: number): GameState {
  const n = state.players.length;
  const chapter: ChapterState = {
    index,
    teamSize: teamSize(index, n),
    twoFailRequired: twoFailRequired(index, n),
    winner: null,
  };
  return {
    ...state,
    status: 'TEAM_PROPOSAL',
    chapterIndex: index,
    chapters: [...state.chapters.filter((c) => c.index !== index), chapter],
    current: null,
    failedProposals: 0,
  };
}

function currentChapter(state: GameState): ChapterState {
  const c = state.chapters.find((x) => x.index === state.chapterIndex);
  if (!c) throw new GameError('NO_CHAPTER', 'No active chapter');
  return c;
}

function proposeTeam(state: GameState, actorId: string, memberIds: string[]): GameState {
  requirePhase(state, 'TEAM_PROPOSAL');
  const shobapoti = playerBySeat(state, state.shobapotiSeat);
  if (actorId !== shobapoti.id) throw new GameError('NOT_SHOBAPOTI', 'Only the Shobapoti proposes');

  const chapter = currentChapter(state);
  const unique = new Set(memberIds);
  if (unique.size !== memberIds.length) throw new GameError('DUP_MEMBER', 'Duplicate team member');
  if (memberIds.length !== chapter.teamSize) {
    throw new GameError('BAD_TEAM_SIZE', `Team must have exactly ${chapter.teamSize} members`);
  }
  const valid = new Set(state.players.map((p) => p.id));
  for (const id of memberIds) {
    if (!valid.has(id)) throw new GameError('BAD_MEMBER', `Unknown player ${id}`);
  }

  return bump({
    ...state,
    status: 'VOTING',
    current: { shobapotiSeat: state.shobapotiSeat, memberIds: [...memberIds], votes: {} },
  });
}

function castVote(state: GameState, actorId: string, value: VoteValue): GameState {
  requirePhase(state, 'VOTING');
  if (!state.current) throw new GameError('NO_PROPOSAL', 'No proposal to vote on');
  if (!state.players.some((p) => p.id === actorId)) {
    throw new GameError('NOT_PLAYER', 'Voter is not in this room');
  }
  if (state.current.votes[actorId]) throw new GameError('DUP_VOTE', 'Player already voted');

  const votes = { ...state.current.votes, [actorId]: value };
  const next: GameState = { ...state, current: { ...state.current, votes } };

  if (Object.keys(votes).length < state.players.length) return bump(next); // still collecting

  // Tally: tie OR No-majority both count as FAIL (rulebook image 3).
  const yes = Object.values(votes).filter((v) => v === 'YES').length;
  const no = state.players.length - yes;
  return bump(yes > no ? toMission(next) : failProposal(next));
}

function toMission(state: GameState): GameState {
  return { ...state, status: 'MISSION' };
}

function failProposal(state: GameState): GameState {
  const failed = state.failedProposals + 1;
  if (failed >= MAX_FAILED_PROPOSALS) {
    // 5 consecutive failures -> EIC wins this chapter.
    return resolveChapter(state, 'EIC', { failedByProposals: true });
  }
  return {
    ...state,
    status: 'TEAM_PROPOSAL',
    current: null,
    failedProposals: failed,
    shobapotiSeat: nextSeat(state, state.shobapotiSeat),
  };
}

function submitCard(state: GameState, actorId: string, card: MissionCard): GameState {
  requirePhase(state, 'MISSION');
  if (!state.current) throw new GameError('NO_PROPOSAL', 'No active mission');
  if (!state.current.memberIds.includes(actorId)) {
    throw new GameError('NOT_TEAM_MEMBER', 'Only selected team members submit a card');
  }
  // Nawab loyalists can never sabotage.
  if (card === 'BETRAYER' && sideOfRole(state, actorId) === 'NAWAB') {
    throw new GameError('NAWAB_NO_BETRAYER', 'Nawab players must play Success');
  }
  const chapter = currentChapter(state);
  const cards = { ...(chapter.cards ?? {}) };
  if (cards[actorId]) throw new GameError('DUP_CARD', 'Card already submitted');
  cards[actorId] = card;

  const updated: ChapterState = { ...chapter, cards };
  let next: GameState = {
    ...state,
    chapters: state.chapters.map((c) => (c.index === chapter.index ? updated : c)),
  };

  if (Object.keys(cards).length < state.current.memberIds.length) return bump(next); // still collecting

  // Resolve mission.
  const betrayers = Object.values(cards).filter((c) => c === 'BETRAYER').length;
  const threshold = chapter.twoFailRequired ? 2 : 1;
  const eicWins = betrayers >= threshold;
  next = { ...next, chapters: next.chapters.map((c) => (c.index === chapter.index ? { ...c, betrayerCount: betrayers } : c)) };
  return resolveChapter(next, eicWins ? 'EIC' : 'NAWAB', { betrayerCount: betrayers });
}

function resolveChapter(
  state: GameState,
  winner: Side,
  extra: Partial<ChapterState>,
): GameState {
  const chapter = currentChapter(state);
  const resolved: ChapterState = { ...chapter, winner, ...extra };
  const wins: Record<Side, number> = { ...state.wins, [winner]: state.wins[winner] + 1 };
  return {
    ...state,
    status: 'CHAPTER_RESULT',
    chapters: state.chapters.map((c) => (c.index === chapter.index ? resolved : c)),
    wins,
    current: null,
  };
}

function advanceChapter(state: GameState, actorId: string, _ctx: ReduceContext): GameState {
  requirePhase(state, 'CHAPTER_RESULT');
  requireHost(state, actorId);

  // Spy variant: the active spy must investigate after chapters 2 and 3 before advancing.
  if (spyInvestigationPending(state)) {
    throw new GameError('SPY_PENDING', 'The spy must investigate before advancing');
  }

  // Game-ending checks (brief rules): EIC wins at 3, Nawab wins outright at 4. If all five
  // chapters are played without either threshold met (a 3-2 Nawab lead), Mir Modon gets the
  // final guess to decide it.
  if (state.wins.EIC >= EIC_WINS_REQUIRED) {
    return bump({ ...state, status: 'GAME_OVER', winner: 'EIC' });
  }
  if (state.wins.NAWAB >= NAWAB_WINS_REQUIRED) {
    return bump({ ...state, status: 'GAME_OVER', winner: 'NAWAB' });
  }
  if (state.chapterIndex >= CHAPTER_COUNT) {
    // Nawab leads 3-2 after all chapters -> Mir Modon must finger Mir Zafar.
    const mirModonId = Object.keys(state.roles).find((id) => state.roles[id] === 'MIR_MODON')!;
    return bump({ ...state, status: 'FINAL_GUESS', finalGuess: { mirModonId } });
  }
  // Next chapter; Shobapoti passes to the left.
  const advanced = beginChapter(state, state.chapterIndex + 1);
  return bump({ ...advanced, shobapotiSeat: nextSeat(state, state.shobapotiSeat) });
}

function finalGuess(state: GameState, actorId: string, targetId: string): GameState {
  requirePhase(state, 'FINAL_GUESS');
  if (!state.finalGuess || actorId !== state.finalGuess.mirModonId) {
    throw new GameError('NOT_MIR_MODON', 'Only Mir Modon makes the final guess');
  }
  if (!state.players.some((p) => p.id === targetId)) {
    throw new GameError('BAD_TARGET', 'Unknown target');
  }
  const correct = state.roles[targetId] === 'MIR_ZAFAR';
  return bump({
    ...state,
    status: 'GAME_OVER',
    finalGuess: { ...state.finalGuess, targetId, correct },
    winner: correct ? 'NAWAB' : 'EIC',
  });
}
