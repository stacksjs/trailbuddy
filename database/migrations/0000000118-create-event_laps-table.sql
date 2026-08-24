CREATE TABLE IF NOT EXISTS "event_laps" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "event_id" INTEGER not null REFERENCES "events"("id"),
  "user_id" INTEGER not null REFERENCES "users"("id"),
  "yard_number" INTEGER not null,
  "started_at" TEXT,
  "finished_at" TEXT not null,
  "duration_seconds" INTEGER NOT NULL DEFAULT 0,
  "distance" REAL,
  "activity_id" INTEGER REFERENCES "activities"("id"),
  "source" TEXT CHECK ("source" IN ('recorder', 'manual', 'import')) NOT NULL DEFAULT 'recorder',
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);

-- Lap reporting is retried from a queue when a phone regains signal, so a
-- duplicate has to resolve to "already recorded" rather than a second yard.
CREATE UNIQUE INDEX IF NOT EXISTS "event_laps_event_user_yard_unique" ON "event_laps" ("event_id", "user_id", "yard_number");
CREATE INDEX IF NOT EXISTS "event_laps_event_finished_index" ON "event_laps" ("event_id", "finished_at");
