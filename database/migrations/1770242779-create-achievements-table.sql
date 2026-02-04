CREATE TABLE IF NOT EXISTS "achievements" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT,
  "description" TEXT,
  "icon" TEXT,
  "category" TEXT,
  "target_value" REAL,
  "target_unit" TEXT,
  "points" REAL,
  "badge_color" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT
);