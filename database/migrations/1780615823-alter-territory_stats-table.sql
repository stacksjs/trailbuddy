-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_stats"."total_territories_owned" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_stats"."total_area_owned" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_stats"."territories_claimed" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_stats"."territories_conquered" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_stats"."territories_lost" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_stats"."territories_defended" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_stats"."longest_ownership_days" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_stats"."largest_territory_area" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_stats"."weekly_rank" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_stats"."all_time_rank" type

ALTER TABLE "territory_stats" ADD COLUMN "user_id" INTEGER;

ALTER TABLE "territory_stats" ADD CONSTRAINT "territory_stats_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "territory_stats" ADD COLUMN "uuid" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "territory_stats_territory_stats_uuid_unique" ON "territory_stats" ("uuid");