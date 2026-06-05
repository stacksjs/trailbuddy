CREATE TABLE IF NOT EXISTS "kudos" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "giver_id" INTEGER,
  "user_id" INTEGER REFERENCES "users"("id"),
  "activity_id" INTEGER REFERENCES "activities"("id"),
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);