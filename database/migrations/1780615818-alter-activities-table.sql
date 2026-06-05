-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "activities"."activity_type" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "activities"."distance" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "activities"."elevation" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "activities"."kudos_count" type

ALTER TABLE "activities" ADD COLUMN "user_id" INTEGER;

ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "activities" ADD COLUMN "trail_id" INTEGER;

ALTER TABLE "activities" ADD CONSTRAINT "activities_trail_id_fk" FOREIGN KEY ("trail_id") REFERENCES "trails"("id");

ALTER TABLE "activities" ADD COLUMN "uuid" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "activities_activities_uuid_unique" ON "activities" ("uuid");