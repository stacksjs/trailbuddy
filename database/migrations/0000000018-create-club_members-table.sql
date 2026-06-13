CREATE TABLE IF NOT EXISTS "club_members" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "club_id" INTEGER REFERENCES "clubs"("id"),
  "user_id" INTEGER REFERENCES "users"("id"),
  "role" TEXT CHECK ("role" IN ('owner', 'admin', 'member')),
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);