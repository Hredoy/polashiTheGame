// Orchestration layer between transport (sockets) and the pure engine + store.
// Owns: room/code creation, the atomic load->reduce->save cycle, and result persistence.

import { customAlphabet, nanoid } from 'nanoid';
import { createRoom as engineCreateRoom, reduce, type Action } from '../game/engine.js';
import { CHARACTER_SIDE, GameError, type GameState, type RoomSettings } from '../game/types.js';
import type { GameResultRecord, RoomStore, UserRecord } from '../repo/store.js';
import { KeyedMutex } from './mutex.js';

const newCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6); // no ambiguous chars

const DEFAULT_SETTINGS: RoomSettings = { optionalCharacters: [], spyVariant: false };

export class GameService {
  private mutex = new KeyedMutex();

  constructor(private store: RoomStore) {}

  async ensureUser(userId: string | undefined, name: string): Promise<UserRecord> {
    if (userId) {
      const existing = await this.store.getUser(userId);
      if (existing) return existing;
    }
    const user: UserRecord = { id: userId ?? nanoid(), name, isGuest: true };
    await this.store.upsertUser(user);
    return user;
  }

  async createRoom(hostId: string, hostName: string): Promise<GameState> {
    const roomId = nanoid();
    // Retry on the astronomically unlikely code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newCode();
      if (await this.store.getByCode(code)) continue;
      const state = engineCreateRoom(roomId, hostId, hostName, DEFAULT_SETTINGS);
      await this.store.createRoom({ code, state });
      return state;
    }
    throw new GameError('CODE_COLLISION', 'Could not allocate a room code');
  }

  async resolveCode(code: string): Promise<GameState> {
    const rec = await this.store.getByCode(code.toUpperCase());
    if (!rec) throw new GameError('NO_ROOM', 'Room not found');
    return rec.state;
  }

  async getState(roomId: string): Promise<GameState | null> {
    const rec = await this.store.getById(roomId);
    return rec?.state ?? null;
  }

  async codeFor(roomId: string): Promise<string | undefined> {
    const rec = await this.store.getById(roomId);
    return rec?.code;
  }

  // The single mutation entrypoint. Atomic per room; retries once on a version conflict.
  async apply(roomId: string, action: Action): Promise<GameState> {
    return this.mutex.run(roomId, async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const rec = await this.store.getById(roomId);
        if (!rec) throw new GameError('NO_ROOM', 'Room not found');
        const prevState = rec.state;
        const next = reduce(prevState, action, { rng: Math.random });
        const ok = await this.store.save(next, prevState.version);
        if (!ok) continue; // version conflict — reload and retry
        if (next.status === 'GAME_OVER' && prevState.status !== 'GAME_OVER') {
          await this.persistResult(rec.code, next);
        }
        return next;
      }
      throw new GameError('CONFLICT', 'Concurrent update, please retry');
    });
  }

  // Resolve a stalled phase by auto-acting for players who haven't acted yet.
  // Default policy (TODO confirm with design): auto NO-vote, auto SUCCESS-card.
  // Returns the new state, or null if nothing was pending / phase changed meanwhile.
  async forceTimeouts(roomId: string, expectedVersion: number): Promise<GameState | null> {
    const rec = await this.store.getById(roomId);
    if (!rec) return null;
    const state = rec.state;
    if (state.version !== expectedVersion) return null; // someone acted; the timer is stale

    if (state.status === 'VOTING' && state.current) {
      const voted = new Set(Object.keys(state.current.votes));
      const missing = state.players.filter((p) => !voted.has(p.id));
      let result = state;
      for (const p of missing) {
        result = await this.apply(roomId, { type: 'CAST_VOTE', actorId: p.id, value: 'NO' });
      }
      return result;
    }

    if (state.status === 'MISSION' && state.current) {
      const chapter = state.chapters.find((c) => c.index === state.chapterIndex);
      const submitted = new Set(Object.keys(chapter?.cards ?? {}));
      const missing = state.current.memberIds.filter((id) => !submitted.has(id));
      let result = state;
      for (const id of missing) {
        result = await this.apply(roomId, { type: 'SUBMIT_CARD', actorId: id, card: 'SUCCESS' });
      }
      return result;
    }

    return null;
  }

  private async persistResult(code: string, state: GameState): Promise<void> {
    const result: GameResultRecord = {
      roomId: state.roomId,
      code,
      winnerSide: state.winner ?? 'EIC',
      playerCount: state.players.length,
      chapters: state.chapters,
      finalGuess: state.finalGuess,
      roles: state.roles,
      participants: state.players.map((p) => {
        const ch = state.roles[p.id]!;
        const side = CHARACTER_SIDE[ch];
        return {
          userId: p.id,
          name: p.name,
          characterKey: ch,
          side,
          won: side === state.winner,
        };
      }),
    };
    await this.store.saveResult(result);
  }

  userHistory(userId: string, limit = 20) {
    return this.store.userHistory(userId, limit);
  }
}
