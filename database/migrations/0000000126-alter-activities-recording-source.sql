-- The `recording_source` CHECK left out 'native_gps'.
--
-- The Activity model, ActivityStoreAction's allow-list, the shared
-- RecordingSource type and useRecorder all carry it — a run recorded in the
-- iOS or Android app sends exactly `native_gps` — but the constraint added in
-- 0000000080 never did, so every native capture failed the INSERT with
-- "CHECK constraint failed: recording_source". SQLite cannot alter a CHECK in
-- place, so the table is rebuilt the same way the other constraint changes in
-- this directory are.
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_activities" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER REFERENCES "users"("id"),
  "trail_id" INTEGER REFERENCES "trails"("id"),
  "activity_type" TEXT CHECK ("activity_type" IN ('Trail Run', 'Hike', 'Walk', 'Bike')) not null,
  "distance" REAL not null,
  "duration" TEXT not null,
  "moving_time" TEXT,
  "pace" TEXT,
  "elevation" REAL,
  "kudos_count" INTEGER,
  "notes" TEXT,
  "gpx_data" TEXT,
  "splits" TEXT,
  "visibility" TEXT CHECK ("visibility" IN ('public', 'followers', 'private')) not null,
  "completed_at" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT,
  "upload_id" TEXT,
  "recording_source" TEXT CHECK ("recording_source" IN ('web_gps', 'native_gps', 'simulation', 'manual', 'file_import', 'garmin')) NOT NULL DEFAULT 'manual',
  "game_mode" TEXT CHECK ("game_mode" IN ('capture', 'free', 'none')) NOT NULL DEFAULT 'none',
  "capture_eligible" INTEGER NOT NULL DEFAULT 0,
  "integrity_status" TEXT CHECK ("integrity_status" IN ('verified', 'unverified', 'rejected')) NOT NULL DEFAULT 'unverified',
  "integrity_reason" TEXT
);
INSERT INTO "_qb_tmp_activities" ("id", "user_id", "trail_id", "activity_type", "distance", "duration", "moving_time", "pace", "elevation", "kudos_count", "notes", "gpx_data", "splits", "visibility", "completed_at", "created_at", "updated_at", "uuid", "upload_id", "recording_source", "game_mode", "capture_eligible", "integrity_status", "integrity_reason") SELECT "id", "user_id", "trail_id", "activity_type", "distance", "duration", "moving_time", "pace", "elevation", "kudos_count", "notes", "gpx_data", "splits", "visibility", "completed_at", "created_at", "updated_at", "uuid", "upload_id", "recording_source", "game_mode", "capture_eligible", "integrity_status", "integrity_reason" FROM "activities";
DROP TABLE "activities";
ALTER TABLE "_qb_tmp_activities" RENAME TO "activities";
CREATE UNIQUE INDEX IF NOT EXISTS "activities_activities_uuid_unique" ON "activities" ("uuid");
CREATE UNIQUE INDEX IF NOT EXISTS "activities_user_upload_unique" ON "activities" ("user_id", "upload_id");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
