CREATE TABLE IF NOT EXISTS "activities" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "activity_type" TEXT,
  "distance" REAL,
  "duration" TEXT,
  "pace" TEXT,
  "elevation" REAL,
  "kudos_count" REAL,
  "notes" TEXT,
  "gpx_data" TEXT,
  "completed_at" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT
);