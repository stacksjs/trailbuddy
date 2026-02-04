CREATE TABLE IF NOT EXISTS "user_achievements" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "progress" REAL,
  "completed_at" TEXT,
  "is_complete" INTEGER,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT
);