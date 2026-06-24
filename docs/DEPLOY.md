# Deployment — APK, Docker backend, and the public domain

Three parts: build the Android APK, run the backend in Docker, and expose it at
`game.arafatbikecare.com` (via a Cloudflare Tunnel, or a normal reverse proxy on a VPS).

---

## 1. Build the APK

### Debug APK (for testing — no signing needed)
In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

Command line (from `android/`):
```
gradlew.bat assembleDebug
```

### Release APK (for distribution — must be signed)
1. Create a keystore once:
   ```
   keytool -genkey -v -keystore polashi.jks -keyalg RSA -keysize 2048 -validity 10000 -alias polashi
   ```
2. In `android/app/build.gradle.kts` add a signing config + wire it to `release`:
   ```kotlin
   android {
       signingConfigs {
           create("release") {
               storeFile = file("../polashi.jks")
               storePassword = System.getenv("KS_PASS")
               keyAlias = "polashi"
               keyPassword = System.getenv("KEY_PASS")
           }
       }
       buildTypes {
           release {
               isMinifyEnabled = false
               signingConfig = signingConfigs.getByName("release")
               proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
           }
       }
   }
   ```
3. Build: `gradlew.bat assembleRelease` →
   `android/app/build/outputs/apk/release/app-release.apk`.

> For Google Play use **`gradlew.bat bundleRelease`** to produce an `.aab` instead.

### Point the app at the server (important)
Set `SERVER_URL` per build type so debug hits your PC and release hits the domain.
Replace the single `buildConfigField` in `defaultConfig` with one per build type:
```kotlin
buildTypes {
    getByName("debug") {
        buildConfigField("String", "SERVER_URL", "\"http://192.168.88.200:3000\"")
    }
    getByName("release") {
        buildConfigField("String", "SERVER_URL", "\"https://game.arafatbikecare.com\"")
    }
}
```
The Socket.IO client uses `wss://` automatically for `https://` URLs. With HTTPS you can
also drop `android:usesCleartextTraffic="true"` from the manifest.

---

## 2. Run the backend in Docker

Files: `backend/Dockerfile`, `docker-compose.yml` (Postgres + Redis + backend).

```
# from repo root
docker compose up -d --build

# first run only — create the tables:
docker compose run --rm backend node dist/db/migrate.js

# logs / health
docker compose logs -f backend
curl http://localhost:3000/health      # {"ok":true,"store":"pg"}
```

**Before any public deployment**, edit `docker-compose.yml`:
- `SESSION_SECRET` → a long random string
- `POSTGRES_PASSWORD` (and the matching password in `DATABASE_URL`)

Data persists in the `pgdata` volume. Redis enables multi-instance scaling (the backend
auto-attaches the adapter when `REDIS_URL` is set).

---

## 3. Expose it at game.arafatbikecare.com

### Option A — Cloudflare Tunnel (recommended; no public IP / port-forwarding needed)
The backend can run on your PC or any machine; the tunnel gives it a public HTTPS hostname
with WebSocket support. See `deploy/cloudflared/config.example.yml` for the full steps:
```
cloudflared tunnel login
cloudflared tunnel create polashi
cloudflared tunnel route dns polashi game.arafatbikecare.com
# put config.yml in ~/.cloudflared/, then:
cloudflared tunnel run polashi
```
This maps `https://game.arafatbikecare.com` → `http://localhost:3000` (the Docker port).
TLS is handled by Cloudflare; the app connects over `wss://` automatically.

### Option B — VPS + reverse proxy (if you have a server with a public IP)
Run `docker compose up -d` on the VPS and put **Caddy** in front for automatic TLS:
```
# Caddyfile
game.arafatbikecare.com {
    reverse_proxy localhost:3000
}
```
Caddy fetches a Let's Encrypt cert and proxies WebSockets transparently. Point the domain's
DNS A record at the VPS IP.

---

## Admin asset panel

The backend serves a built-in upload page for the game logo, character cards, vote/mission
cards, captain crown, and faction stamps. Images are stored on disk (the `uploads` Docker
volume) and served at `/uploads/<slot>`; the Android app loads them by slot via Coil and
falls back to text when a slot is empty.

- Set **`ADMIN_TOKEN`** (in the root `.env`, injected by compose). Required for any public
  deployment — without it the page is open.
- Open `https://game.arafatbikecare.com/admin?key=YOUR_ADMIN_TOKEN` and upload per slot.
- `GET /assets/catalog` (public) lists which slots have images.

## Checklist
- [ ] `docker compose up -d --build` → `/health` returns `store:pg`
- [ ] Ran the one-off migration
- [ ] Changed `SESSION_SECRET` + DB password
- [ ] Tunnel (or proxy) serving `https://game.arafatbikecare.com`
- [ ] Release `SERVER_URL` set to the domain; signed release APK built
- [ ] Installed the APK and created a room end-to-end
