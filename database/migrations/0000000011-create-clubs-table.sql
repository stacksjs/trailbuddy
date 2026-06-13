CREATE TABLE IF NOT EXISTS "clubs" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "creator_id" INTEGER,
  "name" TEXT,
  "description" TEXT,
  "location" TEXT,
  "club_type" TEXT CHECK ("club_type" IN ('Running', 'Hiking', 'Mixed', 'Territory Game')),
  "is_private" INTEGER,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);