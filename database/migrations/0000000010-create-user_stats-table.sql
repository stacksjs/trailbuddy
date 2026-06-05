CREATE TABLE IF NOT EXISTS "user_stats" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "total_distance" INTEGER,
  "total_time" TEXT,
  "total_elevation" INTEGER,
  "trails_completed" INTEGER,
  "current_streak" INTEGER,
  "longest_streak" INTEGER,
  "weekly_rank" INTEGER,
  "total_activities" INTEGER,
  "total_kudos_received" INTEGER,
  "total_kudos_given" INTEGER,
  "user_id" INTEGER REFERENCES "users"("id"),
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);