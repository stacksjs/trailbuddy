-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "saved_trails"."notes" type

ALTER TABLE "saved_trails" ADD COLUMN "user_id" INTEGER;

ALTER TABLE "saved_trails" ADD CONSTRAINT "saved_trails_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "saved_trails" ADD COLUMN "trail_id" INTEGER;

ALTER TABLE "saved_trails" ADD CONSTRAINT "saved_trails_trail_id_fk" FOREIGN KEY ("trail_id") REFERENCES "trails"("id");

ALTER TABLE "saved_trails" ADD COLUMN "uuid" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "saved_trails_saved_trails_uuid_unique" ON "saved_trails" ("uuid");