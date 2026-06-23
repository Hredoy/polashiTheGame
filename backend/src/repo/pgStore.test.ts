// Exercises the REAL SQL in PgStore against an in-memory Postgres (pg-mem). Proves the
// schema, optimistic locking, the transactional saveResult, and the history join.

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { newDb } from 'pg-mem';
import { beforeEach, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { createLobby } from '../game/engine.js';
import type { GameState, PlayerState } from '../game/types.js';
import { PgStore } from './pgStore.js';
import type { GameResultRecord } from './store.js';

const here = dirname(fileURLToPath(import.meta.url));

function players(n: number): PlayerState[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`, name: `P${i}`, seatIndex: i, ready: true, connected: true, ackedRole: false,
  }));
}

async function freshStore(): Promise<{ store: PgStore; state: GameState }> {
  const db = newDb();
  const sql = await readFile(join(here, '../db/schema.sql'), 'utf8');
  db.public.none(sql);
  const { Pool } = db.adapters.createPg();
  const store = new PgStore(new Pool() as pg.Pool);
  const state = createLobby('room-1', players(5), { optionalCharacters: [], spyVariant: false });
  return { store, state };
}

describe('PgStore against in-memory Postgres', () => {
  let store: PgStore;
  let state: GameState;

  beforeEach(async () => {
    ({ store, state } = await freshStore());
  });

  it('creates and reads a room by id and code', async () => {
    await store.createRoom({ code: 'ABCDEF', state });
    expect((await store.getById('room-1'))?.code).toBe('ABCDEF');
    expect((await store.getByCode('ABCDEF'))?.state.roomId).toBe('room-1');
    expect(await store.getById('nope')).toBeNull();
  });

  it('enforces optimistic locking on save', async () => {
    await store.createRoom({ code: 'ABCDEF', state });
    const next = { ...state, status: 'ROLE_REVEAL' as const, version: 1 };

    // Correct expected version succeeds.
    expect(await store.save(next, 0)).toBe(true);
    // Stale expected version (0 again) fails — no lost update.
    expect(await store.save({ ...next, version: 2 }, 0)).toBe(false);
    expect((await store.getById('room-1'))?.state.status).toBe('ROLE_REVEAL');
  });

  it('upserts users', async () => {
    await store.upsertUser({ id: 'u1', name: 'Aaa', isGuest: true });
    await store.upsertUser({ id: 'u1', name: 'Bbb', isGuest: true });
    expect((await store.getUser('u1'))?.name).toBe('Bbb');
  });

  it('writes a game result transactionally and returns user history', async () => {
    const result: GameResultRecord = {
      roomId: 'room-1',
      code: 'ABCDEF',
      winnerSide: 'NAWAB',
      playerCount: 5,
      chapters: [{ index: 1, winner: 'NAWAB' }],
      finalGuess: { mirModonId: 'p0', targetId: 'p4', correct: true },
      roles: { p0: 'MIR_MODON', p4: 'MIR_ZAFAR' },
      participants: [
        { userId: 'p0', name: 'P0', characterKey: 'MIR_MODON', side: 'NAWAB', won: true },
        { userId: 'p4', name: 'P4', characterKey: 'MIR_ZAFAR', side: 'EIC', won: false },
      ],
    };
    await store.saveResult(result);

    const winHist = await store.userHistory('p0', 10);
    expect(winHist).toHaveLength(1);
    expect(winHist[0]!.won).toBe(true);
    expect(winHist[0]!.winnerSide).toBe('NAWAB');

    const loseHist = await store.userHistory('p4', 10);
    expect(loseHist[0]!.won).toBe(false);
    expect(loseHist[0]!.characterKey).toBe('MIR_ZAFAR');
  });
});
