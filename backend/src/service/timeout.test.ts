import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../repo/memoryStore.js';
import { GameService } from './gameService.js';
import type { GameState } from '../game/types.js';

const shobapotiId = (s: GameState) => s.players.find((p) => p.seatIndex === s.shobapotiSeat)!.id;

async function startedGame(n: number) {
  const svc = new GameService(new MemoryStore());
  const host = await svc.ensureUser(undefined, 'Host');
  const room = await svc.createRoom(host.id, host.name);
  const ids = [host.id];
  for (let i = 1; i < n; i++) {
    const u = await svc.ensureUser(undefined, `P${i}`);
    await svc.apply(room.roomId, { type: 'JOIN', actorId: u.id, name: u.name });
    ids.push(u.id);
  }
  for (const id of ids) await svc.apply(room.roomId, { type: 'SET_READY', actorId: id, ready: true });
  await svc.apply(room.roomId, { type: 'START_GAME', actorId: ids[0]! });
  for (const id of ids) await svc.apply(room.roomId, { type: 'ACK_ROLE', actorId: id });
  return { svc, roomId: room.roomId, ids };
}

describe('disconnect / turn timeout policy', () => {
  it('auto-NO-votes missing players when a vote stalls', async () => {
    const { svc, roomId, ids } = await startedGame(5);
    let state = (await svc.getState(roomId))!;
    const size = state.chapters.find((c) => c.index === state.chapterIndex)!.teamSize;
    state = await svc.apply(roomId, {
      type: 'PROPOSE_TEAM',
      actorId: shobapotiId(state),
      memberIds: state.players.map((p) => p.id).slice(0, size),
    });
    // Only one player votes, then the timer fires.
    state = await svc.apply(roomId, { type: 'CAST_VOTE', actorId: ids[0]!, value: 'YES' });
    const resolved = await svc.forceTimeouts(roomId);
    // Missing votes counted as NO -> proposal fails -> back to TEAM_PROPOSAL (or chapter loss).
    expect(resolved).not.toBeNull();
    expect(['TEAM_PROPOSAL', 'CHAPTER_RESULT']).toContain(resolved!.status);
  });

  it('auto-SUCCESS-cards missing team members when a mission stalls', async () => {
    const { svc, roomId } = await startedGame(5);
    let state = (await svc.getState(roomId))!;
    const size = state.chapters.find((c) => c.index === state.chapterIndex)!.teamSize;
    const team = state.players.map((p) => p.id).slice(0, size);
    state = await svc.apply(roomId, { type: 'PROPOSE_TEAM', actorId: shobapotiId(state), memberIds: team });
    for (const p of state.players) state = await svc.apply(roomId, { type: 'CAST_VOTE', actorId: p.id, value: 'YES' });
    expect(state.status).toBe('MISSION');
    // Nobody submits; janitor fires -> all auto SUCCESS -> chapter resolves.
    const resolved = await svc.forceTimeouts(roomId);
    expect(resolved!.status).toBe('CHAPTER_RESULT');
  });

  it('does nothing when no phase is pending', async () => {
    const { svc, roomId } = await startedGame(5); // ROLE_REVEAL acked -> TEAM_PROPOSAL
    expect(await svc.forceTimeouts(roomId)).toBeNull();
  });
});
