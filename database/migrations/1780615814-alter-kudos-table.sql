-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "kudos"."giver_id" type

ALTER TABLE "kudos" ADD COLUMN "user_id" INTEGER;

ALTER TABLE "kudos" ADD CONSTRAINT "kudos_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "kudos" ADD COLUMN "activity_id" INTEGER;

ALTER TABLE "kudos" ADD CONSTRAINT "kudos_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "activities"("id");

ALTER TABLE "kudos" ADD COLUMN "uuid" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "kudos_kudos_uuid_unique" ON "kudos" ("uuid");