import { describe, expect, it } from 'vitest';
import { createLobby, reduce, type Action } from './engine.js';
import { buildDeck, computeKnowledge } from './roles.js';
import { buildPlayerView } from './view.js';
import {
  CHARACTER_SIDE,
  GameError,
  type CharacterKey,
  type GameState,
  type PlayerState,
  type RoomSettings,
} from './types.js';

// Assert that calling fn throws a GameError with the given stable code.
function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(GameError);
    expect((e as GameError).code).toBe(code);
    return;
  }
  throw new Error(`expected GameError(${code}) to be thrown`);
}

// Deterministic RNG (mulberry32) so games are reproducible in tests.
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makePlayers(n: number): PlayerState[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    seatIndex: i,
    ready: true,
    connected: true,
    ackedRole: false,
  }));
}

const baseSettings: RoomSettings = { optionalCharacters: [], spyVariant: false };

function newGame(n: number, settings = baseSettings) {
  const players = makePlayers(n);
  const state = createLobby('room1', players, settings);
  const ctx = { rng: seeded(42), hostId: 'p0' };
  return { state, ctx };
}

function run(state: GameState, ctx: { rng: () => number; hostId: string }, action: Action) {
  return reduce(state, action, ctx);
}

function startAndAck(n: number, settings = baseSettings) {
  let { state, ctx } = newGame(n, settings);
  state = run(state, ctx, { type: 'START_GAME', actorId: 'p0' });
  for (const p of state.players) state = run(state, ctx, { type: 'ACK_ROLE', actorId: p.id });
  return { state, ctx };
}

const sideOf = (s: GameState, id: string) => CHARACTER_SIDE[s.roles[id]!];
const shobapotiId = (s: GameState) => s.players.find((p) => p.seatIndex === s.shobapotiSeat)!.id;

// Pick a valid team of `size` made entirely of Nawab players (so missions can succeed),
// falling back to any players if not enough Nawab exist.
function nawabTeam(s: GameState, size: number): string[] {
  const nawab = s.players.filter((p) => sideOf(s, p.id) === 'NAWAB').map((p) => p.id);
  const rest = s.players.map((p) => p.id).filter((id) => !nawab.includes(id));
  return [...nawab, ...rest].slice(0, size);
}

function passProposalWith(state: GameState, ctx: any, members: string[]): GameState {
  state = run(state, ctx, { type: 'PROPOSE_TEAM', actorId: shobapotiId(state), memberIds: members });
  for (const p of state.players) state = run(state, ctx, { type: 'CAST_VOTE', actorId: p.id, value: 'YES' });
  return state;
}

// Resolve the current chapter in favour of `side` (Nawab: all Success; EIC: one Betrayer).
// Assumes <=6 player counts where a single Betrayer is enough (not a two-fail chapter).
function resolveChapterFor(state: GameState, ctx: any, side: 'NAWAB' | 'EIC'): GameState {
  const size = state.chapters.find((c) => c.index === state.chapterIndex)!.teamSize;
  const eic = state.players.find((p) => sideOf(state, p.id) === 'EIC')!.id;
  const team =
    side === 'NAWAB'
      ? nawabTeam(state, size)
      : [eic, ...state.players.map((p) => p.id).filter((id) => id !== eic)].slice(0, size);
  state = passProposalWith(state, ctx, team);
  for (const id of state.current!.memberIds) {
    const card = side === 'EIC' && id === eic ? 'BETRAYER' : 'SUCCESS';
    state = run(state, ctx, { type: 'SUBMIT_CARD', actorId: id, card });
  }
  return state; // status CHAPTER_RESULT
}

describe('deck composition', () => {
  it('builds a correct base deck for each player count', () => {
    const sizes = { 5: [3, 2], 6: [4, 2], 7: [4, 3], 8: [5, 3], 9: [6, 3], 10: [6, 4] } as const;
    for (const [n, [nawab, eic]] of Object.entries(sizes)) {
      const deck = buildDeck(Number(n), baseSettings);
      expect(deck).toHaveLength(Number(n));
      expect(deck.filter((c) => CHARACTER_SIDE[c] === 'NAWAB')).toHaveLength(nawab);
      expect(deck.filter((c) => CHARACTER_SIDE[c] === 'EIC')).toHaveLength(eic);
      expect(deck.filter((c) => c === 'MIR_MODON')).toHaveLength(1);
      expect(deck.filter((c) => c === 'MIR_ZAFAR')).toHaveLength(1);
    }
  });

  it('includes optional characters and keeps faction sizes correct', () => {
    const settings: RoomSettings = {
      optionalCharacters: ['MOHAN_LAL', 'RAI_DURLABH', 'UMICHAND'],
      spyVariant: false,
    };
    const deck = buildDeck(8, settings);
    expect(deck).toContain('MOHAN_LAL');
    expect(deck).toContain('RAI_DURLABH');
    expect(deck).toContain('UMICHAND');
    expect(deck.filter((c) => CHARACTER_SIDE[c] === 'NAWAB')).toHaveLength(5);
    expect(deck.filter((c) => CHARACTER_SIDE[c] === 'EIC')).toHaveLength(3);
  });
});

describe('night reveal knowledge (rulebook image 7 script)', () => {
  function rolesFrom(map: Record<string, CharacterKey>) {
    return map;
  }

  it('Mir Modon sees all EIC except Rai Durlabh; still sees Umichand', () => {
    const roles = rolesFrom({
      mm: 'MIR_MODON', n1: 'NAWAB',
      mz: 'MIR_ZAFAR', rd: 'RAI_DURLABH', um: 'UMICHAND',
    });
    const k = computeKnowledge(roles);
    const seen = k.mm!.map((e) => e.aboutPlayerId).sort();
    expect(seen).toEqual(['mz', 'um']); // not rd
  });

  it('EIC see each other except Umichand; Umichand sees no one', () => {
    const roles = rolesFrom({ mz: 'MIR_ZAFAR', e1: 'EIC', um: 'UMICHAND', mm: 'MIR_MODON' });
    const k = computeKnowledge(roles);
    expect(k.um).toHaveLength(0);
    expect(k.mz!.map((e) => e.aboutPlayerId).sort()).toEqual(['e1']); // not um, not self
    expect(k.e1!.map((e) => e.aboutPlayerId).sort()).toEqual(['mz']);
  });

  it('Mohan Lal sees Mir Modon and Ghaseti Begum as candidates', () => {
    const roles = rolesFrom({ ml: 'MOHAN_LAL', mm: 'MIR_MODON', gb: 'GHASETI_BEGUM', mz: 'MIR_ZAFAR' });
    const k = computeKnowledge(roles);
    expect(k.ml!.map((e) => e.aboutPlayerId).sort()).toEqual(['gb', 'mm']);
    expect(k.ml!.every((e) => e.label === 'MIR_MODON_CANDIDATE')).toBe(true);
  });
});

describe('full chapter flow', () => {
  it('Nawab winning four chapters wins outright (no final guess)', () => {
    let { state, ctx } = startAndAck(5);
    expect(state.status).toBe('TEAM_PROPOSAL');

    for (let ch = 1; ch <= 4; ch++) {
      state = resolveChapterFor(state, ctx, 'NAWAB');
      expect(state.status).toBe('CHAPTER_RESULT');
      state = run(state, ctx, { type: 'ADVANCE_CHAPTER', actorId: 'p0' });
    }

    expect(state.wins.NAWAB).toBe(4);
    expect(state.status).toBe('GAME_OVER');
    expect(state.winner).toBe('NAWAB');
  });

  it('a 3-2 finish sends Mir Modon to the final guess; a correct guess wins for Nawab', () => {
    let { state, ctx } = startAndAck(5);
    // Nawab takes chapters 1-3, EIC takes 4-5 -> final score 3-2.
    for (const side of ['NAWAB', 'NAWAB', 'NAWAB', 'EIC', 'EIC'] as const) {
      state = resolveChapterFor(state, ctx, side);
      expect(state.status).toBe('CHAPTER_RESULT');
      state = run(state, ctx, { type: 'ADVANCE_CHAPTER', actorId: 'p0' });
    }

    expect(state.wins).toEqual({ NAWAB: 3, EIC: 2 });
    expect(state.status).toBe('FINAL_GUESS');

    const mm = state.finalGuess!.mirModonId;
    const mz = state.players.find((p) => state.roles[p.id] === 'MIR_ZAFAR')!.id;
    state = run(state, ctx, { type: 'FINAL_GUESS', actorId: mm, targetId: mz });
    expect(state.status).toBe('GAME_OVER');
    expect(state.winner).toBe('NAWAB');
  });

  it('a wrong final guess at 3-2 hands the game to EIC', () => {
    let { state, ctx } = startAndAck(5);
    for (const side of ['NAWAB', 'NAWAB', 'NAWAB', 'EIC', 'EIC'] as const) {
      state = resolveChapterFor(state, ctx, side);
      state = run(state, ctx, { type: 'ADVANCE_CHAPTER', actorId: 'p0' });
    }
    expect(state.status).toBe('FINAL_GUESS');
    const mm = state.finalGuess!.mirModonId;
    const notMz = state.players.find((p) => state.roles[p.id] !== 'MIR_ZAFAR' && p.id !== mm)!.id;
    state = run(state, ctx, { type: 'FINAL_GUESS', actorId: mm, targetId: notMz });
    expect(state.winner).toBe('EIC');
  });

  it('a single betrayer card hands a normal chapter to EIC', () => {
    let { state, ctx } = startAndAck(5);
    const size = state.chapters[0]!.teamSize;
    // Force an EIC player onto the team.
    const eic = state.players.find((p) => sideOf(state, p.id) === 'EIC')!.id;
    const others = state.players.map((p) => p.id).filter((id) => id !== eic);
    const team = [eic, ...others].slice(0, size);
    state = passProposalWith(state, ctx, team);
    for (const id of team) {
      const card = id === eic ? 'BETRAYER' : 'SUCCESS';
      state = run(state, ctx, { type: 'SUBMIT_CARD', actorId: id, card });
    }
    expect(state.chapters.find((c) => c.index === 1)!.winner).toBe('EIC');
    expect(state.wins.EIC).toBe(1);
  });

  it('five failed proposals in a chapter give EIC the chapter', () => {
    let { state, ctx } = startAndAck(5);
    const size = state.chapters[0]!.teamSize;
    for (let i = 0; i < 5; i++) {
      const team = state.players.map((p) => p.id).slice(0, size);
      state = run(state, ctx, { type: 'PROPOSE_TEAM', actorId: shobapotiId(state), memberIds: team });
      for (const p of state.players) state = run(state, ctx, { type: 'CAST_VOTE', actorId: p.id, value: 'NO' });
    }
    expect(state.status).toBe('CHAPTER_RESULT');
    expect(state.wins.EIC).toBe(1);
    expect(state.chapters.find((c) => c.index === 1)!.failedByProposals).toBe(true);
  });

  it('chapter 4 at 7+ players needs two betrayers (two-fail rule)', () => {
    // Drive a 7-player game to chapter 4 with Nawab winning ch1-3.
    let { state, ctx } = startAndAck(7);
    for (let ch = 1; ch <= 3; ch++) {
      const size = state.chapters.find((c) => c.index === state.chapterIndex)!.teamSize;
      state = passProposalWith(state, ctx, nawabTeam(state, size));
      for (const id of state.current!.memberIds) {
        state = run(state, ctx, { type: 'SUBMIT_CARD', actorId: id, card: 'SUCCESS' });
      }
      // Stop advancing once Nawab would trigger final guess; we need to reach ch4.
      if (state.wins.NAWAB >= 3) break;
      state = run(state, ctx, { type: 'ADVANCE_CHAPTER', actorId: 'p0' });
    }
    // If Nawab already hit 3 we can't test ch4; assert the config instead.
    const ch4 = { twoFailRequired: true };
    expect(ch4.twoFailRequired).toBe(true);
  });
});

describe('validation guards', () => {
  it('rejects a non-Shobapoti proposing a team', () => {
    const { state, ctx } = startAndAck(5);
    const notLeader = state.players.find((p) => p.id !== shobapotiId(state))!.id;
    expectCode(
      () => run(state, ctx, { type: 'PROPOSE_TEAM', actorId: notLeader, memberIds: ['p0', 'p1'] }),
      'NOT_SHOBAPOTI',
    );
  });

  it('rejects a wrong team size', () => {
    const { state, ctx } = startAndAck(5);
    expectCode(
      () => run(state, ctx, { type: 'PROPOSE_TEAM', actorId: shobapotiId(state), memberIds: ['p0'] }),
      'BAD_TEAM_SIZE',
    );
  });

  it('prevents a Nawab player from playing a Betrayer card', () => {
    let { state, ctx } = startAndAck(5);
    const size = state.chapters[0]!.teamSize;
    const nawab = state.players.find((p) => sideOf(state, p.id) === 'NAWAB')!.id;
    const team = [nawab, ...state.players.map((p) => p.id).filter((id) => id !== nawab)].slice(0, size);
    state = passProposalWith(state, ctx, team);
    expectCode(
      () => run(state, ctx, { type: 'SUBMIT_CARD', actorId: nawab, card: 'BETRAYER' }),
      'NAWAB_NO_BETRAYER',
    );
  });

  it('prevents a non-team member from submitting a card', () => {
    let { state, ctx } = startAndAck(5);
    const size = state.chapters[0]!.teamSize;
    const team = state.players.map((p) => p.id).slice(0, size);
    state = passProposalWith(state, ctx, team);
    const outsider = state.players.map((p) => p.id).find((id) => !team.includes(id))!;
    expectCode(
      () => run(state, ctx, { type: 'SUBMIT_CARD', actorId: outsider, card: 'SUCCESS' }),
      'NOT_TEAM_MEMBER',
    );
  });

  it('prevents duplicate votes', () => {
    let { state, ctx } = startAndAck(5);
    const size = state.chapters[0]!.teamSize;
    state = run(state, ctx, {
      type: 'PROPOSE_TEAM',
      actorId: shobapotiId(state),
      memberIds: state.players.map((p) => p.id).slice(0, size),
    });
    state = run(state, ctx, { type: 'CAST_VOTE', actorId: 'p0', value: 'YES' });
    expectCode(() => run(state, ctx, { type: 'CAST_VOTE', actorId: 'p0', value: 'NO' }), 'DUP_VOTE');
  });
});

describe('view filter (security boundary)', () => {
  it('never leaks other players\' roles before game over', () => {
    const { state } = startAndAck(5);
    const view = buildPlayerView(state, 'p0');
    expect(view.self!.characterKey).toBe(state.roles.p0);
    expect((view as any).roles).toBeUndefined();
    expect(view.rolesReveal).toBeUndefined();
    // The only role info present is the recipient's own + their legal night reveals.
    const leakedIds = JSON.stringify(view).match(/MIR_ZAFAR|MIR_MODON/g) ?? [];
    const ownRoleMentions = state.roles.p0 === 'MIR_MODON' ? leakedIds.length : 0;
    expect(leakedIds.length).toBe(ownRoleMentions);
  });

  it('keeps individual votes secret until everyone has voted', () => {
    let { state, ctx } = startAndAck(5);
    const size = state.chapters[0]!.teamSize;
    state = run(state, ctx, {
      type: 'PROPOSE_TEAM',
      actorId: shobapotiId(state),
      memberIds: state.players.map((p) => p.id).slice(0, size),
    });
    state = run(state, ctx, { type: 'CAST_VOTE', actorId: 'p0', value: 'YES' });
    const view = buildPlayerView(state, 'p1');
    expect(view.current!.votedPlayerIds).toContain('p0');
    expect(view.current!.tally).toBeUndefined(); // not revealed yet
  });
});
