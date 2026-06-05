-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "trail_reviews"."rating" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "trail_reviews"."content" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "trail_reviews"."conditions" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "trail_reviews"."helpful_count" type

ALTER TABLE "trail_reviews" ADD COLUMN "user_id" INTEGER;

ALTER TABLE "trail_reviews" ADD CONSTRAINT "trail_reviews_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "trail_reviews" ADD COLUMN "trail_id" INTEGER;

ALTER TABLE "trail_reviews" ADD CONSTRAINT "trail_reviews_trail_id_fk" FOREIGN KEY ("trail_id") REFERENCES "trails"("id");

ALTER TABLE "trail_reviews" ADD COLUMN "uuid" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "trail_reviews_trail_reviews_uuid_unique" ON "trail_reviews" ("uuid");