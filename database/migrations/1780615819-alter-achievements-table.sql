-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "achievements"."description" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "achievements"."category" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "achievements"."target_value" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "achievements"."target_unit" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "achievements"."points" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "achievements"."badge_color" type

ALTER TABLE "achievements" ADD COLUMN "uuid" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "achievements_achievements_uuid_unique" ON "achievements" ("uuid");