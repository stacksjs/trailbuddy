CREATE TABLE IF NOT EXISTS "device_push_tokens" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" TEXT NOT NULL,
  "platform" TEXT NOT NULL CHECK ("platform" IN ('ios', 'android')),
  "device_id" TEXT,
  "environment" TEXT NOT NULL DEFAULT 'production' CHECK ("environment" IN ('development', 'production')),
  "last_seen_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "device_push_tokens_token_unique"
  ON "device_push_tokens" ("token");

CREATE INDEX IF NOT EXISTS "device_push_tokens_user_id_index"
  ON "device_push_tokens" ("user_id");
