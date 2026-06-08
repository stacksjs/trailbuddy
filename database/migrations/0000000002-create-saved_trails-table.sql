CREATE TABLE IF NOT EXISTS "saved_trails" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "notes" TEXT,
  "want_to_visit" INTEGER,
  "has_visited" INTEGER,
  "user_id" INTEGER REFERENCES "users"("id"),
  "trail_id" INTEGER REFERENCES "trails"("id"),
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);