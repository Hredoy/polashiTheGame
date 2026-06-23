// Server entrypoint. Picks Postgres when DATABASE_URL is set, otherwise in-memory.

import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { hasDatabase } from './db/pool.js';
import { MemoryStore } from './repo/memoryStore.js';
import { PgStore } from './repo/pgStore.js';
import type { RoomStore } from './repo/store.js';
import { GameService } from './service/gameService.js';
import { attachSockets } from './server/socket.js';

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

attachSockets(io, service);

httpServer.listen(PORT, () => {
  console.log(`[polashi] server listening on :${PORT}`);
});
