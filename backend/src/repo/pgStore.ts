// Postgres-backed RoomStore with optimistic locking on rooms.version.

import type pg from 'pg';
import { getPool } from '../db/pool.js';
import type { GameState } from '../game/types.js';
import type {
  GameResultRecord,
  ResultSummary,
  RoomRecord,
  RoomStore,
  UserRecord,
} from './store.js';

export class PgStore implements RoomStore {
  // Pool is injectable so tests can drive the real SQL against an in-memory Postgres.
  constructor(private readonly pool: pg.Pool = getPool()) {}

  async upsertUser(user: UserRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (id, name, is_guest) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [user.id, user.name, user.isGuest],
    );
  }

  async getUser(id: string): Promise<UserRecord | null> {
    const r = await this.pool.query(`SELECT id, name, is_guest FROM users WHERE id = $1`, [id]);
    const row = r.rows[0];
    return row ? { id: row.id, name: row.name, isGuest: row.is_guest } : null;
  }

  async createRoom(record: RoomRecord): Promise<void> {
    const s = record.state;
    await this.pool.query(
      `INSERT INTO rooms (id, code, host_id, status, player_count, state, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [s.roomId, record.code, s.hostId, s.status, s.players.length, JSON.stringify(s), s.version],
    );
  }

  async getById(roomId: string): Promise<RoomRecord | null> {
    const r = await this.pool.query(`SELECT code, state FROM rooms WHERE id = $1`, [roomId]);
    const row = r.rows[0];
    return row ? { code: row.code, state: row.state as GameState } : null;
  }

  async getByCode(code: string): Promise<RoomRecord | null> {
    const r = await this.pool.query(`SELECT code, state FROM rooms WHERE code = $1`, [code]);
    const row = r.rows[0];
    return row ? { code: row.code, state: row.state as GameState } : null;
  }

  async save(state: GameState, expectedVersion: number): Promise<boolean> {
    const r = await this.pool.query(
      `UPDATE rooms
         SET state = $2, status = $3, player_count = $4, host_id = $5,
             version = $6, updated_at = now()
       WHERE id = $1 AND version = $7`,
      [
        state.roomId,
        JSON.stringify(state),
        state.status,
        state.players.length,
        state.hostId,
        state.version,
        expectedVersion,
      ],
    );
    return (r.rowCount ?? 0) > 0; // 0 => version conflict
  }

  async saveResult(result: GameResultRecord): Promise<void> {
    const pool = this.pool;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO game_results
           (room_id, code, winner_side, player_count, chapters, final_guess, roles)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          result.roomId,
          result.code,
          result.winnerSide,
          result.playerCount,
          JSON.stringify(result.chapters),
          result.finalGuess ? JSON.stringify(result.finalGuess) : null,
          JSON.stringify(result.roles),
        ],
      );
      const resultId = res.rows[0].id;
      for (const p of result.participants) {
        await client.query(
          `INSERT INTO game_participants
             (result_id, user_id, name, character_key, side, won)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (result_id, user_id) DO NOTHING`,
          [resultId, p.userId, p.name, p.characterKey, p.side, p.won],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async userHistory(userId: string, limit: number): Promise<ResultSummary[]> {
    const r = await this.pool.query(
      `SELECT gr.room_id, gr.code, gr.winner_side, gr.finished_at,
              gp.character_key, gp.side, gp.won
         FROM game_participants gp
         JOIN game_results gr ON gr.id = gp.result_id
        WHERE gp.user_id = $1
        ORDER BY gr.finished_at DESC
        LIMIT $2`,
      [userId, limit],
    );
    return r.rows.map((row) => ({
      roomId: row.room_id,
      code: row.code,
      winnerSide: row.winner_side,
      characterKey: row.character_key,
      side: row.side,
      won: row.won,
      finishedAt: row.finished_at.toISOString(),
    }));
  }
}
