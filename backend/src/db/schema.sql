-- Polashi schema. The authoritative game state lives in rooms.state (JSONB); the scalar
-- columns are denormalised from it for indexing and admin queries. History tables are
-- written once at GAME_OVER for the history/summary screens.

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  is_guest    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rooms (
  id            TEXT PRIMARY KEY,
  code          TEXT UNIQUE NOT NULL,
  host_id       TEXT NOT NULL,
  status        TEXT NOT NULL,
  player_count  INT NOT NULL DEFAULT 0,
  state         JSONB NOT NULL,
  version       INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms (code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms (status);
-- Supports the janitor's stalled-turn / stale-room sweeps.
CREATE INDEX IF NOT EXISTS idx_rooms_status_updated ON rooms (status, updated_at);

CREATE TABLE IF NOT EXISTS game_results (
  id            BIGSERIAL PRIMARY KEY,
  room_id       TEXT NOT NULL,
  code          TEXT NOT NULL,
  winner_side   TEXT NOT NULL,
  player_count  INT NOT NULL,
  chapters      JSONB NOT NULL,
  final_guess   JSONB,
  roles         JSONB NOT NULL,
  finished_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_results_room ON game_results (room_id);

CREATE TABLE IF NOT EXISTS game_participants (
  result_id     BIGINT NOT NULL REFERENCES game_results (id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL,
  name          TEXT NOT NULL,
  character_key TEXT NOT NULL,
  side          TEXT NOT NULL,
  won           BOOLEAN NOT NULL,
  PRIMARY KEY (result_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_participants_user ON game_participants (user_id);
