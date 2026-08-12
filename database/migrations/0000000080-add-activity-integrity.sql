ALTER TABLE "activities" ADD COLUMN "upload_id" TEXT;
ALTER TABLE "activities" ADD COLUMN "recording_source" TEXT CHECK ("recording_source" IN ('web_gps', 'simulation', 'manual', 'file_import', 'garmin')) NOT NULL DEFAULT 'manual';
ALTER TABLE "activities" ADD COLUMN "game_mode" TEXT CHECK ("game_mode" IN ('capture', 'free', 'none')) NOT NULL DEFAULT 'none';
ALTER TABLE "activities" ADD COLUMN "capture_eligible" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "activities" ADD COLUMN "integrity_status" TEXT CHECK ("integrity_status" IN ('verified', 'unverified', 'rejected')) NOT NULL DEFAULT 'unverified';
ALTER TABLE "activities" ADD COLUMN "integrity_reason" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "activities_user_upload_unique"
  ON "activities" ("user_id", "upload_id");
