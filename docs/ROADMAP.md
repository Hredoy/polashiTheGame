# Roadmap & Status

## Done ✅

- **Backend engine**: rules, role dealing, night reveal, validated state machine, view
  filter (security boundary). Pure & deterministic.
- **Persistence**: MemoryStore (dev) + PgStore (Postgres, optimistic locking); schema +
  migration; result/history persistence.
- **Service**: `GameService.apply()` — atomic per-room mutate; result writing at game over.
- **Transport**: Socket.IO — all events, per-recipient broadcast, reconnect.
- **Spy variant**: full implementation + tests.
- **Disconnect-timeout**: auto NO-vote / SUCCESS-card on stalled phases.
- **Token auth**: HMAC-signed session tokens; clients cannot assert an arbitrary userId
  (impersonation closed). Auth failure disconnects before any handler runs.
- **Tests**: 32 passing — engine, spy, service e2e, timeout, **Postgres SQL via pg-mem**,
  **socket-level e2e** (privacy + impersonation). Strict typecheck clean.
- **Docs**: this set + `CLAUDE.md` + `backend/README.md`.

## In progress 🚧

- **Android client** (`android/`): scaffold only — see `docs/ANDROID_PLAN.md`.
  - Done in scaffold: Gradle config, socket client, `PlayerView` models, `GameViewModel`,
    navigation, Splash/Login/Home/Lobby screens.
  - Remaining: RoleReveal, GameBoard, MakeTeam, Voting, Mission, ChapterResult,
    FinalResult, History screens; theming/animations; asset loading.

## Not started ⬜

- **Admin panel** (`docs/ADMIN_PLAN.md`): characters/cards/assets CRUD, users, history,
  points & shop management, audit logs. Suggested: Laravel Filament or React Admin over a
  REST API on the same Postgres.
- **Points & shop**: earn points post-match; cosmetic upgrades/unlocks. Schema + endpoints
  drafted in `docs/ADMIN_PLAN.md`. **Must never expose hidden roles or affect balance.**
- **Asset delivery**: serve character/card/animation assets from backend so the app can
  update them without a release.

## Ops hardening — DONE ✅

- **Multi-instance**: Socket.IO **Redis adapter** wired conditionally on `REDIS_URL`.
- **Durable timeouts**: replaced per-room in-memory timers with a **janitor** sweep
  (restart-safe, multi-instance-tolerant; uses `rooms.updated_at`).
- **Room TTL**: janitor deletes idle `GAME_OVER`/`LOBBY` rooms (`ROOM_TTL_MS`).
- **Rate limiting**: per-socket token bucket; throttled events get `error:game RATE_LIMITED`.
- **Token expiry + rotation**: tokens carry an `exp` (`SESSION_TTL_MS`) and rotate each connect.

Still optional later: payload size caps beyond zod, structured logging, env-var validation,
a shared distributed lock if running many instances against one DB.

## Open decisions (product owner)

1. Win threshold 3 (rulebook) vs 4 (brief). Currently **3 + Mir Modon guess**.
2. Leader rotation **left** (rulebook) vs right (brief).
3. Timeout auto-action default: **NO-vote / SUCCESS-card**. Confirm.
4. Spy variant: allow at <7 players? Currently allowed (rulebook only *recommends* 7+).

## Suggested next session

1. Stand up Postgres locally, `npm run migrate`, smoke-test a full game with two socket
   clients (or write an integration test using `socket.io-client`).
2. Continue the Android client screens against the running server (backend-first is done).
3. Then admin panel + points/shop as a separate service over the same DB.

## Test/verify commands

```bash
cd backend && npm test && ./node_modules/.bin/tsc --noEmit
cd backend && npm run dev   # GET http://localhost:3000/health
```
