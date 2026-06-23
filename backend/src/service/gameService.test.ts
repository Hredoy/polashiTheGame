import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../repo/memoryStore.js';
import { GameService } from './gameService.js';
import { CHARACTER_SIDE, type GameState } from '../game/types.js';

async function seatPlayers(svc: GameService, n: number) {
  const host = await svc.ensureUser(undefined, 'Host');
  const room = await svc.createRoom(host.id, host.name);
  const ids = [host.id];
  for (let i = 1; i < n; i++) {
    const u = await svc.ensureUser(undefined, `P${i}`);
    await svc.apply(room.roomId, { type: 'JOIN', actorId: u.id, name: u.name });
    ids.push(u.id);
  }
  for (const id of ids) await svc.apply(room.roomId, { type: 'SET_READY', actorId: id, ready: true });
  return { roomId: room.roomId, ids };
}

const shobapotiId = (s: GameState) => s.players.find((p) => p.seatIndex === s.shobapotiSeat)!.id;
const nawabIds = (s: GameState) =>
  s.players.filter((p) => CHARACTER_SIDE[s.roles[p.id]!] === 'NAWAB').map((p) => p.id);

describe('GameService end-to-end (memory store)', () => {
  it('plays a full Nawab victory (4 chapters) and records history', async () => {
    const svc = new GameService(new MemoryStore());
    const { roomId, ids } = await seatPlayers(svc, 5);

    let state = await svc.apply(roomId, { type: 'START_GAME', actorId: ids[0]! });
    expect(state.status).toBe('ROLE_REVEAL');
    for (const id of ids) state = await svc.apply(roomId, { type: 'ACK_ROLE', actorId: id });
    expect(state.status).toBe('TEAM_PROPOSAL');

    // Win 4 chapters with all-Nawab teams -> Nawab wins outright.
    for (let ch = 1; ch <= 4; ch++) {
      const size = state.chapters.find((c) => c.index === state.chapterIndex)!.teamSize;
      const nawab = nawabIds(state);
      const team = [...nawab, ...state.players.map((p) => p.id)].slice(0, size);
      state = await svc.apply(roomId, {
        type: 'PROPOSE_TEAM',
        actorId: shobapotiId(state),
        memberIds: team,
      });
      for (const id of ids) state = await svc.apply(roomId, { type: 'CAST_VOTE', actorId: id, value: 'YES' });
      expect(state.status).toBe('MISSION');
      for (const id of state.current!.memberIds) {
        state = await svc.apply(roomId, { type: 'SUBMIT_CARD', actorId: id, card: 'SUCCESS' });
      }
      state = await svc.apply(roomId, { type: 'ADVANCE_CHAPTER', actorId: ids[0]! });
    }

    expect(state.wins.NAWAB).toBe(4);
    expect(state.status).toBe('GAME_OVER');
    expect(state.winner).toBe('NAWAB');

    // History persisted for every participant.
    const mm = Object.keys(state.roles).find((id) => state.roles[id] === 'MIR_MODON')!;
    const hist = await svc.userHistory(mm);
    expect(hist).toHaveLength(1);
    expect(hist[0]!.winnerSide).toBe('NAWAB');
    expect(hist[0]!.won).toBe(true);
  });

  it('host reassigns when the host leaves the lobby', async () => {
    const svc = new GameService(new MemoryStore());
    const { roomId, ids } = await seatPlayers(svc, 5);
    const state = await svc.apply(roomId, { type: 'LEAVE', actorId: ids[0]! });
    expect(state.hostId).toBe(ids[1]);
    expect(state.players).toHaveLength(4);
    expect(state.players.map((p) => p.seatIndex)).toEqual([0, 1, 2, 3]);
  });
});
