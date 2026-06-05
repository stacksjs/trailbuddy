-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "trails"."location" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "trails"."distance" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "trails"."elevation" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "trails"."difficulty" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "trails"."rating" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "trails"."review_count" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "trails"."latitude" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "trails"."longitude" type

ALTER TABLE "trails" ADD COLUMN "uuid" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "trails_trails_uuid_unique" ON "trails" ("uuid");