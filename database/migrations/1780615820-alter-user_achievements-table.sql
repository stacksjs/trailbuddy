-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "user_achievements"."progress" type

ALTER TABLE "user_achievements" ADD COLUMN "user_id" INTEGER;

ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "user_achievements" ADD COLUMN "achievement_id" INTEGER;

ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id");

ALTER TABLE "user_achievements" ADD COLUMN "uuid" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "user_achievements_user_achievements_uuid_unique" ON "user_achievements" ("uuid");