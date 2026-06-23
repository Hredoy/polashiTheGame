# Android Client Plan

Kotlin + Jetpack Compose. The client is a **pure render** of `room:state` (`PlayerView`)
plus intent emission. No game rules. Theme: Battle-of-Plassey (old paper, Nawab green vs
EIC red, sword/shield, dramatic war SFX) — see brief.

## Module layout (`android/app/src/main/java/com/polashi/`)

```
net/        Socket.IO client wrapper (SocketManager) + event constants
model/      Kotlin data classes mirroring PlayerView (kotlinx.serialization)
game/       GameViewModel (holds StateFlow<PlayerView?>, sends intents)
ui/
  nav/        NavGraph + routes
  screens/    One composable per screen (below)
  theme/      Colors, type, paper background, components
  components/ VoteCard, CharacterCard, PlayerSeat, ChapterTrack, etc.
```

## Screens (brief's 13) → phase mapping

| # | Screen | Driven by | Status |
|--|--|--|--|
| 1 | Splash | — | scaffold |
| 2 | Login / guest name | — | scaffold |
| 3 | Home (Create/Join) | — | scaffold |
| 4 | Join room (enter code) | — | scaffold |
| 5 | Lobby (players + Ready) | `LOBBY` | scaffold |
| 6 | Character reveal | `ROLE_REVEAL` (`self`) | ✅ done |
| 7 | Game board | all in-game phases | ✅ done |
| 8 | Make Team | `TEAM_PROPOSAL` + `isShobapoti` | ✅ done |
| 9 | Voting | `VOTING` | ✅ done |
| 10 | Mission submit | `MISSION` + in `memberIds` | ✅ done |
| 11 | Chapter result | `CHAPTER_RESULT` | ✅ done |
| 12 | Final result | `GAME_OVER` (`rolesReveal`) | ✅ done |
| 13 | History / summary | `history:list` | ✅ done |

Spy-variant UI: investigate prompt when `spy.mustInvestigate`, findings shown from
`spy.myFindings` — ✅ done (in `ChapterResultContent`).

> All in-game screens are implemented as a pure render of `PlayerView` in
> `ui/screens/GamePhases.kt`, `GameEndPhases.kt`, `GameBoardScreen.kt`, `GameScreen.kt`,
> `HistoryScreen.kt`. **Not yet compiled** in Android Studio (no SDK in the build env) — a
> sync/build pass + theming/animation polish is the remaining work.

## State flow

1. App connects with `auth { userId?, name }`; stores `userId` from `session` (DataStore).
2. `GameViewModel` exposes `StateFlow<PlayerView?>`; every `room:state` updates it.
3. UI navigates by `playerView.status`. One `GameBoardScreen` switches sub-UI by phase, with
   modals for team/vote/mission so the board stays visible.
4. Intents are thin: `vm.castVote("YES")` → `socket.emit("vote:cast", {value})`.
5. `error:game` → snackbar.

## Reconnect

- Persist `userId` + last `roomId`. On launch, if a `roomId` exists, emit `room:resume`.
- Show a "reconnecting" overlay while socket is down; Socket.IO auto-reconnects.

## Asset loading (ties to admin panel)

- The server sends logical keys only (e.g. `characterKey`). The app maps keys → image/anim
  URLs from `/api/catalogue` (see `docs/ADMIN_PLAN.md`), cached. Art changes need no release.
- Until the catalogue API exists, ship bundled placeholder art keyed the same way.

## Libraries

- `io.socket:socket.io-client` (or OkHttp-based), `kotlinx-serialization-json`,
  Compose Navigation, DataStore, Coil (remote images), Media3/SoundPool (SFX).

## Next steps

1. Open `android/` in Android Studio; sync Gradle; run against `npm run dev` backend
   (use `10.0.2.2:3000` from the emulator).
2. Implement RoleReveal → GameBoard with phase modals (the core loop).
3. Theme pass + animations. Then History + profile/shop (after admin API).
```
