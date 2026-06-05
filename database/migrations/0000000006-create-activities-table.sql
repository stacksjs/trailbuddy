CREATE TABLE IF NOT EXISTS "activities" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "activity_type" TEXT CHECK ("activity_type" IN ('Trail Run', 'Hike', 'Walk', 'Bike')),
  "distance" INTEGER,
  "duration" TEXT,
  "pace" TEXT,
  "elevation" INTEGER,
  "kudos_count" INTEGER,
  "notes" TEXT,
  "gpx_data" TEXT,
  "completed_at" TEXT,
  "user_id" INTEGER REFERENCES "users"("id"),
  "trail_id" INTEGER REFERENCES "trails"("id"),
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);