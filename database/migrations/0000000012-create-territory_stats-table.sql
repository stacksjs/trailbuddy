CREATE TABLE IF NOT EXISTS "territory_stats" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "total_territories_owned" INTEGER,
  "total_area_owned" INTEGER,
  "territories_claimed" INTEGER,
  "territories_conquered" INTEGER,
  "territories_lost" INTEGER,
  "territories_defended" INTEGER,
  "longest_ownership_days" INTEGER,
  "largest_territory_area" INTEGER,
  "weekly_rank" INTEGER,
  "all_time_rank" INTEGER,
  "user_id" INTEGER REFERENCES "users"("id"),
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);