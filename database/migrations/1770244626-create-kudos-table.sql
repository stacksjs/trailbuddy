CREATE TABLE IF NOT EXISTS "kudos" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "giver_id" REAL,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT
);