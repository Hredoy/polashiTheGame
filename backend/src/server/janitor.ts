// Background sweeper. Replaces per-room in-memory timers with a durable, restart-safe and
// multi-instance-tolerant approach: periodically scan for rooms whose turn has stalled and
// auto-resolve them, and delete stale finished/abandoned rooms.

import type { GameService } from '../service/gameService.js';

export interface JanitorOptions {
  intervalMs?: number; // how often to sweep
  turnTimeoutMs?: number; // a VOTING/MISSION room idle this long is auto-resolved
  roomTtlMs?: number; // a GAME_OVER/LOBBY room idle this long is deleted
  botFillMs?: number; // an under-filled LOBBY idle this long is topped up with bots
  onRoomChanged?: (roomId: string) => void | Promise<void>; // e.g. re-broadcast views
}

export function startJanitor(service: GameService, opts: JanitorOptions = {}): () => void {
  const intervalMs = opts.intervalMs ?? 10_000;
  const turnTimeoutMs = opts.turnTimeoutMs ?? Number(process.env.TURN_TIMEOUT_MS ?? 60_000);
  const roomTtlMs = opts.roomTtlMs ?? Number(process.env.ROOM_TTL_MS ?? 60 * 60 * 1000); // 1h
  const botFillMs = opts.botFillMs ?? Number(process.env.BOT_FILL_MS ?? 120_000); // 2 min

  let running = false;
  const tick = async () => {
    if (running) return; // never overlap sweeps
    running = true;
    try {
      // Top up idle lobbies with bots, then let bots act (a bot host will start the game).
      for (const roomId of await service.fillIdleLobbies(botFillMs)) {
        await service.driveBots(roomId);
        await opts.onRoomChanged?.(roomId);
      }
      // Resolve stalled turns, then let bots react to the new phase.
      for (const roomId of await service.roomsNeedingTimeout(turnTimeoutMs)) {
        const next = await service.forceTimeouts(roomId);
        if (next) {
          await service.driveBots(roomId);
          await opts.onRoomChanged?.(roomId);
        }
      }
      await service.cleanupStaleRooms(roomTtlMs);
    } catch (e) {
      console.error('janitor sweep failed', e);
    } finally {
      running = false;
    }
  };

  const handle = setInterval(tick, intervalMs);
  handle.unref?.(); // don't keep the process alive for the sweeper
  return () => clearInterval(handle);
}
