// Socket.IO transport. Thin: validates input shape, maps events to engine actions via
// GameService, and pushes per-recipient filtered views. No game rules live here.

import { z } from 'zod';
import type { Server, Socket } from 'socket.io';
import type { Action } from '../game/engine.js';
import { GameError, OPTIONAL_CHARACTERS, type RoomSettings } from '../game/types.js';
import { buildPlayerView } from '../game/view.js';
import type { GameService } from '../service/gameService.js';

interface SocketData {
  userId: string;
  name: string;
  roomId?: string;
}

const settingsSchema = z.object({
  optionalCharacters: z.array(z.enum(OPTIONAL_CHARACTERS as [string, ...string[]])),
  spyVariant: z.boolean(),
});

const TURN_TIMEOUT_MS = Number(process.env.TURN_TIMEOUT_MS ?? 60_000);

// Per-room turn timers. A stalled VOTING/MISSION phase auto-resolves so one missing
// player can't freeze the game. Keyed by room; rescheduled on every state change.
const timers = new Map<string, NodeJS.Timeout>();

function clearTimer(roomId: string) {
  const t = timers.get(roomId);
  if (t) {
    clearTimeout(t);
    timers.delete(roomId);
  }
}

// Send each socket in the room its own filtered view, then (re)arm the turn timer.
async function broadcastViews(io: Server, roomId: string, service: GameService): Promise<void> {
  const state = await service.getState(roomId);
  if (!state) return;
  const sockets = await io.in(roomId).fetchSockets();
  for (const s of sockets) {
    const { userId } = s.data as SocketData;
    s.emit('room:state', buildPlayerView(state, userId));
  }

  clearTimer(roomId);
  if (state.status === 'VOTING' || state.status === 'MISSION') {
    const armedVersion = state.version;
    timers.set(
      roomId,
      setTimeout(() => {
        service
          .forceTimeouts(roomId, armedVersion)
          .then((next) => {
            if (next) return broadcastViews(io, roomId, service);
          })
          .catch((e) => console.error('turn timeout failed', e));
      }, TURN_TIMEOUT_MS),
    );
  }
}

export function attachSockets(io: Server, service: GameService): void {
  io.on('connection', (socket: Socket) => {
    // Handshake auth: { userId?, name }. Guests get a fresh id.
    const auth = socket.handshake.auth as { userId?: string; name?: string };

    const handle = (event: string, fn: (payload: any) => Promise<void>) => {
      socket.on(event, (payload) => {
        fn(payload ?? {}).catch((err) => {
          if (err instanceof GameError) {
            socket.emit('error:game', { code: err.code, message: err.message });
          } else if (err instanceof z.ZodError) {
            socket.emit('error:game', { code: 'BAD_INPUT', message: 'Invalid payload' });
          } else {
            console.error('socket handler error', event, err);
            socket.emit('error:game', { code: 'INTERNAL', message: 'Server error' });
          }
        });
      });
    };

    const data = socket.data as SocketData;

    const apply = async (action: Action) => {
      const roomId = data.roomId;
      if (!roomId) throw new GameError('NO_ROOM', 'Not in a room');
      await service.apply(roomId, action);
      await broadcastViews(io, roomId, service);
    };

    const enterRoom = async (roomId: string) => {
      data.roomId = roomId;
      await socket.join(roomId);
    };

    // ---- session bootstrap ----
    (async () => {
      const user = await service.ensureUser(auth.userId, (auth.name ?? 'Player').slice(0, 24));
      data.userId = user.id;
      data.name = user.name;
      socket.emit('session', { userId: user.id, name: user.name });
    })().catch((e) => console.error('session init failed', e));

    // ---- room lifecycle ----
    handle('room:create', async () => {
      const state = await service.createRoom(data.userId, data.name);
      await enterRoom(state.roomId);
      socket.emit('room:created', {
        roomId: state.roomId,
        code: await service.codeFor(state.roomId),
      });
      await broadcastViews(io, state.roomId, service);
    });

    handle('room:join', async (p) => {
      const { code } = z.object({ code: z.string().min(4) }).parse(p);
      const state = await service.resolveCode(code);
      await enterRoom(state.roomId);
      await apply({ type: 'JOIN', actorId: data.userId, name: data.name });
    });

    handle('room:resume', async (p) => {
      const { roomId } = z.object({ roomId: z.string() }).parse(p);
      const state = await service.getState(roomId);
      if (!state) throw new GameError('NO_ROOM', 'Room not found');
      await enterRoom(roomId);
      await apply({ type: 'SET_CONNECTED', actorId: data.userId, connected: true });
    });

    // ---- lobby ----
    handle('player:ready', async (p) => {
      const { ready } = z.object({ ready: z.boolean() }).parse(p);
      await apply({ type: 'SET_READY', actorId: data.userId, ready });
    });

    handle('settings:set', async (p) => {
      const settings = settingsSchema.parse(p) as RoomSettings;
      await apply({ type: 'SET_SETTINGS', actorId: data.userId, settings });
    });

    handle('game:start', async () => {
      await apply({ type: 'START_GAME', actorId: data.userId });
    });

    // ---- in-game ----
    handle('role:ack', async () => {
      await apply({ type: 'ACK_ROLE', actorId: data.userId });
    });

    handle('team:propose', async (p) => {
      const { memberIds } = z.object({ memberIds: z.array(z.string()) }).parse(p);
      await apply({ type: 'PROPOSE_TEAM', actorId: data.userId, memberIds });
    });

    handle('vote:cast', async (p) => {
      const { value } = z.object({ value: z.enum(['YES', 'NO']) }).parse(p);
      await apply({ type: 'CAST_VOTE', actorId: data.userId, value });
    });

    handle('mission:submit', async (p) => {
      const { card } = z.object({ card: z.enum(['SUCCESS', 'BETRAYER']) }).parse(p);
      await apply({ type: 'SUBMIT_CARD', actorId: data.userId, card });
    });

    handle('chapter:advance', async () => {
      await apply({ type: 'ADVANCE_CHAPTER', actorId: data.userId });
    });

    handle('spy:investigate', async (p) => {
      const { targetId } = z.object({ targetId: z.string() }).parse(p);
      await apply({ type: 'INVESTIGATE', actorId: data.userId, targetId });
    });

    handle('final:guess', async (p) => {
      const { targetId } = z.object({ targetId: z.string() }).parse(p);
      await apply({ type: 'FINAL_GUESS', actorId: data.userId, targetId });
    });

    handle('history:list', async () => {
      const items = await service.userHistory(data.userId);
      socket.emit('history:list', items);
    });

    socket.on('disconnect', () => {
      const roomId = data.roomId;
      if (!roomId) return;
      service
        .apply(roomId, { type: 'SET_CONNECTED', actorId: data.userId, connected: false })
        .then(() => broadcastViews(io, roomId, service))
        .catch(() => undefined); // room may be gone
    });
  });
}
