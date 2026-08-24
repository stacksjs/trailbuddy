CREATE TABLE IF NOT EXISTS "events" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "host_id" INTEGER not null REFERENCES "users"("id"),
  "club_id" INTEGER REFERENCES "clubs"("id"),
  "trail_id" INTEGER REFERENCES "trails"("id"),
  "name" TEXT not null,
  "description" TEXT,
  "location" TEXT,
  "event_type" TEXT CHECK ("event_type" IN ('backyard', 'race', 'group_run', 'time_trial')) NOT NULL DEFAULT 'backyard',
  "status" TEXT CHECK ("status" IN ('scheduled', 'live', 'finished', 'cancelled')) NOT NULL DEFAULT 'scheduled',
  "visibility" TEXT CHECK ("visibility" IN ('public', 'club', 'private')) NOT NULL DEFAULT 'public',
  "loop_distance" REAL NOT NULL DEFAULT 4.167,
  "loop_route" TEXT,
  "yard_minutes" INTEGER NOT NULL DEFAULT 60,
  "start_time" TEXT not null,
  "max_yards" INTEGER,
  "winner_id" INTEGER REFERENCES "users"("id"),
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);

CREATE INDEX IF NOT EXISTS "events_status_start_index" ON "events" ("status", "start_time");
CREATE INDEX IF NOT EXISTS "events_club_index" ON "events" ("club_id");
