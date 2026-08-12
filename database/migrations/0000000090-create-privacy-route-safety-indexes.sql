CREATE UNIQUE INDEX IF NOT EXISTS "privacy_settings_user_unique"
  ON "user_privacy_settings" ("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "user_blocks_pair_unique"
  ON "user_blocks" ("blocker_id", "blocked_id");

CREATE UNIQUE INDEX IF NOT EXISTS "content_reports_duplicate_unique"
  ON "content_reports" ("reporter_id", "subject_type", "subject_id", "reason");

CREATE INDEX IF NOT EXISTS "content_reports_status_created_index"
  ON "content_reports" ("status", "created_at");

CREATE INDEX IF NOT EXISTS "custom_routes_user_created_index"
  ON "custom_routes" ("user_id", "created_at");
