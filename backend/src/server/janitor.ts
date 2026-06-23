// Background sweeper. Replaces per-room in-memory timers with a durable, restart-safe and
// multi-instance-tolerant approach: periodically scan for rooms whose turn has stalled and
// auto-resolve them, and delete stale finished/abandoned rooms.

import type { GameService } from '../service/gameService.js';

export interface JanitorOptions {
  intervalMs?: number; // how often to sweep
  turnTimeoutMs?: number; // a VOTING/MISSION room idle this long is auto-resolved
  roomTtlMs?: number; // a GAME_OVER/LOBBY room idle this long is deleted
  onRoomChanged?: (roomId: string) => void | Promise<void>; // e.g. re-broadcast views
}

export function startJanitor(service: GameService, opts: JanitorOptions = {}): () => void {
  const intervalMs = opts.intervalMs ?? 10_000;
  const turnTimeoutMs = opts.turnTimeoutMs ?? Number(process.env.TURN_TIMEOUT_MS ?? 60_000);
  const roomTtlMs = opts.roomTtlMs ?? Number(process.env.ROOM_TTL_MS ?? 60 * 60 * 1000); // 1h

  let running = false;
  const tick = async () => {
    if (running) return; // never overlap sweeps
    running = true;
    try {
      for (const roomId of await service.roomsNeedingTimeout(turnTimeoutMs)) {
        const next = await service.forceTimeouts(roomId);
        if (next) await opts.onRoomChanged?.(roomId);
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
