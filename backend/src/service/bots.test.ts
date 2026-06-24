import { describe, expect, it } from 'vitest';
import { createLobby, reduce } from '../game/engine.js';
import type { PlayerState, RoomSettings } from '../game/types.js';
import { decideBotAction } from './bots.js';

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bots(n: number): PlayerState[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `b${i}`, name: `Bot ${i}`, seatIndex: i, ready: true, connected: true, ackedRole: false, isBot: true,
  }));
}

const baseSettings: RoomSettings = { optionalCharacters: [], spyVariant: false };

describe('bot-driven game', () => {
  it('an all-bot lobby starts and plays through to GAME_OVER', () => {
    let state = createLobby('r', bots(5), baseSettings); // hostId = b0 (a bot)
    const ctx = { rng: seeded(3) };

    for (let i = 0; i < 1000 && state.status !== 'GAME_OVER'; i++) {
      let acted = false;
      for (const p of state.players) {
        const action = decideBotAction(state, p.id);
        if (action) {
          state = reduce(state, action, ctx);
          acted = true;
          break;
        }
      }
      if (!acted) break; // stuck (should not happen) — fail the assertion below
    }

    expect(state.status).toBe('GAME_OVER');
    expect(state.winner === 'NAWAB' || state.winner === 'EIC').toBe(true);
  });

  it('also completes with the spy variant enabled', () => {
    let state = createLobby('r', bots(7), { optionalCharacters: [], spyVariant: true });
    const ctx = { rng: seeded(9) };
    for (let i = 0; i < 2000 && state.status !== 'GAME_OVER'; i++) {
      let acted = false;
      for (const p of state.players) {
        const action = decideBotAction(state, p.id);
        if (action) {
          state = reduce(state, action, ctx);
          acted = true;
          break;
        }
      }
      if (!acted) break;
    }
    expect(state.status).toBe('GAME_OVER');
  });
});
