CREATE TABLE IF NOT EXISTS "activity_comments" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER REFERENCES "users"("id"),
  "activity_id" INTEGER REFERENCES "activities"("id"),
  "body" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);