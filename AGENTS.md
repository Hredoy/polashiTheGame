# AGENTS.md — Polashi (Battle of Plassey) multiplayer game

Project guide for AI/dev sessions. Read this first, then `docs/` for detail.

## What this is

An Android multiplayer **hidden-role mission game** (Avalon/Resistance family) themed on
the 1757 Battle of Plassey. 5–10 players, two hidden factions: **Nawab** (green) vs
**EIC** (red), over 5 chapters. Rules were transcribed from a Bangla rulebook — images in
`instruction/`, canonical rules in `docs/GAME_RULES.md`.

## Stack (confirmed)

- **Backend** (`backend/`): Node.js + Socket.IO + Postgres, **TypeScript**, authoritative.
- **Android** (`android/`): Kotlin + Jetpack Compose. UI is a pure render of server
  `room:state` snapshots — **no game rules on the client**.
- **Admin panel + points/shop**: planned, not started — see `docs/ADMIN_PLAN.md`.

## Repo layout

```
backend/          Authoritative game server (DONE — see backend/README.md)
  src/game/         Pure engine: config, types, roles, engine, view (security boundary)
  src/repo/         RoomStore: MemoryStore (dev) + PgStore (optimistic locking)
  src/db/           Postgres pool, schema.sql, migrate
  src/service/      GameService (atomic load->reduce->save), timeouts, mutex
  src/server/       Socket.IO transport
android/          Kotlin + Compose client (SCAFFOLD — see docs/ANDROID_PLAN.md)
instruction/      Original Bangla rulebook images (source of truth for rules)
docs/             Architecture, protocol, rules, roadmap, android & admin plans
```

## Build & test

```bash
# Backend
cd backend
npm install
npm test                       # vitest — must stay green (currently 25 tests)
./node_modules/.bin/tsc --noEmit   # strict typecheck (npx tsc grabs the wrong pkg — don't)
npm run dev                    # in-memory store, no DB needed; GET /health
# Postgres: cp .env.example .env, set DATABASE_URL, npm run migrate
```

> On Windows Git Bash the shell cwd may not persist between tool calls — use absolute
> paths or prefix `cd /d/polashiTheGame/backend &&`.

## Architecture rules (important)

- **The engine (`src/game/engine.ts`) is the single source of game rules.** It's a pure,
  deterministic reducer `reduce(state, action, {rng})`. No I/O, no timers, no Date.now.
- **All secret state stays server-side.** Clients only ever receive `buildPlayerView()`
  output (`src/game/view.ts`) — the full role map never leaves the backend.
- Every mutation goes through `GameService.apply()` (per-room mutex + optimistic version
  check). Add new rules as engine actions, never in the socket/service layer.
- Timers live in the transport layer only (`src/server/socket.ts`), calling
  `GameService.forceTimeouts()`. Keep the engine timer-free.

## Current status

- ✅ Backend core, Spy variant, token auth, **ops hardening** (Redis adapter, janitor-based
  durable timeouts + room TTL, rate limiting, token expiry/rotation) — **35 tests green**
  (incl. Postgres SQL via pg-mem + socket-level e2e). Production-ready.
- 🚧 Android client — scaffold + in-game screens in progress.
- ⬜ Admin panel, points, shop — design only (`docs/ADMIN_PLAN.md`).
- See `docs/ROADMAP.md` for the prioritized next steps and open TODOs.

## Rule decisions (CONFIRMED with product owner 2026-06-23)

1. Win: **EIC at 3, Nawab at 4**; a 3-2 finish → Mir Modon's final guess (brief rule).
2. Failed-vote leader rotation goes **left**.
3. Tie vote = **fail** (answer was garbled — assumed; reconfirm if needed).
4. Timeout default: auto **NO**-vote / auto **SUCCESS**-card.

Details + provenance: `docs/GAME_RULES.md`, memory `polashi-discrepancies`.

## Conventions

- Commit messages end with the Co-Authored-By trailer. Commit only when work is verified
  (tests green). Branch is `main`.
- Keep tests green before every commit. New rules → new engine test.
