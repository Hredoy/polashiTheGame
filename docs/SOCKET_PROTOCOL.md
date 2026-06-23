# Socket Protocol

Transport: Socket.IO. Server is authoritative; clients send intents and render the
`room:state` they receive. All payloads are zod-validated server-side.

## Handshake

Connect with `auth: { userId?: string, name?: string }`. Guests omit `userId` and get one
back. Server emits:

- `session` → `{ userId, name }` — persist `userId` locally for reconnects.

## Client → Server

| Event | Payload | Phase | Who | Effect |
|---|---|---|---|---|
| `room:create` | — | — | any | Create room; emits `room:created { roomId, code }` |
| `room:join` | `{ code }` | LOBBY | any | Join by share code |
| `room:resume` | `{ roomId }` | any | member | Reconnect; marks connected |
| `player:ready` | `{ ready }` | LOBBY | member | Toggle ready |
| `settings:set` | `{ optionalCharacters: string[], spyVariant: boolean }` | LOBBY | host | Room config |
| `game:start` | — | LOBBY | host | Deal roles, run night reveal |
| `role:ack` | — | ROLE_REVEAL | member | Acknowledge reveal |
| `team:propose` | `{ memberIds: string[] }` | TEAM_PROPOSAL | Shobapoti | Propose mission team |
| `vote:cast` | `{ value: "YES"\|"NO" }` | VOTING | member | One vote each |
| `mission:submit` | `{ card: "SUCCESS"\|"BETRAYER" }` | MISSION | team member | Nawab can't BETRAYER |
| `chapter:advance` | — | CHAPTER_RESULT | host | Next chapter / win check |
| `spy:investigate` | `{ targetId }` | CHAPTER_RESULT (ch 2,3) | current spy | Spy variant |
| `final:guess` | `{ targetId }` | FINAL_GUESS | Mir Modon | Identify Mir Zafar |
| `history:list` | — | — | any | Emits `history:list [...]` |

## Server → Client

| Event | Payload | Notes |
|---|---|---|
| `session` | `{ userId, name }` | After connect |
| `room:created` | `{ roomId, code }` | After `room:create` |
| `room:state` | `PlayerView` | Pushed to each socket after every change, **filtered per recipient** |
| `history:list` | `ResultSummary[]` | After `history:list` |
| `error:game` | `{ code, message }` | On any rejected action (sent only to the actor) |

## PlayerView (the only state the client sees)

See `backend/src/game/view.ts` for the exact type. Key fields:

- `status` — phase: `LOBBY | ROLE_REVEAL | TEAM_PROPOSAL | VOTING | MISSION | CHAPTER_RESULT | FINAL_GUESS | GAME_OVER`
- `players[]` — public info: `{ id, name, seatIndex, ready, connected, ackedRole, isShobapoti }`
- `self` — **your own** `{ characterKey, side, reveals[] }` (night-reveal knowledge), or null pre-deal
- `chapters[]` — `{ index, teamSize, twoFailRequired, winner, betrayerCount? }`
- `wins` — `{ NAWAB, EIC }`
- `current` — proposal: `{ shobapotiSeat, memberIds, votedPlayerIds, tally? }` (individual
  votes hidden until everyone votes)
- `failedProposals` — 0..5
- `finalGuess` — `{ isMine, targetId?, correct? }` or null
- `spy` — `{ enabled, currentSpyId, amCurrentSpy, mustInvestigate, eligibleTargetIds, myFindings[] }` or null
- `winner` — `NAWAB | EIC` or null
- `rolesReveal` — full role map, present **only** at `GAME_OVER`

## Error codes (non-exhaustive)

`NOT_HOST, NOT_SHOBAPOTI, NOT_PLAYER, WRONG_PHASE, BAD_TEAM_SIZE, DUP_MEMBER, BAD_MEMBER,
DUP_VOTE, NOT_TEAM_MEMBER, NAWAB_NO_BETRAYER, DUP_CARD, NOT_MIR_MODON, BAD_TARGET, ROOM_FULL,
NO_ROOM, BAD_SETTINGS, SPY_PENDING, NOT_SPY, PREV_SPY, NO_INVESTIGATION, CONFLICT, BAD_INPUT`
