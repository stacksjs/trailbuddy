CREATE TABLE IF NOT EXISTS "user_stats" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "total_distance" REAL,
  "total_time" TEXT,
  "total_elevation" REAL,
  "trails_completed" REAL,
  "current_streak" REAL,
  "longest_streak" REAL,
  "weekly_rank" REAL,
  "total_activities" REAL,
  "total_kudos_received" REAL,
  "total_kudos_given" REAL,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT
);