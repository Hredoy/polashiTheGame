# Polashi Android Client

Kotlin + Jetpack Compose. **Scaffold** — the pre-game flow and lobby are implemented; the
in-game screens are TODO (see `../docs/ANDROID_PLAN.md`).

The client is a pure render of the server's `PlayerView` (`room:state`) plus thin intent
emission. No game rules live here.

## Open & run

1. Open the `android/` folder in Android Studio (Giraffe+); let Gradle sync.
   - Requires a Gradle wrapper (`gradlew`) — Android Studio generates it on first sync, or
     run `gradle wrapper` if you have Gradle installed. Not committed in this scaffold.
2. Start the backend: `cd ../backend && npm run dev`.
3. Run the app on an **emulator** (it reaches the host backend at `http://10.0.2.2:3000`,
   configured via `SERVER_URL` in `app/build.gradle.kts`). For a physical device, set
   `SERVER_URL` to your machine's LAN IP.

## Implemented

- `net/SocketManager` — socket.io-client wrapper (token auth, reconnect, event flow)
- `model/PlayerView` — serializable mirror of the server view (+ `HistoryItem`)
- `game/GameViewModel` — `StateFlow<PlayerView?>` + history/error/session + all intents
- `ui/` — theme, nav, components (ChapterTrack/ScoreBar/PlayerList), and **all screens**:
  Splash, Login, Home, Lobby, RoleReveal, GameBoard (phase dispatcher), MakeTeam, Voting,
  Mission, ChapterResult (+ Spy investigate), FinalGuess, GameOver, History.

The board (`GameBoardScreen`) renders a persistent score + chapter track and switches phase
content by `PlayerView.status`. Errors surface as a snackbar in `GameScreen`.

## TODO (next session)

- **Compile/sync in Android Studio** — this code was written without an Android SDK in the
  build env, so it has not been run through the compiler yet; expect minor fixes.
- DataStore persistence of the session `token` for reconnect (`room:resume`).
- Theme pass (paper texture, Bengali display font), animations, war SFX.
- Asset catalogue loading (map logical keys → art URLs; see `../docs/ADMIN_PLAN.md`).
