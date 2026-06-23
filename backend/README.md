# Polashi Backend

Authoritative game server for **Polashi** (Battle of Plassey), a hidden-role mission game
(Avalon/Resistance family). Node.js + Socket.IO + Postgres, TypeScript.

All game rules and role visibility are enforced **server-side**. The full role map never
leaves the backend — each client receives a per-recipient filtered view.

## Architecture

```
src/game/      Pure, deterministic engine (no I/O)
  config.ts      Rule tables from the rulebook (team sizes, distribution, two-fail chapters)
  types.ts       Domain model + GameState
  roles.ts       Role dealing + night-reveal knowledge map
  engine.ts      Validated state-machine reducer (the single source of rules)
  view.ts        Security boundary — projects GameState down to one recipient
src/repo/      Persistence (RoomStore: MemoryStore | PgStore, optimistic locking)
src/db/        Postgres pool + schema.sql + migrate
src/service/   GameService — atomic load→reduce→save per room (keyed mutex + version check)
src/server/    Socket.IO transport (input validation + per-recipient broadcast)
src/index.ts   Entry point
```

## Run

```bash
npm install
npm test                 # 19 tests: engine rules + service e2e
npm run dev              # in-memory store (no DB needed)

# With Postgres:
cp .env.example .env     # set DATABASE_URL
npm run migrate
npm run dev
```

`GET /health` → `{ ok, store }`.

## Socket API

Handshake auth: `{ userId?, name }`. Server replies `session { userId, name }` (guests get an id).

**Client → Server**

| Event | Payload | Effect |
|---|---|---|
| `room:create` | — | create room, host seated; replies `room:created { roomId, code }` |
| `room:join` | `{ code }` | join by share code |
| `room:resume` | `{ roomId }` | reconnect to an in-progress room |
| `player:ready` | `{ ready }` | lobby ready toggle |
| `settings:set` | `{ optionalCharacters[], spyVariant }` | host-only, lobby-only |
| `game:start` | — | host-only; deals roles, runs night reveal |
| `role:ack` | — | acknowledge character reveal |
| `team:propose` | `{ memberIds[] }` | Shobapoti only |
| `vote:cast` | `{ value: YES\|NO }` | one vote per player |
| `mission:submit` | `{ card: SUCCESS\|BETRAYER }` | team members only; Nawab can't BETRAYER |
| `chapter:advance` | — | host-only, after a chapter result |
| `final:guess` | `{ targetId }` | Mir Modon only |
| `history:list` | — | replies `history:list [...]` |

**Server → Client**

- `room:state` — the recipient's filtered `PlayerView` (pushed after every change)
- `room:created`, `session`, `history:list`
- `error:game` — `{ code, message }` on any rejected action

## Rule provenance & open questions

Rules transcribed from the Bangla rulebook images. Four points differ from the original
written brief and are currently implemented per the **rulebook** — see
`../instruction/` and the project memory `polashi-discrepancies`:

1. Win = first to **3** chapters (Nawab's 3rd triggers Mir Modon's final guess), not 4.
2. Failed-vote rotation goes **left**, not right.
3. Tie vote counts as a **fail**.
4. Disconnect/timeout auto-actions (auto No-vote / auto Success-card) — **TODO**, not yet implemented.

The optional characters (Mohan Lal, Rai Durlabh, Umichand, Ghaseti Begum) and the Spy
variant are modelled in types/config; optional-character night reveal is implemented,
the Spy variant is **TODO**.
