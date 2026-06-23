import { describe, expect, it } from 'vitest';
import { createLobby, reduce, type Action } from './engine.js';
import { buildPlayerView } from './view.js';
import { CHARACTER_SIDE, type GameState, type PlayerState, type RoomSettings } from './types.js';

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function players(n: number): PlayerState[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`, name: `P${i}`, seatIndex: i, ready: true, connected: true, ackedRole: false,
  }));
}

const spySettings: RoomSettings = { optionalCharacters: [], spyVariant: true };
const shobapotiId = (s: GameState) => s.players.find((p) => p.seatIndex === s.shobapotiSeat)!.id;
const nawabIds = (s: GameState) =>
  s.players.filter((p) => CHARACTER_SIDE[s.roles[p.id]!] === 'NAWAB').map((p) => p.id);

function start(n: number) {
  let state = createLobby('r', players(n), spySettings);
  const ctx = { rng: seeded(7) };
  const run = (a: Action) => (state = reduce(state, a, ctx));
  run({ type: 'START_GAME', actorId: 'p0' });
  for (const p of state.players) run({ type: 'ACK_ROLE', actorId: p.id });
  return { get: () => state, run };
}

// Drive one chapter to a Nawab win (all-Nawab team, all YES, all SUCCESS).
function winChapter(get: () => GameState, run: (a: Action) => GameState) {
  const s = get();
  const size = s.chapters.find((c) => c.index === s.chapterIndex)!.teamSize;
  const team = [...nawabIds(s), ...s.players.map((p) => p.id)].slice(0, size);
  run({ type: 'PROPOSE_TEAM', actorId: shobapotiId(get()), memberIds: team });
  for (const p of get().players) run({ type: 'CAST_VOTE', actorId: p.id, value: 'YES' });
  for (const id of get().current!.memberIds) run({ type: 'SUBMIT_CARD', actorId: id, card: 'SUCCESS' });
}

describe('spy variant', () => {
  it('seats the first spy to the right of the first Shobapoti', () => {
    const { get } = start(7);
    const s = get();
    const rightSeat = (s.shobapotiSeat - 1 + 7) % 7;
    expect(s.spy!.currentSpyId).toBe(s.players.find((p) => p.seatIndex === rightSeat)!.id);
    expect(s.spy!.pastSpyIds).toEqual([s.spy!.currentSpyId]);
  });

  it('blocks advancing chapter 2 until the spy investigates, then passes the role on', () => {
    const { get, run } = start(7);
    winChapter(get, run);
    run({ type: 'ADVANCE_CHAPTER', actorId: 'p0' }); // ch1 -> ch2, no investigation yet
    winChapter(get, run); // resolve chapter 2

    expect(get().status).toBe('CHAPTER_RESULT');
    const spyId = get().spy!.currentSpyId;
    // Host cannot advance while investigation pending.
    expect(() => run({ type: 'ADVANCE_CHAPTER', actorId: 'p0' })).toThrow();

    const target = get().players.find((p) => p.id !== spyId && !get().spy!.pastSpyIds.includes(p.id))!.id;
    run({ type: 'INVESTIGATE', actorId: spyId, targetId: target });

    expect(get().spy!.currentSpyId).toBe(target); // role passed to investigated player
    expect(get().spy!.investigations).toHaveLength(1);
    expect(get().spy!.investigations[0]!.afterChapter).toBe(2);
    // Now advancing is allowed.
    run({ type: 'ADVANCE_CHAPTER', actorId: 'p0' });
    expect(get().chapterIndex).toBe(3);
  });

  it('only the investigating spy sees the finding; cannot investigate a previous spy', () => {
    const { get, run } = start(7);
    winChapter(get, run);
    run({ type: 'ADVANCE_CHAPTER', actorId: 'p0' });
    winChapter(get, run);
    const spyId = get().spy!.currentSpyId;
    const target = get().players.find((p) => p.id !== spyId && !get().spy!.pastSpyIds.includes(p.id))!.id;

    // Cannot investigate the spy themselves or a previous spy.
    expect(() => run({ type: 'INVESTIGATE', actorId: spyId, targetId: spyId })).toThrow();
    const prevSpy = get().spy!.pastSpyIds[0]!;
    if (prevSpy !== spyId) {
      expect(() => run({ type: 'INVESTIGATE', actorId: spyId, targetId: prevSpy })).toThrow();
    }

    run({ type: 'INVESTIGATE', actorId: spyId, targetId: target });

    // The spy sees their own finding; a non-spy does not.
    const spyView = buildPlayerView(get(), spyId);
    expect(spyView.spy!.myFindings).toHaveLength(1);
    expect(spyView.spy!.myFindings[0]!.targetId).toBe(target);

    const other = get().players.find((p) => p.id !== spyId && p.id !== target)!.id;
    const otherView = buildPlayerView(get(), other);
    expect(otherView.spy!.myFindings).toHaveLength(0);
  });
});
