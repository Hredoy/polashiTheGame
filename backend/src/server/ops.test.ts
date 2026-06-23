import { describe, expect, it } from 'vitest';
import { signToken, verifyToken } from '../auth/token.js';
import { RateLimiter } from './rateLimit.js';
import { MemoryStore } from '../repo/memoryStore.js';
import { GameService } from '../service/gameService.js';

describe('session token expiry', () => {
  it('accepts a fresh token and rejects an expired one', () => {
    const good = signToken('user-1', 60_000);
    expect(verifyToken(good)).toBe('user-1');

    const expired = signToken('user-1', -1); // already past
    expect(verifyToken(expired)).toBeNull();

    expect(verifyToken('garbage.sig')).toBeNull();
    expect(verifyToken(undefined)).toBeNull();
  });
});

describe('rate limiter', () => {
  it('allows a burst then throttles, and refills over time', () => {
    let now = 0;
    const rl = new RateLimiter(3, 1, () => now); // capacity 3, 1/sec
    expect(rl.take('a')).toBe(true);
    expect(rl.take('a')).toBe(true);
    expect(rl.take('a')).toBe(true);
    expect(rl.take('a')).toBe(false); // bucket empty
    now = 1000; // 1s later -> +1 token
    expect(rl.take('a')).toBe(true);
    expect(rl.take('a')).toBe(false);
    // Independent key has its own bucket.
    expect(rl.take('b')).toBe(true);
  });
});

describe('janitor store support (room TTL + stalled-turn detection)', () => {
  it('finds stalled VOTING/MISSION rooms and cleans up old finished rooms', async () => {
    let now = 1_000_000;
    const store = new MemoryStore(() => now);
    const svc = new GameService(store);

    // Build a 5-player game up to VOTING.
    const host = await svc.ensureUser(undefined, 'Host');
    const room = await svc.createRoom(host.id, host.name);
    const ids = [host.id];
    for (let i = 1; i < 5; i++) {
      const u = await svc.ensureUser(undefined, `P${i}`);
      await svc.apply(room.roomId, { type: 'JOIN', actorId: u.id, name: u.name });
      ids.push(u.id);
    }
    for (const id of ids) await svc.apply(room.roomId, { type: 'SET_READY', actorId: id, ready: true });
    await svc.apply(room.roomId, { type: 'START_GAME', actorId: ids[0]! });
    for (const id of ids) await svc.apply(room.roomId, { type: 'ACK_ROLE', actorId: id });
    let state = (await svc.getState(room.roomId))!;
    const size = state.chapters.find((c) => c.index === state.chapterIndex)!.teamSize;
    await svc.apply(room.roomId, {
      type: 'PROPOSE_TEAM',
      actorId: state.players.find((p) => p.seatIndex === state.shobapotiSeat)!.id,
      memberIds: state.players.map((p) => p.id).slice(0, size),
    });

    // Not stale yet.
    expect(await svc.roomsNeedingTimeout(60_000)).toHaveLength(0);
    // Advance the clock past the turn timeout.
    now += 61_000;
    expect(await svc.roomsNeedingTimeout(60_000)).toEqual([room.roomId]);

    // forceTimeouts resolves it (auto NO votes).
    const resolved = await svc.forceTimeouts(room.roomId);
    expect(resolved).not.toBeNull();
    // No longer stalled in VOTING.
    expect(await svc.roomsNeedingTimeout(60_000)).toHaveLength(0);
  });
});
