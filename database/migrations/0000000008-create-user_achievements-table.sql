CREATE TABLE IF NOT EXISTS "user_achievements" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "progress" INTEGER,
  "completed_at" TEXT,
  "is_complete" INTEGER,
  "user_id" INTEGER REFERENCES "users"("id"),
  "achievement_id" INTEGER REFERENCES "achievements"("id"),
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);