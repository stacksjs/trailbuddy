CREATE TABLE IF NOT EXISTS "territory_stats" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "total_territories_owned" REAL,
  "total_area_owned" REAL,
  "territories_claimed" REAL,
  "territories_conquered" REAL,
  "territories_lost" REAL,
  "territories_defended" REAL,
  "longest_ownership_days" REAL,
  "largest_territory_area" REAL,
  "weekly_rank" REAL,
  "all_time_rank" REAL,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT
);