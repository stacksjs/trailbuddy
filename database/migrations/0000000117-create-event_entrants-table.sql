CREATE TABLE IF NOT EXISTS "event_entrants" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "event_id" INTEGER not null REFERENCES "events"("id"),
  "user_id" INTEGER not null REFERENCES "users"("id"),
  "bib" TEXT,
  "status" TEXT CHECK ("status" IN ('registered', 'running', 'timed_out', 'withdrawn', 'dnf', 'winner')) NOT NULL DEFAULT 'registered',
  "yards_completed" INTEGER NOT NULL DEFAULT 0,
  "last_lap_at" TEXT,
  "exit_note" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_entrants_event_user_unique" ON "event_entrants" ("event_id", "user_id");
CREATE INDEX IF NOT EXISTS "event_entrants_event_yards_index" ON "event_entrants" ("event_id", "yards_completed");
