// Server entrypoint. Picks Postgres when DATABASE_URL is set, otherwise in-memory.
// Optional Redis adapter for multi-instance fan-out when REDIS_URL is set.

import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { hasDatabase } from './db/pool.js';
import { MemoryStore } from './repo/memoryStore.js';
import { PgStore } from './repo/pgStore.js';
import type { RoomStore } from './repo/store.js';
import { GameService } from './service/gameService.js';
import { startJanitor } from './server/janitor.js';
import { attachSockets, broadcastRoom } from './server/socket.js';

const PORT = Number(process.env.PORT ?? 3000);

const store: RoomStore = hasDatabase() ? new PgStore() : new MemoryStore();
if (!hasDatabase()) {
  console.warn('[polashi] DATABASE_URL not set — using in-memory store (state lost on restart).');
}

const service = new GameService(store);

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, store: hasDatabase() ? 'pg' : 'memory' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN ?? '*' },
});

// Optional horizontal scaling: share Socket.IO events across instances via Redis.
async function maybeAttachRedis(): Promise<void> {
  if (!process.env.REDIS_URL) return;
  const [{ createAdapter }, { createClient }] = await Promise.all([
    import('@socket.io/redis-adapter'),
    import('redis'),
  ]);
  const pub = createClient({ url: process.env.REDIS_URL });
  const sub = pub.duplicate();
  await Promise.all([pub.connect(), sub.connect()]);
  io.adapter(createAdapter(pub, sub));
  console.log('[polashi] Redis adapter attached (multi-instance mode).');
}

attachSockets(io, service);

// Durable, restart-safe turn timeouts + stale-room cleanup.
startJanitor(service, {
  onRoomChanged: (roomId) => broadcastRoom(io, service, roomId),
});

maybeAttachRedis().catch((e) => console.error('[polashi] Redis adapter failed', e));

httpServer.listen(PORT, () => {
  console.log(`[polashi] server listening on :${PORT}`);
});
