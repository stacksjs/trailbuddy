PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_territory_stats" (
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
INSERT INTO "_qb_tmp_territory_stats" ("id", "user_id", "total_territories_owned", "total_area_owned", "territories_claimed", "territories_conquered", "territories_lost", "territories_defended", "longest_ownership_days", "largest_territory_area", "weekly_rank", "all_time_rank", "xp", "created_at", "updated_at", "uuid") SELECT "id", "user_id", "total_territories_owned", "total_area_owned", "territories_claimed", "territories_conquered", "territories_lost", "territories_defended", "longest_ownership_days", "largest_territory_area", "weekly_rank", "all_time_rank", "xp", "created_at", "updated_at", "uuid" FROM "territory_stats";
DROP TABLE "territory_stats";
ALTER TABLE "_qb_tmp_territory_stats" RENAME TO "territory_stats";
CREATE UNIQUE INDEX IF NOT EXISTS "territory_stats_territory_stats_user_unique" ON "territory_stats" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "territory_stats_territory_stats_uuid_unique" ON "territory_stats" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
