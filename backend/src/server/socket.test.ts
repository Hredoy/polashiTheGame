// End-to-end transport test: real Socket.IO server + real socket.io-client over an
// ephemeral port, backed by MemoryStore. Proves the wire protocol, per-recipient privacy,
// and token-based auth (impersonation prevention).

import { createServer, type Server as HttpServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '../repo/memoryStore.js';
import { GameService } from '../service/gameService.js';
import { attachSockets } from './socket.js';
import type { PlayerView } from '../game/view.js';

let http: HttpServer;
let io: Server;
let url: string;

beforeEach(async () => {
  http = createServer();
  io = new Server(http);
  attachSockets(io, new GameService(new MemoryStore()));
  await new Promise<void>((res) => http.listen(0, res));
  url = `http://localhost:${(http.address() as AddressInfo).port}`;
});

afterEach(async () => {
  io.close();
  await new Promise<void>((res) => http.close(() => res()));
});

// A test client that tracks its session and latest view, with promise-based waits.
class Client {
  socket: ClientSocket;
  userId = '';
  token = '';
  view: PlayerView | null = null;
  code: string | null = null;

  constructor(name: string, token?: string) {
    this.socket = ioClient(url, {
      auth: token ? { name, token } : { name },
      transports: ['websocket'],
      forceNew: true,
    });
    this.socket.on('session', (s: any) => {
      this.userId = s.userId;
      this.token = s.token;
    });
    this.socket.on('room:state', (v: PlayerView) => (this.view = v));
    this.socket.on('room:created', (r: any) => (this.code = r.code));
  }

  emit(event: string, payload?: unknown) {
    this.socket.emit(event, payload ?? {});
  }

  async ready(): Promise<this> {
    await waitUntil(() => this.userId !== '');
    return this;
  }

  close() {
    this.socket.close();
  }
}

function waitUntil(pred: () => boolean, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (pred()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('waitUntil timed out'));
      setTimeout(tick, 15);
    };
    tick();
  });
}

const myPlayer = (c: Client) => c.view?.players.find((p) => p.id === c.userId);

describe('socket transport e2e', () => {
  it('runs lobby -> role reveal with per-recipient privacy', async () => {
    const host = await new Client('Host').ready();
    host.emit('room:create');
    await waitUntil(() => host.code !== null && host.view?.status === 'LOBBY');

    const others: Client[] = [];
    for (let i = 1; i < 5; i++) {
      const c = await new Client(`P${i}`).ready();
      c.emit('room:join', { code: host.code });
      await waitUntil(() => c.view?.status === 'LOBBY');
      others.push(c);
    }
    const all = [host, ...others];
    await waitUntil(() => host.view!.players.length === 5);

    for (const c of all) c.emit('player:ready', { ready: true });
    await waitUntil(() => all.every((c) => myPlayer(c)?.ready === true));

    host.emit('game:start');
    await waitUntil(() => all.every((c) => c.view?.status === 'ROLE_REVEAL'));

    // Each client sees ONLY its own role; the full role map is never sent pre-game-over.
    for (const c of all) {
      expect(c.view!.self).not.toBeNull();
      expect(c.view!.self!.characterKey).toBeTruthy();
      expect(c.view!.rolesReveal).toBeUndefined();
      // No other player's entry carries a character key.
      for (const p of c.view!.players) {
        expect((p as any).characterKey).toBeUndefined();
      }
    }

    // Exactly one Mir Modon across the table, and only that client knows it's them.
    const mirModons = all.filter((c) => c.view!.self!.characterKey === 'MIR_MODON');
    expect(mirModons).toHaveLength(1);

    all.forEach((c) => c.close());
  });

  it('hides individual votes until everyone has voted', async () => {
    const host = await new Client('Host').ready();
    host.emit('room:create');
    await waitUntil(() => host.view?.status === 'LOBBY');
    const all = [host];
    for (let i = 1; i < 5; i++) {
      const c = await new Client(`P${i}`).ready();
      c.emit('room:join', { code: host.code });
      await waitUntil(() => c.view?.status === 'LOBBY');
      all.push(c);
    }
    await waitUntil(() => host.view!.players.length === 5);
    for (const c of all) c.emit('player:ready', { ready: true });
    await waitUntil(() => all.every((c) => myPlayer(c)?.ready));
    host.emit('game:start');
    await waitUntil(() => all.every((c) => c.view?.status === 'ROLE_REVEAL'));
    for (const c of all) c.emit('role:ack');
    await waitUntil(() => all.every((c) => c.view?.status === 'TEAM_PROPOSAL'));

    const leader = all.find((c) => myPlayer(c)!.isShobapoti)!;
    const size = leader.view!.chapters.find((ch) => ch.index === leader.view!.chapterIndex)!.teamSize;
    const memberIds = leader.view!.players.slice(0, size).map((p) => p.id);
    leader.emit('team:propose', { memberIds });
    await waitUntil(() => all.every((c) => c.view?.status === 'VOTING'));

    // One vote in: tally must still be hidden.
    host.emit('vote:cast', { value: 'YES' });
    await waitUntil(() => host.view!.current!.votedPlayerIds.includes(host.userId));
    expect(host.view!.current!.tally).toBeUndefined();

    // Everyone votes: proposal passes, mission begins.
    for (const c of all.filter((c) => c !== host)) c.emit('vote:cast', { value: 'YES' });
    await waitUntil(() => all.every((c) => c.view?.status === 'MISSION'));

    all.forEach((c) => c.close());
  });

  it('rejects forged tokens and honours valid ones (no impersonation)', async () => {
    const a = await new Client('Alice').ready();
    expect(a.userId).toBeTruthy();
    expect(a.token).toBeTruthy();

    // A forged token does NOT grant Alice's id — a fresh id is minted instead.
    const forged = await new Client('Mallory', 'aGFjaw.deadbeef').ready();
    expect(forged.userId).not.toBe(a.userId);

    // Reconnecting with Alice's real token restores the same id.
    const reconnect = await new Client('Alice', a.token).ready();
    expect(reconnect.userId).toBe(a.userId);

    a.close();
    forged.close();
    reconnect.close();
  });
});
