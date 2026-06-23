// Persistence abstraction. The full GameState JSON is the source of truth; relational
// columns (status, host, player_count, version) are denormalised from it for indexing.
// Two implementations: MemoryStore (dev/test, zero infra) and PgStore (production).

import type { GameState, Side } from '../game/types.js';

export interface RoomRecord {
  code: string;
  state: GameState;
}

export interface UserRecord {
  id: string;
  name: string;
  isGuest: boolean;
}

export interface GameResultRecord {
  roomId: string;
  code: string;
  winnerSide: Side;
  playerCount: number;
  chapters: unknown;
  finalGuess: unknown;
  roles: Record<string, string>;
  participants: {
    userId: string;
    name: string;
    characterKey: string;
    side: Side;
    won: boolean;
  }[];
}

export interface ResultSummary {
  roomId: string;
  code: string;
  winnerSide: Side;
  characterKey: string;
  side: Side;
  won: boolean;
  finishedAt: string;
}

export interface RoomStore {
  upsertUser(user: UserRecord): Promise<void>;
  getUser(id: string): Promise<UserRecord | null>;

  createRoom(record: RoomRecord): Promise<void>;
  getById(roomId: string): Promise<RoomRecord | null>;
  getByCode(code: string): Promise<RoomRecord | null>;
  /** Optimistic save: succeeds only if the stored version === expectedVersion. */
  save(state: GameState, expectedVersion: number): Promise<boolean>;

  saveResult(result: GameResultRecord): Promise<void>;
  userHistory(userId: string, limit: number): Promise<ResultSummary[]>;

  /** Room ids in one of `statuses` not updated within `olderThanMs` (stalled turns). */
  roomsNeedingTimeout(statuses: string[], olderThanMs: number): Promise<string[]>;
  /** Delete rooms in one of `statuses` not updated within `olderThanMs`. Returns count. */
  deleteStaleRooms(statuses: string[], olderThanMs: number): Promise<number>;
}
