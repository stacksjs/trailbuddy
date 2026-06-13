CREATE TABLE IF NOT EXISTS "activities" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER REFERENCES "users"("id"),
  "trail_id" INTEGER REFERENCES "trails"("id"),
  "activity_type" TEXT CHECK ("activity_type" IN ('Trail Run', 'Hike', 'Walk', 'Bike')),
  "distance" REAL,
  "duration" TEXT,
  "moving_time" TEXT,
  "pace" TEXT,
  "elevation" REAL,
  "kudos_count" INTEGER,
  "notes" TEXT,
  "gpx_data" TEXT,
  "splits" TEXT,
  "completed_at" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);