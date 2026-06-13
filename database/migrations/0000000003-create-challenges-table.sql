CREATE TABLE IF NOT EXISTS "challenges" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "challenger_id" INTEGER,
  "challenged_id" INTEGER,
  "territory_id" INTEGER REFERENCES "territories"("id"),
  "area_at_stake" INTEGER,
  "status" TEXT CHECK ("status" IN ('pending', 'active', 'completed', 'declined')),
  "winner_id" INTEGER,
  "deadline" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);