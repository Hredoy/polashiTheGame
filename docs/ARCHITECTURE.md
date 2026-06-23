# Architecture

## Principle: authoritative server, dumb client

All game rules and secret state live on the server. The Android client renders whatever
`room:state` it receives and sends intents. It cannot compute outcomes or see hidden roles.

```
Android (Compose)            Backend (Node/TS)                     Postgres
─────────────────            ─────────────────────────────        ────────
 GameViewModel  ── socket ─▶ server/socket.ts (validate)
   renders                      │  maps event -> Action
 PlayerView   ◀── room:state ── │
                                ▼
                             service/GameService.apply()  ──────▶ rooms (JSONB state
                                │  KeyedMutex per room              + version, optimistic
                                │  load -> reduce -> save           locking)
                                ▼
                             game/engine.reduce()  (pure)
                                │  validated state machine
                                ▼
                             game/view.buildPlayerView()  ── per-recipient filtering
                                                            (security boundary)
                             on GAME_OVER ─────────────────▶ game_results, game_participants
```

## Layers

| Layer | Dir | Responsibility | Rules of engagement |
|---|---|---|---|
| Engine | `src/game/` | Pure rules + state machine + view filter | No I/O, no timers, no Date/random except injected `rng` |
| Persistence | `src/repo/`, `src/db/` | Store the JSONB state, history | Optimistic locking on `version` |
| Service | `src/service/` | Atomic mutate, results, timeouts | One `apply()` entrypoint; per-room mutex |
| Transport | `src/server/` | Socket.IO, input validation, broadcast, timers | No rules; only shape-validation + fan-out |

## Why a pure engine

- **Testable**: 25 tests drive full games with a seeded RNG, no DB or sockets.
- **Deterministic**: same state + action ⇒ same result, so persistence is just snapshotting.
- **Secure**: the security boundary is one function (`buildPlayerView`) — easy to audit.

## State & concurrency

- The whole `GameState` is one JSONB blob in `rooms.state`, with a denormalised `version`,
  `status`, `host_id`, `player_count` for indexing.
- `GameService.apply()` runs under a per-room `KeyedMutex` (in-process serialization) and
  saves with `WHERE version = expected` (cross-process safety). Conflicts retry up to 3×.

## Adding a feature (checklist)

1. Model new state in `types.ts` (and init it in `createLobby`).
2. Add an `Action` variant + handler in `engine.ts`. Validate everything; throw `GameError`.
3. Expose only what's legal in `view.ts`.
4. Add a socket event in `server/socket.ts` (zod-validate payload → `apply`).
5. Write an engine test. Keep `tsc --noEmit` and `vitest` green. Commit.
