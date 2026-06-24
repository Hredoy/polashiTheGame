// Orchestration layer between transport (sockets) and the pure engine + store.
// Owns: room/code creation, the atomic load->reduce->save cycle, and result persistence.

import { customAlphabet, nanoid } from 'nanoid';
import { signToken, verifyToken } from '../auth/token.js';
import { MIN_PLAYERS } from '../game/config.js';
import { createRoom as engineCreateRoom, reduce, type Action } from '../game/engine.js';
import { CHARACTER_SIDE, GameError, type GameState, type RoomSettings } from '../game/types.js';
import type { GameResultRecord, RoomStore, UserRecord } from '../repo/store.js';
import { decideBotAction } from './bots.js';
import { KeyedMutex } from './mutex.js';

const BOT_NAMES = ['রহিম', 'করিম', 'সেলিম', 'জসিম', 'নাসির', 'বাবু'];

const newCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6); // no ambiguous chars

const DEFAULT_SETTINGS: RoomSettings = { optionalCharacters: [], spyVariant: false };

export class GameService {
  private mutex = new KeyedMutex();

  constructor(private store: RoomStore) {}

  // Authenticate a socket handshake. A valid token proves ownership of its user id; any
  // client-supplied id WITHOUT a matching token is ignored and a fresh guest is minted.
  // Returns the trusted user plus the token to (re)store on the client.
  async authenticate(
    token: string | undefined,
    name: string,
  ): Promise<{ user: UserRecord; token: string }> {
    const uid = verifyToken(token);
    if (uid) {
      let user = await this.store.getUser(uid);
      if (!user) {
        user = { id: uid, name, isGuest: true };
        await this.store.upsertUser(user);
      }
      return { user, token: signToken(user.id) }; // rotate: fresh expiry each connect
    }
    const user: UserRecord = { id: nanoid(), name, isGuest: true };
    await this.store.upsertUser(user);
    return { user, token: signToken(user.id) };
  }

  // Internal helper used by tests/services to mint or fetch a user without a token.
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

  // Janitor support: rooms whose VOTING/MISSION turn has stalled, and stale-room cleanup.
  roomsNeedingTimeout(olderThanMs: number) {
    return this.store.roomsNeedingTimeout(['VOTING', 'MISSION'], olderThanMs);
  }
  cleanupStaleRooms(olderThanMs: number) {
    return this.store.deleteStaleRooms(['GAME_OVER', 'LOBBY'], olderThanMs);
  }

  // Fill idle lobbies (no activity for olderThanMs) with bots up to the minimum player count.
  // Returns the room ids that were filled.
  async fillIdleLobbies(olderThanMs: number): Promise<string[]> {
    const ids = await this.store.roomsNeedingTimeout(['LOBBY'], olderThanMs);
    const filled: string[] = [];
    for (const id of ids) {
      const rec = await this.store.getById(id);
      if (!rec || rec.state.players.length >= MIN_PLAYERS) continue;
      for (let i = rec.state.players.length; i < MIN_PLAYERS; i++) {
        const name = `${BOT_NAMES[i % BOT_NAMES.length]} 🤖`;
        await this.apply(id, { type: 'ADD_BOT', botId: nanoid(), name });
      }
      filled.push(id);
    }
    return filled;
  }

  // Apply pending bot actions for a room until none remain (bounded). Returns whether any
  // bot acted, so the caller can re-broadcast.
  async driveBots(roomId: string): Promise<boolean> {
    let acted = false;
    for (let i = 0; i < 60; i++) {
      const rec = await this.store.getById(roomId);
      if (!rec || rec.state.status === 'GAME_OVER') break;
      let action: Action | null = null;
      for (const p of rec.state.players) {
        if (!p.isBot) continue;
        action = decideBotAction(rec.state, p.id);
        if (action) break;
      }
      if (!action) break;
      try {
        await this.apply(roomId, action);
        acted = true;
      } catch {
        break; // never loop forever on an unexpected rejection
      }
    }
    return acted;
  }

  // Resolve a stalled phase by auto-acting for players who haven't acted yet.
  // Default policy (TODO confirm with design): auto NO-vote, auto SUCCESS-card.
  // Returns the new state, or null if nothing was pending / phase changed meanwhile.
  async forceTimeouts(roomId: string): Promise<GameState | null> {
    const rec = await this.store.getById(roomId);
    if (!rec) return null;
    const state = rec.state;

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
