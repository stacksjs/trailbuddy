CREATE TABLE IF NOT EXISTS "saved_trails" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER REFERENCES "users"("id"),
  "trail_id" INTEGER REFERENCES "trails"("id"),
  "notes" TEXT,
  "want_to_visit" INTEGER,
  "has_visited" INTEGER,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);