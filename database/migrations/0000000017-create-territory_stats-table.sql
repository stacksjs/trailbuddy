CREATE TABLE IF NOT EXISTS "territory_stats" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER REFERENCES "users"("id"),
  "total_territories_owned" INTEGER,
  "total_area_owned" REAL,
  "territories_claimed" INTEGER,
  "territories_conquered" INTEGER,
  "territories_lost" INTEGER,
  "territories_defended" INTEGER,
  "longest_ownership_days" INTEGER,
  "largest_territory_area" REAL,
  "weekly_rank" INTEGER,
  "all_time_rank" INTEGER,
  "xp" INTEGER,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);