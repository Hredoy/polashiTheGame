# Admin Panel, Points & Shop — Design

Not yet built. This is the implementation spec for a future session. Build as a separate
service (REST + admin UI) over the **same Postgres** the game server uses.

## Tech recommendation

- **Admin UI**: Laravel + Filament (fast CRUD, auth, media, audit) **or** React Admin.
- **API**: REST endpoints consumed by the Android app for assets, profile, points, shop.
- **Storage**: images/animations in cloud storage (S3/GCS) or local disk; serve URLs.
- Keep the realtime game server (Node) as-is; admin/API can be a sibling service.

## Admin modules

1. **Characters** — key, side (Nawab/EIC), power text (localizable), image, enabled.
2. **Cards & tokens** — Success, Betrayer, Yes, No, loyalty, chapter-map, team token,
   Shobapoti marker; image + enabled.
3. **Assets/animations** — entry, victory, chapter-intro, team-reveal; type, file, enabled.
4. **Room/game settings** — default timeouts, allowed optional characters, spy-variant flag.
5. **Users & profiles** — name, avatar/frame, points balance, ban/disable.
6. **Game history** — browse `game_results` + participants.
7. **Points/rewards** — configure earn rules, manual grants.
8. **Shop** — items, prices, categories, enable/disable.
9. **Audit log** — every admin change (actor, action, before/after, timestamp).

## Schema additions (new tables)

```sql
-- Asset catalogue (app loads active assets from here)
characters_catalogue (id, key UNIQUE, side, power_text JSONB, image_url, enabled, updated_at)
cards_catalogue      (id, key UNIQUE, kind, image_url, enabled, updated_at)
assets               (id, key, kind, url, enabled, meta JSONB, updated_at)
game_config          (id PK=1, settings JSONB, updated_at)

-- Economy
profiles             (user_id PK->users.id, display_name, avatar_url, frame_id, points INT, badges JSONB)
point_ledger         (id, user_id, delta INT, reason, ref, created_at)         -- append-only
shop_items           (id, sku UNIQUE, category, name, price INT, asset_id, enabled, meta JSONB)
purchases            (id, user_id, item_id, price_paid INT, created_at)        -- idempotent per (user,item) for non-consumables
unlocks              (user_id, item_id, source, created_at, PRIMARY KEY(user_id,item_id))
upgrades             (user_id, character_key, tier INT, cosmetic JSONB, PRIMARY KEY(user_id,character_key))

-- Governance
admin_users          (id, email, role, created_at)
audit_log            (id, actor_id, action, target, before JSONB, after JSONB, created_at)
```

## API endpoints (app-facing)

```
GET  /api/catalogue            -> active characters, cards, assets, config (cacheable)
GET  /api/profile              -> my profile, points, unlocks, upgrades
GET  /api/shop                 -> enabled shop items
POST /api/shop/purchase        { itemId }  -> deduct points (txn), record purchase+unlock
POST /api/upgrades             { characterKey } -> spend points for next cosmetic tier
GET  /api/history?limit=       -> my match history (or reuse socket history:list)
```

Points are **awarded server-side** by the game server at `GAME_OVER` (write to
`point_ledger`); the admin API only spends/configures. Keep earn logic in one place.

## Security rules (hard requirements)

- **Cosmetic only.** Purchases/upgrades must never change game rules, visibility, or
  balance. Character "power upgrades" are visual tiers only.
- **No role leakage.** Shop/skin/animation state must not reveal a player's hidden role to
  others. Entry/victory animations only play at moments where role is already public
  (lobby, game over) or are self-only.
- **Server-authoritative economy.** Validate price, balance, enabled flag, and ownership in
  a DB transaction. Idempotent purchases (no double-spend on retry).
- **Admin auth + audit.** All mutations behind admin auth; write `audit_log` for each.
- **Enable/disable** any item without an app release; app reads the live catalogue.

## App integration flow

1. On launch, app fetches `/api/catalogue` (assets, config) and caches with an ETag.
2. Game server only sends logical keys (e.g. `characterKey: "MIR_MODON"`); the app maps
   keys → active image/animation URLs from the catalogue. Swapping art = admin change only.
3. Profile/shop screens hit the REST API; gameplay stays on the socket.
