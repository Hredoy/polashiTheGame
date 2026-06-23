// In-memory RoomStore — used when DATABASE_URL is not set. Lets the server boot and run
// games with zero infrastructure. State is lost on restart (fine for dev/test).

import type { GameState } from '../game/types.js';
import type {
  GameResultRecord,
  ResultSummary,
  RoomRecord,
  RoomStore,
  UserRecord,
} from './store.js';

export class MemoryStore implements RoomStore {
  private users = new Map<string, UserRecord>();
  private rooms = new Map<string, RoomRecord>(); // by roomId
  private byCode = new Map<string, string>(); // code -> roomId
  private results: (GameResultRecord & { finishedAt: string })[] = [];

  async upsertUser(user: UserRecord): Promise<void> {
    this.users.set(user.id, { ...user });
  }
  async getUser(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async createRoom(record: RoomRecord): Promise<void> {
    this.rooms.set(record.state.roomId, structuredClone(record));
    this.byCode.set(record.code, record.state.roomId);
  }
  async getById(roomId: string): Promise<RoomRecord | null> {
    const r = this.rooms.get(roomId);
    return r ? structuredClone(r) : null;
  }
  async getByCode(code: string): Promise<RoomRecord | null> {
    const id = this.byCode.get(code);
    return id ? this.getById(id) : null;
  }
  async save(state: GameState, expectedVersion: number): Promise<boolean> {
    const existing = this.rooms.get(state.roomId);
    if (!existing) return false;
    if (existing.state.version !== expectedVersion) return false; // optimistic conflict
    this.rooms.set(state.roomId, { code: existing.code, state: structuredClone(state) });
    return true;
  }

  async saveResult(result: GameResultRecord): Promise<void> {
    this.results.push({ ...structuredClone(result), finishedAt: new Date().toISOString() });
  }
  async userHistory(userId: string, limit: number): Promise<ResultSummary[]> {
    const out: ResultSummary[] = [];
    for (const r of [...this.results].reverse()) {
      const me = r.participants.find((p) => p.userId === userId);
      if (!me) continue;
      out.push({
        roomId: r.roomId,
        code: r.code,
        winnerSide: r.winnerSide,
        characterKey: me.characterKey,
        side: me.side,
        won: me.won,
        finishedAt: r.finishedAt,
      });
      if (out.length >= limit) break;
    }
    return out;
  }
}
