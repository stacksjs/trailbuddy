-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "user_stats"."total_distance" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "user_stats"."total_elevation" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "user_stats"."trails_completed" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "user_stats"."current_streak" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "user_stats"."longest_streak" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "user_stats"."weekly_rank" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "user_stats"."total_activities" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "user_stats"."total_kudos_received" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "user_stats"."total_kudos_given" type

ALTER TABLE "user_stats" ADD COLUMN "user_id" INTEGER;

ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "user_stats" ADD COLUMN "uuid" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "user_stats_user_stats_uuid_unique" ON "user_stats" ("uuid");